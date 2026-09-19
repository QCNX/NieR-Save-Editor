import { describe, expect, it } from "vitest";
import {
  BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_MONEY_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_WEAPON_SLOT_1_START_BYTE,
  SAVEFILE_WEAPON_SLOT_2_START_BYTE,
  SAVEFILE_XP_START_BYTE,
  WEAPON_SLOT_SIZE_BYTES,
} from "./constants";
import { load, serialize, SlotDataSizeError } from "./slotData";

/** Patterned synthetic PC save — not a real player file. */
function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  return bytes;
}

describe("SlotData load/serialize", () => {
  it("rejects input that is not exactly the PC save size", () => {
    expect(() => load(new Uint8Array(0))).toThrow(SlotDataSizeError);
    expect(() => load(new Uint8Array(SAVEFILE_SIZE_BYTES - 1))).toThrow(
      SlotDataSizeError,
    );
    expect(() => load(new Uint8Array(SAVEFILE_SIZE_BYTES + 1))).toThrow(
      SlotDataSizeError,
    );
  });

  it("round-trips an unedited synthetic save byte-identically", () => {
    const input = syntheticSave();
    const output = serialize(load(input));
    expect(output.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(output).toEqual(input);
  });

  it("splits both weapon equipment slots without changing any save byte", () => {
    const input = syntheticSave();
    const slot = load(input);

    expect(SAVEFILE_WEAPON_SLOT_1_START_BYTE).toBe(231156);
    expect(SAVEFILE_WEAPON_SLOT_2_START_BYTE).toBe(231164);
    expect(SAVEFILE_WEAPON_SLOT_2_START_BYTE).toBe(
      SAVEFILE_WEAPON_SLOT_1_START_BYTE + 8,
    );
    expect(slot.weaponSlot1).toEqual(
      input.slice(
        SAVEFILE_WEAPON_SLOT_1_START_BYTE,
        SAVEFILE_WEAPON_SLOT_1_START_BYTE + WEAPON_SLOT_SIZE_BYTES,
      ),
    );
    expect(slot.weaponSlot2).toEqual(
      input.slice(
        SAVEFILE_WEAPON_SLOT_2_START_BYTE,
        SAVEFILE_WEAPON_SLOT_2_START_BYTE + WEAPON_SLOT_SIZE_BYTES,
      ),
    );
    expect(slot.betweenChipsAndWeaponSlots.length).toBe(10744);
    expect(slot.betweenWeaponSlotsAndXp.length).toBe(
      BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
    );
    expect(serialize(slot)).toEqual(input);
  });

  it("separates known field placeholders from unknown blobs for later edits", () => {
    const input = syntheticSave();
    const slot = load(input);

    expect(slot.money.length).toBe(4);
    expect(slot.xp.length).toBe(4);
    expect(slot.inventory.length).toBe(256 * 12);
    expect(slot.weapons.length).toBe(80 * 20);
    expect(slot.podPrograms.length).toBe(32 * 8);
    expect(slot.pluginChips.length).toBe(300 * 48);

    // Marker bytes at known offsets land in the right placeholders.
    expect(slot.money[0]).toBe(input[SAVEFILE_MONEY_START_BYTE]);
    expect(slot.xp[0]).toBe(input[SAVEFILE_XP_START_BYTE]);
    expect(slot.inventory[0]).toBe(input[SAVEFILE_INVENTORY_START_BYTE]);

    // Editing a placeholder must not rewrite unrelated opaque regions.
    const edited = {
      ...slot,
      money: new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]),
    };
    const out = serialize(edited);
    expect(out.subarray(0, SAVEFILE_MONEY_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_MONEY_START_BYTE),
    );
    expect(out.subarray(SAVEFILE_MONEY_START_BYTE, SAVEFILE_MONEY_START_BYTE + 4)).toEqual(
      new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]),
    );
    expect(out.subarray(SAVEFILE_MONEY_START_BYTE + 4)).toEqual(
      input.subarray(SAVEFILE_MONEY_START_BYTE + 4),
    );
  });
});
