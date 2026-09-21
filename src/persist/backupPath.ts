/** Backup folder name under the SlotData save directory. */
export const BACKUP_DIR_NAME = "nier-save-editor-backup";

function pathSep(path: string): "\\" | "/" {
  return path.includes("\\") ? "\\" : "/";
}

function splitDirAndBase(path: string): { dir: string | null; base: string } {
  const normalized = path.replace(/[/\\]+$/, "");
  const lastSep = Math.max(
    normalized.lastIndexOf("/"),
    normalized.lastIndexOf("\\"),
  );
  if (lastSep < 0) {
    return { dir: null, base: normalized };
  }
  return {
    dir: normalized.slice(0, lastSep),
    base: normalized.slice(lastSep + 1),
  };
}

function normalizeOptionalRoot(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().replace(/[/\\]+$/, "");
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Root directory for versioned backups of `saveFilePath`.
 * Default: `<saveDir>/nier-save-editor-backup`. Configured: the given directory.
 */
export function resolveVersionedBackupRoot(
  saveFilePath: string,
  customBackupRoot?: string,
): string {
  const configured = normalizeOptionalRoot(customBackupRoot);
  if (configured) {
    return configured;
  }
  const sep = pathSep(saveFilePath);
  const { dir } = splitDirAndBase(saveFilePath);
  if (dir === null) {
    return BACKUP_DIR_NAME;
  }
  return `${dir}${sep}${BACKUP_DIR_NAME}`;
}

/**
 * Target path for a pre-overwrite backup of `saveFilePath`.
 * Default lives under `<saveDir>/nier-save-editor-backup/<basename>`.
 * With a configured root: `<customBackupRoot>/<basename>`.
 */
export function backupTargetPath(
  saveFilePath: string,
  customBackupRoot?: string,
): string {
  const sep = pathSep(saveFilePath);
  const { base } = splitDirAndBase(saveFilePath);
  const root = resolveVersionedBackupRoot(saveFilePath, customBackupRoot);
  return `${root}${sep}${base}`;
}
