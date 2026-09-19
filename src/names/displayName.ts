import items from "../data/items.json";
import weapons from "../data/weapons.json";
import pods from "../data/pods.json";
import chips from "../data/chips.json";
import {
  DEFAULT_LANGUAGE,
  translate,
  type Language,
} from "../i18n/core";

type NameEntry = { en: string; zh: string };
type NameMap = Record<string, NameEntry>;

/** Format an unmapped id as a localized label plus u32 lowercase hex. */
export function formatUnknownId(
  id: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return `${translate(language, "entity.unknown")} (0x${(id >>> 0).toString(16)})`;
}

function lookupName(map: NameMap, id: number, language: Language): string {
  const entry = map[String(id)];
  return entry?.[language === "zh-CN" ? "zh" : "en"] ?? formatUnknownId(id, language);
}

export function lookupItemName(
  id: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return lookupName(items as NameMap, id, language);
}

export function lookupWeaponName(
  id: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return lookupName(weapons as NameMap, id, language);
}

export function lookupPodName(
  id: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return lookupName(pods as NameMap, id, language);
}

export function lookupChipName(
  baseId: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return lookupName(chips as NameMap, baseId, language);
}
