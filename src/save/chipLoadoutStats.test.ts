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
    // Community ladder: L8 = +100%. Two L8 chips → raw 200%.
    const summary = summarizeEquippedChipStats([
      chip(0x01, 8, 0),
      chip(0x01, 8, 1),
    ]);

    expect(summary.stackable).toEqual([
      {
        kind: "stackable",
        type: 0x01,
        unit: "percent",
        raw: 200,
        effective: 100,
        cap: 100,
        overflow: 100,
        estimate: true,
        capPendingConfirm: false,
        capKnown: true,
      },
    ]);
    expect(summary.bestOf).toEqual([]);
    expect(summary.listed).toEqual([]);
  });

  it("clamps Drop Rate Up at 90% and Moving Speed at 20%", () => {
    const drop = summarizeEquippedChipStats([
      chip(0x0f, 8, 0),
      chip(0x0f, 8, 1),
    ]).stackable.find((s) => s.type === 0x0f);
    expect(drop).toMatchObject({
      raw: 180,
      effective: 90,
      cap: 90,
      overflow: 90,
      capKnown: true,
      capPendingConfirm: false,
    });

    const move = summarizeEquippedChipStats([
      chip(0x0e, 8, 0),
      chip(0x0e, 3, 1),
    ]).stackable.find((s) => s.type === 0x0e);
    expect(move).toMatchObject({
      raw: 30,
      effective: 20,
      cap: 20,
      overflow: 10,
      capKnown: true,
    });
  });

  it("clamps Fast Cooldown at 50% (not 80)", () => {
    const line = summarizeEquippedChipStats([
      chip(0x05, 8, 0),
      chip(0x05, 8, 1),
    ]).stackable.find((s) => s.type === 0x05);
    expect(line).toMatchObject({
      raw: 100,
      effective: 50,
      cap: 50,
      overflow: 50,
    });
  });

  it("stacks Anti Chain Damage in seconds up to 6s", () => {
    // L3=2s, L3=2s, L5=3s → raw 7s → effective 6s
    const summary = summarizeEquippedChipStats([
      chip(0x08, 3, 0),
      chip(0x08, 3, 1),
      chip(0x08, 5, 2),
    ]);
    expect(summary.bestOf.filter((s) => s.type === 0x08)).toEqual([]);
    expect(summary.stackable.find((s) => s.type === 0x08)).toMatchObject({
      unit: "seconds",
      raw: 7,
      effective: 6,
      cap: 6,
      overflow: 1,
    });
  });

  it("marks EXP Gain cap as pending confirm at 100%", () => {
    const line = summarizeEquippedChipStats([
      chip(0x10, 8, 0),
      chip(0x10, 8, 1),
    ]).stackable.find((s) => s.type === 0x10);
    expect(line).toMatchObject({
      raw: 200,
      effective: 100,
      cap: 100,
      overflow: 100,
      capPendingConfirm: true,
    });
  });

  it("keeps only the best-of tier for Counter", () => {
    const summary = summarizeEquippedChipStats([
      chip(0x18, 2, 0),
      chip(0x18, 8, 1),
      chip(0x18, 3, 2),
    ]);

    expect(summary.bestOf).toHaveLength(1);
    expect(summary.bestOf[0]).toMatchObject({
      kind: "bestOf",
      type: 0x18,
      level: 8,
      value: 250,
    });
    expect(summary.stackable.filter((s) => s.type === 0x18)).toEqual([]);
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
  it("formats overflow with zh overflow phrasing", () => {
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x01,
          unit: "percent",
          raw: 200,
          effective: 100,
          cap: 100,
          overflow: 100,
          estimate: true,
          capPendingConfirm: false,
          capKnown: true,
        },
        "zh-CN",
      ),
    ).toBe("200% → 100%（上限 100%，+100% 无效）");
  });

  it("formats seconds overflow for Anti Chain", () => {
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x08,
          unit: "seconds",
          raw: 7,
          effective: 6,
          cap: 6,
          overflow: 1,
          estimate: true,
          capPendingConfirm: false,
          capKnown: true,
        },
        "en",
      ),
    ).toBe("7s → 6s (cap 6s, +1s unused)");
  });

  it("labels unknown caps without inventing a cutoff", () => {
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x99,
          unit: "percent",
          raw: 70,
          effective: 70,
          cap: null,
          overflow: 0,
          estimate: true,
          capPendingConfirm: false,
          capKnown: false,
        },
        "en",
      ),
    ).toMatch(/70%/);
    expect(
      formatStackableStatLine(
        {
          kind: "stackable",
          type: 0x99,
          unit: "percent",
          raw: 70,
          effective: 70,
          cap: null,
          overflow: 0,
          estimate: true,
          capPendingConfirm: false,
          capKnown: false,
        },
        "en",
      ),
    ).toMatch(/unknown|Unknown|cap unknown/i);
  });
});
