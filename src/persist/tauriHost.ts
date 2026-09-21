import { invoke } from "@tauri-apps/api/core";
import type { PersistHost } from "./host";
import type {
  BackupEntry,
  CreateBackupResult,
  ListBackupsResult,
  ManagedFailure,
  ManagedPhase,
  PersistIoFailure,
  PersistIoResult,
  PickSaveAsOptions,
  PickSaveAsResult,
  ReadFileResult,
  SafeWriteResult,
  SaveManagementHost,
} from "./types";

interface RustReadFileResult {
  status: string;
  bytes?: number[];
  sha256?: string;
  path?: string;
  message?: string;
}

interface RustIoResult {
  status: string;
  path?: string;
  message?: string;
}

interface RustPickSaveAsResult {
  status: string;
  path?: string;
}

interface RustManagedResult {
  status: string;
  path?: string;
  message?: string;
  phase?: string;
  backup?: unknown;
  backups?: unknown[];
  sha256?: string;
  expected?: number;
  actual?: number;
  expectedSha256?: string;
  actualSha256?: string;
}

const managedPhases: readonly ManagedPhase[] = [
  "validate-source",
  "check-target",
  "backup-target",
  "stage-write",
  "replace-target",
  "verify-target",
  "list-backups",
];

function isManagedPhase(value: unknown): value is ManagedPhase {
  return managedPhases.includes(value as ManagedPhase);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseBackupEntry(value: unknown): BackupEntry | null {
  if (!isRecord(value)) return null;
  const reasons = [
    "manual",
    "before-save",
    "before-import",
    "before-restore",
    "legacy",
  ];
  const metadataStatuses = [
    "ok",
    "missing",
    "invalid",
    "legacy",
    "unreadable",
  ];
  const errorStatuses = ["missing", "permission", "error"];
  if (
    typeof value.path !== "string" ||
    typeof value.slotFileName !== "string" ||
    !reasons.includes(String(value.reason)) ||
    typeof value.size !== "number" ||
    typeof value.mtimeMs !== "number" ||
    typeof value.sha256 !== "string" ||
    !metadataStatuses.includes(String(value.metadataStatus)) ||
    (value.errorStatus !== undefined &&
      !errorStatuses.includes(String(value.errorStatus)))
  ) {
    return null;
  }
  return value as BackupEntry;
}

function failureFrom(
  status: string,
  path: string,
  message: string | undefined,
  fallback: string,
): PersistIoFailure {
  const kind =
    status === "missing" || status === "permission" ? status : "error";
  return {
    status: kind,
    path,
    message: message ?? fallback,
  };
}

function mapIoResult(result: RustIoResult, fallbackPath: string): PersistIoResult {
  if (result.status === "ok") {
    return { status: "ok" };
  }
  return failureFrom(
    result.status,
    result.path ?? fallbackPath,
    result.message,
    `Save I/O failed for: ${fallbackPath}`,
  );
}

function managedFailureFrom(
  result: RustManagedResult,
  fallbackPath: string,
  fallbackPhase: ManagedPhase,
): ManagedFailure {
  const path = result.path ?? fallbackPath;
  if (result.phase !== undefined && !isManagedPhase(result.phase)) {
    return {
      status: "error",
      phase: fallbackPhase,
      path,
      message: result.message ?? `Managed save operation failed: ${path}`,
    };
  }
  const phase = result.phase ?? fallbackPhase;
  if (result.status === "invalid-size") {
    return {
      status: "invalid-size",
      phase: "validate-source",
      path,
      expected: result.expected ?? 0,
      actual: result.actual ?? 0,
      message: result.message ?? `Invalid save size: ${path}`,
    };
  }
  if (
    result.status === "integrity" ||
    result.status === "conflict" ||
    result.status === "backup" ||
    result.status === "verify"
  ) {
    return {
      status: result.status,
      phase,
      path,
      message: result.message ?? `Managed save operation failed: ${path}`,
      expectedSha256: result.expectedSha256,
      actualSha256: result.actualSha256,
    };
  }
  return {
    ...failureFrom(
      result.status,
      path,
      result.message,
      `Managed save operation failed: ${path}`,
    ),
    phase,
  };
}

/** Tauri-backed persist host (thin commands → TypeScript serialize/orchestration). */
export function createTauriPersistHost(): PersistHost & SaveManagementHost {
  return {
    async readFile(path: string): Promise<ReadFileResult> {
      const result = await invoke<RustReadFileResult>("persist_read_file", {
        path,
      });
      if (result.status === "ok") {
        return {
          status: "ok",
          bytes: Uint8Array.from(result.bytes ?? []),
          sha256: result.sha256,
        };
      }
      return failureFrom(
        result.status,
        result.path ?? path,
        result.message,
        `Failed to read save file: ${path}`,
      );
    },

    async backupFile(sourcePath: string, backupPath: string): Promise<PersistIoResult> {
      const result = await invoke<RustIoResult>("persist_backup_file", {
        sourcePath,
        backupPath,
      });
      return mapIoResult(result, sourcePath);
    },

    async writeFile(path: string, bytes: Uint8Array): Promise<PersistIoResult> {
      const result = await invoke<RustIoResult>("persist_write_file", {
        path,
        bytes: Array.from(bytes),
      });
      return mapIoResult(result, path);
    },

    async pickSaveAsPath(opts: PickSaveAsOptions): Promise<PickSaveAsResult> {
      const result = await invoke<RustPickSaveAsResult>("persist_save_as_dialog", {
        defaultPath: opts.defaultPath ?? null,
        defaultName: opts.defaultName ?? null,
      });
      if (result.status === "cancelled") {
        return { status: "cancelled" };
      }
      if (result.status === "ok" && result.path) {
        return { status: "ok", path: result.path };
      }
      return { status: "cancelled" };
    },

    async createVersionedBackup(
      sourcePath: string,
      reason: "manual",
      options?: { backupRoot?: string },
    ): Promise<CreateBackupResult> {
      const result = await invoke<RustManagedResult>(
        "persist_create_versioned_backup",
        {
          sourcePath,
          reason,
          backupRoot: options?.backupRoot?.trim() || null,
        },
      );
      if (result.phase !== undefined && !isManagedPhase(result.phase)) {
        return managedFailureFrom(result, sourcePath, "backup-target");
      }
      const backup = parseBackupEntry(result.backup);
      if (result.status === "ok" && backup) {
        return { status: "ok", backup };
      }
      return managedFailureFrom(result, sourcePath, "backup-target");
    },

    async listBackups(
      sourcePath: string,
      options?: { backupRoot?: string },
    ): Promise<ListBackupsResult> {
      const result = await invoke<RustManagedResult>("persist_list_backups", {
        sourcePath,
        backupRoot: options?.backupRoot?.trim() || null,
      });
      if (result.phase !== undefined && !isManagedPhase(result.phase)) {
        return managedFailureFrom(result, sourcePath, "list-backups");
      }
      if (result.status === "ok") {
        const backups = (result.backups ?? []).map(parseBackupEntry);
        if (backups.every((entry): entry is BackupEntry => entry !== null)) {
          return { status: "ok", backups };
        }
        return {
          status: "error",
          phase: "list-backups",
          path: sourcePath,
          message: `Managed save operation failed: ${sourcePath}`,
        };
      }
      return managedFailureFrom(result, sourcePath, "list-backups");
    },

    async safeWriteFile(options): Promise<SafeWriteResult> {
      const result = await invoke<RustManagedResult>("persist_safe_write_file", {
        targetPath: options.targetPath,
        bytes: Array.from(options.bytes),
        reason: options.reason,
        expectedSourceSha256: options.expectedSourceSha256 ?? null,
        expectedTargetSha256: options.expectedTargetSha256 ?? null,
        backupRoot: options.backupRoot?.trim() || null,
      });
      if (result.phase !== undefined && !isManagedPhase(result.phase)) {
        return managedFailureFrom(result, options.targetPath, "replace-target");
      }
      const backup = parseBackupEntry(result.backup);
      if (
        result.status === "ok" &&
        result.path &&
        backup &&
        result.sha256
      ) {
        return {
          status: "ok",
          path: result.path,
          backup,
          sha256: result.sha256,
        };
      }
      return managedFailureFrom(result, options.targetPath, "replace-target");
    },
  };
}
