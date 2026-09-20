export type CosmeticNameEntry = {
  readonly id: number;
  readonly en: string;
  readonly zh?: string;
};

/** NieREdit vanilla outfit IDs are character-specific and may overlap. */
export const OUTFITS = {
  "2B": [
    { id: 0, en: "Default" },
    { id: 1, en: "Revealing", zh: "暴露的女性服装" },
    { id: 2, en: "Armor" },
    { id: 3, en: "Armor, no helmet" },
  ],
  "9S": [
    { id: 0, en: "Default" },
    { id: 1, en: "Young Man", zh: "年轻人套装" },
  ],
  A2: [
    { id: 0, en: "Default" },
    { id: 1, en: "Destroyer", zh: "毁灭者套装" },
  ],
} as const satisfies Record<string, readonly CosmeticNameEntry[]>;

export const HAIR_COLORS = [
  { id: 0, en: "White" },
  { id: 1, en: "Black" },
  { id: 2, en: "Brown" },
  { id: 3, en: "Red" },
  { id: 4, en: "Blue" },
  { id: 5, en: "Green" },
  { id: 6, en: "Purple" },
  { id: 7, en: "Ash" },
  { id: 8, en: "Golden" },
  { id: 9, en: "Pastel Pink" },
  { id: 10, en: "Light Blue" },
  { id: 11, en: "Light Green" },
  { id: 12, en: "Light Purple" },
  { id: 13, en: "Neon White" },
  { id: 14, en: "Neon Yellow" },
  { id: 15, en: "Neon Pink" },
  { id: 16, en: "Neon Blue" },
  { id: 17, en: "Neon Green" },
  { id: 18, en: "Neon Purple" },
] as const satisfies readonly CosmeticNameEntry[];

export const HEAD_ACCESSORIES = [
  { id: 0, en: "None" },
  { id: 1, en: "Lunar Tear" },
  { id: 2, en: "Sand Mask" },
  { id: 4, en: "Machine Mask" },
  { id: 7, en: "Alien Mask" },
  { id: 8, en: "Valve: Left Eye" },
  { id: 9, en: "Valve: Right Eye" },
  { id: 10, en: "Valve: Both Eyes" },
  { id: 11, en: "Valve: Head" },
  { id: 12, en: "Pink Ribbon" },
  { id: 13, en: "Blue Ribbon" },
  { id: 14, en: "Camouflage Goggles" },
] as const satisfies readonly CosmeticNameEntry[];

export const DRESS_MODULES = [
  { id: 0, en: "Using Module" },
  { id: 1, en: "Default" },
] as const satisfies readonly CosmeticNameEntry[];

export const POD_APPEARANCES = [
  { id: -1, en: "Default" },
  { id: 1, en: "Grimoire" },
  { id: 2, en: "Cardboard" },
  { id: 4, en: "Retro Red" },
  { id: 7, en: "Retro Gray" },
] as const satisfies readonly CosmeticNameEntry[];
