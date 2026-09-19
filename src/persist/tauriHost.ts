import { invoke } from "@tauri-apps/api/core";
import type { PersistHost } from "./host";
import type {
  PersistIoFailure,
  PersistIoResult,
  PickSaveAsOptions,
  PickSaveAsResult,
  ReadFileResult,
} from "./types";

interface RustReadFileResult {
  status: string;
  bytes?: number[];
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

/** Tauri-backed persist host (thin commands → TypeScript serialize/orchestration). */
export function createTauriPersistHost(): PersistHost {
  return {
    async readFile(path: string): Promise<ReadFileResult> {
      const result = await invoke<RustReadFileResult>("persist_read_file", {
        path,
      });
      if (result.status === "ok") {
        return {
          status: "ok",
          bytes: Uint8Array.from(result.bytes ?? []),
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
  };
}
