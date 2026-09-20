import { CHARACTER_NAME_SIZE_BYTES } from "./constants";
import type { SlotData } from "./slotData";

const MAX_U64 = 0xffffffffffffffffn;
const MIN_I32 = -0x80000000;
const MAX_I32 = 0x7fffffff;
const NAME_PAYLOAD_CODE_UNITS = CHARACTER_NAME_SIZE_BYTES / 2 - 1;

export const DEBUG_FLAG_VALUES = [0x00, 0x0b, 0x07, 0x0f] as const;
export type DebugFlagValue = (typeof DEBUG_FLAG_VALUES)[number];

export class GeneralCoreValueError extends Error {
  constructor(field: string, value: string | number | bigint) {
    super(`Invalid ${field}: ${String(value)}`);
    this.name = "GeneralCoreValueError";
  }
}

/** Read the exact eight-byte SteamID as an unsigned little-endian integer. */
export function getSteamId(slot: SlotData): bigint {
  return new DataView(
    slot.steamId.buffer,
    slot.steamId.byteOffset,
    slot.steamId.byteLength,
  ).getBigUint64(0, true);
}

/** Return a SlotData copy with an unsigned 64-bit SteamID. */
export function setSteamId(slot: SlotData, value: bigint): SlotData {
  if (value < 0n || value > MAX_U64) {
    throw new GeneralCoreValueError("SteamID (u64)", value);
  }
  const steamId = new Uint8Array(8);
  new DataView(steamId.buffer).setBigUint64(0, value, true);
  return { ...slot, steamId };
}

/** Read play time in seconds using NieREdit's signed i32 interpretation. */
export function getPlayTime(slot: SlotData): number {
  return new DataView(
    slot.playTime.buffer,
    slot.playTime.byteOffset,
    slot.playTime.byteLength,
  ).getInt32(0, true);
}

/** Return a SlotData copy with signed i32 play time in seconds. */
export function setPlayTime(slot: SlotData, seconds: number): SlotData {
  if (!Number.isInteger(seconds) || seconds < MIN_I32 || seconds > MAX_I32) {
    throw new GeneralCoreValueError("play time (i32 seconds)", seconds);
  }
  const playTime = new Uint8Array(4);
  new DataView(playTime.buffer).setInt32(0, seconds, true);
  return { ...slot, playTime };
}

/** Decode the fixed-width name up to its first UTF-16LE null code unit. */
export function getCharacterName(slot: SlotData): string {
  let byteLength = 0;
  const view = new DataView(
    slot.characterName.buffer,
    slot.characterName.byteOffset,
    slot.characterName.byteLength,
  );
  while (
    byteLength < slot.characterName.byteLength &&
    view.getUint16(byteLength, true) !== 0
  ) {
    byteLength += 2;
  }
  return new TextDecoder("utf-16le").decode(
    slot.characterName.subarray(0, byteLength),
  );
}

/**
 * Return a SlotData copy with a null-terminated UTF-16LE name.
 * Changed names are truncated at a code-point boundary and the remaining
 * fixed-width field is zero-filled, matching NieREdit's padding policy.
 */
export function setCharacterName(slot: SlotData, value: string): SlotData {
  let normalized = "";
  let codeUnits = 0;
  for (const codePoint of value) {
    if (codePoint === "\0") {
      break;
    }
    if (codeUnits + codePoint.length > NAME_PAYLOAD_CODE_UNITS) {
      break;
    }
    normalized += codePoint;
    codeUnits += codePoint.length;
  }

  const characterName = new Uint8Array(CHARACTER_NAME_SIZE_BYTES);
  const view = new DataView(characterName.buffer);
  for (let index = 0; index < normalized.length; index += 1) {
    view.setUint16(index * 2, normalized.charCodeAt(index), true);
  }
  return { ...slot, characterName };
}

/** Read the raw Debug Flag byte so unknown save values remain observable. */
export function getDebugFlag(slot: SlotData): number {
  return slot.debugFlag[0];
}

/** Return a SlotData copy with one of NieREdit's known Debug Flag values. */
export function setDebugFlag(slot: SlotData, value: number): SlotData {
  if (!(DEBUG_FLAG_VALUES as readonly number[]).includes(value)) {
    throw new GeneralCoreValueError("Debug Flag", value);
  }
  return { ...slot, debugFlag: new Uint8Array([value]) };
}
