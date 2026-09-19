import { WEAPON_SLOT_SIZE_BYTES } from "./constants";

export const EMPTY_WEAPON_SLOT_ID = -1;

export class WeaponSlotValueError extends Error {
  constructor(value: number) {
    super(`Weapon slot ID must be a signed 32-bit integer: ${value}`);
    this.name = "WeaponSlotValueError";
  }
}

type EmptyWeaponSlotEncoding = -1 | 0;

export type WeaponSlot = {
  readonly lightAttack: number;
  readonly heavyAttack: number;
  readonly lightEmptyEncoding: EmptyWeaponSlotEncoding;
  readonly heavyEmptyEncoding: EmptyWeaponSlotEncoding;
};

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

function normalizeId(id: number): number {
  return id === 0 || id === -1 ? EMPTY_WEAPON_SLOT_ID : id;
}

function assertI32(value: number): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new WeaponSlotValueError(value);
  }
}

/** Parse Set 1 or Set 2 into light/heavy weapon IDs. */
export function parseWeaponSlot(bytes: Uint8Array): WeaponSlot {
  if (bytes.length !== WEAPON_SLOT_SIZE_BYTES) {
    throw new Error(
      `Invalid weapon slot size: expected ${WEAPON_SLOT_SIZE_BYTES}, got ${bytes.length}`,
    );
  }
  const lightRaw = readI32LE(bytes, 0);
  const heavyRaw = readI32LE(bytes, 4);
  return {
    lightAttack: normalizeId(lightRaw),
    heavyAttack: normalizeId(heavyRaw),
    lightEmptyEncoding: lightRaw === -1 ? -1 : 0,
    heavyEmptyEncoding: heavyRaw === -1 ? -1 : 0,
  };
}

/** Serialize one light/heavy equipment set while preserving its EMPTY encoding. */
export function serializeWeaponSlot(slot: WeaponSlot): Uint8Array {
  assertI32(slot.lightAttack);
  assertI32(slot.heavyAttack);
  const out = new Uint8Array(WEAPON_SLOT_SIZE_BYTES);
  writeI32LE(
    out,
    0,
    slot.lightAttack === EMPTY_WEAPON_SLOT_ID
      ? slot.lightEmptyEncoding
      : slot.lightAttack,
  );
  writeI32LE(
    out,
    4,
    slot.heavyAttack === EMPTY_WEAPON_SLOT_ID
      ? slot.heavyEmptyEncoding
      : slot.heavyAttack,
  );
  return out;
}

/** Replace or clear one attack assignment without touching its sibling. */
export function setWeaponSlotAttack(
  slot: WeaponSlot,
  attack: "light" | "heavy",
  id: number,
): WeaponSlot {
  assertI32(id);
  return attack === "light"
    ? { ...slot, lightAttack: normalizeId(id) }
    : { ...slot, heavyAttack: normalizeId(id) };
}
