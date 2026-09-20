import {
  EMIL_BULLETS_EQUIPPED_SIZE_BYTES,
  PLAY_RECORDS_SIZE_BYTES,
} from "./constants";

export type PlayRecords = {
  readonly itemsUsed: number;
  readonly itemsHarvested: number;
  readonly hackingGamesCompleted: number;
  readonly deaths: number;
  /** Reference semantics are unknown; preserved as the i32 at region byte 16. */
  readonly opaqueCounterAtByte16: number;
  /** Reference semantics are unknown; preserved as the i32 at region byte 20. */
  readonly opaqueCounterAtByte20: number;
  readonly enemiesKilled: number;
};

export class PlayRecordsSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number) {
    super(
      `Invalid Play Records size: expected ${PLAY_RECORDS_SIZE_BYTES} bytes, got ${actual}`,
    );
    this.name = "PlayRecordsSizeError";
    this.expected = PLAY_RECORDS_SIZE_BYTES;
    this.actual = actual;
  }
}

export class PlayRecordsValueError extends Error {
  constructor(field: string, value: number) {
    super(`Invalid Play Records ${field}: ${value}`);
    this.name = "PlayRecordsValueError";
  }
}

function assertI32(field: string, value: number): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new PlayRecordsValueError(field, value);
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

/** Parse the exact 28-byte Play Records region. */
export function parsePlayRecords(bytes: Uint8Array): PlayRecords {
  if (bytes.length !== PLAY_RECORDS_SIZE_BYTES) {
    throw new PlayRecordsSizeError(bytes.length);
  }

  return {
    itemsUsed: readI32LE(bytes, 0),
    itemsHarvested: readI32LE(bytes, 4),
    hackingGamesCompleted: readI32LE(bytes, 8),
    deaths: readI32LE(bytes, 12),
    opaqueCounterAtByte16: readI32LE(bytes, 16),
    opaqueCounterAtByte20: readI32LE(bytes, 20),
    enemiesKilled: readI32LE(bytes, 24),
  };
}

/** Serialize all seven counters, including the two opaque reference fields. */
export function serializePlayRecords(records: PlayRecords): Uint8Array {
  const values = [
    records.itemsUsed,
    records.itemsHarvested,
    records.hackingGamesCompleted,
    records.deaths,
    records.opaqueCounterAtByte16,
    records.opaqueCounterAtByte20,
    records.enemiesKilled,
  ];
  const out = new Uint8Array(PLAY_RECORDS_SIZE_BYTES);
  values.forEach((value, index) => {
    assertI32(`counter at byte ${index * 4}`, value);
    writeI32LE(out, index * 4, value);
  });
  return out;
}

export type EditablePlayRecordCounter =
  | "itemsUsed"
  | "itemsHarvested"
  | "hackingGamesCompleted"
  | "deaths"
  | "enemiesKilled";

/** Edit one user-facing counter while preserving every sibling counter. */
export function setPlayRecordCounter(
  records: PlayRecords,
  counter: EditablePlayRecordCounter,
  value: number,
): PlayRecords {
  assertI32(counter, value);
  return { ...records, [counter]: value };
}

export type EmilBulletsEquipped =
  | { readonly equipped: false; readonly rawValue: 0 }
  | { readonly equipped: true; readonly rawValue: 1 }
  | {
      /** The save contains a byte other than the reference values 0/1. */
      readonly equipped: null;
      /** Original unknown byte, retained for a lossless unedited round-trip. */
      readonly rawValue: number;
    };

export class EmilBulletsSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(actual: number) {
    super(
      `Invalid Emil bullets size: expected ${EMIL_BULLETS_EQUIPPED_SIZE_BYTES} byte, got ${actual}`,
    );
    this.name = "EmilBulletsSizeError";
    this.expected = EMIL_BULLETS_EQUIPPED_SIZE_BYTES;
    this.actual = actual;
  }
}

export class EmilBulletsValueError extends Error {
  constructor(value: number) {
    super(`Invalid Emil bullets raw byte: ${value}`);
    this.name = "EmilBulletsValueError";
  }
}

/** Parse NieREdit's 0/1 boolean without discarding an unknown save byte. */
export function parseEmilBulletsEquipped(
  bytes: Uint8Array,
): EmilBulletsEquipped {
  if (bytes.length !== EMIL_BULLETS_EQUIPPED_SIZE_BYTES) {
    throw new EmilBulletsSizeError(bytes.length);
  }
  const rawValue = bytes[0];
  if (rawValue === 1) {
    return { equipped: true, rawValue: 1 };
  }
  if (rawValue === 0) {
    return { equipped: false, rawValue: 0 };
  }
  return { equipped: null, rawValue };
}

/** Serialize the retained byte so an unedited unknown value is lossless. */
export function serializeEmilBulletsEquipped(
  state: EmilBulletsEquipped,
): Uint8Array {
  if (
    !Number.isInteger(state.rawValue) ||
    state.rawValue < 0 ||
    state.rawValue > 0xff ||
    (state.equipped === true && state.rawValue !== 1) ||
    (state.equipped === false && state.rawValue !== 0) ||
    (state.equipped === null &&
      (state.rawValue === 0 || state.rawValue === 1))
  ) {
    throw new EmilBulletsValueError(state.rawValue);
  }
  return new Uint8Array([state.rawValue]);
}

/** Select a reference boolean value, replacing any previously unknown byte. */
export function setEmilBulletsEquipped(
  equipped: boolean,
): EmilBulletsEquipped {
  return equipped
    ? { equipped: true, rawValue: 1 }
    : { equipped: false, rawValue: 0 };
}
