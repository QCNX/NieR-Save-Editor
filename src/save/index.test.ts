import { describe, expect, it } from "vitest";

import {
  ACTIVE_CHIP_LOADOUT_SET_SUPPORTED,
  ActiveChipLoadoutSetUnsupportedError,
  getActiveChipLoadoutSet,
  getCharacterName,
  getDebugFlag,
  getPlayTime,
  getSteamId,
  decodePurchasedCapacity,
  encodePurchasedCapacity,
  getPurchasedChipCapacity,
  parseEmilBulletsEquipped,
  parseHairColors,
  parseOutfitConfig,
  parsePlayRecords,
  parsePodCosmeticConfig,
  POD_PROGRAM_IDS,
  PURCHASED_CAPACITY_OPTIONS,
  VANILLA_PLUGIN_CHIP_IDS,
  replacePluginChipType,
  replaceWeaponId,
  setActiveChipLoadoutSet,
  setInventoryItemId,
  setCharacterName,
  setDebugFlag,
  setPlayTime,
  setSteamId,
  setEmilBulletsEquipped,
  setHairColor,
  setHeadAccessory,
  setPlayRecordCounter,
  setPodCosmetic,
  setPodProgramId,
  setPurchasedChipCapacity,
  setPurchasedChipCapacityWithInventorySync,
  CAPACITY_EXPANSION_ITEM_IDS,
  purchasedCapacityTiers,
  summarizeEquippedChipStats,
  formatStackableStatLine,
} from "./index";

describe("public save edit API", () => {
  it("exports inventory editing", () => {
    expect(setInventoryItemId).toBeTypeOf("function");
  });

  it("exports weapon editing", () => {
    expect(replaceWeaponId).toBeTypeOf("function");
  });

  it("exports POD editing and the named ID list", () => {
    expect(setPodProgramId).toBeTypeOf("function");
    expect(POD_PROGRAM_IDS).toContain(2001);
  });

  it("exports plug-in chip editing and the vanilla ID list", () => {
    expect(replacePluginChipType).toBeTypeOf("function");
    expect(VANILLA_PLUGIN_CHIP_IDS).toContainEqual(
      expect.objectContaining({ baseId: 0x00000bb9, type: 0x01 }),
    );
  });

  it("exports chip loadout stats aggregation", () => {
    expect(summarizeEquippedChipStats).toBeTypeOf("function");
    expect(formatStackableStatLine).toBeTypeOf("function");
  });

  it("exports General core field editing", () => {
    expect(getSteamId).toBeTypeOf("function");
    expect(setSteamId).toBeTypeOf("function");
    expect(getPlayTime).toBeTypeOf("function");
    expect(setPlayTime).toBeTypeOf("function");
    expect(getCharacterName).toBeTypeOf("function");
    expect(setCharacterName).toBeTypeOf("function");
    expect(getDebugFlag).toBeTypeOf("function");
    expect(setDebugFlag).toBeTypeOf("function");
  });

  it("exports Play Records and Emil bullets editing", () => {
    expect(parsePlayRecords).toBeTypeOf("function");
    expect(setPlayRecordCounter).toBeTypeOf("function");
    expect(parseEmilBulletsEquipped).toBeTypeOf("function");
    expect(setEmilBulletsEquipped).toBeTypeOf("function");
  });

  it("exports cosmetics editing", () => {
    expect(parseOutfitConfig).toBeTypeOf("function");
    expect(setHeadAccessory).toBeTypeOf("function");
    expect(parsePodCosmeticConfig).toBeTypeOf("function");
    expect(setPodCosmetic).toBeTypeOf("function");
    expect(parseHairColors).toBeTypeOf("function");
    expect(setHairColor).toBeTypeOf("function");
  });

  it("exports purchased chip capacity encode/decode", () => {
    expect(decodePurchasedCapacity).toBeTypeOf("function");
    expect(encodePurchasedCapacity).toBeTypeOf("function");
    expect(getPurchasedChipCapacity).toBeTypeOf("function");
    expect(setPurchasedChipCapacity).toBeTypeOf("function");
    expect(PURCHASED_CAPACITY_OPTIONS).toContain(128);
  });

  it("exports capacity expansion backpack sync", () => {
    expect(setPurchasedChipCapacityWithInventorySync).toBeTypeOf("function");
    expect(purchasedCapacityTiers).toBeTypeOf("function");
    // Verified absence: purchases are mask-only (no backpack item ids).
    expect(CAPACITY_EXPANSION_ITEM_IDS).toEqual([]);
  });

  it("exports active chip loadout set as an unsupported stub", () => {
    expect(ACTIVE_CHIP_LOADOUT_SET_SUPPORTED).toBe(false);
    expect(getActiveChipLoadoutSet).toBeTypeOf("function");
    expect(setActiveChipLoadoutSet).toBeTypeOf("function");
    expect(ActiveChipLoadoutSetUnsupportedError).toBeTypeOf("function");
  });
});
