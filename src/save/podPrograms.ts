import {
  POD_PROGRAMS_ITEM_SIZE_BYTES,
  POD_PROGRAMS_SIZE_BYTES,
  POD_PROGRAMS_SIZE_ITEMS,
} from "./constants";

/** NieREdit PodProgramId.EMPTY id. */
export const EMPTY_POD_PROGRAM_ID = -1;

/**
 * One POD program inventory slot (NieREdit PodProgram).
 * Layout: one (i32 LE) + id (i32 LE) = 8 bytes. `position` is the list index.
 */
export type PodProgram = {
  position: number;
  one: number;
  id: number;
};

export class PodProgramsSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number, expected: number = POD_PROGRAMS_SIZE_BYTES) {
    super(
      `Invalid POD programs region size: expected ${expected} bytes, got ${actual}`,
    );
    this.name = "PodProgramsSizeError";
    this.expected = expected;
    this.actual = actual;
  }
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getInt32(offset, true);
}

function writeI32LE(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setInt32(
    offset,
    value,
    true,
  );
}

/**
 * Parse SlotData.podPrograms (32 × 8 bytes) into NieREdit-shaped records.
 */
export function parsePodPrograms(bytes: Uint8Array): PodProgram[] {
  if (bytes.length !== POD_PROGRAMS_SIZE_BYTES) {
    throw new PodProgramsSizeError(bytes.length);
  }

  const programs: PodProgram[] = [];
  for (let i = 0; i < POD_PROGRAMS_SIZE_ITEMS; i++) {
    const offset = i * POD_PROGRAMS_ITEM_SIZE_BYTES;
    programs.push({
      position: i,
      one: readI32LE(bytes, offset),
      id: readI32LE(bytes, offset + 4),
    });
  }
  return programs;
}

/**
 * Serialize POD program records back to the 32 × 8-byte region.
 * `position` is taken from list index so edits stay aligned.
 */
export function serializePodPrograms(programs: readonly PodProgram[]): Uint8Array {
  if (programs.length !== POD_PROGRAMS_SIZE_ITEMS) {
    throw new PodProgramsSizeError(
      programs.length * POD_PROGRAMS_ITEM_SIZE_BYTES,
    );
  }

  const out = new Uint8Array(POD_PROGRAMS_SIZE_BYTES);
  for (let i = 0; i < POD_PROGRAMS_SIZE_ITEMS; i++) {
    const program = programs[i]!;
    const offset = i * POD_PROGRAMS_ITEM_SIZE_BYTES;
    writeI32LE(out, offset, program.one);
    writeI32LE(out, offset + 4, program.id);
  }
  return out;
}

/**
 * Replace one POD slot; returns a new array with `position` set to `index`.
 */
export function replacePodProgram(
  programs: readonly PodProgram[],
  index: number,
  fields: Pick<PodProgram, "one" | "id">,
): PodProgram[] {
  if (index < 0 || index >= POD_PROGRAMS_SIZE_ITEMS) {
    throw new RangeError(
      `POD program index out of range: ${index} (expected 0..${POD_PROGRAMS_SIZE_ITEMS - 1})`,
    );
  }
  if (programs.length !== POD_PROGRAMS_SIZE_ITEMS) {
    throw new PodProgramsSizeError(
      programs.length * POD_PROGRAMS_ITEM_SIZE_BYTES,
    );
  }

  const next = programs.slice();
  next[index] = { position: index, one: fields.one, id: fields.id };
  return next;
}
