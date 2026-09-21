/**
 * In-game active plug-in chip loadout set (A|B|C), independent of which set the
 * editor UI is editing.
 *
 * Verified SlotData offset 0x324B4 (i32 LE: 0=A, 1=B, 2=C), immediately before
 * the purchased-capacity mask at 0x324B8. Live Slot0 switch diffs flip only
 * this field among {0,1,2} near the chips region.
 */

import type { PluginChipLoadoutSet } from "./pluginChips";
import type { SlotData } from "./slotData";

/** True once the verified offset is wired. */
export const ACTIVE_CHIP_LOADOUT_SET_SUPPORTED = true as const;

const SET_TO_ORDINAL: Record<PluginChipLoadoutSet, number> = {
  A: 0,
  B: 1,
  C: 2,
};

const ORDINAL_TO_SET: Record<number, PluginChipLoadoutSet> = {
  0: "A",
  1: "B",
  2: "C",
};

export class ActiveChipLoadoutSetInvalidError extends Error {
  constructor(value: number) {
    super(
      `Invalid active chip loadout set value: ${value} (expected 0|1|2 for A|B|C)`,
    );
    this.name = "ActiveChipLoadoutSetInvalidError";
  }
}

function readI32LE(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getInt32(0, true);
}

function writeI32LE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, value, true);
  return out;
}

/** Read the in-game active loadout set from SlotData. */
export function getActiveChipLoadoutSet(slot: SlotData): PluginChipLoadoutSet {
  const ordinal = readI32LE(slot.activeChipLoadoutSet);
  const set = ORDINAL_TO_SET[ordinal];
  if (set === undefined) {
    throw new ActiveChipLoadoutSetInvalidError(ordinal);
  }
  return set;
}

/**
 * Return a SlotData copy with the in-game active loadout set updated.
 * Only the 4-byte field at 0x324B4 changes on a full-save round-trip.
 */
export function setActiveChipLoadoutSet(
  slot: SlotData,
  set: PluginChipLoadoutSet,
): SlotData {
  return {
    ...slot,
    activeChipLoadoutSet: writeI32LE(SET_TO_ORDINAL[set]),
  };
}
