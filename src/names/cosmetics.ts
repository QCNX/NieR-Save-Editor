import {
  DRESS_MODULES,
  HAIR_COLORS,
  HEAD_ACCESSORIES,
  OUTFITS,
  POD_APPEARANCES,
  type CosmeticNameEntry,
} from "../data/cosmetics";
import { DEFAULT_LANGUAGE, type Language } from "../i18n";
import { formatUnknownId } from "./displayName";

export type CosmeticAndroid = keyof typeof OUTFITS;
export type CosmeticCategory =
  | "hairColor"
  | "headAccessory"
  | "dressModule"
  | "podAppearance";

const COSMETICS: Record<
  CosmeticCategory,
  readonly CosmeticNameEntry[]
> = {
  hairColor: HAIR_COLORS,
  headAccessory: HEAD_ACCESSORIES,
  dressModule: DRESS_MODULES,
  podAppearance: POD_APPEARANCES,
};

function localizedName(
  entry: CosmeticNameEntry | undefined,
  id: number,
  language: Language,
): string {
  if (!entry) return formatUnknownId(id, language);
  return language === "zh-CN" ? (entry.zh ?? entry.en) : entry.en;
}

export function getOutfitOptions(
  android: CosmeticAndroid,
): readonly CosmeticNameEntry[] {
  return OUTFITS[android];
}

export function getCosmeticOptions(
  category: CosmeticCategory,
): readonly CosmeticNameEntry[] {
  return COSMETICS[category];
}

export function lookupOutfitName(
  android: CosmeticAndroid,
  id: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return localizedName(
    OUTFITS[android].find((entry) => entry.id === id),
    id,
    language,
  );
}

export function lookupCosmeticName(
  category: CosmeticCategory,
  id: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return localizedName(
    COSMETICS[category].find((entry) => entry.id === id),
    id,
    language,
  );
}
