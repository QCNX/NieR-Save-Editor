import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  SAVEFILE_SIZE_BYTES,
  load,
} from "../save";
import {
  parseWeapons,
  replaceWeaponId,
  writeWeaponAt,
  type WeaponItem,
} from "../save/weapons";
import {
  availableWeaponChoices,
  filterWeaponRows,
  WeaponsPanel,
} from "./WeaponsPanel";

function slotWithVirtuousContract() {
  const slot = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
  const first = parseWeapons(slot.weapons)[0];
  if (!first) throw new Error("Synthetic save has no weapon slots");
  return {
    ...slot,
    weapons: writeWeaponAt(slot.weapons, replaceWeaponId(first, 0x42e)),
  };
}

function renderPanel(language: "zh-CN" | "en") {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <WeaponsPanel slot={slotWithVirtuousContract()} onSlotChange={vi.fn()} />
    </I18nProvider>,
  );
}

describe("WeaponsPanel editing controls", () => {
  const weapon = (position: number, id: number): WeaponItem => ({
    position,
    id,
    level: 1,
    newItem: true,
    newStory: true,
    enemiesDefeated: 0,
  });

  it("filters localized weapon names and empty slots through the shared list seam", () => {
    const weapons = [weapon(0, 0x42e), weapon(1, -1), weapon(2, 0x42f)];

    expect(filterWeaponRows(weapons, "契约", false, "zh-CN").map((row) => row.position)).toEqual([0]);
    expect(filterWeaponRows(weapons, "oath", true, "en").map((row) => row.position)).toEqual([2]);
    expect(filterWeaponRows(weapons, "", false, "en")).toHaveLength(3);
  });

  it("excludes IDs used by other slots while retaining the current weapon choice", () => {
    const weapons = [weapon(0, 0x42e), weapon(1, -1)];
    const occupiedSlot = availableWeaponChoices(weapons, 0, "en");
    const emptySlot = availableWeaponChoices(weapons, 1, "zh-CN");

    expect(occupiedSlot).toContainEqual({ id: 0x42e, label: "Virtuous Contract" });
    expect(emptySlot.some((choice) => choice.id === 0x42e)).toBe(false);
    expect(emptySlot).toContainEqual({ id: 0x42f, label: "漆黑誓约" });
  });

  it("shows localized weapon choices with search, occupancy, clear, and level controls", () => {
    const english = renderPanel("en");
    const chinese = renderPanel("zh-CN");

    expect(english).toContain("Virtuous Contract");
    expect(english).toContain('aria-label="Search"');
    expect(english).toContain("Show occupied only");
    expect(english).toContain(">Clear</button>");
    expect(english).toContain('type="number" min="1" max="4"');
    expect(chinese).toContain("纯白契约");
    expect(chinese).toContain('aria-label="搜索"');
    expect(chinese).toContain("仅显示占用");
    expect(chinese).toContain(">清空</button>");
  });

  it("offers empty slots through the occupied-only toggle instead of discarding them", () => {
    const html = renderPanel("en");

    expect(html).toContain('type="checkbox" checked=""');
    expect(html).toContain('value="number:-1"');
  });
});
