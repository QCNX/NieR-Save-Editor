import { describe, expect, it } from "vitest";
import {
  POD_PROGRAMS_ITEM_SIZE_BYTES,
  POD_PROGRAMS_SIZE_BYTES,
  POD_PROGRAMS_SIZE_ITEMS,
  SAVEFILE_POD_PROGRAMS_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  EMPTY_POD_PROGRAM_ID,
  parsePodPrograms,
  serializePodPrograms,
  setPodProgramId,
} from "./podPrograms";
import { load, serialize } from "./slotData";

/** Patterned synthetic PC save — not a real player file. */
function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 31 + 17) % 256;
  }
  return bytes;
}

function writeI32LE(buf: Uint8Array, offset: number, value: number): void {
  new DataView(buf.buffer, buf.byteOffset, buf.byteLength).setInt32(
    offset,
    value,
    true,
  );
}

/** Known-good 8-byte POD record (NieREdit: one + id as i32 LE). */
function podRecordBytes(one: number, id: number): Uint8Array {
  const bytes = new Uint8Array(POD_PROGRAMS_ITEM_SIZE_BYTES);
  writeI32LE(bytes, 0, one);
  writeI32LE(bytes, 4, id);
  return bytes;
}

describe("POD programs parse/edit/serialize", () => {
  it("fills, replaces, and clears a POD slot while preserving its one field", () => {
    const region = new Uint8Array(POD_PROGRAMS_SIZE_BYTES);
    for (let index = 0; index < POD_PROGRAMS_SIZE_ITEMS; index++) {
      region.set(
        podRecordBytes(index === 4 ? 7 : 1, EMPTY_POD_PROGRAM_ID),
        index * POD_PROGRAMS_ITEM_SIZE_BYTES,
      );
    }

    const empty = parsePodPrograms(region);
    const filled = setPodProgramId(empty, 4, 2001);
    expect(filled[4]).toEqual({ position: 4, one: 7, id: 2001 });

    const replaced = setPodProgramId(filled, 4, 2024);
    expect(replaced[4]).toEqual({ position: 4, one: 7, id: 2024 });

    const cleared = setPodProgramId(replaced, 4, EMPTY_POD_PROGRAM_ID);
    expect(cleared[4]).toEqual({
      position: 4,
      one: 7,
      id: EMPTY_POD_PROGRAM_ID,
    });
    expect(
      serializePodPrograms(cleared).subarray(
        4 * POD_PROGRAMS_ITEM_SIZE_BYTES,
        5 * POD_PROGRAMS_ITEM_SIZE_BYTES,
      ),
    ).toEqual(podRecordBytes(7, EMPTY_POD_PROGRAM_ID));
  });

  it("parses the POD region as 32 × 8-byte records with NieREdit fields", () => {
    const region = new Uint8Array(POD_PROGRAMS_SIZE_BYTES);
    // Slot 0: empty (one=1, id=-1); slot 1: R010 Laser (one=1, id=2001)
    region.set(podRecordBytes(1, EMPTY_POD_PROGRAM_ID), 0);
    region.set(podRecordBytes(1, 2001), POD_PROGRAMS_ITEM_SIZE_BYTES);

    const programs = parsePodPrograms(region);
    expect(programs).toHaveLength(POD_PROGRAMS_SIZE_ITEMS);
    expect(programs[0]).toEqual({
      position: 0,
      one: 1,
      id: EMPTY_POD_PROGRAM_ID,
    });
    expect(programs[1]).toEqual({ position: 1, one: 1, id: 2001 });
  });

  it("round-trips an unedited POD region byte-identically", () => {
    const input = syntheticSave();
    const slot = load(input);
    const programs = parsePodPrograms(slot.podPrograms);
    const rewritten = serializePodPrograms(programs);
    expect(rewritten).toEqual(slot.podPrograms);

    const out = serialize({ ...slot, podPrograms: rewritten });
    expect(out.length).toBe(SAVEFILE_SIZE_BYTES);
    expect(out).toEqual(input);
  });

  it("a targeted POD edit changes only the intended POD region bytes", () => {
    const input = syntheticSave();
    const slot = load(input);
    const programs = parsePodPrograms(slot.podPrograms);
    const edited = setPodProgramId(programs, 3, 2001);
    const podBytes = serializePodPrograms(edited);
    const out = serialize({ ...slot, podPrograms: podBytes });

    expect(out.length).toBe(SAVEFILE_SIZE_BYTES);

    const start = SAVEFILE_POD_PROGRAMS_START_BYTE;
    const end = start + POD_PROGRAMS_SIZE_BYTES;
    expect(out.subarray(0, start)).toEqual(input.subarray(0, start));
    expect(out.subarray(end)).toEqual(input.subarray(end));

    const recordStart = start + 3 * POD_PROGRAMS_ITEM_SIZE_BYTES;
    expect(out.subarray(recordStart, recordStart + 8)).toEqual(
      podRecordBytes(programs[3]!.one, 2001),
    );
    // Other POD slots unchanged
    expect(out.subarray(start, recordStart)).toEqual(
      input.subarray(start, recordStart),
    );
    expect(out.subarray(recordStart + 8, end)).toEqual(
      input.subarray(recordStart + 8, end),
    );
  });
});
