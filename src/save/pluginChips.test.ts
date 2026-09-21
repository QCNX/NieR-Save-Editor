import { describe, expect, it } from "vitest";
import {
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
  SAVEFILE_PLUGIN_CHIPS_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  copyPluginChipLoadout,
  EMPTY_PLUGIN_CHIP_ID,
  equipPluginChipToLoadout,
  minimumWeightForLevel,
  optimizePluginChipLoadout,
  OsChipLockedError,
  parsePluginChips,
  pluginChipLoadoutUsedCost,
  replacePluginChipType,
  serializePluginChips,
  setEquippedPluginChipWeight,
  setPluginChip,
  unequipPluginChipFromLoadout,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChip,
} from "./pluginChips";
import { load, serialize } from "./slotData";

/** Empty chip hex 鈥?NieREdit PluginChip.EMPTY serialize layout. */
const EMPTY_CHIP_HEX =
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000";

/**
 * Weapon Attack Up @ level 0, weight 4, unequipped slots.
 * Vanilla: baseCode=0, baseId=0xBB9, type=1, hasLevels.
 */
const WEAPON_ATK_L0_HEX =
  "00000000b90b0000010000000000000004000000ffffffffffffffffffffffffffffffffffffffffffffffff00000000";

/**
 * Weapon Attack Up @ level 3, weight 7 (encoded baseCode/baseId include level).
 */
const WEAPON_ATK_L3_HEX =
  "03000000bc0b0000010000000300000007000000ffffffffffffffffffffffffffffffffffffffffffffffff00000000";

/** Item Scan (no levels): baseCode=0xF5, baseId=0xC88, type=0x23, weight=6. */
const ITEM_SCAN_HEX =
  "f5000000880c0000230000000000000006000000ffffffffffffffffffffffffffffffffffffffffffffffff00000000";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function emptyChip(position: number): PluginChip {
  return {
    position,
    id: { ...EMPTY_PLUGIN_CHIP_ID },
    level: -1,
    weight: -1,
    slotA: -1,
    slotB: -1,
    slotC: -1,
    corpseSlotA: -1,
    corpseSlotB: -1,
    corpseSlotC: -1,
    destroyOnCorpseLostMaybe: 0,
  };
}

function fullRegionFromHexSlots(
  slots: Array<{ index: number; hex: string }>,
): Uint8Array {
  const region = new Uint8Array(PLUGIN_CHIPS_SIZE_BYTES);
  for (let i = 0; i < PLUGIN_CHIPS_SIZE_ITEMS; i++) {
    region.set(hexToBytes(EMPTY_CHIP_HEX), i * PLUGIN_CHIPS_ITEM_SIZE_BYTES);
  }
  for (const { index, hex } of slots) {
    region.set(hexToBytes(hex), index * PLUGIN_CHIPS_ITEM_SIZE_BYTES);
  }
  return region;
}

function syntheticSaveWithChips(pluginChips: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  bytes.set(pluginChips, SAVEFILE_PLUGIN_CHIPS_START_BYTE);
  return bytes;
}

describe("PluginChip parse/serialize (NieREdit 48-byte layout)", () => {
  it("parses an empty chip slot", () => {
    const region = fullRegionFromHexSlots([]);
    const chips = parsePluginChips(region);
    expect(chips).toHaveLength(PLUGIN_CHIPS_SIZE_ITEMS);
    expect(chips[0]).toEqual(emptyChip(0));
    expect(chips[0].id.type).toBe(-1);
  });

  it("parses Weapon Attack Up with level encoding (level 0 and 3)", () => {
    const region = fullRegionFromHexSlots([
      { index: 0, hex: WEAPON_ATK_L0_HEX },
      { index: 1, hex: WEAPON_ATK_L3_HEX },
    ]);
    const chips = parsePluginChips(region);

    expect(chips[0].id.baseCode).toBe(0);
    expect(chips[0].id.baseId).toBe(0x0bb9);
    expect(chips[0].id.type).toBe(1);
    expect(chips[0].id.hasLevels).toBe(true);
    expect(chips[0].level).toBe(0);
    expect(chips[0].weight).toBe(4);

    expect(chips[1].id.baseCode).toBe(0);
    expect(chips[1].id.baseId).toBe(0x0bb9);
    expect(chips[1].id.type).toBe(1);
    expect(chips[1].level).toBe(3);
    expect(chips[1].weight).toBe(7);
  });

  it("parses a no-level chip (Item Scan) without subtracting level from ids", () => {
    const region = fullRegionFromHexSlots([{ index: 0, hex: ITEM_SCAN_HEX }]);
    const chip = parsePluginChips(region)[0];
    expect(chip.id.baseCode).toBe(0xf5);
    expect(chip.id.baseId).toBe(0x0c88);
    expect(chip.id.type).toBe(0x23);
    expect(chip.id.hasLevels).toBe(false);
    expect(chip.level).toBe(0);
    expect(chip.weight).toBe(6);
  });

  it("serializes empty and leveled chips back to NieREdit hex", () => {
    const chips = Array.from({ length: PLUGIN_CHIPS_SIZE_ITEMS }, (_, i) =>
      emptyChip(i),
    );
    chips[0] = {
      ...emptyChip(0),
      id: {
        baseCode: 0,
        baseId: 0x0bb9,
        type: 1,
        weight: 4,
        hasLevels: true,
      },
      level: 0,
      weight: 4,
    };
    chips[1] = {
      ...emptyChip(1),
      id: {
        baseCode: 0,
        baseId: 0x0bb9,
        type: 1,
        weight: 4,
        hasLevels: true,
      },
      level: 3,
      weight: 7,
    };

    const bytes = serializePluginChips(chips);
    expect(bytesToHex(bytes.subarray(0, 48))).toBe(WEAPON_ATK_L0_HEX);
    expect(bytesToHex(bytes.subarray(48, 96))).toBe(WEAPON_ATK_L3_HEX);
    expect(bytesToHex(bytes.subarray(96, 144))).toBe(EMPTY_CHIP_HEX);
  });
});

describe("Plugin chips region round-trip and edit", () => {
  it("fills and replaces a chip type with reference level, weight, and slot resets", () => {
    const chips = Array.from({ length: PLUGIN_CHIPS_SIZE_ITEMS }, (_, i) =>
      emptyChip(i),
    );
    const weaponAttack = VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === 1)!;
    const itemScan = VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === 0x23)!;

    const filled = replacePluginChipType(chips, 6, weaponAttack);
    expect(filled[6]).toEqual({
      ...emptyChip(6),
      id: weaponAttack,
      level: 0,
      weight: 4,
    });

    const equipped = setPluginChip(filled, 6, {
      level: 5,
      weight: 12,
      slotA: 3,
      corpseSlotB: 8,
      destroyOnCorpseLostMaybe: 1,
    });
    const replaced = replacePluginChipType(equipped, 6, itemScan);
    expect(replaced[6]).toEqual({
      ...emptyChip(6),
      id: itemScan,
      level: 0,
      weight: 6,
    });
  });

  it("clears a chip type using the reference EMPTY replacement semantics", () => {
    const before = fullRegionFromHexSlots([
      { index: 2, hex: WEAPON_ATK_L3_HEX },
      { index: 3, hex: ITEM_SCAN_HEX },
    ]);
    const chips = parsePluginChips(before);
    const cleared = replacePluginChipType(chips, 2, EMPTY_PLUGIN_CHIP_ID);

    expect(cleared[2]).toEqual({
      ...emptyChip(2),
      level: 0,
    });

    const bytes = serializePluginChips(cleared);
    const recordStart = 2 * PLUGIN_CHIPS_ITEM_SIZE_BYTES;
    const recordEnd = recordStart + PLUGIN_CHIPS_ITEM_SIZE_BYTES;
    expect(bytes.subarray(0, recordStart)).toEqual(
      before.subarray(0, recordStart),
    );
    expect(bytes.subarray(recordEnd)).toEqual(before.subarray(recordEnd));
    const view = new DataView(
      bytes.buffer,
      bytes.byteOffset + recordStart,
      PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
    expect(Array.from({ length: 10 }, (_, field) => view.getInt32(field * 4, true))).toEqual([
      -1, -1, -1, 0, -1, -1, -1, -1, -1, -1,
    ]);
    expect(view.getInt32(44, true)).toBe(0);
  });

  it("round-trips an unedited chips region byte-identically", () => {
    const input = fullRegionFromHexSlots([
      { index: 0, hex: WEAPON_ATK_L3_HEX },
      { index: 5, hex: ITEM_SCAN_HEX },
    ]);
    expect(serializePluginChips(parsePluginChips(input))).toEqual(input);
  });

  it("editing weight changes only the intended weight bytes in the save", () => {
    const region = fullRegionFromHexSlots([
      { index: 2, hex: WEAPON_ATK_L3_HEX },
    ]);
    const input = syntheticSaveWithChips(region);
    const slot = load(input);

    const edited = setPluginChip(parsePluginChips(slot.pluginChips), 2, {
      weight: 99,
    });
    const out = serialize({
      ...slot,
      pluginChips: serializePluginChips(edited),
    });

    const chipOffset =
      SAVEFILE_PLUGIN_CHIPS_START_BYTE + 2 * PLUGIN_CHIPS_ITEM_SIZE_BYTES;
    const weightOffset = chipOffset + 16;

    expect(out.subarray(0, weightOffset)).toEqual(input.subarray(0, weightOffset));
    expect(out.subarray(weightOffset + 4)).toEqual(
      input.subarray(weightOffset + 4),
    );

    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    expect(view.getInt32(weightOffset, true)).toBe(99);
  });

  it("editing level updates encoded id bytes and level within that chip only", () => {
    const region = fullRegionFromHexSlots([
      { index: 2, hex: WEAPON_ATK_L3_HEX },
      { index: 3, hex: ITEM_SCAN_HEX },
    ]);
    const input = syntheticSaveWithChips(region);
    const slot = load(input);

    const edited = setPluginChip(parsePluginChips(slot.pluginChips), 2, {
      level: 5,
    });
    const out = serialize({
      ...slot,
      pluginChips: serializePluginChips(edited),
    });

    const chipOffset =
      SAVEFILE_PLUGIN_CHIPS_START_BYTE + 2 * PLUGIN_CHIPS_ITEM_SIZE_BYTES;

    // Outside chips region unchanged.
    expect(out.subarray(0, SAVEFILE_PLUGIN_CHIPS_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_PLUGIN_CHIPS_START_BYTE),
    );
    expect(
      out.subarray(SAVEFILE_PLUGIN_CHIPS_START_BYTE + PLUGIN_CHIPS_SIZE_BYTES),
    ).toEqual(
      input.subarray(SAVEFILE_PLUGIN_CHIPS_START_BYTE + PLUGIN_CHIPS_SIZE_BYTES),
    );

    // Other chip slots unchanged.
    expect(
      out.subarray(SAVEFILE_PLUGIN_CHIPS_START_BYTE, chipOffset),
    ).toEqual(input.subarray(SAVEFILE_PLUGIN_CHIPS_START_BYTE, chipOffset));
    expect(
      out.subarray(
        chipOffset + PLUGIN_CHIPS_ITEM_SIZE_BYTES,
        SAVEFILE_PLUGIN_CHIPS_START_BYTE + PLUGIN_CHIPS_SIZE_BYTES,
      ),
    ).toEqual(
      input.subarray(
        chipOffset + PLUGIN_CHIPS_ITEM_SIZE_BYTES,
        SAVEFILE_PLUGIN_CHIPS_START_BYTE + PLUGIN_CHIPS_SIZE_BYTES,
      ),
    );

    const chipBytes = out.subarray(
      chipOffset,
      chipOffset + PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
    const view = new DataView(
      chipBytes.buffer,
      chipBytes.byteOffset,
      chipBytes.byteLength,
    );
    // Encoded baseCode/baseId = vanilla base + new level.
    expect(view.getInt32(0, true)).toBe(5);
    expect(view.getInt32(4, true)).toBe(0x0bb9 + 5);
    expect(view.getInt32(8, true)).toBe(1);
    expect(view.getInt32(12, true)).toBe(5);
    // Weight and slots unchanged.
    expect(view.getInt32(16, true)).toBe(7);
    expect(bytesToHex(chipBytes.subarray(20))).toBe(
      WEAPON_ATK_L3_HEX.slice(40),
    );
  });
});

describe("minimumWeightForLevel (NieREdit 鈼?rule)", () => {
  it("matches the reference level 鈫?minimum weight table", () => {
    expect(minimumWeightForLevel(0)).toBe(4);
    expect(minimumWeightForLevel(1)).toBe(5);
    expect(minimumWeightForLevel(2)).toBe(6);
    expect(minimumWeightForLevel(3)).toBe(7);
    expect(minimumWeightForLevel(4)).toBe(9);
    expect(minimumWeightForLevel(5)).toBe(11);
    expect(minimumWeightForLevel(6)).toBe(14);
    expect(minimumWeightForLevel(7)).toBe(17);
    expect(minimumWeightForLevel(8)).toBe(21);
    expect(minimumWeightForLevel(9)).toBe(4);
    expect(minimumWeightForLevel(-1)).toBe(4);
  });
});

function syntheticChip(
  position: number,
  patch: Partial<PluginChip> & { type?: number },
): PluginChip {
  const type = patch.type ?? 1;
  const id =
    patch.id ??
    VANILLA_PLUGIN_CHIP_IDS.find((it) => it.type === type) ??
    EMPTY_PLUGIN_CHIP_ID;
  return {
    ...emptyChip(position),
    id: { ...id },
    level: patch.level ?? 0,
    weight: patch.weight ?? id.weight,
    slotA: patch.slotA ?? -1,
    slotB: patch.slotB ?? -1,
    slotC: patch.slotC ?? -1,
    corpseSlotA: patch.corpseSlotA ?? -1,
    corpseSlotB: patch.corpseSlotB ?? -1,
    corpseSlotC: patch.corpseSlotC ?? -1,
    destroyOnCorpseLostMaybe: patch.destroyOnCorpseLostMaybe ?? 0,
  };
}

function libraryWith(...chips: PluginChip[]): PluginChip[] {
  const all = Array.from({ length: PLUGIN_CHIPS_SIZE_ITEMS }, (_, i) =>
    emptyChip(i),
  );
  for (const chip of chips) {
    all[chip.position] = chip;
  }
  return all;
}

describe("pluginChipLoadoutUsedCost", () => {
  it("sums weight of chips equipped on the given set", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 0, slotB: 0 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 4 }),
      syntheticChip(2, { type: 0x27, weight: 2, slotC: 0 }),
    );

    expect(pluginChipLoadoutUsedCost(chips, "A")).toBe(10);
    expect(pluginChipLoadoutUsedCost(chips, "B")).toBe(4);
    expect(pluginChipLoadoutUsedCost(chips, "C")).toBe(2);
  });
});

describe("equipPluginChipToLoadout", () => {
  it("equips a library chip onto a set and Optimizes starts from 0", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 0 }),
      syntheticChip(1, { type: 0x23, weight: 6 }),
    );

    const next = equipPluginChipToLoadout(chips, 1, "A");

    expect(next[0].slotA).toBe(0);
    expect(next[1].slotA).toBe(4);
    expect(pluginChipLoadoutUsedCost(next, "A")).toBe(10);
  });

  it("is a no-op when the chip is already equipped on that set", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 0 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 4 }),
    );

    const next = equipPluginChipToLoadout(chips, 1, "A");

    expect(next).toBe(chips);
  });

  it("refuses to equip an empty library slot", () => {
    const chips = libraryWith(syntheticChip(0, { weight: 4, slotA: 0 }));

    expect(() => equipPluginChipToLoadout(chips, 5, "A")).toThrow(RangeError);
    expect(chips[0].slotA).toBe(0);
  });
});

describe("copyPluginChipLoadout", () => {
  it("copies equipped membership from one set onto another then Optimizes", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 0, slotB: -1 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 4, slotB: 0 }),
      syntheticChip(2, { type: 0x27, weight: 2, slotA: -1, slotB: 6 }),
    );

    const next = copyPluginChipLoadout(chips, "A", "B");

    expect(next[0].slotB).toBe(0);
    expect(next[1].slotB).toBe(4);
    expect(next[2].slotB).toBe(-1);
    // Source set unchanged
    expect(next[0].slotA).toBe(0);
    expect(next[1].slotA).toBe(4);
    expect(next[2].slotA).toBe(-1);
  });

  it("is a no-op when source and target are the same set", () => {
    const chips = libraryWith(syntheticChip(0, { weight: 4, slotA: 0 }));
    expect(copyPluginChipLoadout(chips, "A", "A")).toBe(chips);
  });
});

describe("optimizePluginChipLoadout (in-game Optimize pack)", () => {
  it("packs equipped set A starts tightly from 0 by preceding weights", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 10 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 2 }),
      syntheticChip(2, { type: 0x27, weight: 2, slotA: 20 }),
    );

    const packed = optimizePluginChipLoadout(chips, "A");

    // Order follows prior strip starts: idx1@2, idx0@10, idx2@20 鈫?0, 6, 10
    expect(packed[1].slotA).toBe(0);
    expect(packed[0].slotA).toBe(6);
    expect(packed[2].slotA).toBe(10);
  });

  it("leaves other sets鈥?slot fields unchanged when packing one set", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 8, slotB: 3, slotC: 12 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 1, slotB: 0, slotC: 5 }),
    );

    const packed = optimizePluginChipLoadout(chips, "A");

    expect(packed[1].slotA).toBe(0);
    expect(packed[0].slotA).toBe(6);
    expect(packed[0].slotB).toBe(3);
    expect(packed[1].slotB).toBe(0);
    expect(packed[0].slotC).toBe(12);
    expect(packed[1].slotC).toBe(5);
  });
});

describe("unequipPluginChipFromLoadout", () => {
  it("sets the set鈥檚 slot to -1 and re-Optimizes remaining chips", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 0 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 4 }),
      syntheticChip(2, { type: 0x27, weight: 2, slotA: 10 }),
    );

    const next = unequipPluginChipFromLoadout(chips, 1, "A");

    expect(next[1].slotA).toBe(-1);
    expect(next[0].slotA).toBe(0);
    expect(next[2].slotA).toBe(4);
  });

  it("rejects unequipping an OS chip (type 0x2A) and leaves the set intact", () => {
    const chips = libraryWith(
      syntheticChip(0, { type: 0x2a, weight: 2, slotA: 0 }),
      syntheticChip(1, { weight: 4, slotA: 2 }),
    );

    expect(() => unequipPluginChipFromLoadout(chips, 0, "A")).toThrow(
      OsChipLockedError,
    );
    expect(chips[0].slotA).toBe(0);
    expect(chips[1].slotA).toBe(2);
  });
});

describe("setEquippedPluginChipWeight", () => {
  it("changes weight and re-Optimizes every set where the chip is equipped", () => {
    const chips = libraryWith(
      syntheticChip(0, { weight: 4, slotA: 0, slotB: 0 }),
      syntheticChip(1, { type: 0x23, weight: 6, slotA: 4, slotB: 4 }),
      syntheticChip(2, { type: 0x27, weight: 2, slotC: 0 }),
    );

    const next = setEquippedPluginChipWeight(chips, 0, 8);

    expect(next[0].weight).toBe(8);
    expect(next[0].slotA).toBe(0);
    expect(next[1].slotA).toBe(8);
    expect(next[0].slotB).toBe(0);
    expect(next[1].slotB).toBe(8);
    // Set C untouched (chip 0 not equipped there)
    expect(next[2].slotC).toBe(0);
  });
});

describe("OS chip clear / type-change lock", () => {
  it("rejects replacePluginChipType when the chip is OS (0x2A)", () => {
    const chips = libraryWith(
      syntheticChip(0, { type: 0x2a, weight: 2, slotA: 0 }),
    );
    const weaponAttack = VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === 1)!;

    expect(() => replacePluginChipType(chips, 0, weaponAttack)).toThrow(
      OsChipLockedError,
    );
    expect(() =>
      replacePluginChipType(chips, 0, EMPTY_PLUGIN_CHIP_ID),
    ).toThrow(OsChipLockedError);
    expect(chips[0].id.type).toBe(0x2a);
    expect(chips[0].slotA).toBe(0);
  });
});
