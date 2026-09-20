import { describe, expect, it } from "vitest";

import {
  getCharacterName,
  getDebugFlag,
  getPlayTime,
  getSteamId,
  POD_PROGRAM_IDS,
  VANILLA_PLUGIN_CHIP_IDS,
  replacePluginChipType,
  replaceWeaponId,
  setInventoryItemId,
  setCharacterName,
  setDebugFlag,
  setPlayTime,
  setSteamId,
  setPodProgramId,
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
});
