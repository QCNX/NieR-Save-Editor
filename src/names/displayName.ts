import items from "../data/items.json";
import weapons from "../data/weapons.json";
import pods from "../data/pods.json";
import chips from "../data/chips.json";

type NameEntry = { en: string; zh: string };
type NameMap = Record<string, NameEntry>;

/** Format an unmapped id as `未知 (0x…)` (u32 hex, lowercase). */
export function formatUnknownId(id: number): string {
  return `未知 (0x${(id >>> 0).toString(16)})`;
}

function lookupZh(map: NameMap, id: number): string {
  const entry = map[String(id)];
  return entry?.zh ?? formatUnknownId(id);
}

export function lookupItemName(id: number): string {
  return lookupZh(items as NameMap, id);
}

export function lookupWeaponName(id: number): string {
  return lookupZh(weapons as NameMap, id);
}

export function lookupPodName(id: number): string {
  return lookupZh(pods as NameMap, id);
}

export function lookupChipName(baseId: number): string {
  return lookupZh(chips as NameMap, baseId);
}
