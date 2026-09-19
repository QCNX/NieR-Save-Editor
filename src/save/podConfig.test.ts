import { describe, expect, it } from "vitest";
import {
  POD_CONFIG_SIZE_BYTES,
  SAVEFILE_POD_CONFIG_START_BYTE,
  SAVEFILE_SIZE_BYTES,
} from "./constants";
import {
  EMPTY_POD_CONFIG_PROGRAM_ID,
  parsePodConfig,
  PodConfigValueError,
  serializePodConfig,
  setPodConfigPod,
} from "./podConfig";
import { load, serialize } from "./slotData";

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index++) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function syntheticSave(): Uint8Array {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = (index * 31 + 17) % 256;
  }
  bytes.set(
    hexToBytes(
      "010000000200000003000000000000000100000018000000",
    ),
    SAVEFILE_POD_CONFIG_START_BYTE,
  );
  return bytes;
}

describe("PodConfig parse/edit/serialize", () => {
  it("parses Pod A/B/C levels and maps NieREdit ordinals to program IDs", () => {
    const bytes = hexToBytes(
      "010000000200000003000000000000000100000018000000",
    );

    expect(parsePodConfig(bytes)).toEqual({
      podA: {
        level: 1,
        program: { id: EMPTY_POD_CONFIG_PROGRAM_ID, ordinal: 0 },
      },
      podB: { level: 2, program: { id: 2001, ordinal: 1 } },
      podC: { level: 3, program: { id: 2024, ordinal: 24 } },
    });
  });

  it("round-trips an unedited full save and an unknown program ordinal", () => {
    const input = syntheticSave();
    const slot = load(input);
    expect(serialize(slot)).toEqual(input);

    const unknown = hexToBytes(
      "010000000200000003000000630000000100000018000000",
    );
    const parsed = parsePodConfig(unknown);
    expect(parsed.podA.program).toEqual({ id: null, ordinal: 99 });
    expect(serializePodConfig(parsed)).toEqual(unknown);
  });

  it("changes only Pod B's program ordinal in the full save", () => {
    const input = syntheticSave();
    const slot = load(input);
    const config = setPodConfigPod(parsePodConfig(slot.podConfig), "B", {
      programId: 2024,
    });
    const output = serialize({
      ...slot,
      podConfig: serializePodConfig(config),
    });
    const changedStart = 231224;

    expect(output.subarray(0, changedStart)).toEqual(
      input.subarray(0, changedStart),
    );
    expect(output.subarray(changedStart, changedStart + 4)).toEqual(
      hexToBytes("18000000"),
    );
    expect(output.subarray(changedStart + 4)).toEqual(
      input.subarray(changedStart + 4),
    );
  });

  it("changes only Pod C's level bytes", () => {
    const original = parsePodConfig(
      hexToBytes("010000000200000003000000000000000100000018000000"),
    );
    const edited = setPodConfigPod(original, "C", {
      level: 7,
    });

    expect(serializePodConfig(edited)).toEqual(
      hexToBytes("010000000200000007000000000000000100000018000000"),
    );
  });

  it("selects NieREdit's EMPTY value by its game-facing ID", () => {
    const original = parsePodConfig(
      hexToBytes("010000000200000003000000000000000100000018000000"),
    );
    const cleared = setPodConfigPod(original, "C", {
      programId: EMPTY_POD_CONFIG_PROGRAM_ID,
    });

    expect(cleared.podC.program).toEqual({
      id: EMPTY_POD_CONFIG_PROGRAM_ID,
      ordinal: 0,
    });
    expect(serializePodConfig(cleared).subarray(20, 24)).toEqual(
      hexToBytes("00000000"),
    );
  });

  it("rejects invalid edit values while permitting all reference enum IDs", () => {
    const config = parsePodConfig(new Uint8Array(POD_CONFIG_SIZE_BYTES));

    expect(() =>
      setPodConfigPod(config, "A", { programId: 0 }),
    ).toThrow(PodConfigValueError);
    expect(() =>
      setPodConfigPod(config, "A", { programId: 2013 }),
    ).not.toThrow();
    expect(() =>
      setPodConfigPod(config, "A", { level: 0x80000000 }),
    ).toThrow(PodConfigValueError);
  });
});
