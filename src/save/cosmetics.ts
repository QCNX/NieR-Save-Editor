import {
  HAIR_COLORS_SIZE_BYTES,
  OUTFIT_CONFIG_SIZE_BYTES,
  POD_COSMETIC_CONFIG_SIZE_BYTES,
} from "./constants";

export type Android = "2B" | "9S" | "A2";

export type SerializedBooleanI32 =
  | { readonly equipped: false; readonly rawValue: 0 }
  | { readonly equipped: true; readonly rawValue: 1 }
  | { readonly equipped: null; readonly rawValue: number };

export type OutfitConfig = {
  readonly dressModule2B: number;
  readonly dressModule9S: number;
  readonly dressModuleA2: number;
  readonly headAccessoryEquipped2B: SerializedBooleanI32;
  readonly headAccessoryEquipped9S: SerializedBooleanI32;
  readonly headAccessoryEquippedA2: SerializedBooleanI32;
  readonly headAccessory2B: number;
  readonly headAccessory9S: number;
  readonly headAccessoryA2: number;
  readonly outfit2B: number;
  readonly outfit9S: number;
  readonly outfitA2: number;
};

export type PodCosmeticConfig = {
  readonly pod2B: number;
  readonly pod9S: number;
  readonly podA2: number;
};

export type HairColors = {
  readonly hair2B: number;
  readonly hair9S: number;
  readonly hairA2: number;
};

export const POD_COSMETIC_IDS = [-1, 1, 2, 4, 7] as const;

export class CosmeticsSizeError extends Error {
  readonly expected: number;
  readonly actual: number;

  constructor(region: string, actual: number, expected: number) {
    super(`Invalid ${region} size: expected ${expected} bytes, got ${actual}`);
    this.name = "CosmeticsSizeError";
    this.expected = expected;
    this.actual = actual;
  }
}

export class CosmeticsValueError extends Error {
  constructor(field: string, value: number) {
    super(`Invalid cosmetics ${field}: ${value}`);
    this.name = "CosmeticsValueError";
  }
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readI32LE(bytes: Uint8Array, offset: number): number {
  return view(bytes).getInt32(offset, true);
}

function assertI32(field: string, value: number): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new CosmeticsValueError(field, value);
  }
}

function assertByte(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new CosmeticsValueError(field, value);
  }
}

function serializedBoolean(rawValue: number): SerializedBooleanI32 {
  if (rawValue === 0) return { equipped: false, rawValue: 0 };
  if (rawValue === 1) return { equipped: true, rawValue: 1 };
  return { equipped: null, rawValue };
}

function selectedBoolean(equipped: boolean): SerializedBooleanI32 {
  return equipped
    ? { equipped: true, rawValue: 1 }
    : { equipped: false, rawValue: 0 };
}

function characterKey(prefix: string, android: Android): string {
  return `${prefix}${android}`;
}

export function parseOutfitConfig(bytes: Uint8Array): OutfitConfig {
  if (bytes.length !== OUTFIT_CONFIG_SIZE_BYTES) {
    throw new CosmeticsSizeError(
      "OutfitConfig",
      bytes.length,
      OUTFIT_CONFIG_SIZE_BYTES,
    );
  }
  return {
    dressModule2B: readI32LE(bytes, 0),
    dressModule9S: readI32LE(bytes, 4),
    dressModuleA2: readI32LE(bytes, 8),
    headAccessoryEquipped2B: serializedBoolean(readI32LE(bytes, 12)),
    headAccessoryEquipped9S: serializedBoolean(readI32LE(bytes, 16)),
    headAccessoryEquippedA2: serializedBoolean(readI32LE(bytes, 20)),
    headAccessory2B: readI32LE(bytes, 24),
    headAccessory9S: readI32LE(bytes, 28),
    headAccessoryA2: readI32LE(bytes, 32),
    outfit2B: readI32LE(bytes, 36),
    outfit9S: readI32LE(bytes, 40),
    outfitA2: readI32LE(bytes, 44),
  };
}

export function serializeOutfitConfig(config: OutfitConfig): Uint8Array {
  const values = [
    config.dressModule2B,
    config.dressModule9S,
    config.dressModuleA2,
    config.headAccessoryEquipped2B.rawValue,
    config.headAccessoryEquipped9S.rawValue,
    config.headAccessoryEquippedA2.rawValue,
    config.headAccessory2B,
    config.headAccessory9S,
    config.headAccessoryA2,
    config.outfit2B,
    config.outfit9S,
    config.outfitA2,
  ];
  values.forEach((value, index) =>
    assertI32(`OutfitConfig field ${index}`, value),
  );
  for (const state of [
    config.headAccessoryEquipped2B,
    config.headAccessoryEquipped9S,
    config.headAccessoryEquippedA2,
  ]) {
    if (
      (state.equipped === true && state.rawValue !== 1) ||
      (state.equipped === false && state.rawValue !== 0) ||
      (state.equipped === null && (state.rawValue === 0 || state.rawValue === 1))
    ) {
      throw new CosmeticsValueError(
        "head accessory equipped raw value",
        state.rawValue,
      );
    }
  }
  const out = new Uint8Array(OUTFIT_CONFIG_SIZE_BYTES);
  values.forEach((value, index) => view(out).setInt32(index * 4, value, true));
  return out;
}

export function setDressModule(
  config: OutfitConfig,
  android: Android,
  id: number,
): OutfitConfig {
  assertI32("dress module ID", id);
  return { ...config, [characterKey("dressModule", android)]: id };
}

export function setHeadAccessory(
  config: OutfitConfig,
  android: Android,
  id: number,
): OutfitConfig {
  assertI32("head accessory ID", id);
  return {
    ...config,
    [characterKey("headAccessory", android)]: id,
    [characterKey("headAccessoryEquipped", android)]: selectedBoolean(id !== 0),
  };
}

export function setOutfit(
  config: OutfitConfig,
  android: Android,
  id: number,
): OutfitConfig {
  assertI32("outfit ID", id);
  return { ...config, [characterKey("outfit", android)]: id };
}

export function parsePodCosmeticConfig(bytes: Uint8Array): PodCosmeticConfig {
  if (bytes.length !== POD_COSMETIC_CONFIG_SIZE_BYTES) {
    throw new CosmeticsSizeError(
      "PodCosmeticConfig",
      bytes.length,
      POD_COSMETIC_CONFIG_SIZE_BYTES,
    );
  }
  return {
    pod2B: readI32LE(bytes, 0),
    pod9S: readI32LE(bytes, 4),
    podA2: readI32LE(bytes, 8),
  };
}

export function serializePodCosmeticConfig(
  config: PodCosmeticConfig,
): Uint8Array {
  const values = [config.pod2B, config.pod9S, config.podA2];
  values.forEach((value, index) =>
    assertI32(`PodCosmeticConfig field ${index}`, value),
  );
  const out = new Uint8Array(POD_COSMETIC_CONFIG_SIZE_BYTES);
  values.forEach((value, index) => view(out).setInt32(index * 4, value, true));
  return out;
}

export function setPodCosmetic(
  config: PodCosmeticConfig,
  android: Android,
  id: number,
): PodCosmeticConfig {
  if (!(POD_COSMETIC_IDS as readonly number[]).includes(id)) {
    throw new CosmeticsValueError("Pod cosmetic ID", id);
  }
  return { ...config, [characterKey("pod", android)]: id };
}

export function parseHairColors(bytes: Uint8Array): HairColors {
  if (bytes.length !== HAIR_COLORS_SIZE_BYTES) {
    throw new CosmeticsSizeError(
      "hair colors",
      bytes.length,
      HAIR_COLORS_SIZE_BYTES,
    );
  }
  return { hair2B: bytes[0], hair9S: bytes[1], hairA2: bytes[2] };
}

export function serializeHairColors(colors: HairColors): Uint8Array {
  const values = [colors.hair2B, colors.hair9S, colors.hairA2];
  values.forEach((value, index) => assertByte(`hair color ${index}`, value));
  return Uint8Array.from(values);
}

export function setHairColor(
  colors: HairColors,
  android: Android,
  id: number,
): HairColors {
  assertByte("hair color ID", id);
  return { ...colors, [characterKey("hair", android)]: id };
}
