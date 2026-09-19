import { POD_CONFIG_SIZE_BYTES } from "./constants";

export const EMPTY_POD_CONFIG_PROGRAM_ID = -1;

/** All NieREdit PodProgramId values, including entries hidden by its UI. */
export const POD_CONFIG_PROGRAM_IDS: readonly number[] = [
  EMPTY_POD_CONFIG_PROGRAM_ID,
  ...Array.from({ length: 24 }, (_, index) => 2001 + index),
];

export type PodConfigProgram = {
  /** Game-facing ID; null means the save contains an unknown enum ordinal. */
  readonly id: number | null;
  /** Serialized NieREdit PodProgramId enum ordinal. */
  readonly ordinal: number;
};

export type PodConfigPod = {
  readonly level: number;
  readonly program: PodConfigProgram;
};

export type PodConfig = {
  readonly podA: PodConfigPod;
  readonly podB: PodConfigPod;
  readonly podC: PodConfigPod;
};

export class PodConfigSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number) {
    super(
      `Invalid PodConfig size: expected ${POD_CONFIG_SIZE_BYTES} bytes, got ${actual}`,
    );
    this.name = "PodConfigSizeError";
    this.expected = POD_CONFIG_SIZE_BYTES;
    this.actual = actual;
  }
}

export class PodConfigValueError extends Error {
  constructor(field: string, value: number) {
    super(`Invalid PodConfig ${field}: ${value}`);
    this.name = "PodConfigValueError";
  }
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt32(
    offset,
    true,
  );
}

function writeI32LE(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setInt32(
    offset,
    value,
    true,
  );
}

function assertI32(field: string, value: number): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new PodConfigValueError(field, value);
  }
}

function programFromOrdinal(ordinal: number): PodConfigProgram {
  return {
    id: POD_CONFIG_PROGRAM_IDS[ordinal] ?? null,
    ordinal,
  };
}

function programFromId(id: number): PodConfigProgram {
  const ordinal = POD_CONFIG_PROGRAM_IDS.indexOf(id);
  if (ordinal === -1) {
    throw new PodConfigValueError("program ID", id);
  }
  return { id, ordinal };
}

/** Parse the exact 24-byte PodConfig region. */
export function parsePodConfig(bytes: Uint8Array): PodConfig {
  if (bytes.length !== POD_CONFIG_SIZE_BYTES) {
    throw new PodConfigSizeError(bytes.length);
  }

  return {
    podA: {
      level: readI32LE(bytes, 0),
      program: programFromOrdinal(readI32LE(bytes, 12)),
    },
    podB: {
      level: readI32LE(bytes, 4),
      program: programFromOrdinal(readI32LE(bytes, 16)),
    },
    podC: {
      level: readI32LE(bytes, 8),
      program: programFromOrdinal(readI32LE(bytes, 20)),
    },
  };
}

/** Serialize PodConfig while preserving unknown enum ordinals. */
export function serializePodConfig(config: PodConfig): Uint8Array {
  const values = [
    config.podA.level,
    config.podB.level,
    config.podC.level,
    config.podA.program.ordinal,
    config.podB.program.ordinal,
    config.podC.program.ordinal,
  ];
  values.forEach((value, index) => assertI32(`field ${index}`, value));

  const out = new Uint8Array(POD_CONFIG_SIZE_BYTES);
  values.forEach((value, index) => writeI32LE(out, index * 4, value));
  return out;
}

export type PodConfigPatch = {
  readonly level?: number;
  readonly programId?: number;
};

/** Edit one Pod without changing either sibling. */
export function setPodConfigPod(
  config: PodConfig,
  pod: "A" | "B" | "C",
  patch: PodConfigPatch,
): PodConfig {
  const key = `pod${pod}` as const;
  const current = config[key];
  if (patch.level !== undefined) {
    assertI32("level", patch.level);
  }
  const next: PodConfigPod = {
    level: patch.level ?? current.level,
    program:
      patch.programId === undefined
        ? current.program
        : programFromId(patch.programId),
  };
  return { ...config, [key]: next };
}
