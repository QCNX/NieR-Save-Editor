import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
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

/** OS + Weapon Attack on set A; Item Scan in library. Capacity 40. */
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

function renderLoadout(language: "zh-CN" | "en" = "en") {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <ChipLoadoutPanel
        slot={loadoutSampleSlot()}
        onSlotChange={vi.fn()}
      />
    </I18nProvider>,
  );
}

describe("ChipLoadoutPanel three-column layout", () => {
  it("renders library, equipped, and Stats as three columns in one split", () => {
    const html = renderLoadout("en");

    expect(html).toContain("panel-split--chip-loadout");
    expect(html).toMatch(
      /panel-split--chip-loadout[\s\S]*panel-split__side[\s\S]*Library[\s\S]*panel-split__main[\s\S]*Equipped[\s\S]*data-testid="chip-loadout-stats"[\s\S]*Stats Panel/,
    );

    const splitIdx = html.indexOf("panel-split--chip-loadout");
    const statsIdx = html.indexOf('data-testid="chip-loadout-stats"');
    expect(splitIdx).toBeGreaterThanOrEqual(0);
    expect(statsIdx).toBeGreaterThan(splitIdx);
    expect(html.indexOf('data-testid="chip-loadout-panel"')).toBeLessThan(
      statsIdx,
    );
  });

  it("keeps level and cost column hooks for denser tables", () => {
    const html = renderLoadout("en");
    expect(html).toContain('class="col-level"');
    expect(html).toContain('class="col-weight"');
  });
});
