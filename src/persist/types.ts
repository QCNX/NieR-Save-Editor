export type PersistIoOk = { status: "ok" };

export type PersistIoFailure = {
  status: "missing" | "permission" | "error";
  path: string;
  message: string;
};

export type PersistIoResult = PersistIoOk | PersistIoFailure;

export type ReadFileResult =
  | { status: "ok"; bytes: Uint8Array }
  | PersistIoFailure;

export type PickSaveAsResult =
  | { status: "ok"; path: string }
  | { status: "cancelled" };

export type ReloadResult = ReadFileResult;

export type OverwriteResult =
  | { status: "ok"; path: string; backupPath: string }
  | { status: "backup"; path: string; backupPath: string; message: string }
  | PersistIoFailure;

export type SaveAsResult =
  | { status: "ok"; path: string }
  | { status: "cancelled" }
  | PersistIoFailure;

export interface PickSaveAsOptions {
  /** Suggested file name in the dialog (e.g. SlotData_0.dat). */
  defaultName?: string;
  /** Optional starting directory for the dialog. */
  defaultPath?: string;
}
