import { describe, expect, it } from "vitest";
import { load, type SlotData } from "../save";
import { SAVEFILE_SIZE_BYTES } from "../save/constants";
import { BACKUP_DIR_NAME } from "./backupPath";
import {
  managedOverwriteSave,
  overwriteSave,
  reloadSave,
  saveAsSave,
  type PersistHost,
} from "./host";
import type { BackupEntry, SaveManagementHost } from "./types";

/** Patterned synthetic PC save — not a real player file. */
function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  return bytes;
}

function slotFromSynthetic(): SlotData {
  return load(syntheticSave());
}

describe("reloadSave", () => {
  it("returns file bytes from the current path", async () => {
    const bytes = syntheticSave();
    const host: PersistHost = {
      async readFile(path) {
        expect(path).toBe("/saves/SlotData_0.dat");
        return { status: "ok", bytes };
      },
      async backupFile() {
        throw new Error("unused");
      },
      async writeFile() {
        throw new Error("unused");
      },
      async pickSaveAsPath() {
        throw new Error("unused");
      },
    };

    const result = await reloadSave(host, "/saves/SlotData_0.dat");
    expect(result).toEqual({ status: "ok", bytes });
  });

  it("reports missing and permission failures clearly", async () => {
    const missingHost: PersistHost = {
      async readFile(path) {
        return {
          status: "missing",
          path,
          message: `Save file not found: ${path}`,
        };
      },
      async backupFile() {
        throw new Error("unused");
      },
      async writeFile() {
        throw new Error("unused");
      },
      async pickSaveAsPath() {
        throw new Error("unused");
      },
    };

    await expect(reloadSave(missingHost, "/missing.dat")).resolves.toEqual({
      status: "missing",
      path: "/missing.dat",
      message: "Save file not found: /missing.dat",
    });

    const deniedHost: PersistHost = {
      ...missingHost,
      async readFile(path) {
        return {
          status: "permission",
          path,
          message: `Permission denied reading save file: ${path}`,
        };
      },
    };

    await expect(reloadSave(deniedHost, "/locked.dat")).resolves.toEqual({
      status: "permission",
      path: "/locked.dat",
      message: "Permission denied reading save file: /locked.dat",
    });
  });
});

describe("overwriteSave", () => {
  it("routes a capable host through the versioned safe-write contract", async () => {
    const bytes = syntheticSave();
    const backup: BackupEntry = {
      path: "/saves/nier-save-editor-backup/SlotData_0/version.dat",
      slotFileName: "SlotData_0.dat",
      reason: "before-save",
      size: bytes.length,
      mtimeMs: 2,
      sha256: "old-sha",
      metadataStatus: "ok",
    };
    let usedLegacyBackup = false;
    const host: PersistHost & SaveManagementHost = {
      async readFile() {
        return { status: "ok", bytes };
      },
      async backupFile() {
        usedLegacyBackup = true;
        return { status: "ok" };
      },
      async writeFile() {
        throw new Error("legacy write must not be used");
      },
      async pickSaveAsPath() {
        throw new Error("unused");
      },
      async createVersionedBackup() {
        throw new Error("unused");
      },
      async listBackups() {
        throw new Error("unused");
      },
      async safeWriteFile(options) {
        expect(options.reason).toBe("before-save");
        return {
          status: "ok",
          path: options.targetPath,
          backup,
          sha256: "new-sha",
        };
      },
    };

    await expect(
      overwriteSave(host, "/saves/SlotData_0.dat", slotFromSynthetic()),
    ).resolves.toEqual({
      status: "ok",
      path: "/saves/SlotData_0.dat",
      backupPath: backup.path,
    });
    expect(usedLegacyBackup).toBe(false);
  });

  it("uses one managed write then rejects a byte-for-byte readback mismatch", async () => {
    const slot = slotFromSynthetic();
    const intended = syntheticSave();
    const mismatched = intended.slice();
    mismatched[123] ^= 0xff;
    const backup: BackupEntry = {
      path: "/saves/nier-save-editor-backup/SlotData_0/version.dat",
      slotFileName: "SlotData_0.dat",
      reason: "before-save",
      size: intended.length,
      mtimeMs: 1,
      sha256: "backup-sha",
      metadataStatus: "ok",
    };
    const host: SaveManagementHost = {
      async createVersionedBackup() {
        throw new Error("unused");
      },
      async listBackups() {
        throw new Error("unused");
      },
      async safeWriteFile({ reason, bytes }) {
        expect(reason).toBe("before-save");
        expect(bytes).toEqual(intended);
        return {
          status: "ok",
          path: "/saves/SlotData_0.dat",
          backup,
          sha256: "new-sha",
        };
      },
      async readFile() {
        return { status: "ok", bytes: mismatched };
      },
    };

    await expect(
      managedOverwriteSave(host, "/saves/SlotData_0.dat", slot),
    ).resolves.toMatchObject({
      status: "verify",
      phase: "verify-target",
      path: "/saves/SlotData_0.dat",
    });
  });

  it("backs up under nier-save-editor-backup then writes serialized bytes", async () => {
    const slot = slotFromSynthetic();
    const calls: string[] = [];
    let written: Uint8Array | undefined;

    const host: PersistHost = {
      async readFile() {
        throw new Error("unused");
      },
      async backupFile(sourcePath, backupPath) {
        calls.push(`backup:${sourcePath}->${backupPath}`);
        return { status: "ok" };
      },
      async writeFile(path, bytes) {
        calls.push(`write:${path}`);
        written = bytes;
        return { status: "ok" };
      },
      async pickSaveAsPath() {
        throw new Error("unused");
      },
    };

    const path = "/saves/SlotData_0.dat";
    const result = await overwriteSave(host, path, slot);

    expect(result).toEqual({ status: "ok", path, backupPath: `/saves/${BACKUP_DIR_NAME}/SlotData_0.dat` });
    expect(calls).toEqual([
      `backup:/saves/SlotData_0.dat->/saves/${BACKUP_DIR_NAME}/SlotData_0.dat`,
      "write:/saves/SlotData_0.dat",
    ]);
    expect(written).toEqual(syntheticSave());
  });

  it("aborts the write when backup fails", async () => {
    const slot = slotFromSynthetic();
    let wrote = false;
    const host: PersistHost = {
      async readFile() {
        throw new Error("unused");
      },
      async backupFile(sourcePath) {
        return {
          status: "permission",
          path: sourcePath,
          message: `Permission denied creating backup for: ${sourcePath}`,
        };
      },
      async writeFile() {
        wrote = true;
        return { status: "ok" };
      },
      async pickSaveAsPath() {
        throw new Error("unused");
      },
    };

    const result = await overwriteSave(host, "/saves/SlotData_0.dat", slot);
    expect(wrote).toBe(false);
    expect(result.status).toBe("backup");
    if (result.status === "backup") {
      expect(result.message).toContain("Permission denied");
    }
  });

  it("aborts when the source save is missing before backup", async () => {
    const slot = slotFromSynthetic();
    let wrote = false;
    const host: PersistHost = {
      async readFile() {
        throw new Error("unused");
      },
      async backupFile(sourcePath) {
        return {
          status: "missing",
          path: sourcePath,
          message: `Save file not found: ${sourcePath}`,
        };
      },
      async writeFile() {
        wrote = true;
        return { status: "ok" };
      },
      async pickSaveAsPath() {
        throw new Error("unused");
      },
    };

    const result = await overwriteSave(host, "/gone.dat", slot);
    expect(wrote).toBe(false);
    expect(result).toMatchObject({
      status: "backup",
      path: "/gone.dat",
    });
  });
});

describe("saveAsSave", () => {
  it("writes serialized bytes to the path chosen via the save dialog", async () => {
    const slot = slotFromSynthetic();
    let written: { path: string; bytes: Uint8Array } | undefined;
    const host: PersistHost = {
      async readFile() {
        throw new Error("unused");
      },
      async backupFile() {
        throw new Error("unused");
      },
      async writeFile(path, bytes) {
        written = { path, bytes };
        return { status: "ok" };
      },
      async pickSaveAsPath(opts) {
        expect(opts.defaultName).toBe("SlotData_0.dat");
        return { status: "ok", path: "/exports/SlotData_copy.dat" };
      },
    };

    const result = await saveAsSave(host, slot, {
      defaultName: "SlotData_0.dat",
    });

    expect(result).toEqual({
      status: "ok",
      path: "/exports/SlotData_copy.dat",
    });
    expect(written?.path).toBe("/exports/SlotData_copy.dat");
    expect(written?.bytes).toEqual(syntheticSave());
  });

  it("reports cancellation without writing", async () => {
    let wrote = false;
    const host: PersistHost = {
      async readFile() {
        throw new Error("unused");
      },
      async backupFile() {
        throw new Error("unused");
      },
      async writeFile() {
        wrote = true;
        return { status: "ok" };
      },
      async pickSaveAsPath() {
        return { status: "cancelled" };
      },
    };

    const result = await saveAsSave(host, slotFromSynthetic(), {});
    expect(wrote).toBe(false);
    expect(result).toEqual({ status: "cancelled" });
  });
});
