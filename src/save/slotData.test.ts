import { describe, expect, it } from "vitest";
import {
  CHARACTER_NAME_SIZE_BYTES,
  DEBUG_FLAG_SIZE_BYTES,
  BETWEEN_XP_AND_POD_CONFIG_SIZE_BYTES,
  BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
  PLAY_TIME_SIZE_BYTES,
  PLAY_RECORDS_SIZE_BYTES,
  POD_CONFIG_SIZE_BYTES,
  SAVEFILE_CHARACTER_NAME_START_BYTE,
  SAVEFILE_DEBUG_FLAG_START_BYTE,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_MONEY_START_BYTE,
  SAVEFILE_PLAY_TIME_START_BYTE,
  SAVEFILE_PLAY_RECORDS_START_BYTE,
  SAVEFILE_EMIL_BULLETS_EQUIPPED_BYTE,
  SAVEFILE_POD_CONFIG_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_STEAM_ID_START_BYTE,
  SAVEFILE_WEAPON_SLOT_1_START_BYTE,
  SAVEFILE_WEAPON_SLOT_2_START_BYTE,
  SAVEFILE_XP_START_BYTE,
  STEAM_ID_SIZE_BYTES,
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

  it("splits General fields at their frozen literal offsets without byte drift", () => {
    const input = syntheticSave();
    const slot = load(input);

    expect(SAVEFILE_STEAM_ID_START_BYTE).toBe(4);
    expect(STEAM_ID_SIZE_BYTES).toBe(8);
    expect(SAVEFILE_PLAY_TIME_START_BYTE).toBe(36);
    expect(PLAY_TIME_SIZE_BYTES).toBe(4);
    expect(SAVEFILE_CHARACTER_NAME_START_BYTE).toBe(52);
    expect(CHARACTER_NAME_SIZE_BYTES).toBe(70);
    expect(SAVEFILE_DEBUG_FLAG_START_BYTE).toBe(234775);
    expect(DEBUG_FLAG_SIZE_BYTES).toBe(1);

    expect(slot.steamId).toEqual(input.slice(4, 12));
    expect(slot.beforeSteamId.length).toBe(4);
    expect(slot.betweenSteamIdAndPlayTime.length).toBe(24);
    expect(slot.playTime).toEqual(input.slice(36, 40));
    expect(slot.betweenPlayTimeAndCharacterName.length).toBe(12);
    expect(slot.characterName).toEqual(input.slice(52, 122));
    expect(slot.betweenCharacterNameAndMoney.length).toBe(197874);
    expect(slot.debugFlag).toEqual(input.slice(234775, 234776));
    expect(slot.betweenPodConfigAndDebugFlag.length).toBe(3543);
    expect(slot.afterDebugFlag.length).toBe(1204);
    expect(serialize(slot)).toEqual(input);
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
    expect(slot.betweenChipsAndOutfitConfig.length).toBe(9952);
    expect(slot.betweenWeaponSlotsAndXp.length).toBe(
      BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
    );
    expect(serialize(slot)).toEqual(input);
  });

  it("splits PodConfig at the frozen literal offset without changing any save byte", () => {
    const input = syntheticSave();
    const slot = load(input);

    expect(SAVEFILE_POD_CONFIG_START_BYTE).toBe(231208);
    expect(POD_CONFIG_SIZE_BYTES).toBe(24);
    expect(slot.betweenXpAndPodConfig.length).toBe(
      BETWEEN_XP_AND_POD_CONFIG_SIZE_BYTES,
    );
    expect(slot.podConfig).toEqual(input.slice(231208, 231232));
    expect(serialize(slot)).toEqual(input);
  });

  it("splits Play Records and Emil bullets at frozen literal offsets without byte drift", () => {
    const input = syntheticSave();
    const slot = load(input);

    expect(SAVEFILE_PLAY_RECORDS_START_BYTE).toBe(230744);
    expect(PLAY_RECORDS_SIZE_BYTES).toBe(28);
    expect(SAVEFILE_EMIL_BULLETS_EQUIPPED_BYTE).toBe(231039);
    expect(slot.betweenChipsAndOutfitConfig.length).toBe(9952);
    expect(slot.playRecords).toEqual(input.slice(230744, 230772));
    expect(slot.betweenPlayRecordsAndPodCosmeticConfig.length).toBe(124);
    expect(slot.betweenPodCosmeticConfigAndHairColors.length).toBe(128);
    expect(slot.emilBulletsEquipped).toEqual(input.slice(231039, 231040));
    expect(slot.betweenEmilBulletsAndWeaponSlots.length).toBe(116);
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
