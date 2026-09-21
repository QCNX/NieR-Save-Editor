import {
  SAVEFILE_SIZE_BYTES,
  getCharacterName,
  getPlayTime,
  getXp,
  levelFromXp,
  load,
  type SlotData,
} from "../save";
import type { SlotFile } from "../discovery";
import type { BackupEntry } from "../persist";

export type SaveBytesValidation =
  | { status: "ready"; slot: SlotData }
  | {
      status: "invalid";
      reason: "invalid-size";
      expectedSize: number;
      actualSize: number;
    }
  | { status: "invalid"; reason: "parse-failed" };

/**
 * Validate the complete PC SlotData payload without leaking parser failures.
 * This guarantees the known binary layout parses; opaque bytes are not claimed
 * to have game-level semantic validation.
 */
export function validateSaveBytes(
  bytes: Uint8Array,
  parse: (input: Uint8Array) => SlotData = load,
): SaveBytesValidation {
  if (bytes.length !== SAVEFILE_SIZE_BYTES) {
    return {
      status: "invalid",
      reason: "invalid-size",
      expectedSize: SAVEFILE_SIZE_BYTES,
      actualSize: bytes.length,
    };
  }

  try {
    return { status: "ready", slot: parse(bytes) };
  } catch {
    return { status: "invalid", reason: "parse-failed" };
  }
}

export type SaveIdentity = {
  path: string;
  fileName: string;
  slotNumber: number | null;
  mtimeMs: number;
};

export type ReadySaveSummary = SaveIdentity & {
  status: "ready";
  characterName: string | null;
  level: number;
  playTimeSeconds: number;
};

export type InvalidSaveSummary = SaveIdentity & {
  status: "invalid";
  validation: Exclude<SaveBytesValidation, { status: "ready" }>;
};

export type UnreadableSaveSummary = SaveIdentity & {
  status: "unreadable";
  reason: "read-failed";
};

export type SaveSummary =
  | ReadySaveSummary
  | InvalidSaveSummary
  | UnreadableSaveSummary;

export type SummarizeSaveInput = {
  path: string;
  mtimeMs: number;
  bytes: Uint8Array;
};

function identityFrom(path: string, mtimeMs: number): SaveIdentity {
  const parts = path.split(/[/\\]/);
  const fileName = parts[parts.length - 1] || path;
  const slotMatch = /^SlotData_(\d+)\.dat$/i.exec(fileName);
  const parsedSlot = slotMatch ? Number(slotMatch[1]) : Number.NaN;
  return {
    path,
    fileName,
    slotNumber: Number.isSafeInteger(parsedSlot) ? parsedSlot : null,
    mtimeMs,
  };
}

/** Build display-ready metadata without treating an empty name as corruption. */
export function summarizeSave(input: SummarizeSaveInput): SaveSummary {
  const identity = identityFrom(input.path, input.mtimeMs);
  const validation = validateSaveBytes(input.bytes);
  if (validation.status === "invalid") {
    return { ...identity, status: "invalid", validation };
  }

  const characterName = getCharacterName(validation.slot);
  return {
    ...identity,
    status: "ready",
    characterName: characterName.trim() ? characterName : null,
    level: levelFromXp(getXp(validation.slot)),
    playTimeSeconds: getPlayTime(validation.slot),
  };
}

/** Resolve an unnamed, but otherwise valid, save through caller-localized copy. */
export function characterNameLabel(
  summary: ReadySaveSummary,
  unknownLabel: string,
): string {
  return summary.characterName ?? unknownLabel;
}

export type SaveBytesReader = (path: string) => Promise<Uint8Array>;

/** Preview discovered files independently; one failed read never drops siblings. */
export async function summarizeDiscoveredSaves(
  files: readonly SlotFile[],
  readBytes: SaveBytesReader,
): Promise<SaveSummary[]> {
  return Promise.all(
    files.map(async (file): Promise<SaveSummary> => {
      try {
        const bytes = await readBytes(file.path);
        return summarizeSave({ ...file, bytes });
      } catch {
        return {
          ...identityFrom(file.path, file.mtimeMs),
          status: "unreadable",
          reason: "read-failed",
        };
      }
    }),
  );
}

export type BackupHistoryItem = {
  entry: BackupEntry;
  summary: SaveSummary;
};

/** Parse backup payloads independently and normalize history newest first. */
export async function summarizeBackupHistory(
  entries: readonly BackupEntry[],
  readBytes: SaveBytesReader,
): Promise<BackupHistoryItem[]> {
  const newestFirst = [...entries].sort((left, right) => {
    const byTime = right.mtimeMs - left.mtimeMs;
    return byTime || right.path.localeCompare(left.path);
  });
  return Promise.all(
    newestFirst.map(async (entry): Promise<BackupHistoryItem> => {
      let summary: SaveSummary;
      try {
        const bytes = await readBytes(entry.path);
        summary = summarizeSave({
          path: entry.path,
          mtimeMs: entry.mtimeMs,
          bytes,
        });
      } catch {
        summary = {
          ...identityFrom(entry.path, entry.mtimeMs),
          status: "unreadable",
          reason: "read-failed",
        };
      }
      return { entry, summary };
    }),
  );
}

export type ReplacementPreview =
  | {
      status: "ready";
      source: ReadySaveSummary;
      target: ReadySaveSummary;
    }
  | {
      status: "invalid";
      source: SaveSummary;
      target: SaveSummary;
      invalidSides: ("source" | "target")[];
    };

/** Preserve replacement direction and enable confirmation only for valid peers. */
export function createReplacementPreview(
  source: SaveSummary,
  target: SaveSummary,
): ReplacementPreview {
  if (source.status === "ready" && target.status === "ready") {
    return { status: "ready", source, target };
  }

  const invalidSides: ("source" | "target")[] = [];
  if (source.status !== "ready") invalidSides.push("source");
  if (target.status !== "ready") invalidSides.push("target");
  return { status: "invalid", source, target, invalidSides };
}

export type SaveByteVerification =
  | { status: "verified" }
  | {
      status: "mismatch";
      reason: "length";
      expectedSize: number;
      actualSize: number;
    }
  | {
      status: "mismatch";
      reason: "contents";
      mismatchIndex: number;
    };

/** Verify a committed save by equality of every byte, not file metadata. */
export function verifySaveBytes(
  intended: Uint8Array,
  reread: Uint8Array,
): SaveByteVerification {
  if (intended.length !== reread.length) {
    return {
      status: "mismatch",
      reason: "length",
      expectedSize: intended.length,
      actualSize: reread.length,
    };
  }

  for (let index = 0; index < intended.length; index += 1) {
    if (intended[index] !== reread[index]) {
      return { status: "mismatch", reason: "contents", mismatchIndex: index };
    }
  }
  return { status: "verified" };
}
