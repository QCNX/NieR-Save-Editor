import {
  AFTER_XP_SIZE_BYTES,
  AFTER_XP_START_BYTE,
  BETWEEN_CHIPS_AND_WEAPON_SLOTS_SIZE_BYTES,
  BETWEEN_CHIPS_AND_WEAPON_SLOTS_START_BYTE,
  BETWEEN_POD_AND_CHIPS_SIZE_BYTES,
  BETWEEN_POD_AND_CHIPS_START_BYTE,
  BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
  BETWEEN_WEAPON_SLOTS_AND_XP_START_BYTE,
  INVENTORY_SIZE_BYTES,
  MONEY_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_BYTES,
  POD_PROGRAMS_SIZE_BYTES,
  SAVEFILE_CORPSE_INVENTORY_START_BYTE,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_MONEY_START_BYTE,
  SAVEFILE_PLUGIN_CHIPS_START_BYTE,
  SAVEFILE_POD_PROGRAMS_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_WEAPON_SLOT_1_START_BYTE,
  SAVEFILE_WEAPON_SLOT_2_START_BYTE,
  SAVEFILE_WEAPONS_START_BYTE,
  SAVEFILE_XP_START_BYTE,
  WEAPONS_SIZE_BYTES,
  WEAPON_SLOT_SIZE_BYTES,
  XP_SIZE_BYTES,
} from "./constants";

/**
 * PC SlotData: known editable regions as placeholders plus opaque blobs.
 * Later tickets refine placeholders (money, inventory, …) without touching
 * unknown passthrough regions.
 */
export type SlotData = {
  /** Bytes [0, money). */
  beforeMoney: Uint8Array;
  /** Known field placeholder at money offset (4 LE bytes). */
  money: Uint8Array;
  /** Known field placeholder: main inventory block. */
  inventory: Uint8Array;
  /** Known field placeholder: corpse inventory block. */
  corpseInventory: Uint8Array;
  /** Known field placeholder: weapons block. */
  weapons: Uint8Array;
  /** Known field placeholder: POD programs block. */
  podPrograms: Uint8Array;
  /** Opaque gap between POD programs and plug-in chips. */
  betweenPodAndChips: Uint8Array;
  /** Known field placeholder: plug-in chips block. */
  pluginChips: Uint8Array;
  /** Opaque region from after chips through before weapon equipment slots. */
  betweenChipsAndWeaponSlots: Uint8Array;
  /** Raw Set 1 weapon equipment IDs (light/heavy). */
  weaponSlot1: Uint8Array;
  /** Raw Set 2 weapon equipment IDs (light/heavy). */
  weaponSlot2: Uint8Array;
  /** Opaque region between weapon equipment slots and XP. */
  betweenWeaponSlotsAndXp: Uint8Array;
  /** Known field placeholder at XP offset (4 LE bytes). */
  xp: Uint8Array;
  /** Opaque trailing region after XP. */
  afterXp: Uint8Array;
};

export class SlotDataSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number, expected: number = SAVEFILE_SIZE_BYTES) {
    super(
      `Invalid PC SlotData size: expected ${expected} bytes, got ${actual}`,
    );
    this.name = "SlotDataSizeError";
    this.expected = expected;
    this.actual = actual;
  }
}

function sliceCopy(bytes: Uint8Array, start: number, length: number): Uint8Array {
  return bytes.slice(start, start + length);
}

/**
 * Load a fixed-size PC save into SlotData.
 * Unknown regions are kept as opaque blobs for byte-identical serialize.
 */
export function load(bytes: Uint8Array): SlotData {
  if (bytes.length !== SAVEFILE_SIZE_BYTES) {
    throw new SlotDataSizeError(bytes.length);
  }

  return {
    beforeMoney: sliceCopy(bytes, 0, SAVEFILE_MONEY_START_BYTE),
    money: sliceCopy(bytes, SAVEFILE_MONEY_START_BYTE, MONEY_SIZE_BYTES),
    inventory: sliceCopy(
      bytes,
      SAVEFILE_INVENTORY_START_BYTE,
      INVENTORY_SIZE_BYTES,
    ),
    corpseInventory: sliceCopy(
      bytes,
      SAVEFILE_CORPSE_INVENTORY_START_BYTE,
      INVENTORY_SIZE_BYTES,
    ),
    weapons: sliceCopy(bytes, SAVEFILE_WEAPONS_START_BYTE, WEAPONS_SIZE_BYTES),
    podPrograms: sliceCopy(
      bytes,
      SAVEFILE_POD_PROGRAMS_START_BYTE,
      POD_PROGRAMS_SIZE_BYTES,
    ),
    betweenPodAndChips: sliceCopy(
      bytes,
      BETWEEN_POD_AND_CHIPS_START_BYTE,
      BETWEEN_POD_AND_CHIPS_SIZE_BYTES,
    ),
    pluginChips: sliceCopy(
      bytes,
      SAVEFILE_PLUGIN_CHIPS_START_BYTE,
      PLUGIN_CHIPS_SIZE_BYTES,
    ),
    betweenChipsAndWeaponSlots: sliceCopy(
      bytes,
      BETWEEN_CHIPS_AND_WEAPON_SLOTS_START_BYTE,
      BETWEEN_CHIPS_AND_WEAPON_SLOTS_SIZE_BYTES,
    ),
    weaponSlot1: sliceCopy(
      bytes,
      SAVEFILE_WEAPON_SLOT_1_START_BYTE,
      WEAPON_SLOT_SIZE_BYTES,
    ),
    weaponSlot2: sliceCopy(
      bytes,
      SAVEFILE_WEAPON_SLOT_2_START_BYTE,
      WEAPON_SLOT_SIZE_BYTES,
    ),
    betweenWeaponSlotsAndXp: sliceCopy(
      bytes,
      BETWEEN_WEAPON_SLOTS_AND_XP_START_BYTE,
      BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
    ),
    xp: sliceCopy(bytes, SAVEFILE_XP_START_BYTE, XP_SIZE_BYTES),
    afterXp: sliceCopy(bytes, AFTER_XP_START_BYTE, AFTER_XP_SIZE_BYTES),
  };
}

/**
 * Serialize SlotData back to PC save bytes.
 * Concatenates placeholders and opaque blobs in layout order.
 */
export function serialize(slot: SlotData): Uint8Array {
  const parts = [
    slot.beforeMoney,
    slot.money,
    slot.inventory,
    slot.corpseInventory,
    slot.weapons,
    slot.podPrograms,
    slot.betweenPodAndChips,
    slot.pluginChips,
    slot.betweenChipsAndWeaponSlots,
    slot.weaponSlot1,
    slot.weaponSlot2,
    slot.betweenWeaponSlotsAndXp,
    slot.xp,
    slot.afterXp,
  ];

  let total = 0;
  for (const part of parts) {
    total += part.length;
  }
  if (total !== SAVEFILE_SIZE_BYTES) {
    throw new SlotDataSizeError(total);
  }

  const out = new Uint8Array(SAVEFILE_SIZE_BYTES);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
