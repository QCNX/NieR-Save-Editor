import { describe, expect, it } from "vitest";

import {
  CHARACTER_NAME_SIZE_BYTES,
  SAVEFILE_CHARACTER_NAME_START_BYTE,
  SAVEFILE_DEBUG_FLAG_START_BYTE,
  SAVEFILE_PLAY_TIME_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_STEAM_ID_START_BYTE,
} from "./constants";
import {
  DEBUG_FLAG_VALUES,
  GeneralCoreValueError,
  getCharacterName,
  getDebugFlag,
  getPlayTime,
  getSteamId,
  setCharacterName,
  setDebugFlag,
  setPlayTime,
  setSteamId,
} from "./generalCore";
import { load, serialize } from "./slotData";

function syntheticSave(): Uint8Array {
  return Uint8Array.from(
    { length: SAVEFILE_SIZE_BYTES },
    (_, index) => (index * 47 + 23) & 0xff,
  );
}

function expectOnlyRegionChanged(
  before: Uint8Array,
  after: Uint8Array,
  start: number,
  length: number,
): void {
  expect(after.slice(0, start)).toEqual(before.slice(0, start));
  expect(after.slice(start + length)).toEqual(before.slice(start + length));
  expect(after.slice(start, start + length)).not.toEqual(
    before.slice(start, start + length),
  );
}

describe("General core fields", () => {
  it("reads and writes SteamID as an exact unsigned 64-bit little-endian value", () => {
    const input = syntheticSave();
    const edited = setSteamId(load(input), 0xffffffffffffffffn);

    expect(getSteamId(edited)).toBe(0xffffffffffffffffn);
    const output = serialize(edited);
    expect(output.slice(4, 12)).toEqual(
      new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
    );
    expectOnlyRegionChanged(input, output, SAVEFILE_STEAM_ID_START_BYTE, 8);
    expect(() => setSteamId(edited, -1n)).toThrow(GeneralCoreValueError);
    expect(() => setSteamId(edited, 0x10000000000000000n)).toThrow(
      GeneralCoreValueError,
    );
  });

  it("reads and writes play time as signed i32 seconds", () => {
    const input = syntheticSave();
    const edited = setPlayTime(load(input), -0x80000000);

    expect(getPlayTime(edited)).toBe(-0x80000000);
    const output = serialize(edited);
    expect(output.slice(36, 40)).toEqual(new Uint8Array([0, 0, 0, 0x80]));
    expectOnlyRegionChanged(input, output, SAVEFILE_PLAY_TIME_START_BYTE, 4);
    expect(() => setPlayTime(edited, 0x80000000)).toThrow(
      GeneralCoreValueError,
    );
    expect(() => setPlayTime(edited, 1.5)).toThrow(GeneralCoreValueError);
  });

  it("reads to the first UTF-16LE terminator and zero-fills a changed name", () => {
    const input = syntheticSave();
    const view = new DataView(input.buffer);
    view.setUint16(SAVEFILE_CHARACTER_NAME_START_BYTE, "A".charCodeAt(0), true);
    view.setUint16(SAVEFILE_CHARACTER_NAME_START_BYTE + 2, 0, true);
    view.setUint16(
      SAVEFILE_CHARACTER_NAME_START_BYTE + 4,
      "Z".charCodeAt(0),
      true,
    );
    expect(getCharacterName(load(input))).toBe("A");

    const output = serialize(setCharacterName(load(input), "2B"));
    expect(output.slice(52, 60)).toEqual(
      new Uint8Array([0x32, 0, 0x42, 0, 0, 0, 0, 0]),
    );
    expect(output.slice(58, 122)).toEqual(new Uint8Array(64));
    expectOnlyRegionChanged(
      input,
      output,
      SAVEFILE_CHARACTER_NAME_START_BYTE,
      CHARACTER_NAME_SIZE_BYTES,
    );
  });

  it("truncates a changed name to 34 UTF-16 code units without splitting a surrogate pair", () => {
    const input = syntheticSave();
    const edited = setCharacterName(load(input), `${"A".repeat(33)}😀tail`);
    const output = serialize(edited);

    expect(getCharacterName(load(output))).toBe("A".repeat(33));
    expect(output.slice(52 + 66, 52 + 70)).toEqual(new Uint8Array(4));
  });

  it("preserves unknown Debug Flag bytes but only writes NieREdit-known values", () => {
    const input = syntheticSave();
    input[SAVEFILE_DEBUG_FLAG_START_BYTE] = 0xaa;
    const parsed = load(input);

    expect(getDebugFlag(parsed)).toBe(0xaa);
    expect(DEBUG_FLAG_VALUES).toEqual([0x00, 0x0b, 0x07, 0x0f]);

    const output = serialize(setDebugFlag(parsed, 0x0f));
    expect(output[SAVEFILE_DEBUG_FLAG_START_BYTE]).toBe(0x0f);
    expectOnlyRegionChanged(input, output, SAVEFILE_DEBUG_FLAG_START_BYTE, 1);
    expect(() => setDebugFlag(parsed, 0xaa)).toThrow(GeneralCoreValueError);
  });
});
