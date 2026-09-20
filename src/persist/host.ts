import { serialize, type SlotData } from "../save";
import { backupTargetPath } from "./backupPath";
import type {
  OverwriteResult,
  PersistIoResult,
  PickSaveAsOptions,
  PickSaveAsResult,
  ReadFileResult,
  ReloadResult,
  ManagedOverwriteResult,
  SaveManagementHost,
  SaveAsResult,
} from "./types";

/**
 * Thin host bridge for save I/O (implemented by Tauri commands).
 * TypeScript owns serialize; Rust only reads/writes/copies/dialogs.
 */
export interface PersistHost {
  readFile(path: string): Promise<ReadFileResult>;
  backupFile(sourcePath: string, backupPath: string): Promise<PersistIoResult>;
  writeFile(path: string, bytes: Uint8Array): Promise<PersistIoResult>;
  pickSaveAsPath(opts: PickSaveAsOptions): Promise<PickSaveAsResult>;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

/**
 * Versioned, host-atomic overwrite followed by an independent full-byte readback.
 * Callers must only clear dirty state after this returns `ok`.
 */
export async function managedOverwriteSave(
  host: SaveManagementHost,
  path: string,
  slot: SlotData,
  expectedTargetSha256?: string,
): Promise<ManagedOverwriteResult> {
  const bytes = serialize(slot);
  const written = await host.safeWriteFile({
    targetPath: path,
    bytes,
    reason: "before-save",
    expectedTargetSha256,
  });
  if (written.status !== "ok") return written;

  const readback = await host.readFile(path);
  if (readback.status !== "ok") {
    return { ...readback, phase: "verify-target" };
  }
  if (!bytesEqual(bytes, readback.bytes)) {
    return {
      status: "verify",
      phase: "verify-target",
      path,
      message: `Written save did not match the intended bytes: ${path}`,
    };
  }
  return { status: "ok", path, backupPath: written.backup.path };
}

/** Reload raw bytes from the current path (callers discard dirty SlotData). */
export async function reloadSave(
  host: PersistHost,
  path: string,
): Promise<ReloadResult> {
  return host.readFile(path);
}

/**
 * Serialize SlotData, create a backup under nier-save-editor-backup/, then
 * overwrite the current path. Backup failure aborts the write.
 */
export async function overwriteSave(
  host: PersistHost,
  path: string,
  slot: SlotData,
): Promise<OverwriteResult> {
  if ("safeWriteFile" in host) {
    return managedOverwriteSave(host as PersistHost & SaveManagementHost, path, slot);
  }
  const backupPath = backupTargetPath(path);
  const backup = await host.backupFile(path, backupPath);
  if (backup.status !== "ok") {
    return {
      status: "backup",
      path: backup.path,
      backupPath,
      message: backup.message,
    };
  }

  const bytes = serialize(slot);
  const written = await host.writeFile(path, bytes);
  if (written.status !== "ok") {
    return written;
  }
  return { status: "ok", path, backupPath };
}

/**
 * Save As: pick a path via the system dialog (window-bound on Tauri), then write.
 * Does not create a backup of the destination (new path or explicit replace).
 */
export async function saveAsSave(
  host: PersistHost,
  slot: SlotData,
  opts: PickSaveAsOptions,
): Promise<SaveAsResult> {
  const picked = await host.pickSaveAsPath(opts);
  if (picked.status === "cancelled") {
    return { status: "cancelled" };
  }

  const bytes = serialize(slot);
  const written = await host.writeFile(picked.path, bytes);
  if (written.status !== "ok") {
    return written;
  }
  return { status: "ok", path: picked.path };
}

export type {
  OverwriteResult,
  PersistIoResult,
  PickSaveAsOptions,
  PickSaveAsResult,
  ReadFileResult,
  ReloadResult,
  SaveAsResult,
} from "./types";
