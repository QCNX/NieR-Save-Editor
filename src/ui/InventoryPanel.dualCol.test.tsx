import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
  BETWEEN_XP_AND_POD_CONFIG_SIZE_BYTES,
  INVENTORY_SIZE_ITEMS,
  ITEM_STATUS_ACTIVE,
  ITEM_STATUS_INACTIVE,
  POD_CONFIG_SIZE_BYTES,
  WEAPON_SLOT_SIZE_BYTES,
  serializeInventory,
  type InventoryItem,
  type SlotData,
} from "../save";
import { InventoryPanel } from "./InventoryPanel";
import {
  DUAL_COLUMN_DEFAULT_ROW_HEIGHT,
  DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT,
  DUAL_COLUMN_OVERSCAN,
  dualColumnRowPairs,
  visibleRowWindow,
} from "./dualColumnVirtual";

function emptyItem(position: number): InventoryItem {
  return {
    position,
    id: -1,
    status: ITEM_STATUS_INACTIVE,
    quantity: 0,
  };
}

function inventory(entries: Record<number, { id: number; quantity: number }>) {
  return serializeInventory(
    Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, position) => {
      const entry = entries[position];
      return entry
        ? {
            position,
            id: entry.id,
            status: ITEM_STATUS_ACTIVE,
            quantity: entry.quantity,
          }
        : emptyItem(position);
    }),
  );
}

function slot(entries: Record<number, { id: number; quantity: number }>): SlotData {
  return {
    beforeSteamId: new Uint8Array(),
    steamId: new Uint8Array(8),
    betweenSteamIdAndPlayTime: new Uint8Array(),
    playTime: new Uint8Array(4),
    betweenPlayTimeAndCharacterName: new Uint8Array(),
    characterName: new Uint8Array(70),
    betweenCharacterNameAndMoney: new Uint8Array(),
    money: new Uint8Array(4),
    inventory: inventory(entries),
    corpseInventory: inventory({}),
    weapons: new Uint8Array(),
    podPrograms: new Uint8Array(),
    betweenPodAndChips: new Uint8Array(),
    activeChipLoadoutSet: new Uint8Array(4),
    purchasedChipCapacity: new Uint8Array(4),
    pluginChips: new Uint8Array(),
    betweenChipsAndOutfitConfig: new Uint8Array(),
    outfitConfig: new Uint8Array(),
    betweenOutfitConfigAndPlayRecords: new Uint8Array(),
    playRecords: new Uint8Array(),
    betweenPlayRecordsAndPodCosmeticConfig: new Uint8Array(),
    podCosmeticConfig: new Uint8Array(),
    betweenPodCosmeticConfigAndHairColors: new Uint8Array(),
    hairColors: new Uint8Array(),
    emilBulletsEquipped: new Uint8Array(),
    betweenEmilBulletsAndWeaponSlots: new Uint8Array(),
    weaponSlot1: new Uint8Array(WEAPON_SLOT_SIZE_BYTES),
    weaponSlot2: new Uint8Array(WEAPON_SLOT_SIZE_BYTES),
    betweenWeaponSlotsAndXp: new Uint8Array(BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES),
    xp: new Uint8Array(4),
    betweenXpAndPodConfig: new Uint8Array(BETWEEN_XP_AND_POD_CONFIG_SIZE_BYTES),
    podConfig: new Uint8Array(POD_CONFIG_SIZE_BYTES),
    betweenPodConfigAndDebugFlag: new Uint8Array(),
    debugFlag: new Uint8Array(1),
    afterDebugFlag: new Uint8Array(),
  };
}

describe("InventoryPanel dual-column virtual list", () => {
  it("renders dual-column chrome and an initial virtual window", () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <InventoryPanel
          slot={slot({ 0: { id: 1, quantity: 4 }, 1: { id: 2, quantity: 1 } })}
          onSlotChange={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(html).toContain("panel--inventory");
    expect(html).toContain("panel--dual-column");
    expect(html).toContain("dual-column-virtual");
    expect(html).toContain("dual-column-pair__rule");
    expect(html).toContain("Main inventory");
    expect(html).toContain("Medium Recovery");
    expect(html).toContain(">Name</th>");
    expect(html).toContain(">Clear</th>");
    expect(html).toContain(">Quantity</th>");
    expect(html.match(/dual-column-pair--row/g)?.length).toBeGreaterThan(0);
  });

  it("windows long inventories instead of rendering every pair", () => {
    const entries: Record<number, { id: number; quantity: number }> = {};
    for (let i = 0; i < 80; i++) {
      entries[i] = { id: (i % 20) + 1, quantity: 1 };
    }
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <InventoryPanel slot={slot(entries)} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );
    const pairCount = (html.match(/dual-column-pair--row/g) ?? []).length;
    const rowCount = dualColumnRowPairs(
      Object.keys(entries).map((key) => Number(key)),
    ).length;
    const expected = visibleRowWindow(
      0,
      DUAL_COLUMN_DEFAULT_ROW_HEIGHT,
      DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT,
      DUAL_COLUMN_OVERSCAN,
      rowCount,
    );
    expect(pairCount).toBe(expected.end - expected.start);
    expect(pairCount).toBeLessThan(rowCount);
    expect(pairCount).toBeGreaterThan(0);
  });
});
