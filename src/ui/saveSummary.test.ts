import { describe, expect, it } from "vitest";

import {
  SAVEFILE_SIZE_BYTES,
  load,
  serialize,
  setCharacterName,
  setPlayTime,
  setXp,
  xpForLevel,
} from "../save";
import {
  characterNameLabel,
  createReplacementPreview,
  summarizeDiscoveredSaves,
  summarizeSave,
  validateSaveBytes,
  verifySaveBytes,
} from "./saveSummary";

function syntheticSave(
  characterName: string,
  level: number,
  playTimeSeconds: number,
): Uint8Array {
  let slot = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
  slot = setCharacterName(slot, characterName);
  slot = setXp(slot, xpForLevel(level) ?? 0);
  slot = setPlayTime(slot, playTimeSeconds);
  return serialize(slot);
}

describe("validateSaveBytes", () => {
  it("rejects bytes that are not the exact PC SlotData size", () => {
    expect(validateSaveBytes(new Uint8Array(SAVEFILE_SIZE_BYTES - 1))).toEqual({
      status: "invalid",
      reason: "invalid-size",
      expectedSize: SAVEFILE_SIZE_BYTES,
      actualSize: SAVEFILE_SIZE_BYTES - 1,
    });
  });

  it("returns the fully parsed slot for an exact-size payload", () => {
    const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
    const result = validateSaveBytes(bytes);

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.slot).toEqual(load(bytes));
    }
  });
});

describe("summarizeDiscoveredSaves", () => {
  it("isolates one read failure so other discovered slot cards stay ready", async () => {
    const files = [
      { path: "~/saves/SlotData_0.dat", mtimeMs: 10 },
      { path: String.raw`C:\Saves\SlotData_1.dat`, mtimeMs: 20 },
    ];

    const summaries = await summarizeDiscoveredSaves(files, async (path) => {
      if (path.endsWith("SlotData_0.dat")) {
        return syntheticSave("9S", 12, 720);
      }
      throw new Error("synthetic read failure");
    });

    expect(summaries[0]).toMatchObject({
      status: "ready",
      fileName: "SlotData_0.dat",
      characterName: "9S",
    });
    expect(summaries[1]).toEqual({
      status: "unreadable",
      path: String.raw`C:\Saves\SlotData_1.dat`,
      fileName: "SlotData_1.dat",
      slotNumber: 1,
      mtimeMs: 20,
      message: "synthetic read failure",
    });
  });
});

describe("summarizeSave", () => {
  it("derives concise identity and player details from a Windows slot path", () => {
    const summary = summarizeSave({
      path: String.raw`C:\Games\NieR_Automata\SlotData_2.dat`,
      mtimeMs: 1_700_000_000_000,
      bytes: syntheticSave("2B", 30, 3_661),
    });

    expect(summary).toEqual({
      status: "ready",
      path: String.raw`C:\Games\NieR_Automata\SlotData_2.dat`,
      fileName: "SlotData_2.dat",
      slotNumber: 2,
      mtimeMs: 1_700_000_000_000,
      characterName: "2B",
      level: 30,
      playTimeSeconds: 3_661,
    });
  });

  it("keeps an unnamed POSIX save ready and lets the caller localize its label", () => {
    const summary = summarizeSave({
      path: "~/saves/export.dat",
      mtimeMs: 42,
      bytes: syntheticSave("", 1, 0),
    });

    expect(summary.status).toBe("ready");
    expect(summary.fileName).toBe("export.dat");
    expect(summary.slotNumber).toBeNull();
    if (summary.status === "ready") {
      expect(summary.characterName).toBeNull();
      expect(characterNameLabel(summary, "未知")).toBe("未知");
      expect(characterNameLabel(summary, "Unknown")).toBe("Unknown");
    }
  });

  it("returns an invalid summary without throwing for a wrong-size source", () => {
    expect(
      summarizeSave({
        path: "~/saves/SlotData_7.dat",
        mtimeMs: 99,
        bytes: new Uint8Array(0),
      }),
    ).toEqual({
      status: "invalid",
      path: "~/saves/SlotData_7.dat",
      fileName: "SlotData_7.dat",
      slotNumber: 7,
      mtimeMs: 99,
      validation: {
        status: "invalid",
        reason: "invalid-size",
        expectedSize: SAVEFILE_SIZE_BYTES,
        actualSize: 0,
      },
    });
  });
});

describe("createReplacementPreview", () => {
  it("states source and target but refuses readiness when either save is invalid", () => {
    const source = summarizeSave({
      path: "~/imports/replacement.dat",
      mtimeMs: 30,
      bytes: new Uint8Array(8),
    });
    const target = summarizeSave({
      path: "~/saves/SlotData_0.dat",
      mtimeMs: 40,
      bytes: syntheticSave("A2", 45, 9_000),
    });

    expect(createReplacementPreview(source, target)).toEqual({
      status: "invalid",
      source,
      target,
      invalidSides: ["source"],
    });
  });

  it("becomes ready only when both explicitly named sides are valid", () => {
    const source = summarizeSave({
      path: "~/backups/SlotData_1-before-save.dat",
      mtimeMs: 50,
      bytes: syntheticSave("9S", 20, 5_000),
    });
    const target = summarizeSave({
      path: "~/saves/SlotData_1.dat",
      mtimeMs: 60,
      bytes: syntheticSave("A2", 40, 8_000),
    });

    expect(createReplacementPreview(source, target)).toEqual({
      status: "ready",
      source,
      target,
    });
  });
});

describe("verifySaveBytes", () => {
  it("detects same-length corruption by comparing the complete payload", () => {
    const intended = syntheticSave("2B", 30, 3_661);
    const reread = intended.slice();
    reread[reread.length - 1] ^= 0xff;

    expect(verifySaveBytes(intended, reread)).toEqual({
      status: "mismatch",
      reason: "contents",
      mismatchIndex: SAVEFILE_SIZE_BYTES - 1,
    });
  });

  it("distinguishes exact equality and truncated readback", () => {
    const intended = syntheticSave("2B", 30, 3_661);

    expect(verifySaveBytes(intended, intended.slice())).toEqual({
      status: "verified",
    });
    expect(
      verifySaveBytes(intended, intended.subarray(0, intended.length - 1)),
    ).toEqual({
      status: "mismatch",
      reason: "length",
      expectedSize: SAVEFILE_SIZE_BYTES,
      actualSize: SAVEFILE_SIZE_BYTES - 1,
    });
  });
});
