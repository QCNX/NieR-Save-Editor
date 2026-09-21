import { describe, expect, it } from "vitest";

import { SAVEFILE_SIZE_BYTES } from "./constants";
import {
  ACTIVE_CHIP_LOADOUT_SET_SUPPORTED,
  ActiveChipLoadoutSetUnsupportedError,
  getActiveChipLoadoutSet,
  setActiveChipLoadoutSet,
} from "./activeChipLoadoutSet";
import { load } from "./slotData";

function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  return bytes;
}

describe("active chip loadout set (discovery gap)", () => {
  it("exposes an unsupported stub until the SlotData offset is located", () => {
    expect(ACTIVE_CHIP_LOADOUT_SET_SUPPORTED).toBe(false);

    const slot = load(syntheticSave());
    expect(() => getActiveChipLoadoutSet(slot)).toThrow(
      ActiveChipLoadoutSetUnsupportedError,
    );
    expect(() => setActiveChipLoadoutSet(slot, "B")).toThrow(
      ActiveChipLoadoutSetUnsupportedError,
    );
  });

  // Pending: confirm offset via in-game A→B→C switch save diffs (synthetic fixture only once located).
  it.skip("reads and writes A|B|C without changing unrelated SlotData bytes", () => {
    expect(ACTIVE_CHIP_LOADOUT_SET_SUPPORTED).toBe(true);
  });
});
