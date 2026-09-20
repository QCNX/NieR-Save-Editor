import { describe, expect, it } from "vitest";
import items from "./items.json";
import weapons from "./weapons.json";
import chips from "./chips.json";
import pods from "./pods.json";

type NameEntry = { en: string; zh: string };

function entry(map: Record<string, NameEntry>, id: number): NameEntry {
  return map[String(id)];
}

describe("Chinese name maps (id → {en, zh})", () => {
  it("maps item save id via decimal catalog key (0x32 → 耐电药)", () => {
    expect(entry(items, 0x32)).toEqual({
      en: "Volt-Proof Salve",
      zh: "耐电药",
    });
  });

  it("maps weapon save id via decimal catalog key (0x42E → 纯白契约)", () => {
    expect(entry(weapons, 0x42e)).toEqual({
      en: "Virtuous Contract",
      zh: "纯白契约",
    });
  });

  it("maps POD save id via saveId-2000 bridging (2001 → R010：激光)", () => {
    expect(entry(pods, 2001)).toEqual({
      en: "R010: Laser",
      zh: "R010：激光",
    });
  });

  it("maps plugin chip via vanilla baseId table (0xBB9 → 武器攻击力UP)", () => {
    expect(entry(chips, 0xbb9)).toEqual({
      en: "Weapon Attack Up",
      zh: "武器攻击力UP",
    });
  });

  it("keeps the OS chip acronym fully capitalized in English", () => {
    expect(entry(chips, 3338)).toEqual({
      en: "OS",
      zh: "OS芯片",
    });
  });
});
