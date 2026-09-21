import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { createTauriPersistHost } from "./tauriHost";

describe("createTauriPersistHost protocol validation", () => {
  beforeEach(() => invokeMock.mockReset());

  it("rejects a backup entry with an unknown reason", async () => {
    invokeMock.mockResolvedValue({
      status: "ok",
      backups: [
        {
          path: "/backups/version.dat",
          slotFileName: "SlotData_0.dat",
          reason: "invented-reason",
          size: 235_980,
          mtimeMs: 1,
          sha256: "abc",
          metadataStatus: "ok",
        },
      ],
    });

    const result = await createTauriPersistHost().listBackups(
      "synthetic/saves/SlotData_0.dat",
    );

    expect(result).toMatchObject({
      status: "error",
      phase: "list-backups",
      path: "synthetic/saves/SlotData_0.dat",
    });
  });

  it("rejects unknown managed status and phase values", async () => {
    invokeMock.mockResolvedValue({
      status: "invented-status",
      phase: "invented-phase",
      message: "synthetic protocol mismatch",
    });

    const result = await createTauriPersistHost().safeWriteFile({
      targetPath: "synthetic/saves/SlotData_0.dat",
      bytes: new Uint8Array(235_980),
      reason: "before-save",
    });

    expect(result).toEqual({
      status: "error",
      phase: "replace-target",
      path: "synthetic/saves/SlotData_0.dat",
      message: "synthetic protocol mismatch",
    });
  });

  it("rejects an unknown phase even when the status says ok", async () => {
    invokeMock.mockResolvedValue({
      status: "ok",
      phase: "invented-phase",
      backups: [],
    });

    const result = await createTauriPersistHost().listBackups(
      "synthetic/saves/SlotData_0.dat",
    );

    expect(result).toMatchObject({
      status: "error",
      phase: "list-backups",
    });
  });

  it("forwards a configured backup root to create/list/safe-write commands", async () => {
    invokeMock.mockResolvedValue({
      status: "ok",
      backups: [],
    });

    await createTauriPersistHost().listBackups("synthetic/saves/SlotData_0.dat", {
      backupRoot: "  synthetic/backups/custom-root  ",
    });

    expect(invokeMock).toHaveBeenCalledWith("persist_list_backups", {
      sourcePath: "synthetic/saves/SlotData_0.dat",
      backupRoot: "synthetic/backups/custom-root",
    });

    invokeMock.mockResolvedValue({
      status: "ok",
      backup: {
        path: "synthetic/backups/custom-root/SlotData_0/version.dat",
        slotFileName: "SlotData_0.dat",
        reason: "manual",
        size: 235_980,
        mtimeMs: 1,
        sha256: "abc",
        metadataStatus: "ok",
      },
    });

    await createTauriPersistHost().createVersionedBackup(
      "synthetic/saves/SlotData_0.dat",
      "manual",
      { backupRoot: "synthetic/backups/custom-root" },
    );

    expect(invokeMock).toHaveBeenCalledWith("persist_create_versioned_backup", {
      sourcePath: "synthetic/saves/SlotData_0.dat",
      reason: "manual",
      backupRoot: "synthetic/backups/custom-root",
    });

    invokeMock.mockResolvedValue({
      status: "ok",
      path: "synthetic/saves/SlotData_0.dat",
      sha256: "def",
      backup: {
        path: "synthetic/backups/custom-root/SlotData_0/version.dat",
        slotFileName: "SlotData_0.dat",
        reason: "before-save",
        size: 235_980,
        mtimeMs: 1,
        sha256: "abc",
        metadataStatus: "ok",
      },
    });

    await createTauriPersistHost().safeWriteFile({
      targetPath: "synthetic/saves/SlotData_0.dat",
      bytes: new Uint8Array(235_980),
      reason: "before-save",
      backupRoot: "synthetic/backups/custom-root",
    });

    expect(invokeMock).toHaveBeenCalledWith(
      "persist_safe_write_file",
      expect.objectContaining({
        targetPath: "synthetic/saves/SlotData_0.dat",
        backupRoot: "synthetic/backups/custom-root",
      }),
    );
  });

  it("sends null backupRoot when unset so the host keeps the beside-save default", async () => {
    invokeMock.mockResolvedValue({ status: "ok", backups: [] });

    await createTauriPersistHost().listBackups("synthetic/saves/SlotData_0.dat");

    expect(invokeMock).toHaveBeenCalledWith("persist_list_backups", {
      sourcePath: "synthetic/saves/SlotData_0.dat",
      backupRoot: null,
    });
  });

  it("opens a resolved backup folder through persist_reveal_backup_folder", async () => {
    invokeMock.mockResolvedValue({ status: "ok" });

    const result = await createTauriPersistHost().revealBackupFolder(
      "synthetic/backups/custom-root",
    );

    expect(result).toEqual({ status: "ok" });
    expect(invokeMock).toHaveBeenCalledWith("persist_reveal_backup_folder", {
      path: "synthetic/backups/custom-root",
    });
  });

  it("maps reveal-folder permission failures from the opener command", async () => {
    invokeMock.mockResolvedValue({
      status: "permission",
      path: "synthetic/backups/blocked",
      message: "Permission denied creating backup folder: synthetic/backups/blocked",
    });

    const result = await createTauriPersistHost().revealBackupFolder(
      "synthetic/backups/blocked",
    );

    expect(result).toEqual({
      status: "permission",
      path: "synthetic/backups/blocked",
      message: "Permission denied creating backup folder: synthetic/backups/blocked",
    });
  });
});
