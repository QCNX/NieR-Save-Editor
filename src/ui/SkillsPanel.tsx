import { useState } from "react";

import { translate, useI18n, type Language } from "../i18n";
import {
  EMPTY_PLUGIN_CHIP_ID,
  EMPTY_POD_CONFIG_PROGRAM_ID,
  EMPTY_POD_PROGRAM_ID,
  parsePluginChips,
  parsePodConfig,
  parsePodPrograms,
  POD_PROGRAM_IDS,
  replacePluginChipType,
  serializePluginChips,
  serializePodConfig,
  serializePodPrograms,
  setPodConfigPod,
  setPluginChip,
  setPodProgramId,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChip,
  type PodConfigPatch,
  type PodProgram,
  type SlotData,
} from "../save";
import {
  CHIP_LIBRARY_CATEGORIES,
  chipTypeMatchesCategory,
  lookupChipName,
  lookupPodName,
  showsChipDiamond,
  type ChipLibraryCategory,
} from "../names";
import {
  filterSlots,
  IdChoiceControl,
  estimateSelectWidthCh,
  type IdChoice,
} from "./slotControls";

function chipIsOccupied(chip: PluginChip): boolean {
  return chip.id.type !== EMPTY_PLUGIN_CHIP_ID.type;
}

const CATEGORY_MESSAGE_KEYS = {
  all: "chips.category.all",
  attack: "chips.category.attack",
  defense: "chips.category.defense",
  support: "chips.category.support",
  hacking: "chips.category.hacking",
  system: "chips.category.system",
} as const satisfies Record<ChipLibraryCategory, string>;

export function filterPodProgramRows(
  programs: readonly PodProgram[],
  query: string,
  occupiedOnly: boolean,
  language: Language,
): PodProgram[] {
  return filterSlots(programs, {
    query,
    occupiedOnly,
    getId: (program) => program.id,
    getLabel: (program) => lookupPodName(program.id, language),
    isOccupied: (program) => program.id !== EMPTY_POD_PROGRAM_ID,
  });
}

export function filterPluginChipRows(
  chips: readonly PluginChip[],
  query: string,
  occupiedOnly: boolean,
  language: Language,
  category: ChipLibraryCategory = "all",
): PluginChip[] {
  return filterSlots(chips, {
    query,
    occupiedOnly,
    getId: (chip) => chip.id.type,
    getLabel: (chip) => lookupChipName(chip.id.baseId, language),
    isOccupied: chipIsOccupied,
  }).filter((chip) => chipTypeMatchesCategory(chip.id.type, category));
}

export function availablePodProgramChoices(
  programs: readonly PodProgram[],
  currentPosition: number,
  language: Language,
): IdChoice<number>[] {
  const occupiedElsewhere = new Set(
    programs
      .filter(
        (program) =>
          program.position !== currentPosition &&
          program.id !== EMPTY_POD_PROGRAM_ID,
      )
      .map((program) => program.id),
  );
  return POD_PROGRAM_IDS.filter((id) => !occupiedElsewhere.has(id)).map(
    (id) => ({ id, label: lookupPodName(id, language) }),
  );
}

export function pluginChipChoices(language: Language): IdChoice<number>[] {
  return VANILLA_PLUGIN_CHIP_IDS.map((id) => ({
    id: id.type,
    label: lookupChipName(id.baseId, language),
  }));
}

export function podConfigProgramChoices(
  language: Language,
): IdChoice<number>[] {
  return [EMPTY_POD_CONFIG_PROGRAM_ID, ...POD_PROGRAM_IDS].map((id) => ({
    id,
    label:
      id === EMPTY_POD_CONFIG_PROGRAM_ID
        ? translate(language, "list.empty")
        : lookupPodName(id, language),
  }));
}

export function updatePodConfig(
  slot: SlotData,
  pod: "A" | "B" | "C",
  patch: PodConfigPatch,
): SlotData {
  const next = setPodConfigPod(parsePodConfig(slot.podConfig), pod, patch);
  return { ...slot, podConfig: serializePodConfig(next) };
}

type PanelProps = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

export function PodsPanel({ slot, onSlotChange }: PanelProps) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [occupiedOnly, setOccupiedOnly] = useState(false);
  const allPods = parsePodPrograms(slot.podPrograms);
  const podConfig = parsePodConfig(slot.podConfig);
  const pods = filterPodProgramRows(allPods, query, occupiedOnly, language);
  const configChoices = podConfigProgramChoices(language);
  const podSelectWidthCh = estimateSelectWidthCh([
    t("list.empty"),
    ...POD_PROGRAM_IDS.map((id) => lookupPodName(id, language)),
  ]);
  const choiceLabels = {
    clear: t("actions.clear"),
    empty: t("list.empty"),
    unknown: (id: number) => `${t("entity.unknown")} (T${id})`,
  };

  return (
    <section className="panel panel--fill">
      <div className="panel-split">
        <aside className="panel-split__side" aria-label={t("skills.podConfig")}>
          <h3>{t("skills.podConfig")}</h3>
          <div className="pod-config-stack">
            {(["A", "B", "C"] as const).map((podName) => {
              const pod = podConfig[`pod${podName}`];
              const programLabel =
                language === "zh-CN"
                  ? `Pod ${podName} 程序`
                  : `Pod ${podName} Program`;
              const levelLabel = `Pod ${podName} ${t("fields.level")}`;
              const unknownProgramValue =
                Number.MAX_SAFE_INTEGER - (pod.program.ordinal >>> 0);
              const programValue = pod.program.id ?? unknownProgramValue;

              return (
                <fieldset key={podName} className="pod-config-card">
                  <legend>{`Pod ${podName}`}</legend>
                  <label>
                    <span>{programLabel}</span>
                    <IdChoiceControl
                      value={programValue}
                      emptyValue={EMPTY_POD_CONFIG_PROGRAM_ID}
                      choices={configChoices}
                      selectWidthCh={podSelectWidthCh}
                      labels={{
                        select: programLabel,
                        clear: t("actions.clear"),
                        empty: t("list.empty"),
                        unknown: () =>
                          `${t("entity.unknown")} (${pod.program.ordinal})`,
                      }}
                      onChange={(programId) => {
                        if (programId === unknownProgramValue) return;
                        onSlotChange(
                          updatePodConfig(slot, podName, { programId }),
                        );
                      }}
                    />
                  </label>
                  {pod.program.id !== EMPTY_POD_CONFIG_PROGRAM_ID ? (
                    <label>
                      <span>{t("fields.level")}</span>
                      <input
                        aria-label={levelLabel}
                        type="number"
                        min={-0x80000000}
                        max={0x7fffffff}
                        value={pod.level}
                        onChange={(event) => {
                          const level = Number(event.currentTarget.value);
                          if (
                            !Number.isInteger(level) ||
                            level < -0x80000000 ||
                            level > 0x7fffffff
                          ) {
                            return;
                          }
                          onSlotChange(
                            updatePodConfig(slot, podName, { level }),
                          );
                        }}
                      />
                    </label>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
        </aside>

        <div className="panel-split__main">
          <h3>{t("skills.podPrograms")}</h3>
          <div className="list-toolbar">
            <label>
              <span>{t("list.search")}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={occupiedOnly}
                onChange={(event) =>
                  setOccupiedOnly(event.currentTarget.checked)
                }
              />
              {t("list.occupiedOnly")}
            </label>
          </div>
          <div className="table-wrap">
            <table className="slot-table">
              <thead>
                <tr>
                  <th className="col-name">{t("fields.name")}</th>
                </tr>
              </thead>
              <tbody>
                {pods.length === 0 ? (
                  <tr>
                    <td className="empty-row">{t("list.empty")}</td>
                  </tr>
                ) : (
                  pods.map((pod) => (
                    <tr key={pod.position}>
                      <td className="col-name">
                        <IdChoiceControl
                          value={pod.id}
                          emptyValue={EMPTY_POD_PROGRAM_ID}
                          choices={availablePodProgramChoices(
                            allPods,
                            pod.position,
                            language,
                          )}
                          selectWidthCh={podSelectWidthCh}
                          labels={{
                            ...choiceLabels,
                            select: `${t("skills.podPrograms")} ${pod.position + 1}`,
                          }}
                          onChange={(id) => {
                            const next = setPodProgramId(
                              parsePodPrograms(slot.podPrograms),
                              pod.position,
                              id,
                            );
                            onSlotChange({
                              ...slot,
                              podPrograms: serializePodPrograms(next),
                            });
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Placeholder until chip loadout UI (later ticket) fills the panel. */
export function ChipLoadoutPanel() {
  return (
    <section
      className="panel panel--fill"
      data-testid="chip-loadout-placeholder"
    />
  );
}

export function ChipsPanel({ slot, onSlotChange }: PanelProps) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [occupiedOnly, setOccupiedOnly] = useState(false);
  const [category, setCategory] = useState<ChipLibraryCategory>("all");
  const allChips = parsePluginChips(slot.pluginChips);
  const chips = filterPluginChipRows(
    allChips,
    query,
    occupiedOnly,
    language,
    category,
  );
  const chipChoices = pluginChipChoices(language);
  const chipSelectWidthCh = estimateSelectWidthCh([
    t("list.empty"),
    ...chipChoices.map((choice) => choice.label),
  ]);
  const choiceLabels = {
    clear: t("actions.clear"),
    empty: t("list.empty"),
    unknown: (id: number) => `${t("entity.unknown")} (T${id})`,
  };

  return (
    <section className="panel panel--fill">
      <div className="list-toolbar">
        <label>
          <span>{t("list.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>{t("chips.category")}</span>
          <select
            aria-label={t("chips.category")}
            value={category}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (
                (CHIP_LIBRARY_CATEGORIES as readonly string[]).includes(next)
              ) {
                setCategory(next as ChipLibraryCategory);
              }
            }}
          >
            {CHIP_LIBRARY_CATEGORIES.map((id) => (
              <option key={id} value={id}>
                {t(CATEGORY_MESSAGE_KEYS[id])}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={occupiedOnly}
            onChange={(event) => setOccupiedOnly(event.currentTarget.checked)}
          />
          {t("list.occupiedOnly")}
        </label>
      </div>

      <div className="table-wrap">
        <table className="slot-table">
          <thead>
            <tr>
              <th className="col-name">{t("fields.name")}</th>
              <th className="col-level">{t("fields.level")}</th>
              <th className="col-weight">{t("fields.weight")}</th>
              <th className="diamond-cell" aria-label="◆" />
            </tr>
          </thead>
          <tbody>
            {chips.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-row">
                  {t("list.empty")}
                </td>
              </tr>
            ) : (
              chips.map((chip) => (
                <tr key={chip.position}>
                  <td className="col-name">
                    <IdChoiceControl
                      value={chip.id.type}
                      emptyValue={EMPTY_PLUGIN_CHIP_ID.type}
                      choices={chipChoices}
                      selectWidthCh={chipSelectWidthCh}
                      labels={{
                        ...choiceLabels,
                        select: `${t("skills.pluginChips")} ${chip.position + 1}`,
                      }}
                      onChange={(type) => {
                        const id =
                          type === EMPTY_PLUGIN_CHIP_ID.type
                            ? EMPTY_PLUGIN_CHIP_ID
                            : VANILLA_PLUGIN_CHIP_IDS.find(
                                (candidate) => candidate.type === type,
                              );
                        if (!id) return;
                        const next = replacePluginChipType(
                          parsePluginChips(slot.pluginChips),
                          chip.position,
                          id,
                        );
                        onSlotChange({
                          ...slot,
                          pluginChips: serializePluginChips(next),
                        });
                      }}
                    />
                  </td>
                  <td className="col-level">
                    {chipIsOccupied(chip) && chip.id.hasLevels ? (
                      <input
                        aria-label={`${t("fields.level")} ${chip.position + 1}`}
                        type="number"
                        min={0}
                        max={8}
                        value={chip.level}
                        onChange={(e) => {
                          const level = Number(e.currentTarget.value);
                          if (!Number.isFinite(level)) return;
                          const all = parsePluginChips(slot.pluginChips);
                          const next = setPluginChip(all, chip.position, {
                            level: Math.min(8, Math.max(0, level | 0)),
                          });
                          onSlotChange({
                            ...slot,
                            pluginChips: serializePluginChips(next),
                          });
                        }}
                      />
                    ) : null}
                  </td>
                  <td className="col-weight">
                    {chipIsOccupied(chip) ? (
                      <input
                        aria-label={`${t("fields.weight")} ${chip.position + 1}`}
                        type="number"
                        min={0}
                        value={chip.weight}
                        onChange={(e) => {
                          const weight = Number(e.currentTarget.value);
                          if (!Number.isFinite(weight)) return;
                          const all = parsePluginChips(slot.pluginChips);
                          const next = setPluginChip(all, chip.position, {
                            weight: Math.max(0, weight | 0),
                          });
                          onSlotChange({
                            ...slot,
                            pluginChips: serializePluginChips(next),
                          });
                        }}
                      />
                    ) : null}
                  </td>
                  <td className="diamond-cell">
                    {chipIsOccupied(chip) &&
                    chip.id.hasLevels &&
                    showsChipDiamond(chip)
                      ? "◆"
                      : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** @deprecated Use PodsPanel / ChipsPanel; kept for older ticket imports. */
export function SkillsPanel(props: PanelProps) {
  return (
    <>
      <PodsPanel {...props} />
      <ChipsPanel {...props} />
    </>
  );
}
