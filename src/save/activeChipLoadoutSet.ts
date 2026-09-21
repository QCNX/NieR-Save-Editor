/**
 * In-game active plug-in chip loadout set (A|B|C), independent of which set the
 * editor UI is editing.
 *
 * Discovery gap: no confirmed SlotData offset. NieREdit keeps the
 * POD-programs→chips gap as opaque `unknown6` and does not model an active set.
 * Local save-monitor captures were capacity-mask purchases (0x324B8), not A/B/C
 * switches. Do not invent an offset; wire R/W only after switch diffs confirm it.
 *
 * Unverified lead (follow-up only): i32 LE at 0x324B4 — four bytes into the
 * opaque `betweenPodAndChips` gap, immediately before the purchased-capacity
 * mask — observed as 0 or 2 across local slots. Not claimed here.
 */

import type { PluginChipLoadoutSet } from "./pluginChips";
import type { SlotData } from "./slotData";

/** False until a verified offset exists; UI should hide ★ switch when false. */
export const ACTIVE_CHIP_LOADOUT_SET_SUPPORTED = false as const;

export class ActiveChipLoadoutSetUnsupportedError extends Error {
  constructor(
    message = "Active chip loadout set offset is not yet located in SlotData",
  ) {
    super(message);
    this.name = "ActiveChipLoadoutSetUnsupportedError";
  }
}

/** Read the in-game active loadout set. Unsupported until the offset is found. */
export function getActiveChipLoadoutSet(
  _slot: SlotData,
): PluginChipLoadoutSet {
  throw new ActiveChipLoadoutSetUnsupportedError();
}

/**
 * Write the in-game active loadout set. Unsupported until the offset is found.
 * When implemented, must update only that field on a synthetic full-save fixture.
 */
export function setActiveChipLoadoutSet(
  _slot: SlotData,
  _set: PluginChipLoadoutSet,
): SlotData {
  throw new ActiveChipLoadoutSetUnsupportedError();
}
