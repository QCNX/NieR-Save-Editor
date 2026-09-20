import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  load,
  parseHairColors,
  parseOutfitConfig,
  parsePodCosmeticConfig,
  SAVEFILE_SIZE_BYTES,
} from "../save";
import {
  SummaryPanel,
  updateCosmeticField,
  type CosmeticFieldEdit,
} from "./SummaryPanel";

function emptySlot() {
  return load(new Uint8Array(SAVEFILE_SIZE_BYTES));
}

describe("ticket 16 cosmetics editor seam", () => {
  it("writes all five cosmetic rows to their public raw regions", () => {
    const edits: CosmeticFieldEdit[] = [
      { field: "outfit", android: "9S", id: 1 },
      { field: "hairColor", android: "A2", id: 18 },
      { field: "headAccessory", android: "2B", id: 12 },
      { field: "dressModule", android: "9S", id: 1 },
      { field: "podAppearance", android: "A2", id: 7 },
    ];
    let slot = emptySlot();
    for (const edit of edits) slot = updateCosmeticField(slot, edit);

    const outfit = parseOutfitConfig(slot.outfitConfig);
    expect(outfit.outfit9S).toBe(1);
    expect(outfit.dressModule9S).toBe(1);
    expect(outfit.headAccessory2B).toBe(12);
    expect(outfit.headAccessoryEquipped2B).toEqual({
      equipped: true,
      rawValue: 1,
    });
    expect(parseHairColors(slot.hairColors).hairA2).toBe(18);
    expect(parsePodCosmeticConfig(slot.podCosmeticConfig).podA2).toBe(7);
  });

  it("clears a head accessory and its equipped flag together", () => {
    const equipped = updateCosmeticField(emptySlot(), {
      field: "headAccessory",
      android: "9S",
      id: 7,
    });
    const cleared = updateCosmeticField(equipped, {
      field: "headAccessory",
      android: "9S",
      id: 0,
    });

    expect(parseOutfitConfig(cleared.outfitConfig).headAccessory9S).toBe(0);
    expect(
      parseOutfitConfig(cleared.outfitConfig).headAccessoryEquipped9S,
    ).toEqual({ equipped: false, rawValue: 0 });
  });

  it("preserves unrelated unknown IDs while another cosmetic is edited", () => {
    const unknown = updateCosmeticField(emptySlot(), {
      field: "outfit",
      android: "2B",
      id: 99,
    });
    const changed = updateCosmeticField(unknown, {
      field: "hairColor",
      android: "9S",
      id: 8,
    });

    expect(parseOutfitConfig(changed.outfitConfig).outfit2B).toBe(99);
    expect(parseHairColors(changed.hairColors).hair9S).toBe(8);
  });

  it("renders five bilingual rows under 2B, 9S, and A2 columns", () => {
    const onSlotChange = vi.fn();
    const english = renderToStaticMarkup(
      <I18nProvider language="en">
        <SummaryPanel slot={emptySlot()} onSlotChange={onSlotChange} />
      </I18nProvider>,
    );
    const chinese = renderToStaticMarkup(
      <I18nProvider language="zh-CN">
        <SummaryPanel slot={emptySlot()} onSlotChange={onSlotChange} />
      </I18nProvider>,
    );

    for (const character of ["2B", "9S", "A2"]) {
      expect(english).toContain(`>${character}</th>`);
    }
    for (const label of [
      "Outfit",
      "Hair color",
      "Head accessory",
      "Dress Module",
      "POD appearance",
    ]) {
      expect(english).toContain(label);
    }
    for (const label of ["外观", "发色", "头饰", "穿脱服装模块", "POD 外观"]) {
      expect(chinese).toContain(label);
    }
    expect(english).toContain('aria-label="Outfit 2B"');
    expect(english).toContain("Unknown (0x0)");
    expect(chinese).toContain("暴露的女性服装");
  });
});
