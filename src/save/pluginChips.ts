import {
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
} from "./constants";

/**
 * Identity fields for a plug-in chip (NieREdit PluginChipId).
 * For known chips, baseCode/baseId are the vanilla bases (level not applied).
 * For unknown chips, baseCode/baseId are the raw on-disk values.
 */
export type PluginChipId = {
  baseCode: number;
  baseId: number;
  type: number;
  /** Default/base weight from vanilla tables (informational). */
  weight: number;
  hasLevels: boolean;
  isUnknown?: boolean;
};

export type PluginChip = {
  position: number;
  id: PluginChipId;
  level: number;
  weight: number;
  slotA: number;
  slotB: number;
  slotC: number;
  corpseSlotA: number;
  corpseSlotB: number;
  corpseSlotC: number;
  destroyOnCorpseLostMaybe: number;
};

export type PluginChipPatch = Partial<
  Pick<
    PluginChip,
    | "level"
    | "weight"
    | "id"
    | "slotA"
    | "slotB"
    | "slotC"
    | "corpseSlotA"
    | "corpseSlotB"
    | "corpseSlotC"
    | "destroyOnCorpseLostMaybe"
  >
>;

/** NieREdit VanillaPluginChipIds.EMPTY. */
export const EMPTY_PLUGIN_CHIP_ID: PluginChipId = {
  baseCode: -1,
  baseId: -1,
  type: -1,
  weight: -1,
  hasLevels: true,
};

/**
 * Vanilla plug-in chip identities (NieREdit VanillaPluginChipIds), excluding
 * EMPTY which is handled separately. Needed so level encoding matches the
 * reference editor on serialize.
 */
export const VANILLA_PLUGIN_CHIP_IDS: readonly PluginChipId[] = [
  { baseCode: 0x00000000, baseId: 0x00000bb9, type: 0x01, weight: 4, hasLevels: true },
  { baseCode: 0x00000009, baseId: 0x00000bc2, type: 0x02, weight: 4, hasLevels: true },
  { baseCode: 0x00000012, baseId: 0x00000bcb, type: 0x03, weight: 4, hasLevels: true },
  { baseCode: 0x0000001b, baseId: 0x00000bd4, type: 0x04, weight: 4, hasLevels: true },
  { baseCode: 0x000000a3, baseId: 0x00000bdd, type: 0x05, weight: 4, hasLevels: true },
  { baseCode: 0x00000049, baseId: 0x00000be6, type: 0x06, weight: 4, hasLevels: true },
  { baseCode: 0x00000052, baseId: 0x00000bef, type: 0x07, weight: 4, hasLevels: true },
  { baseCode: 0x0000005b, baseId: 0x00000bf8, type: 0x08, weight: 4, hasLevels: true },
  { baseCode: 0x0000006d, baseId: 0x00000c01, type: 0x09, weight: 4, hasLevels: true },
  { baseCode: 0x00000076, baseId: 0x00000c0a, type: 0x0a, weight: 4, hasLevels: true },
  { baseCode: 0x0000007f, baseId: 0x00000c13, type: 0x0b, weight: 4, hasLevels: true },
  { baseCode: 0x00000088, baseId: 0x00000c1c, type: 0x0c, weight: 4, hasLevels: true },
  { baseCode: 0x000000ac, baseId: 0x00000c25, type: 0x0d, weight: 4, hasLevels: true },
  { baseCode: 0x000000b5, baseId: 0x00000c2e, type: 0x0e, weight: 4, hasLevels: true },
  { baseCode: 0x000000be, baseId: 0x00000c37, type: 0x0f, weight: 4, hasLevels: true },
  { baseCode: 0x000000c7, baseId: 0x00000c40, type: 0x10, weight: 4, hasLevels: true },
  { baseCode: 0x00000024, baseId: 0x00000c49, type: 0x11, weight: 4, hasLevels: true },
  { baseCode: 0x0000002d, baseId: 0x00000c52, type: 0x12, weight: 4, hasLevels: true },
  { baseCode: 0x00000091, baseId: 0x00000c5b, type: 0x13, weight: 4, hasLevels: true },
  { baseCode: 0x000000d0, baseId: 0x00000c64, type: 0x14, weight: 4, hasLevels: true },
  { baseCode: 0x0000009a, baseId: 0x00000c6d, type: 0x15, weight: 4, hasLevels: true },
  { baseCode: 0x000000d9, baseId: 0x00000c76, type: 0x16, weight: 4, hasLevels: true },
  { baseCode: 0x00000064, baseId: 0x00000c7f, type: 0x17, weight: 4, hasLevels: true },
  { baseCode: 0x00000036, baseId: 0x00000c91, type: 0x18, weight: 4, hasLevels: true },
  { baseCode: 0x000000e2, baseId: 0x00000c9a, type: 0x19, weight: 4, hasLevels: true },
  { baseCode: 0x0000003f, baseId: 0x00000ca3, type: 0x1a, weight: 4, hasLevels: true },
  { baseCode: 0x000000eb, baseId: 0x00000cac, type: 0x1b, weight: 4, hasLevels: true },
  { baseCode: 0x000000fd, baseId: 0x00000cbe, type: 0x1d, weight: 4, hasLevels: true },
  { baseCode: 0x00000106, baseId: 0x00000cd9, type: 0x1e, weight: 4, hasLevels: true },
  { baseCode: 0x0000010f, baseId: 0x00000ce2, type: 0x1f, weight: 4, hasLevels: true },
  { baseCode: 0x00000118, baseId: 0x00000cfd, type: 0x22, weight: 4, hasLevels: true },
  { baseCode: 0x000000f5, baseId: 0x00000c88, type: 0x23, weight: 6, hasLevels: false },
  { baseCode: 0x00000121, baseId: 0x00000d06, type: 0x26, weight: 6, hasLevels: false },
  { baseCode: 0x00000123, baseId: 0x00000d07, type: 0x27, weight: 2, hasLevels: false },
  { baseCode: 0x0000012d, baseId: 0x00000d08, type: 0x28, weight: 3, hasLevels: false },
  { baseCode: 0x00000126, baseId: 0x00000d09, type: 0x29, weight: 2, hasLevels: false },
  { baseCode: 0x00000122, baseId: 0x00000d0a, type: 0x2a, weight: 2, hasLevels: false },
  { baseCode: 0x000000f6, baseId: 0x00000d0b, type: 0x2c, weight: 6, hasLevels: false },
  { baseCode: 0x00000048, baseId: 0x00000d0c, type: 0x2d, weight: 6, hasLevels: false },
  { baseCode: 0x000000f7, baseId: 0x00000d0d, type: 0x2e, weight: 6, hasLevels: false },
  { baseCode: 0x000000f4, baseId: 0x00000d0e, type: 0x2f, weight: 6, hasLevels: false },
  { baseCode: 0x00000125, baseId: 0x00000d0f, type: 0x30, weight: 2, hasLevels: false },
  { baseCode: 0x00000129, baseId: 0x00000d10, type: 0x31, weight: 2, hasLevels: false },
  { baseCode: 0x00000127, baseId: 0x00000d11, type: 0x32, weight: 2, hasLevels: false },
  { baseCode: 0x00000124, baseId: 0x00000d12, type: 0x33, weight: 1, hasLevels: false },
  { baseCode: 0x0000012a, baseId: 0x00000d13, type: 0x34, weight: 1, hasLevels: false },
  { baseCode: 0x0000012c, baseId: 0x00000d14, type: 0x35, weight: 3, hasLevels: false },
  { baseCode: 0x00000128, baseId: 0x00000d15, type: 0x36, weight: 1, hasLevels: false },
  { baseCode: 0x0000012e, baseId: 0x00000d16, type: 0x37, weight: 3, hasLevels: false },
  { baseCode: 0x0000012b, baseId: 0x00000d19, type: 0x3a, weight: 3, hasLevels: false },
  { baseCode: 0x000000f8, baseId: 0x00000d1a, type: 0x3b, weight: 1, hasLevels: false },
  { baseCode: 0x000000f9, baseId: 0x00000d1b, type: 0x3c, weight: 1, hasLevels: false },
  { baseCode: 0x000000fa, baseId: 0x00000d1c, type: 0x3d, weight: 1, hasLevels: false },
  { baseCode: 0x000000fb, baseId: 0x00000d1d, type: 0x3e, weight: 1, hasLevels: false },
  { baseCode: 0x000000fc, baseId: 0x00000d1e, type: 0x3f, weight: 1, hasLevels: false },
];

export class PluginChipsSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number, expected: number = PLUGIN_CHIPS_SIZE_BYTES) {
    super(
      `Invalid plugin chips region size: expected ${expected} bytes, got ${actual}`,
    );
    this.name = "PluginChipsSizeError";
    this.expected = expected;
    this.actual = actual;
  }
}

/** Loadout set keys matching `slotA` / `slotB` / `slotC`. */
export type PluginChipLoadoutSet = "A" | "B" | "C";

/** OS chip type — cannot be unequipped from a loadout set. */
export const OS_PLUGIN_CHIP_TYPE = 0x2a;

const LOADOUT_SLOT_KEY: Record<
  PluginChipLoadoutSet,
  "slotA" | "slotB" | "slotC"
> = {
  A: "slotA",
  B: "slotB",
  C: "slotC",
};

export class OsChipLockedError extends Error {
  constructor(
    message = "OS chip (type 0x2A) cannot be unequipped or cleared from a loadout",
  ) {
    super(message);
    this.name = "OsChipLockedError";
  }
}

/**
 * Rewrite one set’s strip start indices tightly from 0 (in-game Optimize).
 * Equipped chips keep left-to-right order by current start; unequipped stay -1.
 * Other sets’ slot fields are unchanged. Corpse slots are ignored.
 */
export function optimizePluginChipLoadout(
  chips: PluginChip[],
  set: PluginChipLoadoutSet,
): PluginChip[] {
  if (chips.length !== PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new PluginChipsSizeError(
      chips.length * PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
  }

  const key = LOADOUT_SLOT_KEY[set];
  const equipped = chips
    .map((chip, index) => ({ chip, index }))
    .filter(({ chip }) => chip[key] >= 0)
    .sort(
      (a, b) => a.chip[key] - b.chip[key] || a.index - b.index,
    );

  const starts = new Map<number, number>();
  let cursor = 0;
  for (const { chip, index } of equipped) {
    starts.set(index, cursor);
    cursor += chip.weight;
  }

  return chips.map((chip, index) => {
    const start = starts.get(index);
    if (start === undefined) return chip;
    if (chip[key] === start) return chip;
    return { ...chip, [key]: start };
  });
}

/**
 * Unequip a chip from one loadout set, then Optimize that set.
 * OS chips (type 0x2A) cannot be unequipped while present on the set.
 */
export function unequipPluginChipFromLoadout(
  chips: PluginChip[],
  index: number,
  set: PluginChipLoadoutSet,
): PluginChip[] {
  if (index < 0 || index >= PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new RangeError(
      `Plugin chip index out of range: ${index} (expected 0..${PLUGIN_CHIPS_SIZE_ITEMS - 1})`,
    );
  }
  if (chips.length !== PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new PluginChipsSizeError(
      chips.length * PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
  }

  const key = LOADOUT_SLOT_KEY[set];
  const chip = chips[index]!;
  if (chip[key] < 0) return chips;
  if (chip.id.type === OS_PLUGIN_CHIP_TYPE) {
    throw new OsChipLockedError();
  }

  const cleared = setPluginChip(chips, index, { [key]: -1 });
  return optimizePluginChipLoadout(cleared, set);
}

/**
 * Change a chip’s weight and re-Optimize every loadout set where it is equipped.
 */
export function setEquippedPluginChipWeight(
  chips: PluginChip[],
  index: number,
  weight: number,
): PluginChip[] {
  if (index < 0 || index >= PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new RangeError(
      `Plugin chip index out of range: ${index} (expected 0..${PLUGIN_CHIPS_SIZE_ITEMS - 1})`,
    );
  }
  if (chips.length !== PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new PluginChipsSizeError(
      chips.length * PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
  }

  let next = setPluginChip(chips, index, { weight });
  const chip = next[index]!;
  for (const set of ["A", "B", "C"] as const) {
    if (chip[LOADOUT_SLOT_KEY[set]] >= 0) {
      next = optimizePluginChipLoadout(next, set);
    }
  }
  return next;
}

/**
 * Minimum diamond (◆) weight for a chip level — NieREdit TabSkills rule.
 * Out-of-range levels fall back to 4.
 */
export function minimumWeightForLevel(level: number): number {
  switch (level) {
    case 0:
      return 4;
    case 1:
      return 5;
    case 2:
      return 6;
    case 3:
      return 7;
    case 4:
      return 9;
    case 5:
      return 11;
    case 6:
      return 14;
    case 7:
      return 17;
    case 8:
      return 21;
    default:
      return 4;
  }
}

function idsEqual(a: PluginChipId, b: PluginChipId): boolean {
  return (
    a.baseCode === b.baseCode &&
    a.baseId === b.baseId &&
    a.type === b.type &&
    a.hasLevels === b.hasLevels
  );
}

function resolveId(
  rawBaseCode: number,
  rawBaseId: number,
  type: number,
  level: number,
  weight: number,
): PluginChipId {
  if (type === EMPTY_PLUGIN_CHIP_ID.type) {
    return { ...EMPTY_PLUGIN_CHIP_ID };
  }

  // NieREdit uses level != 0 to decide whether stored codes include level.
  const levelApplied = level !== 0;
  const modifiedBaseCode = rawBaseCode - level;
  const modifiedBaseId = rawBaseId - level;

  const matched = VANILLA_PLUGIN_CHIP_IDS.find(
    (it) =>
      it.type === type &&
      ((it.baseId === rawBaseId && !levelApplied) ||
        (it.baseId === modifiedBaseId && levelApplied)) &&
      ((it.baseCode === rawBaseCode && !levelApplied) ||
        (it.baseCode === modifiedBaseCode && levelApplied)),
  );

  if (matched) {
    return { ...matched };
  }

  return {
    baseCode: rawBaseCode,
    baseId: rawBaseId,
    type,
    weight,
    hasLevels: true,
    isUnknown: true,
  };
}

function readChip(view: DataView, position: number): PluginChip {
  const offset = position * PLUGIN_CHIPS_ITEM_SIZE_BYTES;
  const rawBaseCode = view.getInt32(offset, true);
  const rawBaseId = view.getInt32(offset + 4, true);
  const type = view.getInt32(offset + 8, true);
  const level = view.getInt32(offset + 12, true);
  const weight = view.getInt32(offset + 16, true);

  return {
    position,
    id: resolveId(rawBaseCode, rawBaseId, type, level, weight),
    level,
    weight,
    slotA: view.getInt32(offset + 20, true),
    slotB: view.getInt32(offset + 24, true),
    slotC: view.getInt32(offset + 28, true),
    corpseSlotA: view.getInt32(offset + 32, true),
    corpseSlotB: view.getInt32(offset + 36, true),
    corpseSlotC: view.getInt32(offset + 40, true),
    destroyOnCorpseLostMaybe: view.getInt32(offset + 44, true),
  };
}

function writeChip(view: DataView, chip: PluginChip): void {
  const offset = chip.position * PLUGIN_CHIPS_ITEM_SIZE_BYTES;
  const { id, level } = chip;

  let encodedBaseCode: number;
  let encodedBaseId: number;
  if (id.isUnknown) {
    encodedBaseCode = id.baseCode;
    encodedBaseId = id.baseId;
  } else if (idsEqual(id, EMPTY_PLUGIN_CHIP_ID) || !id.hasLevels) {
    encodedBaseCode = id.baseCode;
    encodedBaseId = id.baseId;
  } else {
    encodedBaseCode = id.baseCode + level;
    encodedBaseId = id.baseId + level;
  }

  view.setInt32(offset, encodedBaseCode, true);
  view.setInt32(offset + 4, encodedBaseId, true);
  view.setInt32(offset + 8, id.type, true);
  view.setInt32(offset + 12, level, true);
  view.setInt32(offset + 16, chip.weight, true);
  view.setInt32(offset + 20, chip.slotA, true);
  view.setInt32(offset + 24, chip.slotB, true);
  view.setInt32(offset + 28, chip.slotC, true);
  view.setInt32(offset + 32, chip.corpseSlotA, true);
  view.setInt32(offset + 36, chip.corpseSlotB, true);
  view.setInt32(offset + 40, chip.corpseSlotC, true);
  view.setInt32(offset + 44, chip.destroyOnCorpseLostMaybe, true);
}

/**
 * Parse the plug-in chips region (300 × 48-byte records).
 * Encoding matches NieREdit PluginChip.read / serialize.
 */
export function parsePluginChips(region: Uint8Array): PluginChip[] {
  if (region.length !== PLUGIN_CHIPS_SIZE_BYTES) {
    throw new PluginChipsSizeError(region.length);
  }
  const view = new DataView(region.buffer, region.byteOffset, region.byteLength);
  const chips: PluginChip[] = [];
  for (let i = 0; i < PLUGIN_CHIPS_SIZE_ITEMS; i++) {
    chips.push(readChip(view, i));
  }
  return chips;
}

/**
 * Serialize plug-in chips back to a 300 × 48-byte region.
 */
export function serializePluginChips(chips: PluginChip[]): Uint8Array {
  if (chips.length !== PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new PluginChipsSizeError(
      chips.length * PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
  }
  const out = new Uint8Array(PLUGIN_CHIPS_SIZE_BYTES);
  const view = new DataView(out.buffer);
  for (const chip of chips) {
    writeChip(view, chip);
  }
  return out;
}

/** Immutable patch of one chip by index (level/weight/id/slots). */
export function setPluginChip(
  chips: PluginChip[],
  index: number,
  patch: PluginChipPatch,
): PluginChip[] {
  return chips.map((chip, i) =>
    i === index
      ? {
          ...chip,
          ...patch,
          id: patch.id ? { ...patch.id } : chip.id,
          position: index,
        }
      : chip,
  );
}

/**
 * Replace a chip type with the same reset semantics as NieREdit's selector:
 * level starts at zero, weight comes from the selected type, and equipment
 * bookkeeping is cleared.
 */
export function replacePluginChipType(
  chips: PluginChip[],
  index: number,
  id: PluginChipId,
): PluginChip[] {
  if (index < 0 || index >= PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new RangeError(
      `Plugin chip index out of range: ${index} (expected 0..${PLUGIN_CHIPS_SIZE_ITEMS - 1})`,
    );
  }
  if (chips.length !== PLUGIN_CHIPS_SIZE_ITEMS) {
    throw new PluginChipsSizeError(
      chips.length * PLUGIN_CHIPS_ITEM_SIZE_BYTES,
    );
  }

  const current = chips[index]!;
  if (current.id.type === OS_PLUGIN_CHIP_TYPE) {
    throw new OsChipLockedError();
  }

  const next = chips.slice();
  next[index] = {
    position: index,
    id: { ...id },
    level: 0,
    weight: id.weight,
    slotA: -1,
    slotB: -1,
    slotC: -1,
    corpseSlotA: -1,
    corpseSlotB: -1,
    corpseSlotC: -1,
    destroyOnCorpseLostMaybe: 0,
  };
  return next;
}
