import type { SlotData } from "./slotData";

function readU32LE(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(0, true);
}

function writeU32LE(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, true);
  return out;
}

/** Read experience from the SlotData xp placeholder (u32 LE). */
export function getXp(slot: SlotData): number {
  return readU32LE(slot.xp);
}

/** Return a SlotData copy with experience set (u32 LE). */
export function setXp(slot: SlotData, value: number): SlotData {
  return { ...slot, xp: writeU32LE(value) };
}
