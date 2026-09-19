import { describe, expect, it } from "vitest";
import {
  SAVEFILE_MONEY_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import { getMoney, setMoney } from "./money";
import { load, serialize } from "./slotData";

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

describe("money get/set", () => {
  it("reads money as u32 little-endian from the SlotData placeholder", () => {
    const input = syntheticSave();
    writeU32LE(input, SAVEFILE_MONEY_START_BYTE, 1_234_567);
    const slot = load(input);
    expect(getMoney(slot)).toBe(1_234_567);
  });

  it("writes money as u32 little-endian into a new SlotData placeholder", () => {
    const slot = load(syntheticSave());
    const edited = setMoney(slot, 9_999_999);
    expect(getMoney(edited)).toBe(9_999_999);
    expect(edited.money).toEqual(new Uint8Array([0x7f, 0x96, 0x98, 0x00]));
  });

  it("unedited money round-trip preserves all save bytes", () => {
    const input = syntheticSave();
    writeU32LE(input, SAVEFILE_MONEY_START_BYTE, 42);
    const slot = load(input);
    const untouched = setMoney(slot, getMoney(slot));
    const output = serialize(untouched);
    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(output).toEqual(input);
  });

  it("editing money changes only the 4-byte money region", () => {
    const input = syntheticSave();
    const slot = load(input);
    const edited = setMoney(slot, 0xaabbccdd);
    const output = serialize(edited);

    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(output.subarray(0, SAVEFILE_MONEY_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_MONEY_START_BYTE),
    );
    expect(
      output.subarray(
        SAVEFILE_MONEY_START_BYTE,
        SAVEFILE_MONEY_START_BYTE + 4,
      ),
    ).toEqual(new Uint8Array([0xdd, 0xcc, 0xbb, 0xaa]));
    expect(output.subarray(SAVEFILE_MONEY_START_BYTE + 4)).toEqual(
      input.subarray(SAVEFILE_MONEY_START_BYTE + 4),
    );
  });
});
