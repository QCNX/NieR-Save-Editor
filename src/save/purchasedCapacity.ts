/**
 * Purchased motherboard chip capacity encoded as an i32 mask at 0x324B8.
 * capacity = 40 + 8·pop(bits0–3) + 16·pop(bits5–6) + 24·bit7; bit4 always 0.
 */

import type { SlotData } from "./slotData";

/** Deduped UI options: 40, 48, …, 128. */
export const PURCHASED_CAPACITY_OPTIONS: readonly number[] = Object.freeze(
  Array.from({ length: 12 }, (_, i) => 40 + i * 8),
);

const MIN_CAPACITY = PURCHASED_CAPACITY_OPTIONS[0]!;
const MAX_CAPACITY = PURCHASED_CAPACITY_OPTIONS[PURCHASED_CAPACITY_OPTIONS.length - 1]!;

function popcountBits(mask: number, from: number, toInclusive: number): number {
  let count = 0;
  for (let bit = from; bit <= toInclusive; bit++) {
    if ((mask >>> bit) & 1) count++;
  }
  return count;
}

/** Decode a purchased-capacity mask to the motherboard capacity number. */
export function decodePurchasedCapacity(mask: number): number {
  const n8 = popcountBits(mask, 0, 3);
  const n16 = popcountBits(mask, 5, 6);
  const n24 = (mask >>> 7) & 1;
  return 40 + 8 * n8 + 16 * n16 + 24 * n24;
}

/** Snap an arbitrary capacity to the nearest deduped option in [40, 128]. */
function snapToCapacityOption(capacity: number): number {
  const clamped = Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, capacity));
  let best = MIN_CAPACITY;
  let bestDist = Math.abs(clamped - best);
  for (const option of PURCHASED_CAPACITY_OPTIONS) {
    const dist = Math.abs(clamped - option);
    if (dist < bestDist) {
      best = option;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Encode a purchased capacity into the on-disk mask.
 * Among (n8,n16,n24) triples that yield the capacity, prefer fewer +24 then
 * fewer +16 (prefer +8). Bit4 is never set. Out-of-range values snap to the
 * nearest legal option.
 */
export function encodePurchasedCapacity(capacity: number): number {
  const snapped = snapToCapacityOption(capacity);
  const units = (snapped - 40) / 8;
  let best: { n8: number; n16: number; n24: number } | null = null;
  for (let n24 = 0; n24 <= 1; n24++) {
    for (let n16 = 0; n16 <= 2; n16++) {
      const n8 = units - 2 * n16 - 3 * n24;
      if (n8 < 0 || n8 > 4 || !Number.isInteger(n8)) continue;
      const candidate = { n8, n16, n24 };
      if (
        !best ||
        candidate.n24 < best.n24 ||
        (candidate.n24 === best.n24 && candidate.n16 < best.n16)
      ) {
        best = candidate;
      }
    }
  }
  if (!best) {
    throw new RangeError(`Unsupported purchased capacity: ${capacity}`);
  }

  let mask = 0;
  for (let i = 0; i < best.n8; i++) mask |= 1 << i;
  for (let i = 0; i < best.n16; i++) mask |= 1 << (5 + i);
  if (best.n24) mask |= 1 << 7;
  return mask;
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

/** Read purchased motherboard capacity from the SlotData mask placeholder. */
export function getPurchasedChipCapacity(slot: SlotData): number {
  return decodePurchasedCapacity(readI32LE(slot.purchasedChipCapacity));
}

/** Return a SlotData copy with purchased capacity encoded into the mask. */
export function setPurchasedChipCapacity(
  slot: SlotData,
  capacity: number,
): SlotData {
  return {
    ...slot,
    purchasedChipCapacity: writeI32LE(encodePurchasedCapacity(capacity)),
  };
}
