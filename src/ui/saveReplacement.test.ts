import { describe, expect, it, vi } from "vitest";

import type {
  ReadFileResult,
  SafeWriteOptions,
  SafeWriteResult,
  SaveManagementHost,
} from "../persist";
import { SAVEFILE_SIZE_BYTES } from "../save";
import {
  executeSaveReplacement,
  prepareSaveReplacement,
  sha256SaveBytes,
} from "./saveReplacement";

function bytes(seed: number): Uint8Array {
  const value = new Uint8Array(SAVEFILE_SIZE_BYTES);
  value.fill(seed);
  return value;
}

function fakeHost(options?: {
  safeWrite?: (input: SafeWriteOptions) => Promise<SafeWriteResult>;
  readFile?: (path: string) => Promise<ReadFileResult>;
}): SaveManagementHost {
  return {
    createVersionedBackup: vi.fn(),
    listBackups: vi.fn(),
    safeWriteFile:
      options?.safeWrite ??
      vi.fn(async (input: SafeWriteOptions): Promise<SafeWriteResult> => ({
        status: "ok",
        path: input.targetPath,
        backup: {
          path: "~/backups/version.dat",
          slotFileName: "SlotData_0.dat",
          reason: input.reason,
          size: SAVEFILE_SIZE_BYTES,
          mtimeMs: 1,
          sha256: "old-target-sha",
          metadataStatus: "ok",
        },
        sha256: "written-sha",
      })),
    readFile:
      options?.readFile ??
      vi.fn(async (): Promise<ReadFileResult> => ({
        status: "ok",
        bytes: bytes(7),
        sha256: "written-sha",
      })),
  };
}

describe("sha256SaveBytes", () => {
  it("hashes in-memory import bytes with WebCrypto", async () => {
    await expect(sha256SaveBytes(new TextEncoder().encode("abc"))).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("executeSaveReplacement", () => {
  it("rejects an invalid source before calling the host", async () => {
    const host = fakeHost();

    const result = await executeSaveReplacement(host, {
      kind: "import",
      targetPath: "~/saves/SlotData_0.dat",
      sourceBytes: new Uint8Array(12),
      expectedSourceSha256: "invalid",
      expectedTargetSha256: "target-sha",
    });

    expect(result).toMatchObject({ status: "error", phase: "validate-source" });
    expect(host.safeWriteFile).not.toHaveBeenCalled();
    expect(host.readFile).not.toHaveBeenCalled();
  });

  it("restores with both conflict hashes and verifies the complete readback", async () => {
    const intended = bytes(7);
    const safeWriteFile = vi.fn(async (input: SafeWriteOptions) => ({
      status: "ok" as const,
      path: input.targetPath,
      backup: {
        path: "~/backups/before-restore.dat",
        slotFileName: "SlotData_0.dat",
        reason: input.reason,
        size: SAVEFILE_SIZE_BYTES,
        mtimeMs: 1,
        sha256: "target-sha",
        metadataStatus: "ok" as const,
      },
      sha256: "written-sha",
    }));
    const host = fakeHost({ safeWrite: safeWriteFile });

    await expect(
      executeSaveReplacement(host, {
        kind: "restore",
        targetPath: "~/saves/SlotData_0.dat",
        sourceBytes: intended,
        expectedSourceSha256: "backup-sha",
        expectedTargetSha256: "target-sha",
      }),
    ).resolves.toMatchObject({ status: "ok", bytes: intended });
    expect(safeWriteFile).toHaveBeenCalledWith({
      targetPath: "~/saves/SlotData_0.dat",
      bytes: intended,
      reason: "before-restore",
      expectedSourceSha256: "backup-sha",
      expectedTargetSha256: "target-sha",
    });
  });

  it("imports with before-import and propagates a target conflict without readback", async () => {
    const safeWriteFile = vi.fn(async (): Promise<SafeWriteResult> => ({
      status: "conflict",
      phase: "check-target",
      path: "~/saves/SlotData_1.dat",
      message: "target changed",
      expectedSha256: "old",
      actualSha256: "new",
    }));
    const readFile = vi.fn();
    const host = fakeHost({ safeWrite: safeWriteFile, readFile });

    const result = await executeSaveReplacement(host, {
      kind: "import",
      targetPath: "~/saves/SlotData_1.dat",
      sourceBytes: bytes(3),
      expectedSourceSha256: "import-sha",
      expectedTargetSha256: "old",
    });

    expect(safeWriteFile).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "before-import" }),
    );
    expect(result).toMatchObject({
      status: "error",
      phase: "check-target",
      message: "target changed",
    });
    expect(readFile).not.toHaveBeenCalled();
  });

  it("reports a full-byte verification mismatch after a successful host write", async () => {
    const intended = bytes(4);
    const corrupted = intended.slice();
    corrupted[corrupted.length - 1] ^= 0xff;
    const host = fakeHost({
      readFile: vi.fn(async (): Promise<ReadFileResult> => ({
        status: "ok",
        bytes: corrupted,
        sha256: "corrupted",
      })),
    });

    const result = await executeSaveReplacement(host, {
      kind: "restore",
      targetPath: "~/saves/SlotData_2.dat",
      sourceBytes: intended,
      expectedSourceSha256: "source",
      expectedTargetSha256: "target",
    });

    expect(result).toMatchObject({
      status: "error",
      phase: "verify-target",
      verification: { status: "mismatch", reason: "contents" },
    });
  });

  it("reports a readback failure after the host commits", async () => {
    const host = fakeHost({
      readFile: vi.fn(async (): Promise<ReadFileResult> => ({
        status: "permission",
        path: "~/saves/SlotData_0.dat",
        message: "synthetic readback denial",
      })),
    });

    const result = await executeSaveReplacement(host, {
      kind: "import",
      targetPath: "~/saves/SlotData_0.dat",
      sourceBytes: bytes(5),
      expectedSourceSha256: "source",
      expectedTargetSha256: "target",
    });

    expect(result).toEqual({
      status: "error",
      phase: "verify-target",
      message: "synthetic readback denial",
    });
  });

  it("preserves a backend backup failure and does not attempt readback", async () => {
    const readFile = vi.fn();
    const host = fakeHost({
      safeWrite: vi.fn(async (): Promise<SafeWriteResult> => ({
        status: "backup",
        phase: "backup-target",
        path: "~/saves/SlotData_0.dat",
        message: "synthetic backup failure",
      })),
      readFile,
    });

    const result = await executeSaveReplacement(host, {
      kind: "restore",
      targetPath: "~/saves/SlotData_0.dat",
      sourceBytes: bytes(6),
      expectedSourceSha256: "source",
      expectedTargetSha256: "target",
    });

    expect(result).toMatchObject({
      status: "error",
      phase: "backup-target",
      message: "synthetic backup failure",
    });
    expect(readFile).not.toHaveBeenCalled();
  });
});

describe("prepareSaveReplacement", () => {
  it("rejects a wrong-size import before reading the target", async () => {
    const host = fakeHost();

    const result = await prepareSaveReplacement(host, {
      kind: "import",
      sourcePath: "replacement.dat",
      sourceMtimeMs: 10,
      sourceBytes: new Uint8Array(12),
      targetPath: "~/saves/SlotData_0.dat",
      targetMtimeMs: 20,
    });

    expect(result).toMatchObject({ status: "error", phase: "validate-source" });
    expect(host.readFile).not.toHaveBeenCalled();
  });

  it("rejects a changed backup before reading the target", async () => {
    const source = bytes(2);
    const readFile = vi.fn(async () => ({
      status: "ok" as const,
      bytes: source,
      sha256: "changed-backup-sha",
    }));
    const host = fakeHost({ readFile });

    const result = await prepareSaveReplacement(host, {
      kind: "restore",
      sourcePath: "~/backups/restore.dat",
      sourceMtimeMs: 10,
      expectedSourceSha256: "listed-backup-sha",
      targetPath: "~/saves/SlotData_0.dat",
      targetMtimeMs: 20,
    });

    expect(result).toMatchObject({ status: "error", phase: "validate-source" });
    expect(readFile).toHaveBeenCalledTimes(1);
  });

  it("builds an explicit source-to-target preview with both conflict hashes", async () => {
    const source = bytes(2);
    const target = bytes(3);
    const sourceSha = await sha256SaveBytes(source);
    const readFile = vi
      .fn()
      .mockResolvedValueOnce({ status: "ok", bytes: source, sha256: sourceSha })
      .mockResolvedValueOnce({
        status: "ok",
        bytes: target,
        sha256: "target-sha",
      });
    const host = fakeHost({ readFile });

    const result = await prepareSaveReplacement(host, {
      kind: "restore",
      sourcePath: "~/backups/restore.dat",
      sourceMtimeMs: 10,
      expectedSourceSha256: sourceSha,
      targetPath: "~/saves/SlotData_2.dat",
      targetMtimeMs: 20,
    });

    expect(result).toMatchObject({
      status: "ready",
      preview: {
        status: "ready",
        source: { fileName: "restore.dat" },
        target: { fileName: "SlotData_2.dat" },
      },
      expectedSourceSha256: sourceSha,
      expectedTargetSha256: "target-sha",
    });
  });

  it("isolates source-read and target-read failures before confirmation", async () => {
    const sourceDenied = fakeHost({
      readFile: vi.fn(async (): Promise<ReadFileResult> => ({
        status: "permission",
        path: "~/backups/restore.dat",
        message: "synthetic source denial",
      })),
    });
    await expect(
      prepareSaveReplacement(sourceDenied, {
        kind: "restore",
        sourcePath: "~/backups/restore.dat",
        sourceMtimeMs: 10,
        expectedSourceSha256: "source",
        targetPath: "~/saves/SlotData_0.dat",
        targetMtimeMs: 20,
      }),
    ).resolves.toMatchObject({ status: "error", phase: "read-backup" });

    const targetDenied = fakeHost({
      readFile: vi.fn(async (): Promise<ReadFileResult> => ({
        status: "missing",
        path: "~/saves/SlotData_0.dat",
        message: "synthetic target missing",
      })),
    });
    await expect(
      prepareSaveReplacement(targetDenied, {
        kind: "import",
        sourcePath: "replacement.dat",
        sourceMtimeMs: 10,
        sourceBytes: bytes(8),
        targetPath: "~/saves/SlotData_0.dat",
        targetMtimeMs: 20,
      }),
    ).resolves.toMatchObject({ status: "error", phase: "check-target" });
    expect(targetDenied.safeWriteFile).not.toHaveBeenCalled();
  });
});
