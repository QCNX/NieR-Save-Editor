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

/** Provisional ids from the rejected catalog invention — must stay gone. */
const REJECTED_PROVISIONAL_IDS = [8042, 8043, 8044] as const;

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

function syntheticSaveWithInventory(inventory: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  bytes.set(inventory, SAVEFILE_INVENTORY_START_BYTE);
  return bytes;
}

describe("capacity expansion backpack item ids", () => {
  it("lists no verified inventory ids (evidence: mask-only purchases)", () => {
    // Slot1 progressive mask 0x01→0x03→0x07→0x2f→0x6f→0xef left inventory
    // unchanged; Slot0/2 at 0xEF have no dedicated +8/+16/+24 stacks.
    expect(CAPACITY_EXPANSION_ITEM_IDS).toEqual([]);
  });

  it("does not keep rejected provisional catalog ids 8042–8044", () => {
    const map = items as Record<string, NameEntry>;
    for (const id of REJECTED_PROVISIONAL_IDS) {
      expect(map[String(id)]).toBeUndefined();
    }
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
  it("is a no-op because no backpack expansion item ids exist", () => {
    const items = emptyInventory();
    items[0] = {
      position: 0,
      id: 0x32,
      status: ITEM_STATUS_ACTIVE,
      quantity: 9,
    };
    items[3] = {
      position: 3,
      id: 0x190,
      status: ITEM_STATUS_ACTIVE,
      quantity: 2,
    };

    const synced = syncInventoryCapacityExpansionItems(
      items,
      purchasedCapacityTiers(128),
    );

    expect(synced).toEqual(items);
    expect(synced[0]).toEqual(items[0]);
    expect(synced[3]).toEqual(items[3]);
  });
});

describe("setPurchasedChipCapacityWithInventorySync", () => {
  it("writes the purchase mask and leaves main inventory byte-identical", () => {
    const inventory = emptyInventory();
    inventory[2] = {
      position: 2,
      id: 0x32,
      status: ITEM_STATUS_ACTIVE,
      quantity: 5,
    };
    const serialized = serializeInventory(inventory);
    const input = syntheticSaveWithInventory(serialized);
    const slot = load(input);

    const edited = setPurchasedChipCapacityWithInventorySync(slot, 128);
    expect(getPurchasedChipCapacity(edited)).toBe(128);
    expect(edited.inventory).toEqual(serialized);
    expect(parseInventory(edited.inventory)[2]).toEqual(inventory[2]);

    const cleared = setPurchasedChipCapacityWithInventorySync(edited, 40);
    expect(getPurchasedChipCapacity(cleared)).toBe(40);
    expect(cleared.inventory).toEqual(serialized);

    expect(serialize(cleared).length).toBe(SAVEFILE_SIZE_BYTES);
  });
});
