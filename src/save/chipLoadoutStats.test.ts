import { describe, expect, it } from "vitest";

import { EMPTY_PLUGIN_CHIP_ID, VANILLA_PLUGIN_CHIP_IDS } from "./pluginChips";
import type { PluginChip } from "./pluginChips";
import {
  formatStackableStatLine,
  summarizeEquippedChipStats,
} from "./chipLoadoutStats";

function chip(
  type: number,
  level: number,
  position = 0,
): PluginChip {
  const id =
    VANILLA_PLUGIN_CHIP_IDS.find((it) => it.type === type) ??
    EMPTY_PLUGIN_CHIP_ID;
  return {
    position,
    id: { ...id },
    level,
    weight: id.weight,
    slotA: 0,
    slotB: -1,
    slotC: -1,
    corpseSlotA: -1,
    corpseSlotB: -1,
    corpseSlotC: -1,
    destroyOnCorpseLostMaybe: 0,
  };
}

describe("summarizeEquippedChipStats", () => {
  it("sums stackable Weapon Attack Up and clamps at the known 100% cap", () => {
    // Community ladder (estimate): L8 = +24%. Five L8 chips → raw 120%.
    const summary = summarizeEquippedChipStats([
      chip(0x01, 8, 0),
      chip(0x01, 8, 1),
      chip(0x01, 8, 2),
      chip(0x01, 8, 3),
      chip(0x01, 8, 4),
    ]);

    expect(summary.stackable).toEqual([
      {
        kind: "stackable",
        type: 0x01,
        unit: "percent",
        raw: 120,
        effective: 100,
        cap: 100,
        overflow: 20,
        estimate: true,
        capKnown: true,
      },
    ]);
    expect(summary.bestOf).toEqual([]);
    expect(summary.listed).toEqual([]);
  });

  it("leaves unknown-cap stackables uncapped (never invents a cutoff)", () => {
    // Drop Rate Up: community values, no confident hard cap in our table.
    const summary = summarizeEquippedChipStats([
      chip(0x0e, 8, 0),
      chip(0x0e, 8, 1),
    ]);

    const line = summary.stackable.find((s) => s.type === 0x0e);
    expect(line).toMatchObject({
      kind: "stackable",
      type: 0x0e,
      raw: line!.raw,
      effective: line!.raw,
      cap: null,
      overflow: 0,
      capKnown: false,
    });
    expect(line!.raw).toBeGreaterThan(0);
  });

  it("keeps only the best-of tier for Anti Chain Damage", () => {
    const summary = summarizeEquippedChipStats([
      chip(0x08, 2, 0),
      chip(0x08, 5, 1),
      chip(0x08, 3, 2),
    ]);

    expect(summary.bestOf).toHaveLength(1);
    expect(summary.bestOf[0]).toMatchObject({
      kind: "bestOf",
      type: 0x08,
      level: 5,
    });
    expect(summary.stackable.filter((s) => s.type === 0x08)).toEqual([]);
  });

  it("lists system/HUD chips as enabled text without a fake aggregate", () => {
    const summary = summarizeEquippedChipStats([
      chip(0x27, 0, 0), // HUD: HP Gauge
      chip(0x2a, 0, 1), // OS
    ]);

    expect(summary.stackable).toEqual([]);
    expect(summary.bestOf).toEqual([]);
    expect(summary.listed.map((l) => l.type).sort((a, b) => a - b)).toEqual([
      0x27, 0x2a,
    ]);
    for (const line of summary.listed) {
      expect(line.kind).toBe("listed");
      expect(line.aggregate).toBeNull();
    }
  });

  it("lists conditional chips with level params instead of summing percents", () => {
    const summary = summarizeEquippedChipStats([chip(0x0a, 4, 0)]); // Offensive Heal

    expect(summary.stackable.filter((s) => s.type === 0x0a)).toEqual([]);
    expect(summary.listed).toContainEqual(
      expect.objectContaining({
        kind: "listed",
        type: 0x0a,
        level: 4,
        aggregate: null,
      }),
    );
  });
});

describe("formatStackableStatLine", () => {
  it("formats overflow in the PLAN zh style", () => {
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x01,
          unit: "percent",
          raw: 120,
          effective: 100,
          cap: 100,
          overflow: 20,
          estimate: true,
          capKnown: true,
        },
        "zh-CN",
      ),
    ).toBe("120% → 100%（上限 100%，+20% 无效）");
  });

  it("labels unknown caps without inventing a cutoff", () => {
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x0e,
          unit: "percent",
          raw: 70,
          effective: 70,
          cap: null,
          overflow: 0,
          estimate: true,
          capKnown: false,
        },
        "en",
      ),
    ).toMatch(/70%/);
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x0e,
          unit: "percent",
          raw: 70,
          effective: 70,
          cap: null,
          overflow: 0,
          estimate: true,
          capKnown: false,
        },
        "en",
      ),
    ).toMatch(/unknown|Unknown|cap unknown/i);
  });
});
