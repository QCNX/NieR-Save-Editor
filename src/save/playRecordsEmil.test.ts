import { describe, expect, it } from "vitest";

import {
  SAVEFILE_PLAY_RECORDS_START_BYTE,
  SAVEFILE_EMIL_BULLETS_EQUIPPED_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  EmilBulletsSizeError,
  EmilBulletsValueError,
  parseEmilBulletsEquipped,
  parsePlayRecords,
  PlayRecordsSizeError,
  PlayRecordsValueError,
  serializeEmilBulletsEquipped,
  serializePlayRecords,
  setEmilBulletsEquipped,
  setPlayRecordCounter,
  type EmilBulletsEquipped,
} from "./playRecordsEmil";
import { load, serialize } from "./slotData";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index++) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

describe("Play Records and Emil bullets", () => {
  it("parses the exact seven signed little-endian Play Records counters", () => {
    const bytes = hexToBytes(
      "01000000020000000300000004000000050000000600000007000000",
    );

    const records = parsePlayRecords(bytes);

    expect(records).toEqual({
      itemsUsed: 1,
      itemsHarvested: 2,
      hackingGamesCompleted: 3,
      deaths: 4,
      opaqueCounterAtByte16: 5,
      opaqueCounterAtByte20: 6,
      enemiesKilled: 7,
    });
    expect(serializePlayRecords(records)).toEqual(bytes);
  });

  it("changes only the selected Play Records counter in a full save", () => {
    const input = new Uint8Array(SAVEFILE_SIZE_BYTES);
    for (let index = 0; index < input.length; index++) {
      input[index] = (index * 31 + 17) % 256;
    }
    input.set(
      hexToBytes(
        "01000000020000000300000004000000050000000600000007000000",
      ),
      SAVEFILE_PLAY_RECORDS_START_BYTE,
    );
    const slot = load(input);
    const records = setPlayRecordCounter(
      parsePlayRecords(slot.playRecords),
      "hackingGamesCompleted",
      0x12345678,
    );
    const output = serialize({
      ...slot,
      playRecords: serializePlayRecords(records),
    });
    const changedStart = 230752;

    expect(output.subarray(0, changedStart)).toEqual(
      input.subarray(0, changedStart),
    );
    expect(output.subarray(changedStart, changedStart + 4)).toEqual(
      hexToBytes("78563412"),
    );
    expect(output.subarray(changedStart + 4)).toEqual(
      input.subarray(changedStart + 4),
    );
  });

  it("maps Emil values 0 and 1 while preserving an unknown raw byte", () => {
    expect(parseEmilBulletsEquipped(hexToBytes("00"))).toEqual({
      equipped: false,
      rawValue: 0,
    });
    expect(parseEmilBulletsEquipped(hexToBytes("01"))).toEqual({
      equipped: true,
      rawValue: 1,
    });

    const unknown = parseEmilBulletsEquipped(hexToBytes("7f"));
    expect(unknown).toEqual({ equipped: null, rawValue: 0x7f });
    expect(serializeEmilBulletsEquipped(unknown)).toEqual(hexToBytes("7f"));
  });

  it("rejects a manually constructed Emil state whose boolean conflicts with its byte", () => {
    expect(() =>
      serializeEmilBulletsEquipped(
        { equipped: true, rawValue: 0 } as unknown as EmilBulletsEquipped,
      ),
    ).toThrow(EmilBulletsValueError);
    expect(() =>
      serializeEmilBulletsEquipped(
        { equipped: null, rawValue: 1 } as unknown as EmilBulletsEquipped,
      ),
    ).toThrow(EmilBulletsValueError);
  });

  it("rejects invalid region sizes and out-of-range Play Records edits", () => {
    expect(() => parsePlayRecords(new Uint8Array(27))).toThrow(
      PlayRecordsSizeError,
    );
    expect(() => parseEmilBulletsEquipped(new Uint8Array(2))).toThrow(
      EmilBulletsSizeError,
    );
    const records = parsePlayRecords(new Uint8Array(28));
    expect(() =>
      setPlayRecordCounter(records, "deaths", 0x80000000),
    ).toThrow(PlayRecordsValueError);
  });

  it("changes only the Emil bullets byte in a full save", () => {
    const input = new Uint8Array(SAVEFILE_SIZE_BYTES);
    for (let index = 0; index < input.length; index++) {
      input[index] = (index * 31 + 17) % 256;
    }
    input[SAVEFILE_EMIL_BULLETS_EQUIPPED_BYTE] = 0x7f;
    const slot = load(input);
    const edited = setEmilBulletsEquipped(true);
    const output = serialize({
      ...slot,
      emilBulletsEquipped: serializeEmilBulletsEquipped(edited),
    });
    const changedByte = 231039;

    expect(output.subarray(0, changedByte)).toEqual(
      input.subarray(0, changedByte),
    );
    expect(output[changedByte]).toBe(1);
    expect(output.subarray(changedByte + 1)).toEqual(
      input.subarray(changedByte + 1),
    );
  });
});
