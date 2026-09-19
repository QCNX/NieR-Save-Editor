import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n";
import {
  INVENTORY_SIZE_ITEMS,
  ITEM_STATUS_ACTIVE,
  ITEM_STATUS_INACTIVE,
  parseInventory,
  serializeInventory,
  type InventoryItem,
  type SlotData,
} from "../save";
import {
  InventoryPanel,
  inventoryItemChoices,
  inventoryRows,
  updateInventorySlot,
} from "./InventoryPanel";

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

function slot(): SlotData {
  return {
    beforeMoney: new Uint8Array(),
    money: new Uint8Array(4),
    inventory: inventory({ 0: { id: 1, quantity: 4 } }),
    corpseInventory: inventory({ 1: { id: 0x32, quantity: 2 } }),
    weapons: new Uint8Array(),
    podPrograms: new Uint8Array(),
    betweenPodAndChips: new Uint8Array(),
    pluginChips: new Uint8Array(),
    betweenChipsAndXp: new Uint8Array(),
    xp: new Uint8Array(4),
    afterXp: new Uint8Array(),
  };
}

describe("ticket 05 inventory editor seam", () => {
  it("edits main and corpse inventory independently", () => {
    const original = slot();
    const corpseFilled = updateInventorySlot(original, "corpse", 3, {
      id: 2,
    });

    expect(corpseFilled.inventory).toBe(original.inventory);
    expect(parseInventory(corpseFilled.corpseInventory)[3]).toMatchObject({
      id: 2,
      status: ITEM_STATUS_ACTIVE,
      quantity: 1,
    });

    const mainCleared = updateInventorySlot(corpseFilled, "main", 0, {
      id: -1,
    });
    expect(mainCleared.corpseInventory).toBe(corpseFilled.corpseInventory);
    expect(parseInventory(mainCleared.inventory)[0]).toEqual(emptyItem(0));

    const corpseQuantity = updateInventorySlot(mainCleared, "corpse", 1, {
      quantity: 9,
    });
    expect(parseInventory(corpseQuantity.corpseInventory)[1]?.quantity).toBe(9);
  });

  it("searches localized names and combines the occupied-only filter", () => {
    const items = parseInventory(slot().inventory);

    expect(
      inventoryRows(items, "medium", true, "en").map((row) => row.item.position),
    ).toEqual([0]);
    expect(
      inventoryRows(items, "回复药：中", true, "zh-CN").map(
        (row) => row.item.position,
      ),
    ).toEqual([0]);
    expect(inventoryRows(items, "", false, "en")).toHaveLength(256);
  });

  it("does not offer an ID already occupied by another row", () => {
    const items = parseInventory(slot().inventory);

    expect(
      inventoryItemChoices(items, -1, "en").some((choice) => choice.id === 1),
    ).toBe(false);
    expect(
      inventoryItemChoices(items, 1, "en").find((choice) => choice.id === 1),
    ).toEqual({ id: 1, label: "Medium Recovery" });
  });

  it("renders the actual panel with localized controls and entity names", () => {
    const html = renderToStaticMarkup(
      <I18nProvider language="en">
        <InventoryPanel slot={slot()} onSlotChange={() => undefined} />
      </I18nProvider>,
    );

    expect(html).toContain("Main inventory");
    expect(html).toContain("Corpse inventory");
    expect(html).toContain("Show occupied only");
    expect(html).toContain("Medium Recovery");
    expect(html).toContain("Clear");
  });
});
