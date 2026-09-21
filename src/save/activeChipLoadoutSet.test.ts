import { describe, expect, it } from "vitest";

import {
  SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  ACTIVE_CHIP_LOADOUT_SET_SUPPORTED,
  ActiveChipLoadoutSetInvalidError,
  getActiveChipLoadoutSet,
  setActiveChipLoadoutSet,
} from "./activeChipLoadoutSet";
import { load, serialize } from "./slotData";

/** Patterned synthetic PC save — not a real player file. */
function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  return bytes;
}

function writeI32LE(bytes: Uint8Array, offset: number, value: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setInt32(offset, value, true);
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getInt32(offset, true);
}

describe("active chip loadout set", () => {
  it("exposes supported get/set for the verified SlotData offset", () => {
    expect(ACTIVE_CHIP_LOADOUT_SET_SUPPORTED).toBe(true);
    expect(SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE).toBe(0x324b4);
  });

  it("reads A|B|C from the i32 LE at 0x324B4", () => {
    const input = syntheticSave();
    writeI32LE(input, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE, 0);
    expect(getActiveChipLoadoutSet(load(input))).toBe("A");

    writeI32LE(input, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE, 1);
    expect(getActiveChipLoadoutSet(load(input))).toBe("B");

    writeI32LE(input, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE, 2);
    expect(getActiveChipLoadoutSet(load(input))).toBe("C");
  });

  it("writes A|B|C without changing unrelated SlotData bytes", () => {
    const input = syntheticSave();
    const slot = load(input);
    const edited = setActiveChipLoadoutSet(slot, "B");
    expect(getActiveChipLoadoutSet(edited)).toBe("B");

    const output = serialize(edited);
    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(readI32LE(output, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE)).toBe(
      1,
    );
    expect(
      output.subarray(0, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE),
    ).toEqual(input.subarray(0, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE));
    expect(
      output.subarray(SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE + 4),
    ).toEqual(input.subarray(SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE + 4));
  });

  it("round-trips each set on a synthetic full save", () => {
    for (const [set, ordinal] of [
      ["A", 0],
      ["B", 1],
      ["C", 2],
    ] as const) {
      const input = syntheticSave();
      const edited = setActiveChipLoadoutSet(load(input), set);
      expect(getActiveChipLoadoutSet(edited)).toBe(set);
      expect(
        readI32LE(serialize(edited), SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE),
      ).toBe(ordinal);
    }
  });

  it("rejects stored values outside 0|1|2", () => {
    const input = syntheticSave();
    writeI32LE(input, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE, 3);
    expect(() => getActiveChipLoadoutSet(load(input))).toThrow(
      ActiveChipLoadoutSetInvalidError,
    );

    writeI32LE(input, SAVEFILE_ACTIVE_CHIP_LOADOUT_SET_START_BYTE, -1);
    expect(() => getActiveChipLoadoutSet(load(input))).toThrow(
      ActiveChipLoadoutSetInvalidError,
    );
  });
});
