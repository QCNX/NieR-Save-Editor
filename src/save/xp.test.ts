import { describe, expect, it } from "vitest";
import {
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_XP_START_BYTE,
} from "./constants";
import { levelFromXp, xpForLevel } from "./level";
import { load, serialize } from "./slotData";
import { getXp, setXp } from "./xp";
import { XP_TABLE } from "./xpTable";

/** Patterned synthetic PC save — not a real player file. */
function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  return bytes;
}

function writeU32LE(bytes: Uint8Array, offset: number, value: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(offset, value >>> 0, true);
}

describe("xp get/set", () => {
  it("reads experience as u32 little-endian from the SlotData placeholder", () => {
    const input = syntheticSave();
    writeU32LE(input, SAVEFILE_XP_START_BYTE, 55412);
    const slot = load(input);
    expect(getXp(slot)).toBe(55412);
  });

  it("writes experience as u32 little-endian into a new SlotData placeholder", () => {
    const slot = load(syntheticSave());
    const edited = setXp(slot, 1235211);
    expect(getXp(edited)).toBe(1235211);
    expect(edited.xp).toEqual(new Uint8Array([0x0b, 0xd9, 0x12, 0x00]));
  });

  it("unedited experience round-trip preserves all save bytes", () => {
    const input = syntheticSave();
    writeU32LE(input, SAVEFILE_XP_START_BYTE, 3184);
    const slot = load(input);
    const untouched = setXp(slot, getXp(slot));
    const output = serialize(untouched);
    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(output).toEqual(input);
  });

  it("editing experience changes only the 4-byte xp region", () => {
    const input = syntheticSave();
    const slot = load(input);
    const edited = setXp(slot, 0x11223344);
    const output = serialize(edited);

    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(output.subarray(0, SAVEFILE_XP_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_XP_START_BYTE),
    );
    expect(
      output.subarray(SAVEFILE_XP_START_BYTE, SAVEFILE_XP_START_BYTE + 4),
    ).toEqual(new Uint8Array([0x44, 0x33, 0x22, 0x11]));
    expect(output.subarray(SAVEFILE_XP_START_BYTE + 4)).toEqual(
      input.subarray(SAVEFILE_XP_START_BYTE + 4),
    );
  });
});

describe("levelFromXp", () => {
  it("matches NieREdit XP_TABLE thresholds at exact level boundaries", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(48)).toBe(2);
    expect(levelFromXp(47)).toBe(1);
    expect(levelFromXp(55412)).toBe(30);
    expect(levelFromXp(1235211)).toBe(99);
    expect(levelFromXp(1235210)).toBe(98);
    expect(levelFromXp(2_000_000)).toBe(99);
  });

  it("xpForLevel returns the table threshold used when setting level", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(30)).toBe(55412);
    expect(xpForLevel(99)).toBe(1235211);
    expect(xpForLevel(100)).toBeUndefined();
  });

  it("XP_TABLE covers levels 1 through 99", () => {
    expect(Object.keys(XP_TABLE).length).toBe(99);
    expect(XP_TABLE[1]).toBe(0);
    expect(XP_TABLE[99]).toBe(1235211);
  });
});
