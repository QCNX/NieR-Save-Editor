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
  backup?: BackupEntry;
  backups?: BackupEntry[];
  sha256?: string;
  expected?: number;
  actual?: number;
  expectedSha256?: string;
  actualSha256?: string;
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
  const phase = (result.phase ?? fallbackPhase) as ManagedPhase;
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
    ): Promise<CreateBackupResult> {
      const result = await invoke<RustManagedResult>(
        "persist_create_versioned_backup",
        { sourcePath, reason },
      );
      if (result.status === "ok" && result.backup) {
        return { status: "ok", backup: result.backup };
      }
      return managedFailureFrom(result, sourcePath, "backup-target");
    },

    async listBackups(sourcePath: string): Promise<ListBackupsResult> {
      const result = await invoke<RustManagedResult>("persist_list_backups", {
        sourcePath,
      });
      if (result.status === "ok") {
        return { status: "ok", backups: result.backups ?? [] };
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
      });
      if (
        result.status === "ok" &&
        result.path &&
        result.backup &&
        result.sha256
      ) {
        return {
          status: "ok",
          path: result.path,
          backup: result.backup,
          sha256: result.sha256,
        };
      }
      return managedFailureFrom(result, options.targetPath, "replace-target");
    },
  };
}
