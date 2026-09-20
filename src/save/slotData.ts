import {
  AFTER_DEBUG_FLAG_SIZE_BYTES,
  AFTER_DEBUG_FLAG_START_BYTE,
  BEFORE_STEAM_ID_SIZE_BYTES,
  BETWEEN_CHARACTER_NAME_AND_MONEY_SIZE_BYTES,
  BETWEEN_CHARACTER_NAME_AND_MONEY_START_BYTE,
  BETWEEN_CHIPS_AND_OUTFIT_CONFIG_SIZE_BYTES,
  BETWEEN_CHIPS_AND_OUTFIT_CONFIG_START_BYTE,
  BETWEEN_EMIL_BULLETS_AND_WEAPON_SLOTS_SIZE_BYTES,
  BETWEEN_EMIL_BULLETS_AND_WEAPON_SLOTS_START_BYTE,
  BETWEEN_PLAY_TIME_AND_CHARACTER_NAME_SIZE_BYTES,
  BETWEEN_PLAY_TIME_AND_CHARACTER_NAME_START_BYTE,
  BETWEEN_OUTFIT_CONFIG_AND_PLAY_RECORDS_SIZE_BYTES,
  BETWEEN_OUTFIT_CONFIG_AND_PLAY_RECORDS_START_BYTE,
  BETWEEN_PLAY_RECORDS_AND_POD_COSMETIC_CONFIG_SIZE_BYTES,
  BETWEEN_PLAY_RECORDS_AND_POD_COSMETIC_CONFIG_START_BYTE,
  BETWEEN_POD_COSMETIC_CONFIG_AND_HAIR_COLORS_SIZE_BYTES,
  BETWEEN_POD_COSMETIC_CONFIG_AND_HAIR_COLORS_START_BYTE,
  BETWEEN_POD_AND_CHIPS_SIZE_BYTES,
  BETWEEN_POD_AND_CHIPS_START_BYTE,
  BETWEEN_POD_CONFIG_AND_DEBUG_FLAG_SIZE_BYTES,
  BETWEEN_POD_CONFIG_AND_DEBUG_FLAG_START_BYTE,
  BETWEEN_STEAM_ID_AND_PLAY_TIME_SIZE_BYTES,
  BETWEEN_STEAM_ID_AND_PLAY_TIME_START_BYTE,
  BETWEEN_WEAPON_SLOTS_AND_XP_SIZE_BYTES,
  BETWEEN_WEAPON_SLOTS_AND_XP_START_BYTE,
  BETWEEN_XP_AND_POD_CONFIG_SIZE_BYTES,
  BETWEEN_XP_AND_POD_CONFIG_START_BYTE,
  CHARACTER_NAME_SIZE_BYTES,
  DEBUG_FLAG_SIZE_BYTES,
  EMIL_BULLETS_EQUIPPED_SIZE_BYTES,
  HAIR_COLORS_SIZE_BYTES,
  INVENTORY_SIZE_BYTES,
  MONEY_SIZE_BYTES,
  OUTFIT_CONFIG_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_BYTES,
  PLAY_TIME_SIZE_BYTES,
  PLAY_RECORDS_SIZE_BYTES,
  POD_COSMETIC_CONFIG_SIZE_BYTES,
  POD_CONFIG_SIZE_BYTES,
  POD_PROGRAMS_SIZE_BYTES,
  SAVEFILE_CORPSE_INVENTORY_START_BYTE,
  SAVEFILE_CHARACTER_NAME_START_BYTE,
  SAVEFILE_DEBUG_FLAG_START_BYTE,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_MONEY_START_BYTE,
  SAVEFILE_OUTFIT_CONFIG_START_BYTE,
  SAVEFILE_PLAY_TIME_START_BYTE,
  SAVEFILE_PLAY_RECORDS_START_BYTE,
  SAVEFILE_EMIL_BULLETS_EQUIPPED_BYTE,
  SAVEFILE_HAIR_COLORS_START_BYTE,
  SAVEFILE_PLUGIN_CHIPS_START_BYTE,
  SAVEFILE_POD_CONFIG_START_BYTE,
  SAVEFILE_POD_COSMETIC_CONFIG_START_BYTE,
  SAVEFILE_POD_PROGRAMS_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_STEAM_ID_START_BYTE,
  SAVEFILE_WEAPON_SLOT_1_START_BYTE,
  SAVEFILE_WEAPON_SLOT_2_START_BYTE,
  SAVEFILE_WEAPONS_START_BYTE,
  SAVEFILE_XP_START_BYTE,
  STEAM_ID_SIZE_BYTES,
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
  /** Opaque four-byte file prefix. */
  beforeSteamId: Uint8Array;
  /** Raw unsigned 64-bit SteamID. */
  steamId: Uint8Array;
  /** Opaque region between SteamID and play time. */
  betweenSteamIdAndPlayTime: Uint8Array;
  /** Raw signed 32-bit play time in seconds. */
  playTime: Uint8Array;
  /** Opaque region between play time and character name. */
  betweenPlayTimeAndCharacterName: Uint8Array;
  /** Raw fixed-width UTF-16LE character name. */
  characterName: Uint8Array;
  /** Opaque region between character name and money. */
  betweenCharacterNameAndMoney: Uint8Array;
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
  /** Opaque region from after chips through before OutfitConfig. */
  betweenChipsAndOutfitConfig: Uint8Array;
  /** Raw dress, head-accessory, and outfit configuration. */
  outfitConfig: Uint8Array;
  /** Opaque region from after OutfitConfig through before Play Records. */
  betweenOutfitConfigAndPlayRecords: Uint8Array;
  /** Raw seven-counter Play Records region. */
  playRecords: Uint8Array;
  /** Opaque region from after Play Records through before Pod cosmetics. */
  betweenPlayRecordsAndPodCosmeticConfig: Uint8Array;
  /** Raw Pod cosmetic IDs for 2B, 9S, and A2. */
  podCosmeticConfig: Uint8Array;
  /** Opaque region from after Pod cosmetics through before hair colors. */
  betweenPodCosmeticConfigAndHairColors: Uint8Array;
  /** Raw hair color bytes for 2B, 9S, and A2. */
  hairColors: Uint8Array;
  /** Raw Emil bullets equipped byte. */
  emilBulletsEquipped: Uint8Array;
  /** Opaque region from after the Emil flag through before weapon slots. */
  betweenEmilBulletsAndWeaponSlots: Uint8Array;
  /** Raw Set 1 weapon equipment IDs (light/heavy). */
  weaponSlot1: Uint8Array;
  /** Raw Set 2 weapon equipment IDs (light/heavy). */
  weaponSlot2: Uint8Array;
  /** Opaque region between weapon equipment slots and XP. */
  betweenWeaponSlotsAndXp: Uint8Array;
  /** Known field placeholder at XP offset (4 LE bytes). */
  xp: Uint8Array;
  /** Opaque region between XP and PodConfig. */
  betweenXpAndPodConfig: Uint8Array;
  /** Raw Pod A/B/C levels and equipped programs. */
  podConfig: Uint8Array;
  /** Opaque region between PodConfig and Debug Flag. */
  betweenPodConfigAndDebugFlag: Uint8Array;
  /** Raw Debug Flag byte. */
  debugFlag: Uint8Array;
  /** Opaque trailing region after Debug Flag. */
  afterDebugFlag: Uint8Array;
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
    beforeSteamId: sliceCopy(bytes, 0, BEFORE_STEAM_ID_SIZE_BYTES),
    steamId: sliceCopy(bytes, SAVEFILE_STEAM_ID_START_BYTE, STEAM_ID_SIZE_BYTES),
    betweenSteamIdAndPlayTime: sliceCopy(
      bytes,
      BETWEEN_STEAM_ID_AND_PLAY_TIME_START_BYTE,
      BETWEEN_STEAM_ID_AND_PLAY_TIME_SIZE_BYTES,
    ),
    playTime: sliceCopy(
      bytes,
      SAVEFILE_PLAY_TIME_START_BYTE,
      PLAY_TIME_SIZE_BYTES,
    ),
    betweenPlayTimeAndCharacterName: sliceCopy(
      bytes,
      BETWEEN_PLAY_TIME_AND_CHARACTER_NAME_START_BYTE,
      BETWEEN_PLAY_TIME_AND_CHARACTER_NAME_SIZE_BYTES,
    ),
    characterName: sliceCopy(
      bytes,
      SAVEFILE_CHARACTER_NAME_START_BYTE,
      CHARACTER_NAME_SIZE_BYTES,
    ),
    betweenCharacterNameAndMoney: sliceCopy(
      bytes,
      BETWEEN_CHARACTER_NAME_AND_MONEY_START_BYTE,
      BETWEEN_CHARACTER_NAME_AND_MONEY_SIZE_BYTES,
    ),
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
    betweenChipsAndOutfitConfig: sliceCopy(
      bytes,
      BETWEEN_CHIPS_AND_OUTFIT_CONFIG_START_BYTE,
      BETWEEN_CHIPS_AND_OUTFIT_CONFIG_SIZE_BYTES,
    ),
    outfitConfig: sliceCopy(
      bytes,
      SAVEFILE_OUTFIT_CONFIG_START_BYTE,
      OUTFIT_CONFIG_SIZE_BYTES,
    ),
    betweenOutfitConfigAndPlayRecords: sliceCopy(
      bytes,
      BETWEEN_OUTFIT_CONFIG_AND_PLAY_RECORDS_START_BYTE,
      BETWEEN_OUTFIT_CONFIG_AND_PLAY_RECORDS_SIZE_BYTES,
    ),
    playRecords: sliceCopy(
      bytes,
      SAVEFILE_PLAY_RECORDS_START_BYTE,
      PLAY_RECORDS_SIZE_BYTES,
    ),
    betweenPlayRecordsAndPodCosmeticConfig: sliceCopy(
      bytes,
      BETWEEN_PLAY_RECORDS_AND_POD_COSMETIC_CONFIG_START_BYTE,
      BETWEEN_PLAY_RECORDS_AND_POD_COSMETIC_CONFIG_SIZE_BYTES,
    ),
    podCosmeticConfig: sliceCopy(
      bytes,
      SAVEFILE_POD_COSMETIC_CONFIG_START_BYTE,
      POD_COSMETIC_CONFIG_SIZE_BYTES,
    ),
    betweenPodCosmeticConfigAndHairColors: sliceCopy(
      bytes,
      BETWEEN_POD_COSMETIC_CONFIG_AND_HAIR_COLORS_START_BYTE,
      BETWEEN_POD_COSMETIC_CONFIG_AND_HAIR_COLORS_SIZE_BYTES,
    ),
    hairColors: sliceCopy(
      bytes,
      SAVEFILE_HAIR_COLORS_START_BYTE,
      HAIR_COLORS_SIZE_BYTES,
    ),
    emilBulletsEquipped: sliceCopy(
      bytes,
      SAVEFILE_EMIL_BULLETS_EQUIPPED_BYTE,
      EMIL_BULLETS_EQUIPPED_SIZE_BYTES,
    ),
    betweenEmilBulletsAndWeaponSlots: sliceCopy(
      bytes,
      BETWEEN_EMIL_BULLETS_AND_WEAPON_SLOTS_START_BYTE,
      BETWEEN_EMIL_BULLETS_AND_WEAPON_SLOTS_SIZE_BYTES,
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
    betweenXpAndPodConfig: sliceCopy(
      bytes,
      BETWEEN_XP_AND_POD_CONFIG_START_BYTE,
      BETWEEN_XP_AND_POD_CONFIG_SIZE_BYTES,
    ),
    podConfig: sliceCopy(
      bytes,
      SAVEFILE_POD_CONFIG_START_BYTE,
      POD_CONFIG_SIZE_BYTES,
    ),
    betweenPodConfigAndDebugFlag: sliceCopy(
      bytes,
      BETWEEN_POD_CONFIG_AND_DEBUG_FLAG_START_BYTE,
      BETWEEN_POD_CONFIG_AND_DEBUG_FLAG_SIZE_BYTES,
    ),
    debugFlag: sliceCopy(
      bytes,
      SAVEFILE_DEBUG_FLAG_START_BYTE,
      DEBUG_FLAG_SIZE_BYTES,
    ),
    afterDebugFlag: sliceCopy(
      bytes,
      AFTER_DEBUG_FLAG_START_BYTE,
      AFTER_DEBUG_FLAG_SIZE_BYTES,
    ),
  };
}

/**
 * Serialize SlotData back to PC save bytes.
 * Concatenates placeholders and opaque blobs in layout order.
 */
export function serialize(slot: SlotData): Uint8Array {
  const parts = [
    slot.beforeSteamId,
    slot.steamId,
    slot.betweenSteamIdAndPlayTime,
    slot.playTime,
    slot.betweenPlayTimeAndCharacterName,
    slot.characterName,
    slot.betweenCharacterNameAndMoney,
    slot.money,
    slot.inventory,
    slot.corpseInventory,
    slot.weapons,
    slot.podPrograms,
    slot.betweenPodAndChips,
    slot.pluginChips,
    slot.betweenChipsAndOutfitConfig,
    slot.outfitConfig,
    slot.betweenOutfitConfigAndPlayRecords,
    slot.playRecords,
    slot.betweenPlayRecordsAndPodCosmeticConfig,
    slot.podCosmeticConfig,
    slot.betweenPodCosmeticConfigAndHairColors,
    slot.hairColors,
    slot.emilBulletsEquipped,
    slot.betweenEmilBulletsAndWeaponSlots,
    slot.weaponSlot1,
    slot.weaponSlot2,
    slot.betweenWeaponSlotsAndXp,
    slot.xp,
    slot.betweenXpAndPodConfig,
    slot.podConfig,
    slot.betweenPodConfigAndDebugFlag,
    slot.debugFlag,
    slot.afterDebugFlag,
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
