import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider, translate } from "../i18n";
import {
  EMPTY_PLUGIN_CHIP_ID,
  load,
  OS_PLUGIN_CHIP_TYPE,
  parsePluginChips,
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
  replacePluginChipType,
  SAVEFILE_SIZE_BYTES,
  serializePluginChips,
  setPluginChip,
  setPurchasedChipCapacity,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChipId,
  type SlotData,
} from "../save";
import { ChipLoadoutPanel } from "./SkillsPanel";

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

/** Five Weapon Attack Up L8 on set A → raw 120% → effective 100%. */
function overflowAttackSlot(): SlotData {
  let chips = parsePluginChips(emptyPluginChipsRegion());
  for (let i = 0; i < 5; i++) {
    chips = replacePluginChipType(chips, i, chipId(0x01));
    chips = setPluginChip(chips, i, {
      weight: 4,
      level: 8,
      slotA: i * 4,
    });
  }
  return setPurchasedChipCapacity(
    { ...baseSlot(), pluginChips: serializePluginChips(chips) },
    128,
  );
}

/** Offensive Heal + HUD HP + OS — listed, no fake percent aggregate. */
function listedEffectsSlot(): SlotData {
  let chips = parsePluginChips(emptyPluginChipsRegion());
  chips = replacePluginChipType(chips, 0, chipId(0x0a));
  chips = setPluginChip(chips, 0, { weight: 4, level: 3, slotA: 0 });
  chips = replacePluginChipType(chips, 1, chipId(0x27));
  chips = setPluginChip(chips, 1, { weight: 2, level: 0, slotA: 4 });
  chips = replacePluginChipType(chips, 2, chipId(OS_PLUGIN_CHIP_TYPE));
  chips = setPluginChip(chips, 2, { weight: 2, level: 0, slotA: 6 });
  return setPurchasedChipCapacity(
    { ...baseSlot(), pluginChips: serializePluginChips(chips) },
    40,
  );
}

/** Drop Rate Up with unknown cap — must not silently clamp. */
function unknownCapSlot(): SlotData {
  let chips = parsePluginChips(emptyPluginChipsRegion());
  chips = replacePluginChipType(chips, 0, chipId(0x0e));
  chips = setPluginChip(chips, 0, { weight: 4, level: 8, slotA: 0 });
  chips = replacePluginChipType(chips, 1, chipId(0x0e));
  chips = setPluginChip(chips, 1, { weight: 4, level: 8, slotA: 4 });
  return setPurchasedChipCapacity(
    { ...baseSlot(), pluginChips: serializePluginChips(chips) },
    40,
  );
}

function renderLoadout(slot: SlotData, language: "zh-CN" | "en" = "zh-CN") {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <ChipLoadoutPanel slot={slot} onSlotChange={vi.fn()} />
    </I18nProvider>,
  );
}

describe("ChipLoadoutPanel Stats Panel v1", () => {
  it("shows stackable overflow with raw → effective + cap styling", () => {
    const html = renderLoadout(overflowAttackSlot(), "zh-CN");
    expect(html).toContain(translate("zh-CN", "chips.statsPanel"));
    expect(html).toContain('data-testid="chip-stats-stackable"');
    expect(html).toContain('data-overflow="true"');
    expect(html).toContain("120% → 100%（上限 100%，+20% 无效）");
    expect(html).toContain("chip-stats-row--overflow");
  });

  it("lists conditional and system chips without a fake aggregate percent", () => {
    const html = renderLoadout(listedEffectsSlot(), "en");
    expect(html).toContain('data-testid="chip-stats-listed"');
    expect(html).toContain('data-role="conditional"');
    expect(html).toContain('data-role="system"');
    expect(html).toContain(translate("en", "chips.stats.enabled"));
    expect(html).toContain("Lv.3");
    expect(html).not.toMatch(/Offensive Heal[^<]*%/);
  });

  it("never silently clamps unknown-cap stackables", () => {
    const html = renderLoadout(unknownCapSlot(), "en");
    expect(html).toContain('data-cap-known="false"');
    expect(html).toContain("cap unknown");
    expect(html).not.toContain("→");
  });

  it("updates the panel when equipped chips change via onSlotChange wiring", () => {
    const empty = renderLoadout(baseSlot());
    expect(empty).toContain(translate("zh-CN", "chips.stats.empty"));

    const withChips = renderLoadout(overflowAttackSlot());
    expect(withChips).not.toContain(translate("zh-CN", "chips.stats.empty"));
    expect(withChips).toContain('data-testid="chip-stats-stackable"');
  });

  it("does not treat EMPTY library rows as stats", () => {
    expect(EMPTY_PLUGIN_CHIP_ID.type).toBe(-1);
    const html = renderLoadout(baseSlot(), "en");
    expect(html).not.toContain('data-testid="chip-stats-stackable"');
    expect(html).toContain(translate("en", "chips.stats.empty"));
  });
});
