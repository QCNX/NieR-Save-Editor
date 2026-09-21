import { describe, expect, it } from "vitest";
import items from "../data/items.json";
import {
  INVENTORY_SIZE_ITEMS,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  CAPACITY_EXPANSION_ITEM_IDS,
  purchasedCapacityTiers,
  setPurchasedChipCapacityWithInventorySync,
  syncInventoryCapacityExpansionItems,
} from "./capacityExpansionInventory";
import {
  ITEM_STATUS_ACTIVE,
  ITEM_STATUS_INACTIVE,
  parseInventory,
  serializeInventory,
  type InventoryItem,
} from "./inventory";
import { getPurchasedChipCapacity } from "./purchasedCapacity";
import { load, serialize } from "./slotData";

type NameEntry = { en: string; zh: string };

function emptyItem(position: number): InventoryItem {
  return {
    position,
    id: -1,
    status: ITEM_STATUS_INACTIVE,
    quantity: 0,
  };
}

function emptyInventory(): InventoryItem[] {
  return Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, i) => emptyItem(i));
}

function totalQty(items: InventoryItem[], id: number): number {
  return items
    .filter((item) => item.id === id)
    .reduce((sum, item) => sum + item.quantity, 0);
}

function syntheticSaveWithInventory(inventory: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  bytes.set(inventory, SAVEFILE_INVENTORY_START_BYTE);
  return bytes;
}

describe("capacity expansion item name map", () => {
  it("maps +8/+16/+24 expansion items via zh names in items.json", () => {
    const map = items as Record<string, NameEntry>;
    expect(map[String(CAPACITY_EXPANSION_ITEM_IDS.plus8)]?.zh).toBe(
      "扩充储存容量+8",
    );
    expect(map[String(CAPACITY_EXPANSION_ITEM_IDS.plus16)]?.zh).toBe(
      "扩充储存容量+16",
    );
    expect(map[String(CAPACITY_EXPANSION_ITEM_IDS.plus24)]?.zh).toBe(
      "扩充储存容量+24",
    );
  });
});

describe("purchasedCapacityTiers", () => {
  it("yields zero tiers for base capacity 40", () => {
    expect(purchasedCapacityTiers(40)).toEqual({ n8: 0, n16: 0, n24: 0 });
  });

  it("yields merchant full tiers for capacity 128", () => {
    expect(purchasedCapacityTiers(128)).toEqual({ n8: 4, n16: 2, n24: 1 });
  });
});

describe("syncInventoryCapacityExpansionItems", () => {
  it("leaves zero expansion items for capacity 40 tiers", () => {
    const items = emptyInventory();
    items[3] = {
      position: 3,
      id: CAPACITY_EXPANSION_ITEM_IDS.plus8,
      status: ITEM_STATUS_ACTIVE,
      quantity: 2,
    };
    items[5] = {
      position: 5,
      id: CAPACITY_EXPANSION_ITEM_IDS.plus16,
      status: ITEM_STATUS_ACTIVE,
      quantity: 1,
    };
    items[7] = {
      position: 7,
      id: CAPACITY_EXPANSION_ITEM_IDS.plus24,
      status: ITEM_STATUS_ACTIVE,
      quantity: 1,
    };

    const synced = syncInventoryCapacityExpansionItems(
      items,
      purchasedCapacityTiers(40),
    );

    expect(totalQty(synced, CAPACITY_EXPANSION_ITEM_IDS.plus8)).toBe(0);
    expect(totalQty(synced, CAPACITY_EXPANSION_ITEM_IDS.plus16)).toBe(0);
    expect(totalQty(synced, CAPACITY_EXPANSION_ITEM_IDS.plus24)).toBe(0);
  });

  it("sets four +8, two +16, and one +24 for capacity 128 tiers", () => {
    const synced = syncInventoryCapacityExpansionItems(
      emptyInventory(),
      purchasedCapacityTiers(128),
    );

    expect(totalQty(synced, CAPACITY_EXPANSION_ITEM_IDS.plus8)).toBe(4);
    expect(totalQty(synced, CAPACITY_EXPANSION_ITEM_IDS.plus16)).toBe(2);
    expect(totalQty(synced, CAPACITY_EXPANSION_ITEM_IDS.plus24)).toBe(1);
  });

  it("increases and decreases expansion stacks without corrupting other rows", () => {
    const items = emptyInventory();
    items[0] = {
      position: 0,
      id: 0x32,
      status: ITEM_STATUS_ACTIVE,
      quantity: 9,
    };
    items[1] = {
      position: 1,
      id: CAPACITY_EXPANSION_ITEM_IDS.plus8,
      status: ITEM_STATUS_ACTIVE,
      quantity: 1,
    };
    items[10] = {
      position: 10,
      id: 0x190,
      status: ITEM_STATUS_ACTIVE,
      quantity: 3,
    };

    const up = syncInventoryCapacityExpansionItems(
      items,
      purchasedCapacityTiers(88),
    );
    expect(purchasedCapacityTiers(88)).toEqual({ n8: 4, n16: 1, n24: 0 });
    expect(totalQty(up, CAPACITY_EXPANSION_ITEM_IDS.plus8)).toBe(4);
    expect(totalQty(up, CAPACITY_EXPANSION_ITEM_IDS.plus16)).toBe(1);
    expect(totalQty(up, CAPACITY_EXPANSION_ITEM_IDS.plus24)).toBe(0);
    expect(up[0]).toEqual(items[0]);
    expect(up[10]).toEqual(items[10]);

    const down = syncInventoryCapacityExpansionItems(
      up,
      purchasedCapacityTiers(48),
    );
    expect(purchasedCapacityTiers(48)).toEqual({ n8: 1, n16: 0, n24: 0 });
    expect(totalQty(down, CAPACITY_EXPANSION_ITEM_IDS.plus8)).toBe(1);
    expect(totalQty(down, CAPACITY_EXPANSION_ITEM_IDS.plus16)).toBe(0);
    expect(totalQty(down, CAPACITY_EXPANSION_ITEM_IDS.plus24)).toBe(0);
    expect(down[0]).toEqual(items[0]);
    expect(down[10]).toEqual(items[10]);
  });
});

describe("setPurchasedChipCapacityWithInventorySync", () => {
  it("writes mask and syncs main-inventory expansion counts together", () => {
    const inventory = emptyInventory();
    inventory[2] = {
      position: 2,
      id: 0x32,
      status: ITEM_STATUS_ACTIVE,
      quantity: 5,
    };
    inventory[4] = {
      position: 4,
      id: CAPACITY_EXPANSION_ITEM_IDS.plus8,
      status: ITEM_STATUS_ACTIVE,
      quantity: 9,
    };
    const input = syntheticSaveWithInventory(serializeInventory(inventory));
    const slot = load(input);

    const edited = setPurchasedChipCapacityWithInventorySync(slot, 128);
    expect(getPurchasedChipCapacity(edited)).toBe(128);

    const items = parseInventory(edited.inventory);
    expect(totalQty(items, CAPACITY_EXPANSION_ITEM_IDS.plus8)).toBe(4);
    expect(totalQty(items, CAPACITY_EXPANSION_ITEM_IDS.plus16)).toBe(2);
    expect(totalQty(items, CAPACITY_EXPANSION_ITEM_IDS.plus24)).toBe(1);
    expect(items[2]).toEqual(inventory[2]);

    const cleared = setPurchasedChipCapacityWithInventorySync(edited, 40);
    expect(getPurchasedChipCapacity(cleared)).toBe(40);
    const clearedItems = parseInventory(cleared.inventory);
    expect(totalQty(clearedItems, CAPACITY_EXPANSION_ITEM_IDS.plus8)).toBe(0);
    expect(totalQty(clearedItems, CAPACITY_EXPANSION_ITEM_IDS.plus16)).toBe(0);
    expect(totalQty(clearedItems, CAPACITY_EXPANSION_ITEM_IDS.plus24)).toBe(0);
    expect(clearedItems[2]).toEqual(inventory[2]);

    expect(serialize(cleared).length).toBe(SAVEFILE_SIZE_BYTES);
  });
});
