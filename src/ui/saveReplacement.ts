import type {
  ManagedFailure,
  ManagedPhase,
  SaveManagementHost,
} from "../persist";
import {
  createReplacementPreview,
  summarizeSave,
  validateSaveBytes,
  verifySaveBytes,
  type ReadySaveSummary,
  type ReplacementPreview,
  type SaveByteVerification,
} from "./saveSummary";

export type ReplacementKind = "restore" | "import";

export type SaveReplacementPreview = {
  kind: ReplacementKind;
  source: ReadySaveSummary;
  target: ReadySaveSummary;
  targetDirty: boolean;
};

export type ExecuteSaveReplacementInput = {
  kind: ReplacementKind;
  targetPath: string;
  sourceBytes: Uint8Array;
  expectedSourceSha256: string;
  expectedTargetSha256: string;
};

export type PrepareSaveReplacementInput =
  | {
      kind: "restore";
      sourcePath: string;
      sourceMtimeMs: number;
      expectedSourceSha256: string;
      targetPath: string;
      targetMtimeMs: number;
    }
  | {
      kind: "import";
      sourcePath: string;
      sourceMtimeMs: number;
      sourceBytes: Uint8Array;
      targetPath: string;
      targetMtimeMs: number;
    };

export type ReplacementUiPhase = ManagedPhase | "read-backup";
export type ReplacementFailureStatus = ManagedFailure["status"];

export type PreparedSaveReplacement = {
  status: "ready";
  kind: ReplacementKind;
  preview: Extract<ReplacementPreview, { status: "ready" }>;
  sourceBytes: Uint8Array;
  expectedSourceSha256: string;
  expectedTargetSha256: string;
};

export type PrepareSaveReplacementResult =
  | PreparedSaveReplacement
  | {
      status: "error";
      phase: ReplacementUiPhase;
      failureStatus: ReplacementFailureStatus;
      message: string;
    };

export type SaveReplacementResult =
  | {
      status: "ok";
      path: string;
      backupPath: string;
      bytes: Uint8Array;
      sha256?: string;
    }
  | {
      status: "error";
      phase: ManagedPhase;
      failureStatus: ReplacementFailureStatus;
      message: string;
      verification?: SaveByteVerification;
    };

export async function sha256SaveBytes(bytes: Uint8Array): Promise<string> {
  const source = new Uint8Array(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export async function prepareSaveReplacement(
  host: SaveManagementHost,
  input: PrepareSaveReplacementInput,
): Promise<PrepareSaveReplacementResult> {
  let sourceBytes: Uint8Array;
  let expectedSourceSha256: string;

  if (input.kind === "restore") {
    const sourceRead = await host.readFile(input.sourcePath);
    if (sourceRead.status !== "ok") {
      return {
        status: "error",
        phase: "read-backup",
        failureStatus: sourceRead.status,
        message: sourceRead.message,
      };
    }
    sourceBytes = sourceRead.bytes;
    const actualSourceSha256 =
      sourceRead.sha256 ?? (await sha256SaveBytes(sourceBytes));
    if (actualSourceSha256 !== input.expectedSourceSha256) {
      return {
        status: "error",
        phase: "validate-source",
        failureStatus: "integrity",
        message: "replacement.error.sourceChanged",
      };
    }
    expectedSourceSha256 = input.expectedSourceSha256;
  } else {
    sourceBytes = input.sourceBytes;
    const validation = validateSaveBytes(sourceBytes);
    if (validation.status !== "ready") {
      return {
        status: "error",
        phase: "validate-source",
        failureStatus: "invalid-size",
        message: "replacement.error.invalidSource",
      };
    }
    expectedSourceSha256 = await sha256SaveBytes(sourceBytes);
  }

  const source = summarizeSave({
    path: input.sourcePath,
    mtimeMs: input.sourceMtimeMs,
    bytes: sourceBytes,
  });
  if (source.status !== "ready") {
    return {
      status: "error",
      phase: "validate-source",
      failureStatus: "invalid-size",
      message: "replacement.error.invalidSource",
    };
  }

  const targetRead = await host.readFile(input.targetPath);
  if (targetRead.status !== "ok") {
    return {
      status: "error",
      phase: "check-target",
      failureStatus: targetRead.status,
      message: targetRead.message,
    };
  }
  const target = summarizeSave({
    path: input.targetPath,
    mtimeMs: input.targetMtimeMs,
    bytes: targetRead.bytes,
  });
  const preview = createReplacementPreview(source, target);
  if (preview.status !== "ready") {
    return {
      status: "error",
      phase: "check-target",
      failureStatus: "invalid-size",
      message: "replacement.error.invalidTarget",
    };
  }
  const expectedTargetSha256 =
    targetRead.sha256 ?? (await sha256SaveBytes(targetRead.bytes));
  return {
    status: "ready",
    kind: input.kind,
    preview,
    sourceBytes,
    expectedSourceSha256,
    expectedTargetSha256,
  };
}

/**
 * Execute one already-previewed replacement. The host owns backup + atomic
 * commit; this seam independently validates the source and verifies readback.
 */
export async function executeSaveReplacement(
  host: SaveManagementHost,
  input: ExecuteSaveReplacementInput,
): Promise<SaveReplacementResult> {
  const validation = validateSaveBytes(input.sourceBytes);
  if (validation.status !== "ready") {
    return {
      status: "error",
      phase: "validate-source",
      failureStatus: "invalid-size",
      message: "replacement.error.invalidSource",
    };
  }

  const written = await host.safeWriteFile({
    targetPath: input.targetPath,
    bytes: input.sourceBytes,
    reason: input.kind === "restore" ? "before-restore" : "before-import",
    expectedSourceSha256: input.expectedSourceSha256,
    expectedTargetSha256: input.expectedTargetSha256,
  });
  if (written.status !== "ok") {
    return {
      status: "error",
      phase: written.phase,
      failureStatus: written.status,
      message: written.message,
    };
  }

  const reread = await host.readFile(input.targetPath);
  if (reread.status !== "ok") {
    return {
      status: "error",
      phase: "verify-target",
      failureStatus: reread.status,
      message: reread.message,
    };
  }
  const verification = verifySaveBytes(input.sourceBytes, reread.bytes);
  if (verification.status !== "verified") {
    return {
      status: "error",
      phase: "verify-target",
      failureStatus: "verify",
      message: "replacement.error.verificationMismatch",
      verification,
    };
  }
  return {
    status: "ok",
    path: input.targetPath,
    backupPath: written.backup.path,
    bytes: reread.bytes,
    sha256: reread.sha256 ?? written.sha256,
  };
}
