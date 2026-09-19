import { describe, expect, it } from "vitest";
import {
  formatUnknownId,
  lookupChipName,
  lookupItemName,
  lookupPodName,
  lookupWeaponName,
} from "./index";
import { showsChipDiamond } from "./chipDiamond";

describe("formatUnknownId", () => {
  it("formats a known-style hex id as 未知 (0x…)", () => {
    expect(formatUnknownId(0x32)).toBe("未知 (0x32)");
  });

  it("formats empty sentinel −1 as unsigned hex", () => {
    expect(formatUnknownId(-1)).toBe("未知 (0xffffffff)");
  });

  it("localizes the unknown label for English", () => {
    expect(formatUnknownId(0x32, "en")).toBe("Unknown (0x32)");
  });
});

describe("lookupItemName", () => {
  it("returns Chinese name for mapped item id 0x32", () => {
    expect(lookupItemName(0x32, "zh-CN")).toBe("耐电药");
  });

  it("returns English name for mapped item id 0x32", () => {
    expect(lookupItemName(0x32, "en")).toBe("Volt-Proof Salve");
  });

  it("falls back for unmapped item id", () => {
    expect(lookupItemName(0xdead)).toBe("未知 (0xdead)");
    expect(lookupItemName(0xdead, "en")).toBe("Unknown (0xdead)");
  });
});

describe("lookupWeaponName", () => {
  it("returns Chinese name for mapped weapon id 0x42e", () => {
    expect(lookupWeaponName(0x42e, "zh-CN")).toBe("纯白契约");
  });

  it("returns English name for mapped weapon id 0x42e", () => {
    expect(lookupWeaponName(0x42e, "en")).toBe("Virtuous Contract");
  });

  it("falls back for unmapped weapon id", () => {
    expect(lookupWeaponName(0xbeef)).toBe("未知 (0xbeef)");
    expect(lookupWeaponName(0xbeef, "en")).toBe("Unknown (0xbeef)");
  });
});

describe("lookupPodName", () => {
  it("returns Chinese name for POD save id 2001", () => {
    expect(lookupPodName(2001, "zh-CN")).toBe("R010：激光");
  });

  it("returns English name for POD save id 2001", () => {
    expect(lookupPodName(2001, "en")).toBe("R010: Laser");
  });

  it("falls back for unmapped POD id", () => {
    expect(lookupPodName(9999)).toBe("未知 (0x270f)");
    expect(lookupPodName(9999, "en")).toBe("Unknown (0x270f)");
  });
});

describe("lookupChipName", () => {
  it("returns Chinese name for chip baseId 0xbb9", () => {
    expect(lookupChipName(0xbb9, "zh-CN")).toBe("武器攻击力UP");
  });

  it("returns English name for chip baseId 0xbb9", () => {
    expect(lookupChipName(0xbb9, "en")).toBe("Weapon Attack Up");
  });

  it("falls back for unmapped chip baseId", () => {
    expect(lookupChipName(0xcafe)).toBe("未知 (0xcafe)");
    expect(lookupChipName(0xcafe, "en")).toBe("Unknown (0xcafe)");
  });
});

describe("showsChipDiamond", () => {
  it("is true when weight equals minimum for level", () => {
    expect(showsChipDiamond({ level: 0, weight: 4 })).toBe(true);
    expect(showsChipDiamond({ level: 4, weight: 9 })).toBe(true);
  });

  it("is true when weight is under the minimum for level", () => {
    expect(showsChipDiamond({ level: 4, weight: 8 })).toBe(true);
  });

  it("is false when weight is above the minimum for level", () => {
    expect(showsChipDiamond({ level: 4, weight: 10 })).toBe(false);
  });
});
