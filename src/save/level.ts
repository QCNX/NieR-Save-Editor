import { MAX_LEVEL, XP_TABLE } from "./xpTable";

/**
 * Derive player level from experience using NieREdit's rule:
 * last table entry whose threshold is <= xp.
 */
export function levelFromXp(xp: number): number {
  let level = 1;
  for (let n = 1; n <= MAX_LEVEL; n++) {
    const threshold = XP_TABLE[n];
    if (threshold === undefined || xp < threshold) {
      break;
    }
    level = n;
  }
  return level;
}

/** Minimum XP required for the given level (NieREdit XP_TABLE lookup). */
export function xpForLevel(level: number): number | undefined {
  return XP_TABLE[level];
}
