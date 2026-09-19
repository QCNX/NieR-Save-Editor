import {
  WEAPONS_ITEM_SIZE_BYTES,
  WEAPONS_SIZE_BYTES,
  WEAPONS_SIZE_ITEMS,
} from "./constants";

/**
 * One PC weapon record (20 bytes / 5 × i32 LE), matching NieREdit WeaponItem.
 * `id` is the raw weapon id (−1 / 0xffffffff = empty).
 */
export type WeaponItem = {
  position: number;
  id: number;
  level: number;
  newItem: boolean;
  newStory: boolean;
  enemiesDefeated: number;
};

/** NieREdit WeaponItem.EMPTY serialized bytes. */
export const EMPTY_WEAPON_BYTES = Uint8Array.of(
  0xff, 0xff, 0xff, 0xff,
  0x01, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
);

export class WeaponSizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeaponSizeError";
  }
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
    offset,
    true,
  );
}

function writeI32LE(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setInt32(
    offset,
    value,
    true,
  );
}

function intToBool(value: number): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  throw new Error(`Invalid integer for boolean! ${value}`);
}

function boolToInt(value: boolean): number {
  return value ? 1 : 0;
}

/** Parse a single 20-byte weapon record. */
export function parseWeaponItem(
  bytes: Uint8Array,
  position: number,
): WeaponItem {
  if (bytes.length !== WEAPONS_ITEM_SIZE_BYTES) {
    throw new WeaponSizeError(
      `Invalid weapon record size: expected ${WEAPONS_ITEM_SIZE_BYTES}, got ${bytes.length}`,
    );
  }
  const item: WeaponItem = {
    position,
    id: readI32LE(bytes, 0),
    level: readI32LE(bytes, 4),
    newItem: intToBool(readI32LE(bytes, 8)),
    newStory: intToBool(readI32LE(bytes, 12)),
    enemiesDefeated: readI32LE(bytes, 16),
  };
  const again = serializeWeaponItem(item);
  for (let i = 0; i < WEAPONS_ITEM_SIZE_BYTES; i++) {
    if (again[i] !== bytes[i]) {
      throw new Error("Weapon record does not round-trip");
    }
  }
  return item;
}

/** Serialize one weapon record to 20 bytes (position is not encoded). */
export function serializeWeaponItem(item: WeaponItem): Uint8Array {
  const out = new Uint8Array(WEAPONS_ITEM_SIZE_BYTES);
  writeI32LE(out, 0, item.id);
  writeI32LE(out, 4, item.level);
  writeI32LE(out, 8, boolToInt(item.newItem));
  writeI32LE(out, 12, boolToInt(item.newStory));
  writeI32LE(out, 16, item.enemiesDefeated);
  return out;
}

/**
 * Replace or clear a weapon slot using NieREdit's canonical EMPTY defaults.
 * Changing the ID intentionally resets all ID-specific progress fields.
 */
export function replaceWeaponId(item: WeaponItem, id: number): WeaponItem {
  return {
    position: item.position,
    id,
    level: 1,
    newItem: true,
    newStory: true,
    enemiesDefeated: 0,
  };
}

/** Parse the full PC weapons region (80 × 20 bytes). */
export function parseWeapons(region: Uint8Array): WeaponItem[] {
  if (region.length !== WEAPONS_SIZE_BYTES) {
    throw new WeaponSizeError(
      `Invalid weapons region size: expected ${WEAPONS_SIZE_BYTES}, got ${region.length}`,
    );
  }
  const items: WeaponItem[] = [];
  for (let i = 0; i < WEAPONS_SIZE_ITEMS; i++) {
    const start = i * WEAPONS_ITEM_SIZE_BYTES;
    items.push(
      parseWeaponItem(region.subarray(start, start + WEAPONS_ITEM_SIZE_BYTES), i),
    );
  }
  return items;
}

/** Serialize 80 weapon items back to the weapons region. */
export function serializeWeapons(items: WeaponItem[]): Uint8Array {
  if (items.length !== WEAPONS_SIZE_ITEMS) {
    throw new WeaponSizeError(
      `Invalid weapons count: expected ${WEAPONS_SIZE_ITEMS}, got ${items.length}`,
    );
  }
  const out = new Uint8Array(WEAPONS_SIZE_BYTES);
  for (let i = 0; i < WEAPONS_SIZE_ITEMS; i++) {
    const item = items[i];
    if (!item) {
      throw new WeaponSizeError(`Missing weapon at index ${i}`);
    }
    out.set(serializeWeaponItem({ ...item, position: i }), i * WEAPONS_ITEM_SIZE_BYTES);
  }
  return out;
}

/**
 * Write one weapon into a copy of the region; sibling slots stay byte-identical.
 */
export function writeWeaponAt(
  region: Uint8Array,
  item: WeaponItem,
): Uint8Array {
  if (region.length !== WEAPONS_SIZE_BYTES) {
    throw new WeaponSizeError(
      `Invalid weapons region size: expected ${WEAPONS_SIZE_BYTES}, got ${region.length}`,
    );
  }
  if (item.position < 0 || item.position >= WEAPONS_SIZE_ITEMS) {
    throw new Error(
      `Weapon position out of range: ${item.position} (0..${WEAPONS_SIZE_ITEMS - 1})`,
    );
  }
  const out = new Uint8Array(region);
  out.set(
    serializeWeaponItem(item),
    item.position * WEAPONS_ITEM_SIZE_BYTES,
  );
  return out;
}
