import { MAX_LEVEL, XP_TABLE } from "./xpTable";
import type { SlotData } from "./slotData";
import { setXp } from "./xp";

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
  if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
    return undefined;
  }
  return XP_TABLE[level];
}

/** Return a copy at the level threshold, or the original slot for invalid input. */
export function setLevel(slot: SlotData, level: number): SlotData {
  const xp = xpForLevel(level);
  return xp === undefined ? slot : setXp(slot, xp);
}
