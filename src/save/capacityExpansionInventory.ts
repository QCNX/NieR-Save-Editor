/**
 * Keep main-backpack 「扩充储存容量+8/+16/+24」 stacks aligned with the
 * prefer-small-tier (n8,n16,n24) counts for a purchased capacity.
 *
 * Item IDs are the decimal catalog keys for those zh names in items.json
 * (past the last vanilla fish/material id so they do not collide with CORE_ITEM_NAME).
 */

import type { SlotData } from "./slotData";
import {
  ITEM_STATUS_ACTIVE,
  ITEM_STATUS_INACTIVE,
  parseInventory,
  serializeInventory,
  type InventoryItem,
} from "./inventory";
import {
  purchasedCapacityTiers,
  setPurchasedChipCapacity,
  type PurchasedCapacityTiers,
} from "./purchasedCapacity";

/** Catalog ids for 「扩充储存容量+8/+16/+24」 in src/data/items.json. */
export const CAPACITY_EXPANSION_ITEM_IDS = Object.freeze({
  plus8: 8042,
  plus16: 8043,
  plus24: 8044,
});

export { purchasedCapacityTiers };
export type { PurchasedCapacityTiers };

const EXPANSION_IDS = [
  CAPACITY_EXPANSION_ITEM_IDS.plus8,
  CAPACITY_EXPANSION_ITEM_IDS.plus16,
  CAPACITY_EXPANSION_ITEM_IDS.plus24,
] as const;

function emptySlot(position: number): InventoryItem {
  return {
    position,
    id: -1,
    status: ITEM_STATUS_INACTIVE,
    quantity: 0,
  };
}

function setStackQuantity(
  items: InventoryItem[],
  id: number,
  quantity: number,
): InventoryItem[] {
  const next = items.map((item, index) => ({ ...item, position: index }));
  const indices = next
    .map((item, index) => (item.id === id ? index : -1))
    .filter((index) => index >= 0);

  if (quantity <= 0) {
    for (const index of indices) {
      next[index] = emptySlot(index);
    }
    return next;
  }

  if (indices.length === 0) {
    const emptyIndex = next.findIndex((item) => item.id === -1);
    if (emptyIndex < 0) {
      throw new RangeError(
        `No empty inventory slot to place capacity expansion item ${id}`,
      );
    }
    next[emptyIndex] = {
      position: emptyIndex,
      id,
      status: ITEM_STATUS_ACTIVE,
      quantity,
    };
    return next;
  }

  const [primary, ...extras] = indices;
  next[primary!] = {
    position: primary!,
    id,
    status: ITEM_STATUS_ACTIVE,
    quantity,
  };
  for (const index of extras) {
    next[index] = emptySlot(index);
  }
  return next;
}

/**
 * Rewrite expansion-item stacks so quantities match the given tier counts.
 * Unrelated inventory rows are left unchanged.
 */
export function syncInventoryCapacityExpansionItems(
  items: InventoryItem[],
  tiers: PurchasedCapacityTiers,
): InventoryItem[] {
  let next = items;
  const targets: Record<(typeof EXPANSION_IDS)[number], number> = {
    [CAPACITY_EXPANSION_ITEM_IDS.plus8]: tiers.n8,
    [CAPACITY_EXPANSION_ITEM_IDS.plus16]: tiers.n16,
    [CAPACITY_EXPANSION_ITEM_IDS.plus24]: tiers.n24,
  };
  for (const id of EXPANSION_IDS) {
    next = setStackQuantity(next, id, targets[id]);
  }
  return next;
}

/**
 * Set purchased capacity mask and sync main-backpack expansion items to the
 * same prefer-small-tier counts used for that capacity.
 */
export function setPurchasedChipCapacityWithInventorySync(
  slot: SlotData,
  capacity: number,
): SlotData {
  const withMask = setPurchasedChipCapacity(slot, capacity);
  const tiers = purchasedCapacityTiers(capacity);
  const items = syncInventoryCapacityExpansionItems(
    parseInventory(withMask.inventory),
    tiers,
  );
  return {
    ...withMask,
    inventory: serializeInventory(items),
  };
}
