import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  EMPTY_POD_CONFIG_PROGRAM_ID,
  SAVEFILE_SIZE_BYTES,
  load,
  parsePodConfig,
  parsePodPrograms,
  serializePodConfig,
  serializePodPrograms,
  setPodConfigPod,
  setPodProgramId,
} from "../save";
import {
  podConfigProgramChoices,
  updatePodConfig,
  PodsPanel,
} from "./SkillsPanel";

function configuredSlot() {
  const loaded = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
  let programs = parsePodPrograms(loaded.podPrograms);
  programs = setPodProgramId(programs, 0, 2001);
  programs = setPodProgramId(programs, 1, 2002);
  programs = setPodProgramId(programs, 2, 2003);
  let config = parsePodConfig(loaded.podConfig);
  config = setPodConfigPod(config, "A", { programId: 2001, level: 2 });
  config = setPodConfigPod(config, "B", { programId: 2002, level: 3 });
  config = setPodConfigPod(config, "C", { programId: 2003, level: 4 });
  return {
    ...loaded,
    podPrograms: serializePodPrograms(programs),
    podConfig: serializePodConfig(config),
  };
}

describe("ticket 11 Pod Config editor seam", () => {
  it("offers EMPTY plus only unlocked POD program choices", () => {
    const owned = parsePodPrograms(configuredSlot().podPrograms);
    const english = podConfigProgramChoices(owned, "en");
    expect(english).toEqual([
      { id: EMPTY_POD_CONFIG_PROGRAM_ID, label: "(Empty)" },
      { id: 2001, label: "R010: Laser" },
      { id: 2002, label: "R020: Mirage" },
      { id: 2003, label: "R030: Hammer" },
    ]);
    expect(english.some((choice) => choice.id === 2024)).toBe(false);
    expect(english.some((choice) => choice.id === 2013)).toBe(false);

    expect(podConfigProgramChoices([], "en")).toEqual([
      { id: EMPTY_POD_CONFIG_PROGRAM_ID, label: "(Empty)" },
    ]);

    expect(podConfigProgramChoices(owned, "zh-CN")).toEqual([
      { id: EMPTY_POD_CONFIG_PROGRAM_ID, label: "（空）" },
      { id: 2001, label: "R010：激光" },
      { id: 2002, label: "R020：幻象" },
      { id: 2003, label: "R030：榔头" },
    ]);
  });

  it("keeps the currently equipped program even if missing from the library", () => {
    const orphan = podConfigProgramChoices([], "en", 2024);
    expect(orphan).toEqual([
      { id: EMPTY_POD_CONFIG_PROGRAM_ID, label: "(Empty)" },
      { id: 2024, label: "A170: Scanner" },
    ]);
  });

  it("updates one Pod Config field without changing inventory or POD inventory", () => {
    const original = configuredSlot();
    const changed = updatePodConfig(original, "B", { programId: 2024 });
    const leveled = updatePodConfig(changed, "C", { level: 0x7fffffff });

    expect(changed).not.toBe(original);
    expect(changed.podConfig).not.toBe(original.podConfig);
    expect(parsePodConfig(leveled.podConfig)).toMatchObject({
      podA: { level: 2, program: { id: 2001 } },
      podB: { level: 3, program: { id: 2024 } },
      podC: { level: 0x7fffffff, program: { id: 2003 } },
    });
    expect(leveled.inventory).toBe(original.inventory);
    expect(leveled.podPrograms).toBe(original.podPrograms);
    expect(leveled.pluginChips).toBe(original.pluginChips);

    const cleared = updatePodConfig(leveled, "A", {
      programId: EMPTY_POD_CONFIG_PROGRAM_ID,
    });
    expect(parsePodConfig(cleared.podConfig).podA.program.id).toBe(
      EMPTY_POD_CONFIG_PROGRAM_ID,
    );
  });

  it("renders Pod A/B/C program and level controls in both languages", () => {
    const onSlotChange = vi.fn();
    const english = renderToStaticMarkup(
      <I18nProvider language="en">
        <PodsPanel slot={configuredSlot()} onSlotChange={onSlotChange} />
      </I18nProvider>,
    );
    const chinese = renderToStaticMarkup(
      <I18nProvider language="zh-CN">
        <PodsPanel slot={configuredSlot()} onSlotChange={onSlotChange} />
      </I18nProvider>,
    );

    expect(english).toContain("Pod Config");
    expect(english).toContain('aria-label="Pod A Program"');
    expect(english).toContain('aria-label="Pod B Level"');
    expect(english).toContain('aria-label="Pod C Program"');
    expect(english).toContain(">Program</span>");
    expect(english).not.toContain(">Pod A Program</span>");

    expect(chinese).toContain("Pod 配置");
    expect(chinese).toContain('aria-label="Pod A 程序"');
    expect(chinese).toContain('aria-label="Pod B 等级"');
    expect(chinese).toContain(">程序</span>");
    expect(chinese).not.toContain(">Pod A 程序</span>");
  });
});
