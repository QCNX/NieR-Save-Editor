import { describe, expect, it } from "vitest";

import { VANILLA_PLUGIN_CHIP_IDS } from "../save/pluginChips";
import {
  CHIP_LIBRARY_CATEGORIES,
  chipCategoryForType,
  type ChipLibraryCategory,
} from "./chipCategory";

/** One representative type per in-game category (龙汉化 CORE_PSV_SKILL_CTG_01..05). */
const CATEGORY_EXAMPLES: ReadonlyArray<{
  category: Exclude<ChipLibraryCategory, "all">;
  type: number;
  label: string;
}> = [
  { category: "attack", type: 0x01, label: "Weapon Attack Up" },
  { category: "defense", type: 0x06, label: "Melee Defense Up" },
  { category: "support", type: 0x05, label: "Fast Cooldown" },
  { category: "hacking", type: 0x1d, label: "Hijack Boost" },
  { category: "system", type: 0x2a, label: "OS" },
];

describe("chipCategoryForType", () => {
  it("maps a known type into each CORE_PSV_SKILL_CTG category", () => {
    for (const example of CATEGORY_EXAMPLES) {
      expect(chipCategoryForType(example.type), example.label).toBe(
        example.category,
      );
    }
  });

  it("classifies every vanilla chip type and leaves EMPTY/unknown unmapped", () => {
    for (const id of VANILLA_PLUGIN_CHIP_IDS) {
      expect(chipCategoryForType(id.type), `type 0x${id.type.toString(16)}`).not.toBeNull();
    }
    expect(chipCategoryForType(-1)).toBeNull();
    expect(chipCategoryForType(0xdead)).toBeNull();
  });

  it("exposes the six library filter choices with All first", () => {
    expect(CHIP_LIBRARY_CATEGORIES).toEqual([
      "all",
      "attack",
      "defense",
      "support",
      "hacking",
      "system",
    ]);
  });
});
