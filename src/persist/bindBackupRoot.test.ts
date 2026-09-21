import { describe, expect, it, vi } from "vitest";
import { bindBackupRoot } from "./bindBackupRoot";
import type { PersistHost } from "./host";
import type {
  BackupEntry,
  CreateBackupResult,
  ListBackupsResult,
  SafeWriteResult,
  SaveManagementHost,
} from "./types";

const sampleBackup: BackupEntry = {
  path: "synthetic/backups/custom-root/SlotData_0/v.dat",
  slotFileName: "SlotData_0.dat",
  reason: "manual",
  size: 1,
  mtimeMs: 1,
  sha256: "abc",
  metadataStatus: "ok",
};

function fakeHost(): PersistHost & SaveManagementHost {
  return {
    readFile: vi.fn(),
    backupFile: vi.fn(),
    writeFile: vi.fn(),
    pickSaveAsPath: vi.fn(),
    revealBackupFolder: vi.fn(),
    createVersionedBackup: vi.fn(
      async (): Promise<CreateBackupResult> => ({
        status: "ok",
        backup: sampleBackup,
      }),
    ),
    listBackups: vi.fn(
      async (): Promise<ListBackupsResult> => ({
        status: "ok",
        backups: [],
      }),
    ),
    safeWriteFile: vi.fn(
      async (): Promise<SafeWriteResult> => ({
        status: "ok",
        path: "synthetic/saves/SlotData_0.dat",
        backup: { ...sampleBackup, reason: "before-save" },
        sha256: "def",
      }),
    ),
  };
}

describe("bindBackupRoot", () => {
  it("leaves the host unchanged when the backup root is empty", () => {
    const host = fakeHost();
    expect(bindBackupRoot(host, "   ")).toBe(host);
  });

  it("injects a configured backup root into create/list/safe-write", async () => {
    const host = fakeHost();
    const bound = bindBackupRoot(host, "  synthetic/backups/custom-root  ");

    await bound.createVersionedBackup("synthetic/saves/SlotData_0.dat", "manual");
    await bound.listBackups("synthetic/saves/SlotData_0.dat");
    await bound.safeWriteFile({
      targetPath: "synthetic/saves/SlotData_0.dat",
      bytes: new Uint8Array(1),
      reason: "before-save",
    });

    expect(host.createVersionedBackup).toHaveBeenCalledWith(
      "synthetic/saves/SlotData_0.dat",
      "manual",
      { backupRoot: "synthetic/backups/custom-root" },
    );
    expect(host.listBackups).toHaveBeenCalledWith(
      "synthetic/saves/SlotData_0.dat",
      { backupRoot: "synthetic/backups/custom-root" },
    );
    expect(host.safeWriteFile).toHaveBeenCalledWith(
      expect.objectContaining({
        backupRoot: "synthetic/backups/custom-root",
      }),
    );
  });
});
