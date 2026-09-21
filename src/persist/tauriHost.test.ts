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
      "/saves/SlotData_0.dat",
    );

    expect(result).toMatchObject({
      status: "error",
      phase: "list-backups",
      path: "/saves/SlotData_0.dat",
    });
  });

  it("rejects unknown managed status and phase values", async () => {
    invokeMock.mockResolvedValue({
      status: "invented-status",
      phase: "invented-phase",
      message: "synthetic protocol mismatch",
    });

    const result = await createTauriPersistHost().safeWriteFile({
      targetPath: "/saves/SlotData_0.dat",
      bytes: new Uint8Array(235_980),
      reason: "before-save",
    });

    expect(result).toEqual({
      status: "error",
      phase: "replace-target",
      path: "/saves/SlotData_0.dat",
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
      "/saves/SlotData_0.dat",
    );

    expect(result).toMatchObject({
      status: "error",
      phase: "list-backups",
    });
  });
});
