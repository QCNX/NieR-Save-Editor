import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider, translate } from "../i18n";
import {
  EMPTY_PLUGIN_CHIP_ID,
  getPurchasedChipCapacity,
  load,
  OS_PLUGIN_CHIP_TYPE,
  parsePluginChips,
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
  PURCHASED_CAPACITY_OPTIONS,
  replacePluginChipType,
  SAVEFILE_SIZE_BYTES,
  serializePluginChips,
  setPluginChip,
  setPurchasedChipCapacity,
  setActiveChipLoadoutSet,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChipId,
  type SlotData,
} from "../save";
import {
  ChipLoadoutCapacityError,
  ChipLoadoutPanel,
  applyChipLoadoutCapacity,
  applyChipLoadoutCopy,
  applyChipLoadoutEquip,
  applyChipLoadoutLevel,
  applyChipLoadoutUnequip,
  applyChipLoadoutWeight,
  chipsAvailableForLoadout,
  chipsEquippedOnLoadout,
} from "./SkillsPanel";

function emptyPluginChipsRegion(): Uint8Array {
  const pluginChips = new Uint8Array(
    PLUGIN_CHIPS_SIZE_ITEMS * PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  );
  const view = new DataView(pluginChips.buffer);
  for (let index = 0; index < PLUGIN_CHIPS_SIZE_ITEMS; index++) {
    const offset = index * PLUGIN_CHIPS_ITEM_SIZE_BYTES;
    for (let field = 0; field < 11; field++) {
      view.setInt32(offset + field * 4, -1, true);
    }
    view.setInt32(offset + 44, 0, true);
  }
  return pluginChips;
}

function chipId(type: number): PluginChipId {
  const id = VANILLA_PLUGIN_CHIP_IDS.find((candidate) => candidate.type === type);
  if (!id) throw new Error(`missing vanilla type 0x${type.toString(16)}`);
  return id;
}

function baseSlot(): SlotData {
  return {
    ...load(new Uint8Array(SAVEFILE_SIZE_BYTES)),
    pluginChips: emptyPluginChipsRegion(),
  };
}

/** OS + Weapon Attack + Item Scan in library; OS+Weapon on set A. Capacity 40. */
function loadoutSampleSlot(): SlotData {
  let chips = parsePluginChips(emptyPluginChipsRegion());
  chips = replacePluginChipType(chips, 0, chipId(OS_PLUGIN_CHIP_TYPE));
  chips = setPluginChip(chips, 0, { weight: 2, slotA: 0 });
  chips = replacePluginChipType(chips, 1, chipId(0x01));
  chips = setPluginChip(chips, 1, { weight: 4, level: 0, slotA: 2 });
  chips = replacePluginChipType(chips, 2, chipId(0x23));
  chips = setPluginChip(chips, 2, { weight: 6, level: 0 });
  return setPurchasedChipCapacity(
    { ...baseSlot(), pluginChips: serializePluginChips(chips) },
    40,
  );
}

/** Set A already uses 38 of 40 so equipping Item Scan (6) would overflow. */
function nearCapacitySlot(): SlotData {
  let chips = parsePluginChips(emptyPluginChipsRegion());
  chips = replacePluginChipType(chips, 0, chipId(OS_PLUGIN_CHIP_TYPE));
  chips = setPluginChip(chips, 0, { weight: 2, slotA: 0 });
  chips = replacePluginChipType(chips, 1, chipId(0x01));
  chips = setPluginChip(chips, 1, { weight: 36, level: 0, slotA: 2 });
  chips = replacePluginChipType(chips, 2, chipId(0x23));
  chips = setPluginChip(chips, 2, { weight: 6, level: 0 });
  return setPurchasedChipCapacity(
    { ...baseSlot(), pluginChips: serializePluginChips(chips) },
    40,
  );
}

function renderLoadout(language: "zh-CN" | "en", slot: SlotData = loadoutSampleSlot()) {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <ChipLoadoutPanel slot={slot} onSlotChange={vi.fn()} />
    </I18nProvider>,
  );
}

describe("chip loadout list seams", () => {
  it("lists equipped chips for a set ordered by strip start", () => {
    const chips = parsePluginChips(loadoutSampleSlot().pluginChips);
    expect(chipsEquippedOnLoadout(chips, "A").map((c) => c.position)).toEqual([
      0, 1,
    ]);
    expect(chipsEquippedOnLoadout(chips, "B")).toEqual([]);
  });

  it("offers only occupied library chips not already on the edit set", () => {
    const chips = parsePluginChips(loadoutSampleSlot().pluginChips);
    expect(chipsAvailableForLoadout(chips, "A").map((c) => c.position)).toEqual([
      2,
    ]);
    expect(
      chipsAvailableForLoadout(chips, "B").map((c) => c.id.type),
    ).toEqual([OS_PLUGIN_CHIP_TYPE, 0x01, 0x23]);
    expect(
      chipsAvailableForLoadout(chips, "A").some(
        (c) => c.id.type === EMPTY_PLUGIN_CHIP_ID.type,
      ),
    ).toBe(false);
  });
});

describe("chip loadout write seams", () => {
  it("equips from the library and Optimizes the edit set", () => {
    const slot = loadoutSampleSlot();
    const next = applyChipLoadoutEquip(slot, 2, "A", { overload: true });
    const chips = parsePluginChips(next.pluginChips);
    expect(chips[2]!.slotA).toBe(6);
    expect(chips[0]!.slotA).toBe(0);
    expect(chips[1]!.slotA).toBe(2);
  });

  it("blocks equip that would exceed purchased capacity when overload is off", () => {
    const slot = nearCapacitySlot();
    expect(() =>
      applyChipLoadoutEquip(slot, 2, "A", { overload: false }),
    ).toThrow(ChipLoadoutCapacityError);
    expect(parsePluginChips(slot.pluginChips)[2]!.slotA).toBe(-1);
  });

  it("allows over-capacity equip when overload is on", () => {
    const slot = nearCapacitySlot();
    const next = applyChipLoadoutEquip(slot, 2, "A", { overload: true });
    const chips = parsePluginChips(next.pluginChips);
    expect(chips[0]!.weight + chips[1]!.weight + chips[2]!.weight).toBe(44);
    expect(getPurchasedChipCapacity(next)).toBe(40);
  });

  it("unequips non-OS chips and refuses OS unequip", () => {
    const slot = loadoutSampleSlot();
    const unequipped = applyChipLoadoutUnequip(slot, 1, "A");
    expect(parsePluginChips(unequipped.pluginChips)[1]!.slotA).toBe(-1);
    expect(parsePluginChips(unequipped.pluginChips)[0]!.slotA).toBe(0);

    expect(() => applyChipLoadoutUnequip(slot, 0, "A")).toThrow();
  });

  it("copies one set onto another and Optimizes the target", () => {
    const slot = loadoutSampleSlot();
    const next = applyChipLoadoutCopy(slot, "A", "B", { overload: true });
    const chips = parsePluginChips(next.pluginChips);
    expect(chips[0]!.slotB).toBe(0);
    expect(chips[1]!.slotB).toBe(2);
    expect(chips[2]!.slotB).toBe(-1);
  });

  it("writes purchased capacity through the inventory-sync API", () => {
    const slot = loadoutSampleSlot();
    const next = applyChipLoadoutCapacity(slot, 128, { overload: false });
    expect(getPurchasedChipCapacity(next)).toBe(128);
    expect(PURCHASED_CAPACITY_OPTIONS).toContain(128);
  });

  it("blocks capacity drops below used when overload is off", () => {
    // used = 52 on A; purchased starts at 128 so 40 is a legal dropdown drop.
    let chips = parsePluginChips(emptyPluginChipsRegion());
    chips = replacePluginChipType(chips, 0, chipId(OS_PLUGIN_CHIP_TYPE));
    chips = setPluginChip(chips, 0, { weight: 2, slotA: 0 });
    chips = replacePluginChipType(chips, 1, chipId(0x01));
    chips = setPluginChip(chips, 1, { weight: 50, level: 0, slotA: 2 });
    const slot = setPurchasedChipCapacity(
      { ...baseSlot(), pluginChips: serializePluginChips(chips) },
      128,
    );

    expect(() =>
      applyChipLoadoutCapacity(slot, 40, { overload: false }),
    ).toThrow(ChipLoadoutCapacityError);
    expect(getPurchasedChipCapacity(slot)).toBe(128);
  });

  it("allows capacity drops below used when overload is on", () => {
    let chips = parsePluginChips(emptyPluginChipsRegion());
    chips = replacePluginChipType(chips, 0, chipId(OS_PLUGIN_CHIP_TYPE));
    chips = setPluginChip(chips, 0, { weight: 2, slotA: 0 });
    chips = replacePluginChipType(chips, 1, chipId(0x01));
    chips = setPluginChip(chips, 1, { weight: 50, level: 0, slotA: 2 });
    const slot = setPurchasedChipCapacity(
      { ...baseSlot(), pluginChips: serializePluginChips(chips) },
      128,
    );

    const next = applyChipLoadoutCapacity(slot, 40, { overload: true });
    expect(getPurchasedChipCapacity(next)).toBe(40);

    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <ChipLoadoutPanel
          slot={next}
          onSlotChange={vi.fn()}
          initialOverload
        />
      </I18nProvider>,
    );
    expect(html).toContain('data-over-capacity="true"');
  });

  it("syncs Level and Cost edits with the shared pluginChips records", () => {
    const slot = loadoutSampleSlot();
    const leveled = applyChipLoadoutLevel(slot, 1, 3);
    expect(parsePluginChips(leveled.pluginChips)[1]!.level).toBe(3);

    const weighted = applyChipLoadoutWeight(leveled, 1, 8, {
      overload: true,
    });
    const chip = parsePluginChips(weighted.pluginChips)[1]!;
    expect(chip.weight).toBe(8);
    expect(chip.slotA).toBe(2);
    expect(parsePluginChips(weighted.pluginChips)[0]!.slotA).toBe(0);
  });

  it("blocks Cost increases that exceed capacity when overload is off", () => {
    const slot = loadoutSampleSlot();
    expect(() =>
      applyChipLoadoutWeight(slot, 1, 50, { overload: false }),
    ).toThrow(ChipLoadoutCapacityError);
  });
});

describe("ChipLoadoutPanel wireframe", () => {
  it("renders A/B/C, overload, purchased dropdown, library + equipped panes", () => {
    const html = renderLoadout("en");

    expect(html).toContain('data-testid="chip-loadout-panel"');
    expect(html).not.toContain('data-testid="chip-loadout-placeholder"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>A</);
    expect(html).toMatch(/data-in-game-active="true"[^>]*>A</);
    expect(html).toContain(">B</button>");
    expect(html).toContain(">C</button>");
    expect(html).not.toContain("★");
    expect(html).toContain('data-testid="chip-loadout-active"');
    expect(html).toContain("Overload");
    expect(html).toContain('data-testid="chip-loadout-capacity"');
    for (const option of PURCHASED_CAPACITY_OPTIONS) {
      expect(html).toContain(`>${option}</option>`);
    }
    expect(html).toContain("Library");
    expect(html).toContain("Equipped");
    expect(html).toContain("Copy from");
    expect(html).toContain("Stats Panel");
    expect(html).toContain("Cost");
    expect(html).toContain("Purchased");
  });

  it("groups editing, in-game, copy, and capacity controls by their jobs", () => {
    const html = renderLoadout("en");

    expect(html).toContain('data-testid="chip-loadout-editing-set"');
    expect(html).toContain('data-testid="chip-loadout-in-game-set"');
    expect(html).toContain('data-testid="chip-loadout-copy"');
    expect(html).toContain('data-testid="chip-loadout-capacity-controls"');
    expect(html).toContain("Editing set");
    expect(html).toContain("In-game active set");
    expect(html).toContain("Copy loadout");
    expect(html).toContain("Capacity");
  });

  it("marks the in-game active set with inverted button chrome and exposes a switch", () => {
    const slot = setActiveChipLoadoutSet(loadoutSampleSlot(), "B");
    const html = renderLoadout("en", slot);

    expect(html).toContain('data-testid="chip-loadout-active"');
    expect(html).not.toContain("★");
    expect(html).not.toContain("unavailable");
    expect(html).toMatch(
      /data-testid="chip-loadout-active"[^>]*>[\s\S]*?<option[^>]*value="B"[^>]*selected/,
    );
    expect(html).toMatch(/data-in-game-active="true"[^>]*>B</);
    expect(html).not.toMatch(
      /data-testid="chip-loadout-active"[^>]*disabled/,
    );
  });

  it("keeps the edit subpage independent of the active set", () => {
    const slot = setActiveChipLoadoutSet(loadoutSampleSlot(), "C");
    const html = renderLoadout("en", slot);
    // Default edit set remains A while in-game active is C.
    expect(html).toMatch(/aria-pressed="true"[^>]*>A</);
    expect(html).toMatch(/data-in-game-active="true"[^>]*>C</);
    expect(html).not.toContain("★");
  });

  it("reuses category filter labels on the from-library pane", () => {
    const html = renderLoadout("en");
    expect(html).toContain("Category");
    expect(html).toContain(">All</option>");
    expect(html).toContain(">Attack</option>");
    expect(html).toContain(">System</option>");
  });

  it("localizes loadout chrome to 占用 / 已购容量 wording", () => {
    expect(translate("zh-CN", "chips.overload")).toBe("过载");
    expect(translate("en", "chips.overload")).toBe("Overload");
    expect(translate("zh-CN", "chips.fromLibrary")).toBe("芯片库");
    expect(translate("en", "chips.fromLibrary")).toBe("Library");
    expect(translate("zh-CN", "chips.equipped")).toBe("已装备");
    expect(translate("en", "chips.equipped")).toBe("Equipped");
    expect(translate("zh-CN", "chips.copyFrom")).toBe("复制自");
    expect(translate("en", "chips.copyFrom")).toBe("Copy from");
    expect(translate("zh-CN", "chips.activeSet")).toBe("当前套装");
    expect(translate("en", "chips.activeSet")).toBe("Active set");
    expect(translate("zh-CN", "chips.equip")).toBe("装备");
    expect(translate("en", "chips.equip")).toBe("Equip");
    expect(translate("zh-CN", "chips.unequip")).toBe("卸下");
    expect(translate("en", "chips.unequip")).toBe("Unequip");
    expect(translate("zh-CN", "chips.usage")).toBe("用量");
    expect(translate("en", "chips.usage")).toBe("Usage");

    const zh = renderLoadout("zh-CN");
    expect(zh).toContain("占用");
    expect(zh).toContain("已购容量");
    expect(zh).toContain("过载");
    expect(zh).toContain("数值面板");
  });

  it("flags over-capacity usage in the markup when used exceeds purchased", () => {
    const slot = applyChipLoadoutEquip(nearCapacitySlot(), 2, "A", {
      overload: true,
    });
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <ChipLoadoutPanel
          slot={slot}
          onSlotChange={vi.fn()}
          initialOverload
        />
      </I18nProvider>,
    );
    expect(html).toContain('data-over-capacity="true"');
  });
});
