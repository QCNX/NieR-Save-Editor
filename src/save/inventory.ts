import {
  INVENTORY_ITEM_SIZE_BYTES,
  INVENTORY_SIZE_BYTES,
  INVENTORY_SIZE_ITEMS,
} from "./constants";

/** NieREdit ItemStatus.ACTIVE — bytes 00 00 07 00. */
export const ITEM_STATUS_ACTIVE = "active" as const;
/** NieREdit ItemStatus.INACTIVE — bytes ff ff ff ff. */
export const ITEM_STATUS_INACTIVE = "inactive" as const;

export type ItemStatus = typeof ITEM_STATUS_ACTIVE | typeof ITEM_STATUS_INACTIVE;

export type InventoryItem = {
  position: number;
  /** Signed int32 item id (−1 = empty). */
  id: number;
  status: ItemStatus;
  /** Signed int32 quantity. */
  quantity: number;
};

const STATUS_ACTIVE_U32 = 0x0007_0000;
const STATUS_INACTIVE_U32 = 0xffff_ffff;

export class InventorySizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number, expected: number = INVENTORY_SIZE_BYTES) {
    super(
      `Invalid inventory region size: expected ${expected} bytes, got ${actual}`,
    );
    this.name = "InventorySizeError";
    this.expected = expected;
    this.actual = actual;
  }
}

export class InventoryItemStatusError extends Error {
  readonly hex: string;

  constructor(hex: string) {
    super(`Unknown inventory item status: ${hex}`);
    this.name = "InventoryItemStatusError";
    this.hex = hex;
  }
}

function statusFromU32(value: number): ItemStatus {
  if (value === STATUS_ACTIVE_U32) return ITEM_STATUS_ACTIVE;
  if (value === STATUS_INACTIVE_U32) return ITEM_STATUS_INACTIVE;
  const hex = value.toString(16).padStart(8, "0");
  throw new InventoryItemStatusError(hex);
}

function statusToU32(status: ItemStatus): number {
  return status === ITEM_STATUS_ACTIVE ? STATUS_ACTIVE_U32 : STATUS_INACTIVE_U32;
}

function readItem(view: DataView, index: number): InventoryItem {
  const offset = index * INVENTORY_ITEM_SIZE_BYTES;
  return {
    position: index,
    id: view.getInt32(offset, true),
    status: statusFromU32(view.getUint32(offset + 4, true)),
    quantity: view.getInt32(offset + 8, true),
  };
}

function writeItem(view: DataView, item: InventoryItem): void {
  const offset = item.position * INVENTORY_ITEM_SIZE_BYTES;
  view.setInt32(offset, item.id, true);
  view.setUint32(offset + 4, statusToU32(item.status), true);
  view.setInt32(offset + 8, item.quantity, true);
}

/**
 * Parse a main or corpse inventory region (256 × 12-byte items).
 * Layout matches NieREdit InventoryItem: id i32 LE, status u32 LE, quantity i32 LE.
 */
export function parseInventory(bytes: Uint8Array): InventoryItem[] {
  if (bytes.length !== INVENTORY_SIZE_BYTES) {
    throw new InventorySizeError(bytes.length);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const items: InventoryItem[] = [];
  for (let i = 0; i < INVENTORY_SIZE_ITEMS; i++) {
    items.push(readItem(view, i));
  }
  return items;
}

/**
 * Serialize 256 inventory items back to a region buffer.
 */
export function serializeInventory(items: InventoryItem[]): Uint8Array {
  if (items.length !== INVENTORY_SIZE_ITEMS) {
    throw new InventorySizeError(
      items.length * INVENTORY_ITEM_SIZE_BYTES,
      INVENTORY_SIZE_BYTES,
    );
  }
  const out = new Uint8Array(INVENTORY_SIZE_BYTES);
  const view = new DataView(out.buffer);
  for (let i = 0; i < items.length; i++) {
    writeItem(view, { ...items[i], position: i });
  }
  return out;
}

/**
 * Return a new item list with id / quantity / status patched at `index`.
 * Position is always the slot index; unrelated slots are unchanged.
 */
export function setInventoryItem(
  items: InventoryItem[],
  index: number,
  patch: Partial<Pick<InventoryItem, "id" | "quantity" | "status">>,
): InventoryItem[] {
  if (index < 0 || index >= items.length) {
    throw new RangeError(
      `Inventory slot index out of range: ${index} (length ${items.length})`,
    );
  }
  return items.map((item, i) =>
    i === index
      ? {
          ...item,
          ...patch,
          position: index,
        }
      : item,
  );
}

/**
 * Replace the item carried by a slot using NieREdit's fill/clear semantics.
 * A non-empty ID activates the slot with quantity 1; EMPTY resets the complete
 * record so stale status and quantity bytes cannot leak into the save.
 */
export function setInventoryItemId(
  items: InventoryItem[],
  index: number,
  id: number,
): InventoryItem[] {
  return setInventoryItem(items, index, {
    id,
    status: id === -1 ? ITEM_STATUS_INACTIVE : ITEM_STATUS_ACTIVE,
    quantity: id === -1 ? 0 : 1,
  });
}
