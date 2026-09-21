/**
 * Equipped-chip bonus aggregation for the loadout Stats Panel (v1).
 *
 * Stackable: raw sum → effective = min(raw, cap) when cap is known.
 * Best-of: highest equipped tier only.
 * Conditional / system / HUD: listed as text; no fake numeric aggregate.
 *
 * Caps: only confident community-table values are stored. Unknown caps stay
 * uncapped (`cap: null`) and must never invent a cutoff.
 */
import { chipCategoryForType } from "../names/chipCategory";
import type { Language } from "../i18n";
import type { PluginChip } from "./pluginChips";
import { EMPTY_PLUGIN_CHIP_ID } from "./pluginChips";

export type ChipStatUnit = "percent" | "flat";

export type StackableStatLine = {
  kind: "stackable";
  type: number;
  unit: ChipStatUnit;
  raw: number;
  effective: number;
  /** Null when the hard cap is unknown — do not invent one. */
  cap: number | null;
  overflow: number;
  estimate: boolean;
  capKnown: boolean;
};

export type BestOfStatLine = {
  kind: "bestOf";
  type: number;
  unit: ChipStatUnit;
  level: number;
  /** Null when the level→value ladder is missing. */
  value: number | null;
  estimate: boolean;
};

export type ListedStatLine = {
  kind: "listed";
  type: number;
  level: number;
  /** Always null — listed rows never collapse to one number. */
  aggregate: null;
  estimate: boolean;
  /** System/HUD chips are shown as enabled. */
  role: "conditional" | "system";
};

export type ChipLoadoutStatsSummary = {
  stackable: StackableStatLine[];
  bestOf: BestOfStatLine[];
  listed: ListedStatLine[];
};

type EffectDef =
  | {
      kind: "stackable";
      unit: ChipStatUnit;
      /** Magnitude at chip levels 0..8. */
      valuesByLevel: readonly number[];
      /** Omit when unknown — never invent. */
      cap?: number;
      estimate?: boolean;
    }
  | {
      kind: "bestOf";
      unit: ChipStatUnit;
      valuesByLevel?: readonly number[];
      estimate?: boolean;
    }
  | {
      kind: "listed";
      role: "conditional" | "system";
      estimate?: boolean;
    };

/**
 * Community-table effect metadata keyed by chip type.
 * Value ladders are community estimates unless noted; caps only when confident.
 */
const CHIP_EFFECT_DEFS: ReadonlyMap<number, EffectDef> = new Map([
  // Product spec example: Weapon Attack Up hard-caps at 100%.
  // Ladder: common community table (diamond-efficiency guides); marked estimate.
  [
    0x01,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [4, 8, 10, 12, 14, 16, 18, 20, 24],
      cap: 100,
      estimate: true,
    },
  ],
  [
    0x02,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [5, 10, 15, 20, 30, 40, 50, 60, 80],
      estimate: true,
    },
  ],
  [
    0x03,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [1, 2, 3, 4, 5, 6, 8, 10, 15],
      estimate: true,
    },
  ],
  [
    0x04,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [2, 4, 8, 10, 15, 20, 25, 30, 40],
      cap: 100,
      estimate: true,
    },
  ],
  [
    0x05,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [2, 4, 8, 10, 15, 20, 25, 30, 35],
      cap: 80,
      estimate: true,
    },
  ],
  [
    0x06,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [2, 4, 8, 10, 15, 20, 25, 30, 35],
      cap: 80,
      estimate: true,
    },
  ],
  [
    0x07,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [2, 4, 8, 10, 15, 20, 25, 30, 35],
      cap: 80,
      estimate: true,
    },
  ],
  // Anti Chain Damage — only the best equipped tier applies.
  [
    0x08,
    {
      kind: "bestOf",
      unit: "percent",
      valuesByLevel: [10, 20, 30, 40, 50, 60, 70, 80, 90],
      estimate: true,
    },
  ],
  [
    0x09,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [5, 10, 15, 20, 25, 30, 35, 40, 50],
      estimate: true,
    },
  ],
  // Drop Rate Up — values community-known; hard cap not confident → uncapped.
  [
    0x0e,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [10, 20, 30, 40, 50, 60, 70, 80, 90],
      estimate: true,
    },
  ],
  [
    0x0f,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: [2, 4, 8, 10, 15, 20, 25, 30, 35],
      cap: 100,
      estimate: true,
    },
  ],
  // Conditional / trigger chips — list text + level; no fake aggregate.
  [0x0a, { kind: "listed", role: "conditional", estimate: true }],
  [0x0b, { kind: "listed", role: "conditional", estimate: true }],
  [0x0c, { kind: "listed", role: "conditional", estimate: true }],
  [0x11, { kind: "listed", role: "conditional", estimate: true }],
  [0x12, { kind: "listed", role: "conditional", estimate: true }],
  [0x13, { kind: "listed", role: "conditional", estimate: true }],
  [0x14, { kind: "listed", role: "conditional", estimate: true }],
  [0x15, { kind: "listed", role: "conditional", estimate: true }],
  [0x16, { kind: "listed", role: "conditional", estimate: true }],
  [0x18, { kind: "listed", role: "conditional", estimate: true }],
  [0x19, { kind: "listed", role: "conditional", estimate: true }],
  [0x1a, { kind: "listed", role: "conditional", estimate: true }],
  [0x1b, { kind: "listed", role: "conditional", estimate: true }],
  [0x1d, { kind: "listed", role: "conditional", estimate: true }],
  [0x1e, { kind: "listed", role: "conditional", estimate: true }],
  [0x1f, { kind: "listed", role: "conditional", estimate: true }],
  [0x22, { kind: "listed", role: "conditional", estimate: true }],
  [0x23, { kind: "listed", role: "conditional" }],
  [0x26, { kind: "listed", role: "conditional" }],
  [0x2c, { kind: "listed", role: "conditional" }],
  [0x2d, { kind: "listed", role: "conditional" }],
  [0x2e, { kind: "listed", role: "conditional" }],
  [0x2f, { kind: "listed", role: "conditional" }],
]);

function valueAtLevel(
  valuesByLevel: readonly number[],
  level: number,
): number | null {
  if (!Number.isInteger(level) || level < 0 || level >= valuesByLevel.length) {
    return null;
  }
  return valuesByLevel[level]!;
}

function resolveDef(type: number): EffectDef {
  const known = CHIP_EFFECT_DEFS.get(type);
  if (known) return known;
  if (chipCategoryForType(type) === "system") {
    return { kind: "listed", role: "system" };
  }
  // Missing effect-table row: list by type name with estimate marker.
  return { kind: "listed", role: "conditional", estimate: true };
}

/**
 * Aggregate equipped chips on one loadout set into Stats Panel rows.
 * Pass only chips already filtered to the edited set.
 */
export function summarizeEquippedChipStats(
  equipped: readonly PluginChip[],
): ChipLoadoutStatsSummary {
  const occupied = equipped.filter(
    (chip) => chip.id.type !== EMPTY_PLUGIN_CHIP_ID.type,
  );

  const byType = new Map<number, PluginChip[]>();
  for (const chip of occupied) {
    const type = chip.id.type;
    const group = byType.get(type);
    if (group) group.push(chip);
    else byType.set(type, [chip]);
  }

  const stackable: StackableStatLine[] = [];
  const bestOf: BestOfStatLine[] = [];
  const listed: ListedStatLine[] = [];

  const types = [...byType.keys()].sort((a, b) => a - b);
  for (const type of types) {
    const chips = byType.get(type)!;
    const def = resolveDef(type);

    if (def.kind === "stackable") {
      let raw = 0;
      let anyUnknown = false;
      for (const chip of chips) {
        const v = valueAtLevel(def.valuesByLevel, chip.level);
        if (v == null) {
          anyUnknown = true;
          continue;
        }
        raw += v;
      }
      if (anyUnknown && raw === 0) {
        for (const chip of chips) {
          listed.push({
            kind: "listed",
            type,
            level: chip.level,
            aggregate: null,
            estimate: true,
            role: "conditional",
          });
        }
        continue;
      }
      const capKnown = def.cap != null;
      const cap = def.cap ?? null;
      const effective = capKnown ? Math.min(raw, def.cap!) : raw;
      const overflow = capKnown ? Math.max(0, raw - effective) : 0;
      stackable.push({
        kind: "stackable",
        type,
        unit: def.unit,
        raw,
        effective,
        cap,
        overflow,
        estimate: def.estimate === true,
        capKnown,
      });
      continue;
    }

    if (def.kind === "bestOf") {
      let best = chips[0]!;
      for (const chip of chips) {
        if (chip.level > best.level) best = chip;
      }
      const value =
        def.valuesByLevel != null
          ? valueAtLevel(def.valuesByLevel, best.level)
          : null;
      bestOf.push({
        kind: "bestOf",
        type,
        unit: def.unit,
        level: best.level,
        value,
        estimate: def.estimate === true,
      });
      continue;
    }

    for (const chip of chips) {
      listed.push({
        kind: "listed",
        type,
        level: chip.level,
        aggregate: null,
        estimate: def.estimate === true,
        role: def.role,
      });
    }
  }

  return { stackable, bestOf, listed };
}

function formatUnit(value: number, unit: ChipStatUnit): string {
  return unit === "percent" ? `${value}%` : `${value}`;
}

/**
 * Display string for a stackable row (zh overflow phrasing).
 */
export function formatStackableStatLine(
  line: StackableStatLine,
  language: Language,
): string {
  const raw = formatUnit(line.raw, line.unit);
  const effective = formatUnit(line.effective, line.unit);

  if (line.capKnown && line.cap != null && line.overflow > 0) {
    const cap = formatUnit(line.cap, line.unit);
    const unused = `+${formatUnit(line.overflow, line.unit)}`;
    if (language === "zh-CN") {
      return `${raw} → ${effective}（上限 ${cap}，${unused} 无效）`;
    }
    return `${raw} → ${effective} (cap ${cap}, ${unused} unused)`;
  }

  if (line.capKnown && line.cap != null) {
    const cap = formatUnit(line.cap, line.unit);
    if (language === "zh-CN") {
      return `${raw} → ${effective}（上限 ${cap}）`;
    }
    return `${raw} → ${effective} (cap ${cap})`;
  }

  // Unknown cap: show raw only; label unknown — never invent a cutoff.
  if (language === "zh-CN") {
    return `${raw}（上限未知）`;
  }
  return `${raw} (cap unknown)`;
}

export function formatBestOfStatLine(line: BestOfStatLine): string {
  const tier = `Lv.${line.level}`;
  if (line.value != null) {
    return `${tier} ${formatUnit(line.value, line.unit)}`;
  }
  return tier;
}
