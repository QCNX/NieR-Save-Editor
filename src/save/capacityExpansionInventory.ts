/**
 * Purchased motherboard capacity sync entry point.
 *
 * Evidence (local Slot1 progressive purchase snapshots): when the mask at
 * 0x324B8 advanced 0x01 → 0x03 → 0x07 → 0x2f → 0x6f → 0xef, both main and
 * corpse inventory regions were unchanged across steps. Slot0/Slot2 at full
 * mask 0xEF likewise have no dedicated +8/+16/+24 backpack stacks.
 * CORE_ITEM_NAME / items maps have no 「扩充储存容量+*」 entries.
 *
 * Conclusion: purchases are mask-only; there are no verified inventory item
 * ids to keep in sync. Closest correct behaviour is set the mask and leave
 * backpack rows alone (do not invent catalog ids such as 8042–8044).
 */

import type { SlotData } from "./slotData";
import type { InventoryItem } from "./inventory";
import {
  purchasedCapacityTiers,
  setPurchasedChipCapacity,
  type PurchasedCapacityTiers,
} from "./purchasedCapacity";

/**
 * Verified main-backpack item ids for capacity expansion stacks.
 * Empty: none exist in game inventory (mask at 0x324B8 only).
 */
export const CAPACITY_EXPANSION_ITEM_IDS: readonly number[] = Object.freeze([]);

export { purchasedCapacityTiers };
export type { PurchasedCapacityTiers };

/**
 * Historical sync hook: no-op for inventory because expansion purchases are
 * not stored as backpack item stacks.
 */
export function syncInventoryCapacityExpansionItems(
  items: InventoryItem[],
  _tiers: PurchasedCapacityTiers,
): InventoryItem[] {
  return items;
}

/**
 * Set purchased capacity mask. Inventory is left unchanged (verified absence
 * of backpack expansion item ids).
 */
export function setPurchasedChipCapacityWithInventorySync(
  slot: SlotData,
  capacity: number,
): SlotData {
  return setPurchasedChipCapacity(slot, capacity);
}
