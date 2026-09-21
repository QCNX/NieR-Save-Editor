import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider, translate } from "../i18n";
import {
  EMPTY_PLUGIN_CHIP_ID,
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
  SAVEFILE_SIZE_BYTES,
  load,
  parsePluginChips,
  replacePluginChipType,
  serializePluginChips,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChipId,
} from "../save";
import { CHIP_LIBRARY_CATEGORIES, type ChipLibraryCategory } from "../names";
import { ChipsPanel, filterPluginChipRows } from "./SkillsPanel";

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

/** Occupied samples spanning every category, plus one empty trailing slot. */
function libraryWithCategorySamples() {
  const slot = {
    ...load(new Uint8Array(SAVEFILE_SIZE_BYTES)),
    pluginChips: emptyPluginChipsRegion(),
  };
  const samples: Array<{ type: number; category: Exclude<ChipLibraryCategory, "all"> }> =
    [
      { type: 0x01, category: "attack" },
      { type: 0x06, category: "defense" },
      { type: 0x05, category: "support" },
      { type: 0x1d, category: "hacking" },
      { type: 0x2a, category: "system" },
    ];
  let chips = parsePluginChips(slot.pluginChips);
  samples.forEach((sample, index) => {
    chips = replacePluginChipType(chips, index, chipId(sample.type));
  });
  return {
    slot: { ...slot, pluginChips: serializePluginChips(chips) },
    samples,
  };
}

describe("chip library category filter", () => {
  it("gates each category to its known type and hides EMPTY/unknown outside All", () => {
    const { slot, samples } = libraryWithCategorySamples();
    const chips = parsePluginChips(slot.pluginChips);
    // Inject an unknown occupied type at position 10 without going through vanilla replace.
    const mutated = chips.map((chip) =>
      chip.position === 10
        ? {
            ...chip,
            id: { ...EMPTY_PLUGIN_CHIP_ID, type: 0x777, baseId: 0x777, baseCode: 0 },
            level: 0,
            weight: 1,
          }
        : chip,
    );

    for (const sample of samples) {
      const rows = filterPluginChipRows(
        mutated,
        "",
        false,
        "en",
        sample.category,
      );
      expect(
        rows.map((row) => row.id.type),
        sample.category,
      ).toEqual([sample.type]);
    }

    const allRows = filterPluginChipRows(mutated, "", false, "en", "all");
    expect(allRows.some((row) => row.id.type === EMPTY_PLUGIN_CHIP_ID.type)).toBe(
      true,
    );
    expect(allRows.some((row) => row.id.type === 0x777)).toBe(true);

    for (const category of CHIP_LIBRARY_CATEGORIES.filter((c) => c !== "all")) {
      const rows = filterPluginChipRows(mutated, "", false, "en", category);
      expect(
        rows.some((row) => row.id.type === EMPTY_PLUGIN_CHIP_ID.type),
        category,
      ).toBe(false);
      expect(
        rows.some((row) => row.id.type === 0x777),
        category,
      ).toBe(false);
    }
  });

  it("applies search and occupied-only on top of the category filter", () => {
    const { slot } = libraryWithCategorySamples();
    const chips = parsePluginChips(slot.pluginChips);

    expect(
      filterPluginChipRows(chips, "Weapon", false, "en", "attack").map(
        (row) => row.id.type,
      ),
    ).toEqual([0x01]);
    expect(
      filterPluginChipRows(chips, "Weapon", false, "en", "defense"),
    ).toHaveLength(0);
    expect(
      filterPluginChipRows(chips, "", true, "en", "all").every(
        (row) => row.id.type !== EMPTY_PLUGIN_CHIP_ID.type,
      ),
    ).toBe(true);
    expect(
      filterPluginChipRows(chips, "OS", true, "en", "system").map(
        (row) => row.id.type,
      ),
    ).toEqual([0x2a]);
  });

  it("localizes the six category labels to 龙汉化 / English glossary wording", () => {
    expect(translate("zh-CN", "chips.category")).toBe("分类");
    expect(translate("en", "chips.category")).toBe("Category");
    expect(translate("zh-CN", "chips.category.all")).toBe("全部");
    expect(translate("en", "chips.category.all")).toBe("All");
    expect(translate("zh-CN", "chips.category.attack")).toBe("攻击");
    expect(translate("en", "chips.category.attack")).toBe("Attack");
    expect(translate("zh-CN", "chips.category.defense")).toBe("防御");
    expect(translate("en", "chips.category.defense")).toBe("Defense");
    expect(translate("zh-CN", "chips.category.support")).toBe("辅助");
    expect(translate("en", "chips.category.support")).toBe("Support");
    expect(translate("zh-CN", "chips.category.hacking")).toBe("黑客");
    expect(translate("en", "chips.category.hacking")).toBe("Hacking");
    expect(translate("zh-CN", "chips.category.system")).toBe("系统");
    expect(translate("en", "chips.category.system")).toBe("System");
  });

  it("renders the category dropdown beside search, defaulting to All", () => {
    const { slot } = libraryWithCategorySamples();
    const english = renderToStaticMarkup(
      <I18nProvider language="en">
        <ChipsPanel slot={slot} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );
    const chinese = renderToStaticMarkup(
      <I18nProvider language="zh-CN">
        <ChipsPanel slot={slot} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(english).toContain("Category");
    expect(english).toContain(">All</option>");
    expect(english).toContain(">Attack</option>");
    expect(english).toContain(">Defense</option>");
    expect(english).toContain(">Support</option>");
    expect(english).toContain(">Hacking</option>");
    expect(english).toContain(">System</option>");
    expect(english).toContain('aria-label="Category"');
    expect(english).toContain('<option value="all" selected="">All</option>');

    expect(chinese).toContain("分类");
    expect(chinese).toContain(">全部</option>");
    expect(chinese).toContain(">攻击</option>");
    expect(chinese).toContain(">防御</option>");
    expect(chinese).toContain(">辅助</option>");
    expect(chinese).toContain(">黑客</option>");
    expect(chinese).toContain(">系统</option>");
    expect(chinese).toContain('<option value="all" selected="">全部</option>');
  });
});
