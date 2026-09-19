/** Backup folder name under the SlotData save directory. */
export const BACKUP_DIR_NAME = "nier-save-editor-backup";

/**
 * Target path for a pre-overwrite backup of `saveFilePath`.
 * Lives under `<saveDir>/nier-save-editor-backup/<basename>`.
 */
export function backupTargetPath(saveFilePath: string): string {
  const sep = saveFilePath.includes("\\") ? "\\" : "/";
  const normalized = saveFilePath.replace(/[/\\]+$/, "");
  const lastSep = Math.max(
    normalized.lastIndexOf("/"),
    normalized.lastIndexOf("\\"),
  );
  if (lastSep < 0) {
    return `${BACKUP_DIR_NAME}${sep}${normalized}`;
  }
  const dir = normalized.slice(0, lastSep);
  const base = normalized.slice(lastSep + 1);
  return `${dir}${sep}${BACKUP_DIR_NAME}${sep}${base}`;
}
