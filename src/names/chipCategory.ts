/**
 * In-game plug-in chip library categories (龙汉化 CORE_PSV_SKILL_CTG_01..05).
 * Classification is by chip type id; EMPTY / unknown types have no category.
 */
export type ChipLibraryCategory =
  | "all"
  | "attack"
  | "defense"
  | "support"
  | "hacking"
  | "system";

/** Non-All filter values — match CORE_PSV_SKILL_CTG_01..05 order. */
export type ChipTypeCategory = Exclude<ChipLibraryCategory, "all">;

export const CHIP_LIBRARY_CATEGORIES: readonly ChipLibraryCategory[] = [
  "all",
  "attack",
  "defense",
  "support",
  "hacking",
  "system",
] as const;

/** Vanilla type → category. Gaps (0x1C, 0x20, …) are intentionally absent. */
const TYPE_TO_CATEGORY: ReadonlyMap<number, ChipTypeCategory> = new Map([
  // Attack — CORE_PSV_SKILL_CTG_01 攻击
  [0x01, "attack"],
  [0x02, "attack"],
  [0x03, "attack"],
  [0x04, "attack"],
  [0x11, "attack"],
  [0x12, "attack"],
  [0x18, "attack"],
  [0x1a, "attack"],
  [0x26, "attack"],
  [0x2d, "attack"],
  [0x2e, "attack"],
  [0x3b, "attack"],
  [0x3c, "attack"],
  // Defense — CORE_PSV_SKILL_CTG_02 防御
  [0x06, "defense"],
  [0x07, "defense"],
  [0x08, "defense"],
  [0x09, "defense"],
  [0x13, "defense"],
  [0x15, "defense"],
  [0x17, "defense"],
  [0x2c, "defense"],
  [0x3d, "defense"],
  // Support — CORE_PSV_SKILL_CTG_03 辅助
  [0x05, "support"],
  [0x0a, "support"],
  [0x0b, "support"],
  [0x0c, "support"],
  [0x0d, "support"],
  [0x0e, "support"],
  [0x0f, "support"],
  [0x10, "support"],
  [0x14, "support"],
  [0x16, "support"],
  [0x19, "support"],
  [0x1b, "support"],
  [0x22, "support"],
  [0x23, "support"],
  [0x2f, "support"],
  [0x3e, "support"],
  [0x3f, "support"],
  // Hacking — CORE_PSV_SKILL_CTG_04 黑客
  [0x1d, "hacking"],
  [0x1e, "hacking"],
  [0x1f, "hacking"],
  // System — CORE_PSV_SKILL_CTG_05 系统
  [0x27, "system"],
  [0x28, "system"],
  [0x29, "system"],
  [0x2a, "system"],
  [0x30, "system"],
  [0x31, "system"],
  [0x32, "system"],
  [0x33, "system"],
  [0x34, "system"],
  [0x35, "system"],
  [0x36, "system"],
  [0x37, "system"],
  [0x3a, "system"],
]);

/**
 * Return the in-game category for a chip type, or null for EMPTY / unknown types
 * (visible under All only).
 */
export function chipCategoryForType(type: number): ChipTypeCategory | null {
  return TYPE_TO_CATEGORY.get(type) ?? null;
}

/** Whether a chip type passes the library category filter. */
export function chipTypeMatchesCategory(
  type: number,
  category: ChipLibraryCategory,
): boolean {
  if (category === "all") return true;
  return chipCategoryForType(type) === category;
}
