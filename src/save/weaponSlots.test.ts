import { describe, expect, it } from "vitest";
import {
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_WEAPON_SLOT_1_START_BYTE,
} from "./constants";
import { load, serialize } from "./slotData";
import {
  EMPTY_WEAPON_SLOT_ID,
  parseWeaponSlot,
  serializeWeaponSlot,
  setWeaponSlotAttack,
  WeaponSlotValueError,
} from "./weaponSlots";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  bytes.set(hexToBytes("ffffffff00000000"), 231156);
  bytes.set(hexToBytes("00000000ffffffff"), 231164);
  return bytes;
}

describe("WeaponSlot parse/serialize", () => {
  it("normalizes both NieREdit EMPTY encodings and preserves their bytes", () => {
    const bytes = hexToBytes("ffffffff00000000");
    const slot = parseWeaponSlot(bytes);

    expect(slot.lightAttack).toBe(EMPTY_WEAPON_SLOT_ID);
    expect(slot.heavyAttack).toBe(EMPTY_WEAPON_SLOT_ID);
    expect(serializeWeaponSlot(slot)).toEqual(bytes);
  });

  it("edits one attack and clears it using the original EMPTY encoding", () => {
    const original = parseWeaponSlot(hexToBytes("ffffffff00000000"));
    const equipped = setWeaponSlotAttack(original, "light", 1070);

    expect(serializeWeaponSlot(equipped)).toEqual(
      hexToBytes("2e04000000000000"),
    );
    expect(
      serializeWeaponSlot(
        setWeaponSlotAttack(equipped, "light", EMPTY_WEAPON_SLOT_ID),
      ),
    ).toEqual(hexToBytes("ffffffff00000000"));
  });

  it("restores zero when a zero-encoded EMPTY attack is equipped then cleared", () => {
    const original = parseWeaponSlot(hexToBytes("00000000ffffffff"));
    const equipped = setWeaponSlotAttack(original, "light", 1070);
    const cleared = setWeaponSlotAttack(
      equipped,
      "light",
      EMPTY_WEAPON_SLOT_ID,
    );

    expect(serializeWeaponSlot(cleared)).toEqual(
      hexToBytes("00000000ffffffff"),
    );
  });

  it("changes only Set 1 light-attack bytes in the full save", () => {
    const input = syntheticSave();
    const slot = load(input);
    const edited = setWeaponSlotAttack(
      parseWeaponSlot(slot.weaponSlot1),
      "light",
      1070,
    );
    const output = serialize({
      ...slot,
      weaponSlot1: serializeWeaponSlot(edited),
    });

    expect(output.subarray(0, SAVEFILE_WEAPON_SLOT_1_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_WEAPON_SLOT_1_START_BYTE),
    );
    expect(
      output.subarray(
        SAVEFILE_WEAPON_SLOT_1_START_BYTE,
        SAVEFILE_WEAPON_SLOT_1_START_BYTE + 4,
      ),
    ).toEqual(hexToBytes("2e040000"));
    expect(output.subarray(SAVEFILE_WEAPON_SLOT_1_START_BYTE + 4)).toEqual(
      input.subarray(SAVEFILE_WEAPON_SLOT_1_START_BYTE + 4),
    );
  });

  it("changes only Set 2 heavy-attack bytes in the full save", () => {
    const input = syntheticSave();
    const slot = load(input);
    const edited = setWeaponSlotAttack(
      parseWeaponSlot(slot.weaponSlot2),
      "heavy",
      1260,
    );
    const output = serialize({
      ...slot,
      weaponSlot2: serializeWeaponSlot(edited),
    });
    const heavyStart = 231168;

    expect(output.subarray(0, heavyStart)).toEqual(
      input.subarray(0, heavyStart),
    );
    expect(output.subarray(heavyStart, heavyStart + 4)).toEqual(
      hexToBytes("ec040000"),
    );
    expect(output.subarray(heavyStart + 4)).toEqual(
      input.subarray(heavyStart + 4),
    );
  });

  it("rejects edits outside NieREdit's signed 32-bit ID range", () => {
    const slot = parseWeaponSlot(hexToBytes("ffffffffffffffff"));

    expect(() =>
      setWeaponSlotAttack(slot, "light", 0x80000000),
    ).toThrow(WeaponSlotValueError);
    expect(() => setWeaponSlotAttack(slot, "heavy", 1.5)).toThrow(
      WeaponSlotValueError,
    );
    expect(() =>
      serializeWeaponSlot({ ...slot, heavyAttack: Number.NaN }),
    ).toThrow(WeaponSlotValueError);
  });
});
