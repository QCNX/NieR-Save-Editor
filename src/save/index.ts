export {
  AFTER_XP_SIZE_BYTES,
  AFTER_XP_START_BYTE,
  BETWEEN_CHIPS_AND_XP_SIZE_BYTES,
  BETWEEN_CHIPS_AND_XP_START_BYTE,
  BETWEEN_POD_AND_CHIPS_SIZE_BYTES,
  BETWEEN_POD_AND_CHIPS_START_BYTE,
  INVENTORY_ITEM_SIZE_BYTES,
  INVENTORY_SIZE_BYTES,
  INVENTORY_SIZE_ITEMS,
  MONEY_SIZE_BYTES,
  PLUGIN_CHIPS_ITEM_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_BYTES,
  PLUGIN_CHIPS_SIZE_ITEMS,
  POD_PROGRAMS_ITEM_SIZE_BYTES,
  POD_PROGRAMS_SIZE_BYTES,
  POD_PROGRAMS_SIZE_ITEMS,
  SAVEFILE_CORPSE_INVENTORY_START_BYTE,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_MONEY_START_BYTE,
  SAVEFILE_PLUGIN_CHIPS_START_BYTE,
  SAVEFILE_POD_PROGRAMS_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_WEAPONS_START_BYTE,
  SAVEFILE_XP_START_BYTE,
  WEAPONS_ITEM_SIZE_BYTES,
  WEAPONS_SIZE_BYTES,
  WEAPONS_SIZE_ITEMS,
  XP_SIZE_BYTES,
} from "./constants";

export {
  InventoryItemStatusError,
  InventorySizeError,
  ITEM_STATUS_ACTIVE,
  ITEM_STATUS_INACTIVE,
  parseInventory,
  serializeInventory,
  setInventoryItem,
  type InventoryItem,
  type ItemStatus,
} from "./inventory";

export {
  load,
  serialize,
  SlotDataSizeError,
  type SlotData,
} from "./slotData";

export {
  EMPTY_WEAPON_BYTES,
  parseWeaponItem,
  parseWeapons,
  serializeWeaponItem,
  serializeWeapons,
  WeaponSizeError,
  writeWeaponAt,
  type WeaponItem,
} from "./weapons";

export { getMoney, setMoney } from "./money";
export { getXp, setXp } from "./xp";
export { levelFromXp, xpForLevel } from "./level";
export { MAX_LEVEL, XP_TABLE } from "./xpTable";
