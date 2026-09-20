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

export type BackupReason =
  | "manual"
  | "before-save"
  | "before-import"
  | "before-restore";

export type BackupEntry = {
  path: string;
  slotFileName: string;
  reason: BackupReason | "legacy";
  size: number;
  mtimeMs: number;
  sha256: string;
  metadataStatus: "ok" | "missing" | "invalid" | "legacy";
};

export type ManagedPhase =
  | "validate-source"
  | "check-target"
  | "backup-target"
  | "stage-write"
  | "replace-target"
  | "verify-target"
  | "list-backups";

export type ManagedFailure =
  | (PersistIoFailure & { phase: ManagedPhase })
  | {
      status: "invalid-size";
      phase: "validate-source";
      path: string;
      expected: number;
      actual: number;
      message: string;
    }
  | {
      status: "integrity" | "conflict" | "backup" | "verify";
      phase: ManagedPhase;
      path: string;
      message: string;
      expectedSha256?: string;
      actualSha256?: string;
    };

export type CreateBackupResult =
  | { status: "ok"; backup: BackupEntry }
  | ManagedFailure;

export type ListBackupsResult =
  | { status: "ok"; backups: BackupEntry[] }
  | ManagedFailure;

export type SafeWriteResult =
  | {
      status: "ok";
      path: string;
      backup: BackupEntry;
      sha256: string;
    }
  | ManagedFailure;

export type SafeWriteOptions = {
  targetPath: string;
  bytes: Uint8Array;
  reason: Exclude<BackupReason, "manual">;
  expectedTargetSha256?: string;
};

/** Injectable boundary for versioned history and verified target mutation. */
export interface SaveManagementHost {
  readFile(path: string): Promise<ReadFileResult>;
  createVersionedBackup(
    sourcePath: string,
    reason: "manual",
  ): Promise<CreateBackupResult>;
  listBackups(sourcePath: string): Promise<ListBackupsResult>;
  safeWriteFile(options: SafeWriteOptions): Promise<SafeWriteResult>;
}

export type ManagedOverwriteResult =
  | { status: "ok"; path: string; backupPath: string }
  | ManagedFailure;
