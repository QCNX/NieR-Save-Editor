import type { PersistHost } from "./host";
import type { SaveManagementHost } from "./types";

/**
 * Inject a configured backup root into save-management APIs.
 * Empty/whitespace leaves the host's beside-save default unchanged.
 */
export function bindBackupRoot(
  host: PersistHost & SaveManagementHost,
  backupRoot: string | undefined,
): PersistHost & SaveManagementHost {
  const normalized = backupRoot?.trim() || undefined;
  if (!normalized) {
    return host;
  }
  return {
    ...host,
    createVersionedBackup(sourcePath, reason, options) {
      return host.createVersionedBackup(sourcePath, reason, {
        ...options,
        backupRoot: options?.backupRoot ?? normalized,
      });
    },
    listBackups(sourcePath, options) {
      return host.listBackups(sourcePath, {
        ...options,
        backupRoot: options?.backupRoot ?? normalized,
      });
    },
    safeWriteFile(options) {
      return host.safeWriteFile({
        ...options,
        backupRoot: options.backupRoot ?? normalized,
      });
    },
  };
}
