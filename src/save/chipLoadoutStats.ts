/**
 * Equipped-chip bonus aggregation for the loadout Stats Panel (v1).
 *
 * Stackable: raw sum → effective = min(raw, cap) when cap is known.
 * Best-of: highest equipped tier only.
 * Conditional / system / HUD: listed as text; no fake numeric aggregate.
 *
 * Caps/ladders: community consensus (Fandom / Fextralife / player popup reports).
 * High-confidence caps are applied; disputed values use the higher-confidence
 * figure with `capPendingConfirm` (UI: 待确认 / Unconfirmed). Unknown caps stay
 * uncapped (`cap: null`) and must never invent a cutoff.
 *
 * Research notes (local, gitignored): `.scratch/chips/research-chip-caps.md`
 */
import { chipCategoryForType } from "../names/chipCategory";
import type { Language } from "../i18n";
import type { PluginChip } from "./pluginChips";
import { EMPTY_PLUGIN_CHIP_ID } from "./pluginChips";

export type ChipStatUnit = "percent" | "flat" | "seconds";

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
  /** Cap taken from community consensus but still awaiting in-game confirm. */
  capPendingConfirm: boolean;
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
      /** High-confidence but disputed across sources — show 待确认. */
      capPendingConfirm?: boolean;
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

/** Community Rank 0–8 ladders (Fextralife / shared sheet); all marked estimate. */
const ATK_PCT = [2, 4, 8, 10, 15, 20, 50, 80, 100] as const;
const CRIT_PCT = [1, 2, 3, 4, 6, 8, 10, 15, 30] as const;
const DEF_PCT = [2, 4, 8, 10, 15, 20, 30, 60, 80] as const;
const FAST_CD_PCT = [2, 4, 8, 10, 15, 20, 25, 35, 50] as const;
const MAX_HP_PCT = [5, 10, 15, 20, 25, 30, 40, 60, 100] as const;
const EVADE_PCT = [10, 20, 30, 40, 60, 80, 100, 150, 200] as const;
const MOVE_PCT = [2, 4, 8, 10, 12, 14, 16, 18, 20] as const;
const DROP_PCT = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;
const EXP_PCT = [2, 4, 8, 10, 20, 30, 50, 80, 100] as const;
const ANTI_CHAIN_S = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 6] as const;
const CHARGE_PCT = [120, 140, 160, 180, 200, 250, 300, 350, 400] as const;
const COUNTER_PCT = [0, 10, 20, 40, 60, 80, 100, 150, 250] as const;
const TAUNT_PCT = [180, 200, 220, 240, 260, 300, 350, 400, 500] as const;

/**
 * Community-table effect metadata keyed by chip type.
 * Caps: high-confidence community consensus; disputed → capPendingConfirm.
 */
const CHIP_EFFECT_DEFS: ReadonlyMap<number, EffectDef> = new Map([
  // Attack
  [
    0x01, // Weapon Attack Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: ATK_PCT,
      cap: 100,
      estimate: true,
    },
  ],
  [
    0x02, // Down-Attack Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: ATK_PCT,
      cap: 100,
      estimate: true,
    },
  ],
  [
    0x03, // Critical Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: CRIT_PCT,
      cap: 30,
      estimate: true,
    },
  ],
  [
    0x04, // Ranged Attack Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: ATK_PCT,
      cap: 100,
      estimate: true,
    },
  ],
  [
    0x1a, // Charge Attack — Fandom/Steam 400% vs GameWith ×3; use 400 pending confirm
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: CHARGE_PCT,
      cap: 400,
      estimate: true,
      capPendingConfirm: true,
    },
  ],
  [
    0x18, // Counter — Fandom: does not stack; highest tier only
    {
      kind: "bestOf",
      unit: "percent",
      valuesByLevel: COUNTER_PCT,
      estimate: true,
    },
  ],
  // Defense
  [
    0x06, // Melee Defense
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: DEF_PCT,
      cap: 80,
      estimate: true,
    },
  ],
  [
    0x07, // Ranged Defense
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: DEF_PCT,
      cap: 80,
      estimate: true,
    },
  ],
  [
    0x08, // Anti Chain Damage — stacks in seconds, clamp 6.0s
    {
      kind: "stackable",
      unit: "seconds",
      valuesByLevel: ANTI_CHAIN_S,
      cap: 6,
      estimate: true,
    },
  ],
  // Support
  [
    0x05, // Fast Cooldown
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: FAST_CD_PCT,
      cap: 50,
      estimate: true,
    },
  ],
  [
    0x09, // Max HP Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: MAX_HP_PCT,
      cap: 100,
      estimate: true,
    },
  ],
  [
    0x0d, // Evade Range Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: EVADE_PCT,
      cap: 200,
      estimate: true,
    },
  ],
  [
    0x0e, // Moving Speed Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: MOVE_PCT,
      cap: 20,
      estimate: true,
    },
  ],
  [
    0x0f, // Drop Rate Up
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: DROP_PCT,
      cap: 90,
      estimate: true,
    },
  ],
  [
    // EXP Gain Up — Fandom/Steam/GameWith 100% vs Fextralife ~450%; use 100 pending confirm
    0x10,
    {
      kind: "stackable",
      unit: "percent",
      valuesByLevel: EXP_PCT,
      cap: 100,
      estimate: true,
      capPendingConfirm: true,
    },
  ],
  [
    0x19, // Taunt Up — Fandom: does not stack; highest tier only
    {
      kind: "bestOf",
      unit: "percent",
      valuesByLevel: TAUNT_PCT,
      estimate: true,
    },
  ],
  // Dual-param / intensity / conditional — list until stacking axes verified
  [0x0a, { kind: "listed", role: "conditional", estimate: true }], // Offensive Heal
  [0x0b, { kind: "listed", role: "conditional", estimate: true }], // Deadly Heal
  [0x0c, { kind: "listed", role: "conditional", estimate: true }], // Auto-Heal
  [0x11, { kind: "listed", role: "conditional", estimate: true }], // Shock Wave
  [0x12, { kind: "listed", role: "conditional", estimate: true }], // Last Stand
  [0x13, { kind: "listed", role: "conditional", estimate: true }], // Damage Absorb
  [0x14, { kind: "listed", role: "conditional", estimate: true }], // Vengeance
  [0x15, { kind: "listed", role: "conditional", estimate: true }], // Reset
  [0x16, { kind: "listed", role: "conditional", estimate: true }], // Overclock
  [0x17, { kind: "listed", role: "conditional", estimate: true }], // Resilience
  [0x1b, { kind: "listed", role: "conditional", estimate: true }], // Auto-Use Item
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
      // Avoid float drift on second ladders (Anti Chain).
      raw = Math.round(raw * 1000) / 1000;
      const capKnown = def.cap != null;
      const cap = def.cap ?? null;
      const effective = capKnown ? Math.min(raw, def.cap!) : raw;
      const overflow = capKnown
        ? Math.round(Math.max(0, raw - effective) * 1000) / 1000
        : 0;
      stackable.push({
        kind: "stackable",
        type,
        unit: def.unit,
        raw,
        effective,
        cap,
        overflow,
        estimate: def.estimate === true,
        capPendingConfirm: def.capPendingConfirm === true,
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
  if (unit === "percent") return `${value}%`;
  if (unit === "seconds") return `${value}s`;
  return `${value}`;
}

/**
 * Display string for a stackable row.
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
