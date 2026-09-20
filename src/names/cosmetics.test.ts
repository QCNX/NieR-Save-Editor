import { describe, expect, it } from "vitest";

import {
  getCosmeticOptions,
  getOutfitOptions,
  lookupCosmeticName,
  lookupOutfitName,
} from "./index";

describe("ticket 16 cosmetic name seam", () => {
  it("exposes the exact NieREdit vanilla IDs per cosmetic domain", () => {
    expect(getOutfitOptions("2B").map(({ id }) => id)).toEqual([0, 1, 2, 3]);
    expect(getOutfitOptions("9S").map(({ id }) => id)).toEqual([0, 1]);
    expect(getOutfitOptions("A2").map(({ id }) => id)).toEqual([0, 1]);
    expect(getCosmeticOptions("hairColor").map(({ id }) => id)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
    ]);
    expect(getCosmeticOptions("headAccessory").map(({ id }) => id)).toEqual([
      0, 1, 2, 4, 7, 8, 9, 10, 11, 12, 13, 14,
    ]);
    expect(getCosmeticOptions("dressModule").map(({ id }) => id)).toEqual([0, 1]);
    expect(getCosmeticOptions("podAppearance").map(({ id }) => id)).toEqual([
      -1, 1, 2, 4, 7,
    ]);
  });

  it("uses confirmed Chinese outfit names and English fallback instead of false matches", () => {
    expect(lookupOutfitName("2B", 1, "zh-CN")).toBe("暴露的女性服装");
    expect(lookupOutfitName("9S", 1, "zh-CN")).toBe("年轻人套装");
    expect(lookupOutfitName("A2", 1, "zh-CN")).toBe("毁灭者套装");
    expect(lookupCosmeticName("hairColor", 0, "zh-CN")).toBe("White");
    expect(lookupCosmeticName("headAccessory", 1, "zh-CN")).toBe("Lunar Tear");
  });

  it("localizes an unknown ID without rejecting it", () => {
    expect(lookupOutfitName("2B", 99, "en")).toBe("Unknown (0x63)");
    expect(lookupCosmeticName("hairColor", 255, "zh-CN")).toBe(
      "未知 (0xff)",
    );
  });
});
