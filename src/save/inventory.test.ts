import { describe, expect, it } from "vitest";
import {
  INVENTORY_ITEM_SIZE_BYTES,
  INVENTORY_SIZE_BYTES,
  INVENTORY_SIZE_ITEMS,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_CORPSE_INVENTORY_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  ITEM_STATUS_ACTIVE,
  ITEM_STATUS_INACTIVE,
  parseInventory,
  serializeInventory,
  setInventoryItemId,
  setInventoryItem,
  type InventoryItem,
} from "./inventory";
import { load, serialize } from "./slotData";

/** Empty slot hex from NieREdit InventoryItemTest. */
const EMPTY_ITEM_HEX = "ffffffffffffffff00000000";
/** Grimoire Weiss qty 1 — NieREdit InventoryItemTest. */
const GRIMOIRE_WEISS_HEX = "b70300000000070001000000";
/** Medium Recovery qty 86 — NieREdit InventoryItemTest. */
const MEDIUM_RECOVERY_HEX = "010000000000070056000000";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function emptyItem(position: number): InventoryItem {
  return {
    position,
    id: -1,
    status: ITEM_STATUS_INACTIVE,
    quantity: 0,
  };
}

function inventoryRegionFromItems(items: InventoryItem[]): Uint8Array {
  return serializeInventory(items);
}

function syntheticSaveWithInventory(inventory: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  bytes.set(inventory, SAVEFILE_INVENTORY_START_BYTE);
  return bytes;
}

describe("InventoryItem parse/serialize (NieREdit 12-byte layout)", () => {
  it("parses an empty item slot", () => {
    const region = new Uint8Array(INVENTORY_SIZE_BYTES);
    region.set(hexToBytes(EMPTY_ITEM_HEX), 0);
    for (let i = 1; i < INVENTORY_SIZE_ITEMS; i++) {
      region.set(hexToBytes(EMPTY_ITEM_HEX), i * INVENTORY_ITEM_SIZE_BYTES);
    }

    const items = parseInventory(region);
    expect(items).toHaveLength(INVENTORY_SIZE_ITEMS);
    expect(items[0]).toEqual(emptyItem(0));
    expect(items[1]).toEqual(emptyItem(1));
  });

  it("parses used slots (id, status, quantity) from NieREdit fixtures", () => {
    const region = new Uint8Array(INVENTORY_SIZE_BYTES);
    for (let i = 0; i < INVENTORY_SIZE_ITEMS; i++) {
      region.set(hexToBytes(EMPTY_ITEM_HEX), i * INVENTORY_ITEM_SIZE_BYTES);
    }
    region.set(hexToBytes(GRIMOIRE_WEISS_HEX), 0);
    region.set(hexToBytes(MEDIUM_RECOVERY_HEX), INVENTORY_ITEM_SIZE_BYTES);

    const items = parseInventory(region);
    expect(items[0]).toEqual({
      position: 0,
      id: 0x03b7,
      status: ITEM_STATUS_ACTIVE,
      quantity: 1,
    });
    expect(items[1]).toEqual({
      position: 1,
      id: 1,
      status: ITEM_STATUS_ACTIVE,
      quantity: 86,
    });
  });

  it("serializes empty and used items back to NieREdit hex", () => {
    const full = Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, i) => {
      if (i === 0) {
        return {
          position: 0,
          id: 0x03b7,
          status: ITEM_STATUS_ACTIVE,
          quantity: 1,
        };
      }
      if (i === 1) {
        return {
          position: 1,
          id: 1,
          status: ITEM_STATUS_ACTIVE,
          quantity: 86,
        };
      }
      return emptyItem(i);
    });
    const bytes = serializeInventory(full);
    expect(bytesToHex(bytes.subarray(0, 12))).toBe(GRIMOIRE_WEISS_HEX);
    expect(bytesToHex(bytes.subarray(12, 24))).toBe(MEDIUM_RECOVERY_HEX);
    expect(bytesToHex(bytes.subarray(24, 36))).toBe(EMPTY_ITEM_HEX);
  });
});

describe("Inventory region round-trip and edit", () => {
  it("fills an empty slot as active with quantity one and clears it to EMPTY", () => {
    const items = Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, i) =>
      emptyItem(i),
    );

    const filled = setInventoryItemId(items, 7, 0x32);
    expect(filled[7]).toEqual({
      position: 7,
      id: 0x32,
      status: ITEM_STATUS_ACTIVE,
      quantity: 1,
    });

    const cleared = setInventoryItemId(filled, 7, -1);
    expect(cleared[7]).toEqual(emptyItem(7));
    expect(cleared.filter((item) => item !== items[item.position])).toHaveLength(1);
  });

  it("round-trips an unedited inventory region byte-identically", () => {
    const items = Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, i) => {
      if (i === 0) {
        return {
          position: 0,
          id: 0x03b7,
          status: ITEM_STATUS_ACTIVE,
          quantity: 1,
        };
      }
      if (i === 3) {
        return {
          position: 3,
          id: 1,
          status: ITEM_STATUS_ACTIVE,
          quantity: 86,
        };
      }
      return emptyItem(i);
    });
    const input = inventoryRegionFromItems(items);
    expect(serializeInventory(parseInventory(input))).toEqual(input);
  });

  it("editing id/quantity changes only the intended item bytes in the save", () => {
    const items = Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, i) =>
      emptyItem(i),
    );
    items[2] = {
      position: 2,
      id: 1,
      status: ITEM_STATUS_ACTIVE,
      quantity: 10,
    };
    const inventory = inventoryRegionFromItems(items);
    const input = syntheticSaveWithInventory(inventory);
    const slot = load(input);

    const editedItems = setInventoryItem(parseInventory(slot.inventory), 2, {
      id: 42,
      quantity: 99,
    });
    const out = serialize({
      ...slot,
      inventory: serializeInventory(editedItems),
    });

    const itemOffset =
      SAVEFILE_INVENTORY_START_BYTE + 2 * INVENTORY_ITEM_SIZE_BYTES;

    // Outside inventory unchanged.
    expect(out.subarray(0, SAVEFILE_INVENTORY_START_BYTE)).toEqual(
      input.subarray(0, SAVEFILE_INVENTORY_START_BYTE),
    );
    expect(
      out.subarray(SAVEFILE_INVENTORY_START_BYTE + INVENTORY_SIZE_BYTES),
    ).toEqual(
      input.subarray(SAVEFILE_INVENTORY_START_BYTE + INVENTORY_SIZE_BYTES),
    );

    // Other inventory slots unchanged.
    expect(out.subarray(SAVEFILE_INVENTORY_START_BYTE, itemOffset)).toEqual(
      input.subarray(SAVEFILE_INVENTORY_START_BYTE, itemOffset),
    );
    expect(
      out.subarray(itemOffset + INVENTORY_ITEM_SIZE_BYTES, SAVEFILE_INVENTORY_START_BYTE + INVENTORY_SIZE_BYTES),
    ).toEqual(
      input.subarray(itemOffset + INVENTORY_ITEM_SIZE_BYTES, SAVEFILE_INVENTORY_START_BYTE + INVENTORY_SIZE_BYTES),
    );

    // Slot 2: id and qty changed; status still active.
    const editedItem = out.subarray(itemOffset, itemOffset + INVENTORY_ITEM_SIZE_BYTES);
    const view = new DataView(editedItem.buffer, editedItem.byteOffset, editedItem.byteLength);
    expect(view.getInt32(0, true)).toBe(42);
    expect(view.getUint32(4, true)).toBe(0x00070000);
    expect(view.getInt32(8, true)).toBe(99);
  });

  it("parses corpse inventory with the same 12-byte layout", () => {
    const region = new Uint8Array(INVENTORY_SIZE_BYTES);
    for (let i = 0; i < INVENTORY_SIZE_ITEMS; i++) {
      region.set(hexToBytes(EMPTY_ITEM_HEX), i * INVENTORY_ITEM_SIZE_BYTES);
    }
    region.set(hexToBytes(MEDIUM_RECOVERY_HEX), 0);
    const items = parseInventory(region);
    expect(items[0].id).toBe(1);
    expect(items[0].quantity).toBe(86);
  });

  it("editing a corpse empty slot changes only that corpse record", () => {
    const empty = Array.from({ length: INVENTORY_SIZE_ITEMS }, (_, i) =>
      emptyItem(i),
    );
    const input = syntheticSaveWithInventory(serializeInventory(empty));
    input.set(serializeInventory(empty), SAVEFILE_CORPSE_INVENTORY_START_BYTE);
    const slot = load(input);
    const corpse = setInventoryItemId(
      parseInventory(slot.corpseInventory),
      5,
      0x32,
    );
    const out = serialize({
      ...slot,
      corpseInventory: serializeInventory(corpse),
    });
    const start =
      SAVEFILE_CORPSE_INVENTORY_START_BYTE +
      5 * INVENTORY_ITEM_SIZE_BYTES;
    const end = start + INVENTORY_ITEM_SIZE_BYTES;

    expect(out.subarray(0, start)).toEqual(input.subarray(0, start));
    expect(out.subarray(end)).toEqual(input.subarray(end));
    expect(bytesToHex(out.subarray(start, end))).toBe(
      "320000000000070001000000",
    );
  });
});
