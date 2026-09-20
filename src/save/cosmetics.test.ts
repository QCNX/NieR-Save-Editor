import { describe, expect, it } from "vitest";

import {
  HAIR_COLORS_SIZE_BYTES,
  OUTFIT_CONFIG_SIZE_BYTES,
  POD_COSMETIC_CONFIG_SIZE_BYTES,
  SAVEFILE_HAIR_COLORS_START_BYTE,
  SAVEFILE_OUTFIT_CONFIG_START_BYTE,
  SAVEFILE_POD_COSMETIC_CONFIG_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  parseHairColors,
  parseOutfitConfig,
  parsePodCosmeticConfig,
  serializeHairColors,
  serializeOutfitConfig,
  serializePodCosmeticConfig,
  setDressModule,
  setHairColor,
  setHeadAccessory,
  setOutfit,
  setPodCosmetic,
} from "./cosmetics";
import { load, serialize } from "./slotData";

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from(
    { length: hex.length / 2 },
    (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16),
  );
}

function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = (index * 31 + 17) % 256;
  }
  bytes.set(
    hexToBytes(
      "000000000100000078563412" +
        "010000000000000002000000" +
        "010000000200000004000000" +
        "010000000100000000000000",
    ),
    SAVEFILE_OUTFIT_CONFIG_START_BYTE,
  );
  bytes.set(
    hexToBytes("ffffffff0100000078563412"),
    SAVEFILE_POD_COSMETIC_CONFIG_START_BYTE,
  );
  bytes.set(hexToBytes("00127f"), SAVEFILE_HAIR_COLORS_START_BYTE);
  return bytes;
}

describe("cosmetics save models", () => {
  it("parses and losslessly serializes the exact 48-byte OutfitConfig layout", () => {
    const bytes = syntheticSave().slice(
      SAVEFILE_OUTFIT_CONFIG_START_BYTE,
      SAVEFILE_OUTFIT_CONFIG_START_BYTE + OUTFIT_CONFIG_SIZE_BYTES,
    );
    const config = parseOutfitConfig(bytes);

    expect(config).toEqual({
      dressModule2B: 0,
      dressModule9S: 1,
      dressModuleA2: 0x12345678,
      headAccessoryEquipped2B: { equipped: true, rawValue: 1 },
      headAccessoryEquipped9S: { equipped: false, rawValue: 0 },
      headAccessoryEquippedA2: { equipped: null, rawValue: 2 },
      headAccessory2B: 1,
      headAccessory9S: 2,
      headAccessoryA2: 4,
      outfit2B: 1,
      outfit9S: 1,
      outfitA2: 0,
    });
    expect(serializeOutfitConfig(config)).toEqual(bytes);
  });

  it("edits OutfitConfig fields with NieREdit head-accessory flag semantics", () => {
    const original = parseOutfitConfig(syntheticSave().slice(230364, 230412));
    const edited = setOutfit(
      setDressModule(setHeadAccessory(original, "9S", 7), "A2", -123),
      "2B",
      3,
    );
    const cleared = setHeadAccessory(edited, "9S", 0);

    expect(cleared.headAccessory9S).toBe(0);
    expect(cleared.headAccessoryEquipped9S).toEqual({
      equipped: false,
      rawValue: 0,
    });
    expect(cleared.dressModuleA2).toBe(-123);
    expect(cleared.outfit2B).toBe(3);
  });

  it("preserves unknown Pod cosmetic IDs and edits known IDs", () => {
    const bytes = hexToBytes("ffffffff0100000078563412");
    const config = parsePodCosmeticConfig(bytes);

    expect(config).toEqual({ pod2B: -1, pod9S: 1, podA2: 0x12345678 });
    expect(serializePodCosmeticConfig(config)).toEqual(bytes);
    expect(setPodCosmetic(config, "A2", 7).podA2).toBe(7);
  });

  it("preserves all three raw hair bytes and changes one selected character", () => {
    const bytes = hexToBytes("00127f");
    const colors = parseHairColors(bytes);

    expect(colors).toEqual({ hair2B: 0, hair9S: 18, hairA2: 127 });
    expect(serializeHairColors(colors)).toEqual(bytes);
    expect(serializeHairColors(setHairColor(colors, "9S", 255))).toEqual(
      hexToBytes("00ff7f"),
    );
  });

  it("changes only one literal OutfitConfig field in a full save", () => {
    const input = syntheticSave();
    const slot = load(input);
    const config = setOutfit(parseOutfitConfig(slot.outfitConfig), "9S", 2);
    const output = serialize({
      ...slot,
      outfitConfig: serializeOutfitConfig(config),
    });
    const changedStart = 230404;

    expect(output.subarray(0, changedStart)).toEqual(
      input.subarray(0, changedStart),
    );
    expect(output.subarray(changedStart, changedStart + 4)).toEqual(
      hexToBytes("02000000"),
    );
    expect(output.subarray(changedStart + 4)).toEqual(
      input.subarray(changedStart + 4),
    );
  });

  it("changes only Pod A2 cosmetic at its literal four-byte field", () => {
    const input = syntheticSave();
    const slot = load(input);
    const podCosmetics = setPodCosmetic(
      parsePodCosmeticConfig(slot.podCosmeticConfig),
      "A2",
      7,
    );
    const output = serialize({
      ...slot,
      podCosmeticConfig: serializePodCosmeticConfig(podCosmetics),
    });

    expect(output.subarray(230904, 230908)).toEqual(hexToBytes("07000000"));
    expect(output.subarray(0, 230904)).toEqual(input.subarray(0, 230904));
    expect(output.subarray(230908)).toEqual(input.subarray(230908));
  });

  it("changes only the literal 9S hair byte", () => {
    const input = syntheticSave();
    const slot = load(input);
    const hairColors = setHairColor(parseHairColors(slot.hairColors), "9S", 8);
    const output = serialize({
      ...slot,
      hairColors: serializeHairColors(hairColors),
    });

    expect(output.subarray(0, 231037)).toEqual(input.subarray(0, 231037));
    expect(output[231037]).toBe(8);
    expect(output.subarray(231038)).toEqual(input.subarray(231038));
  });

  it("locks the model sizes and offsets to the verified reference literals", () => {
    expect(SAVEFILE_OUTFIT_CONFIG_START_BYTE).toBe(230364);
    expect(OUTFIT_CONFIG_SIZE_BYTES).toBe(48);
    expect(SAVEFILE_POD_COSMETIC_CONFIG_START_BYTE).toBe(230896);
    expect(POD_COSMETIC_CONFIG_SIZE_BYTES).toBe(12);
    expect(SAVEFILE_HAIR_COLORS_START_BYTE).toBe(231036);
    expect(HAIR_COLORS_SIZE_BYTES).toBe(3);
  });
});
