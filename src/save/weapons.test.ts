import { describe, expect, it } from "vitest";
import {
  SAVEFILE_SIZE_BYTES,
  SAVEFILE_WEAPONS_START_BYTE,
  WEAPONS_ITEM_SIZE_BYTES,
  WEAPONS_SIZE_BYTES,
  WEAPONS_SIZE_ITEMS,
} from "./constants";
import { load, serialize } from "./slotData";
import {
  EMPTY_WEAPON_BYTES,
  parseWeaponItem,
  parseWeapons,
  serializeWeaponItem,
  serializeWeapons,
  writeWeaponAt,
  type WeaponItem,
} from "./weapons";

/** NieREdit WeaponItemTest empty hex — independent fixture. */
const EMPTY_HEX = "ffffffff01000000010000000100000000000000";
/** Virtuous Contract level 3, 466 enemies. */
const VIRTUOUS_HEX = "2e040000030000000000000000000000d2010000";
/** Cruel Oath level 1. */
const CRUEL_HEX = "2f04000001000000000000000000000000000000";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Patterned synthetic PC save with a valid empty weapons region. */
function syntheticSaveWithWeapons(weapons: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  bytes.set(weapons, SAVEFILE_WEAPONS_START_BYTE);
  return bytes;
}

function emptyWeaponsRegion(): Uint8Array {
  const region = new Uint8Array(WEAPONS_SIZE_BYTES);
  const empty = hexToBytes(EMPTY_HEX);
  for (let i = 0; i < WEAPONS_SIZE_ITEMS; i++) {
    region.set(empty, i * WEAPONS_ITEM_SIZE_BYTES);
  }
  return region;
}

describe("WeaponItem parse/serialize", () => {
  it("parses empty weapon hex like NieREdit", () => {
    const item = parseWeaponItem(hexToBytes(EMPTY_HEX), 0);
    expect(item).toEqual({
      position: 0,
      id: -1,
      level: 1,
      newItem: true,
      newStory: true,
      enemiesDefeated: 0,
    } satisfies WeaponItem);
  });

  it("serializes empty weapon to NieREdit empty hex", () => {
    expect(bytesToHex(serializeWeaponItem({
      position: -1,
      id: -1,
      level: 1,
      newItem: true,
      newStory: true,
      enemiesDefeated: 0,
    }))).toBe(EMPTY_HEX);
    expect(bytesToHex(EMPTY_WEAPON_BYTES)).toBe(EMPTY_HEX);
  });

  it("parses Virtuous Contract level 3 from NieREdit fixture hex", () => {
    const item = parseWeaponItem(hexToBytes(VIRTUOUS_HEX), 0);
    expect(item.id).toBe(0x42e);
    expect(item.level).toBe(3);
    expect(item.newItem).toBe(false);
    expect(item.newStory).toBe(false);
    expect(item.enemiesDefeated).toBe(0x1d2);
  });

  it("parses Cruel Oath level 1 from NieREdit fixture hex", () => {
    const item = parseWeaponItem(hexToBytes(CRUEL_HEX), 0);
    expect(item.id).toBe(0x42f);
    expect(item.level).toBe(1);
    expect(item.newItem).toBe(false);
  });

  it("rejects wrong-sized weapon record", () => {
    expect(() => parseWeaponItem(hexToBytes(CRUEL_HEX.slice(0, -2)), 0)).toThrow();
  });
});

describe("weapons region", () => {
  it("parses 80 × 20-byte records and round-trips unedited", () => {
    const region = emptyWeaponsRegion();
    region.set(hexToBytes(VIRTUOUS_HEX), 5 * WEAPONS_ITEM_SIZE_BYTES);

    const items = parseWeapons(region);
    expect(items).toHaveLength(WEAPONS_SIZE_ITEMS);
    expect(items[5]?.id).toBe(0x42e);
    expect(items[5]?.level).toBe(3);
    expect(items[0]?.id).toBe(-1);

    expect(serializeWeapons(items)).toEqual(region);
  });

  it("rejects wrong-sized weapons region", () => {
    expect(() => parseWeapons(new Uint8Array(0))).toThrow();
    expect(() => parseWeapons(new Uint8Array(WEAPONS_SIZE_BYTES - 1))).toThrow();
  });
});

describe("SlotData weapons edit seam", () => {
  it("unedited weapons passthrough keeps full save byte-identical", () => {
    const input = syntheticSaveWithWeapons(emptyWeaponsRegion());
    const slot = load(input);
    const weapons = parseWeapons(slot.weapons);
    const out = serialize({
      ...slot,
      weapons: serializeWeapons(weapons),
    });
    expect(out.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(out).toEqual(input);
  });

  it("targeted weapon edit changes only that weapon's bytes in the save", () => {
    const region = emptyWeaponsRegion();
    region.set(hexToBytes(CRUEL_HEX), 3 * WEAPONS_ITEM_SIZE_BYTES);
    const input = syntheticSaveWithWeapons(region);
    const slot = load(input);

    const editedRegion = writeWeaponAt(slot.weapons, {
      position: 3,
      id: 0x42e,
      level: 4,
      newItem: false,
      newStory: true,
      enemiesDefeated: 99,
    });
    const out = serialize({ ...slot, weapons: editedRegion });

    expect(out.length).toBe(SAVEFILE_SIZE_BYTES);

    const start = SAVEFILE_WEAPONS_START_BYTE + 3 * WEAPONS_ITEM_SIZE_BYTES;
    const end = start + WEAPONS_ITEM_SIZE_BYTES;

    expect(out.subarray(0, start)).toEqual(input.subarray(0, start));
    expect(out.subarray(end)).toEqual(input.subarray(end));
    expect(bytesToHex(out.subarray(start, end))).toBe(
      bytesToHex(serializeWeaponItem({
        position: 3,
        id: 0x42e,
        level: 4,
        newItem: false,
        newStory: true,
        enemiesDefeated: 99,
      })),
    );
  });
});
