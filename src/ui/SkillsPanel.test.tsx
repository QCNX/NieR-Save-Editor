import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  EMPTY_PLUGIN_CHIP_ID,
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
  POD_PROGRAMS_ITEM_SIZE_BYTES,
  POD_PROGRAMS_SIZE_ITEMS,
  SAVEFILE_SIZE_BYTES,
  load,
  parsePluginChips,
  parsePodPrograms,
  replacePluginChipType,
  serializePluginChips,
  serializePodPrograms,
  setPodProgramId,
  VANILLA_PLUGIN_CHIP_IDS,
} from "../save";
import {
  availablePodProgramChoices,
  filterPluginChipRows,
  filterPodProgramRows,
  SkillsPanel,
} from "./SkillsPanel";

function editableSlot() {
  const loaded = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
  const podPrograms = loaded.podPrograms.slice();
  const podView = new DataView(podPrograms.buffer);
  for (let index = 0; index < POD_PROGRAMS_SIZE_ITEMS; index++) {
    const offset = index * POD_PROGRAMS_ITEM_SIZE_BYTES;
    podView.setInt32(offset, 1, true);
    podView.setInt32(offset + 4, -1, true);
  }
  const pluginChips = loaded.pluginChips.slice();
  const chipView = new DataView(pluginChips.buffer);
  for (let index = 0; index < PLUGIN_CHIPS_SIZE_ITEMS; index++) {
    const offset = index * PLUGIN_CHIPS_ITEM_SIZE_BYTES;
    for (let field = 0; field < 11; field++) {
      chipView.setInt32(offset + field * 4, -1, true);
    }
    chipView.setInt32(offset + 44, 0, true);
  }
  const slot = { ...loaded, podPrograms, pluginChips };
  const pods = setPodProgramId(parsePodPrograms(slot.podPrograms), 0, 2001);
  const chipId = VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === 1)!;
  const chips = replacePluginChipType(
    parsePluginChips(slot.pluginChips),
    0,
    chipId,
  );
  return {
    ...slot,
    podPrograms: serializePodPrograms(pods),
    pluginChips: serializePluginChips(chips),
  };
}

describe("SkillsPanel public behavior", () => {
  it("filters POD and chip rows by localized entity names and occupancy", () => {
    const slot = editableSlot();
    const pods = parsePodPrograms(slot.podPrograms);
    const chips = parsePluginChips(slot.pluginChips);

    expect(filterPodProgramRows(pods, "激光", false, "zh-CN").map((row) => row.position)).toEqual([0]);
    expect(filterPodProgramRows(pods, "Laser", true, "en").map((row) => row.position)).toEqual([0]);
    expect(filterPluginChipRows(chips, "武器攻击力", true, "zh-CN").map((row) => row.position)).toEqual([0]);
    expect(filterPluginChipRows(chips, "Weapon Attack", true, "en").map((row) => row.position)).toEqual([0]);
    expect(filterPluginChipRows(chips, "", true, "en")).toHaveLength(1);
  });

  it("offers bilingual POD choices while excluding IDs occupied by other slots", () => {
    const programs = parsePodPrograms(editableSlot().podPrograms);
    const english = availablePodProgramChoices(programs, 1, "en");
    const chinese = availablePodProgramChoices(programs, 1, "zh-CN");

    expect(english.some((choice) => choice.id === 2001)).toBe(false);
    expect(english.find((choice) => choice.id === 2002)?.label).toContain("Mirage");
    expect(chinese.find((choice) => choice.id === 2002)?.label).toContain("幻象");
  });

  it("renders editable bilingual controls with Level before Cost and the diamond marker", () => {
    const slot = editableSlot();
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <SkillsPanel slot={slot} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(html).toContain("POD Programs");
    expect(html).toContain("R010: Laser");
    expect(html).toContain("Plug-in Chips");
    expect(html).toContain("Weapon Attack Up");
    expect(html).toContain("Show occupied only");
    expect(html).toContain("◆");
    expect(html.indexOf("Level")).toBeLessThan(html.indexOf("Cost"));
    expect(html).not.toContain(`Unknown (0x${(EMPTY_PLUGIN_CHIP_ID.baseId >>> 0).toString(16)})`);
    // POD collection keeps content-width; Chip Library uses dual-col virtual shell.
    expect(html).toContain('class="table-wrap dual-column-virtual"');
    expect(html).toContain("panel--chip-library");
    expect(html).toContain("panel--dual-column");
    expect(html.match(/panel-split--collection/g)).toHaveLength(1);
    expect(html.match(/panel-split__side--ungrouped/g)).toHaveLength(1);
    expect(html).toContain("pod-config-card");
    expect(html).not.toContain("collection-workspace");
  });

  it("renders chip cost as 占用 in zh-CN", () => {
    const slot = editableSlot();
    const html = renderToStaticMarkup(
      <I18nProvider language="zh-CN">
        <SkillsPanel slot={slot} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(html).toContain("占用");
    expect(html).not.toContain(">重量<");
  });
});
