import { describe, expect, it } from "vitest";
import {
  SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  decodePurchasedCapacity,
  encodePurchasedCapacity,
  getPurchasedChipCapacity,
  PURCHASED_CAPACITY_OPTIONS,
  setPurchasedChipCapacity,
} from "./purchasedCapacity";
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

describe("purchased capacity decode", () => {
  it("decodes mask 0 to base capacity 40", () => {
    expect(decodePurchasedCapacity(0)).toBe(40);
  });

  it("decodes progressive +8 masks and documented checkpoints", () => {
    expect(decodePurchasedCapacity(0x01)).toBe(48);
    expect(decodePurchasedCapacity(0x03)).toBe(56);
    expect(decodePurchasedCapacity(0x07)).toBe(64);
    expect(decodePurchasedCapacity(0x0f)).toBe(72);
    expect(decodePurchasedCapacity(0x2f)).toBe(88);
    expect(decodePurchasedCapacity(0x6f)).toBe(104);
    expect(decodePurchasedCapacity(0xef)).toBe(128);
  });
});

describe("purchased capacity encode", () => {
  it("encodes base capacity 40 as mask 0", () => {
    expect(encodePurchasedCapacity(40)).toBe(0);
  });

  it("prefers small tiers when encoding progressive capacities", () => {
    expect(encodePurchasedCapacity(48)).toBe(0x01);
    expect(encodePurchasedCapacity(56)).toBe(0x03);
    expect(encodePurchasedCapacity(64)).toBe(0x07);
    expect(encodePurchasedCapacity(72)).toBe(0x0f);
    expect(encodePurchasedCapacity(80)).toBe(0x27); // 3×+8 + 1×+16
    expect(encodePurchasedCapacity(88)).toBe(0x2f);
    expect(encodePurchasedCapacity(96)).toBe(0x67); // 3×+8 + 2×+16
    expect(encodePurchasedCapacity(104)).toBe(0x6f);
    expect(encodePurchasedCapacity(112)).toBe(0xaf); // 4×+8 + 1×+16 + 1×+24
    expect(encodePurchasedCapacity(120)).toBe(0xe7); // 3×+8 + 2×+16 + 1×+24
    expect(encodePurchasedCapacity(128)).toBe(0xef);
  });

  it("never sets bit4 and stays within 0xEF semantics", () => {
    for (const capacity of PURCHASED_CAPACITY_OPTIONS) {
      const mask = encodePurchasedCapacity(capacity);
      expect(mask & (1 << 4)).toBe(0);
      expect(mask).toBeLessThanOrEqual(0xef);
      expect(decodePurchasedCapacity(mask)).toBe(capacity);
    }
  });

  it("clamps out-of-range capacity without writing bit4", () => {
    expect(encodePurchasedCapacity(30)).toBe(0);
    expect(encodePurchasedCapacity(200)).toBe(0xef);
    expect(encodePurchasedCapacity(45)).toBe(0x01); // nearest option 48
    expect(encodePurchasedCapacity(44)).toBe(0); // nearest option 40
  });
});

describe("purchased capacity options", () => {
  it("lists deduped capacities from 40 to 128 step 8", () => {
    expect(PURCHASED_CAPACITY_OPTIONS).toEqual([
      40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128,
    ]);
  });
});

describe("purchased capacity SlotData get/set", () => {
  it("reads capacity from the i32 mask at 0x324B8", () => {
    const input = syntheticSave();
    writeI32LE(input, SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE, 0x2f);
    const slot = load(input);
    expect(getPurchasedChipCapacity(slot)).toBe(88);
  });

  it("writes capacity as prefer-small-tier mask and preserves other bytes", () => {
    const input = syntheticSave();
    const slot = load(input);
    const edited = setPurchasedChipCapacity(slot, 104);
    expect(getPurchasedChipCapacity(edited)).toBe(104);

    const output = serialize(edited);
    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(output.subarray(0, SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE),
    );
    expect(
      output.subarray(
        SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE,
        SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE + 4,
      ),
    ).toEqual(new Uint8Array([0x6f, 0x00, 0x00, 0x00]));
    expect(output.subarray(SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE + 4)).toEqual(
      input.subarray(SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE + 4),
    );
  });

  it("round-trips unedited capacity byte-identically", () => {
    const input = syntheticSave();
    writeI32LE(input, SAVEFILE_PURCHASED_CHIP_CAPACITY_START_BYTE, 0xef);
    const slot = load(input);
    const untouched = setPurchasedChipCapacity(
      slot,
      getPurchasedChipCapacity(slot),
    );
    expect(serialize(untouched)).toEqual(input);
  });
});
