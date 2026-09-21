import { useState } from "react";

import { translate, useI18n, type Language } from "../i18n";
import {
  ACTIVE_CHIP_LOADOUT_SET_SUPPORTED,
  copyPluginChipLoadout,
  EMPTY_PLUGIN_CHIP_ID,
  EMPTY_POD_CONFIG_PROGRAM_ID,
  EMPTY_POD_PROGRAM_ID,
  equipPluginChipToLoadout,
  formatBestOfStatLine,
  formatStackableStatLine,
  getPurchasedChipCapacity,
  OS_PLUGIN_CHIP_TYPE,
  parsePluginChips,
  parsePodConfig,
  parsePodPrograms,
  pluginChipLoadoutUsedCost,
  POD_PROGRAM_IDS,
  PURCHASED_CAPACITY_OPTIONS,
  replacePluginChipType,
  serializePluginChips,
  serializePodConfig,
  serializePodPrograms,
  setEquippedPluginChipWeight,
  setPodConfigPod,
  setPluginChip,
  setPodProgramId,
  setPurchasedChipCapacityWithInventorySync,
  summarizeEquippedChipStats,
  unequipPluginChipFromLoadout,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChip,
  type PluginChipLoadoutSet,
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

const LOADOUT_SETS: readonly PluginChipLoadoutSet[] = ["A", "B", "C"];

const LOADOUT_SLOT_KEY = {
  A: "slotA",
  B: "slotB",
  C: "slotC",
} as const satisfies Record<PluginChipLoadoutSet, keyof PluginChip>;

export class ChipLoadoutCapacityError extends Error {
  constructor(
    message = "Loadout change would exceed purchased capacity while overload is off",
  ) {
    super(message);
    this.name = "ChipLoadoutCapacityError";
  }
}

export function chipsEquippedOnLoadout(
  chips: readonly PluginChip[],
  set: PluginChipLoadoutSet,
): PluginChip[] {
  const key = LOADOUT_SLOT_KEY[set];
  return chips
    .filter((chip) => chip[key] >= 0)
    .sort((a, b) => a[key] - b[key] || a.position - b.position);
}

export function chipsAvailableForLoadout(
  chips: readonly PluginChip[],
  set: PluginChipLoadoutSet,
): PluginChip[] {
  const key = LOADOUT_SLOT_KEY[set];
  return chips.filter(
    (chip) => chipIsOccupied(chip) && chip[key] < 0,
  );
}

function assertWithinCapacity(
  used: number,
  purchased: number,
  overload: boolean,
): void {
  if (!overload && used > purchased) {
    throw new ChipLoadoutCapacityError();
  }
}

export function applyChipLoadoutEquip(
  slot: SlotData,
  index: number,
  set: PluginChipLoadoutSet,
  options: { overload: boolean },
): SlotData {
  const chips = parsePluginChips(slot.pluginChips);
  const chip = chips[index];
  if (!chip) {
    throw new RangeError(`Plugin chip index out of range: ${index}`);
  }
  const key = LOADOUT_SLOT_KEY[set];
  if (chip[key] < 0) {
    const used =
      pluginChipLoadoutUsedCost(chips, set) + Math.max(0, chip.weight);
    assertWithinCapacity(
      used,
      getPurchasedChipCapacity(slot),
      options.overload,
    );
  }
  return {
    ...slot,
    pluginChips: serializePluginChips(
      equipPluginChipToLoadout(chips, index, set),
    ),
  };
}

export function applyChipLoadoutUnequip(
  slot: SlotData,
  index: number,
  set: PluginChipLoadoutSet,
): SlotData {
  const chips = parsePluginChips(slot.pluginChips);
  return {
    ...slot,
    pluginChips: serializePluginChips(
      unequipPluginChipFromLoadout(chips, index, set),
    ),
  };
}

export function applyChipLoadoutCopy(
  slot: SlotData,
  from: PluginChipLoadoutSet,
  to: PluginChipLoadoutSet,
  options: { overload: boolean },
): SlotData {
  const chips = parsePluginChips(slot.pluginChips);
  const projected = copyPluginChipLoadout(chips, from, to);
  assertWithinCapacity(
    pluginChipLoadoutUsedCost(projected, to),
    getPurchasedChipCapacity(slot),
    options.overload,
  );
  return {
    ...slot,
    pluginChips: serializePluginChips(projected),
  };
}

export function applyChipLoadoutCapacity(
  slot: SlotData,
  capacity: number,
  options: { overload: boolean },
): SlotData {
  const chips = parsePluginChips(slot.pluginChips);
  for (const set of LOADOUT_SETS) {
    assertWithinCapacity(
      pluginChipLoadoutUsedCost(chips, set),
      capacity,
      options.overload,
    );
  }
  return setPurchasedChipCapacityWithInventorySync(slot, capacity);
}

export function applyChipLoadoutLevel(
  slot: SlotData,
  index: number,
  level: number,
): SlotData {
  const chips = parsePluginChips(slot.pluginChips);
  const next = setPluginChip(chips, index, {
    level: Math.min(8, Math.max(0, level | 0)),
  });
  return { ...slot, pluginChips: serializePluginChips(next) };
}

export function applyChipLoadoutWeight(
  slot: SlotData,
  index: number,
  weight: number,
  options: { overload: boolean },
): SlotData {
  const chips = parsePluginChips(slot.pluginChips);
  const chip = chips[index];
  if (!chip) {
    throw new RangeError(`Plugin chip index out of range: ${index}`);
  }
  const nextWeight = Math.max(0, weight | 0);
  const purchased = getPurchasedChipCapacity(slot);
  for (const set of LOADOUT_SETS) {
    const key = LOADOUT_SLOT_KEY[set];
    if (chip[key] < 0) continue;
    const used =
      pluginChipLoadoutUsedCost(chips, set) - chip.weight + nextWeight;
    assertWithinCapacity(used, purchased, options.overload);
  }
  return {
    ...slot,
    pluginChips: serializePluginChips(
      setEquippedPluginChipWeight(chips, index, nextWeight),
    ),
  };
}

type ChipLoadoutPanelProps = PanelProps & {
  /** Test seam: start with overload enabled (defaults to off). */
  initialOverload?: boolean;
};

/** Chip loadout wireframe: A/B/C sets, capacity, overload, library → equipped. */
export function ChipLoadoutPanel({
  slot,
  onSlotChange,
  initialOverload = false,
}: ChipLoadoutPanelProps) {
  const { language, t } = useI18n();
  const [editSet, setEditSet] = useState<PluginChipLoadoutSet>("A");
  const [copySource, setCopySource] = useState<PluginChipLoadoutSet>("B");
  const [overload, setOverload] = useState(initialOverload);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ChipLibraryCategory>("all");

  const allChips = parsePluginChips(slot.pluginChips);
  const purchased = getPurchasedChipCapacity(slot);
  const used = pluginChipLoadoutUsedCost(allChips, editSet);
  const overCapacity = used > purchased;
  const equipped = chipsEquippedOnLoadout(allChips, editSet);
  const stats = summarizeEquippedChipStats(equipped);
  const available = filterPluginChipRows(
    chipsAvailableForLoadout(allChips, editSet),
    query,
    true,
    language,
    category,
  );

  const runGuarded = (action: () => SlotData) => {
    try {
      onSlotChange(action());
    } catch (error) {
      if (error instanceof ChipLoadoutCapacityError) return;
      throw error;
    }
  };

  return (
    <section
      className="panel panel--fill"
      data-testid="chip-loadout-panel"
    >
      <div className="list-toolbar chip-loadout-toolbar">
        <div
          className="slot-list-toolbar"
          role="group"
          aria-label={t("chips.loadoutSet")}
        >
          {LOADOUT_SETS.map((set) => (
            <button
              key={set}
              type="button"
              aria-pressed={editSet === set}
              onClick={() => setEditSet(set)}
            >
              {set}
            </button>
          ))}
        </div>

        <button
          type="button"
          data-testid="chip-loadout-active"
          disabled={!ACTIVE_CHIP_LOADOUT_SET_SUPPORTED}
          title={t("chips.activeUnavailable")}
          aria-label={t("chips.activeUnavailable")}
        >
          {t("chips.activeUnavailable")}
        </button>

        <label>
          <span>{t("chips.copyFrom")}</span>
          <select
            aria-label={t("chips.copyFrom")}
            value={copySource}
            onChange={(event) =>
              setCopySource(event.currentTarget.value as PluginChipLoadoutSet)
            }
          >
            {LOADOUT_SETS.map((set) => (
              <option key={set} value={set}>
                {set}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() =>
            runGuarded(() =>
              applyChipLoadoutCopy(slot, copySource, editSet, { overload }),
            )
          }
        >
          {t("chips.copy")}
        </button>

        <label>
          <input
            type="checkbox"
            checked={overload}
            onChange={(event) => setOverload(event.currentTarget.checked)}
          />
          {t("chips.overload")}
        </label>

        <label
          data-testid="chip-loadout-usage"
          data-over-capacity={overCapacity ? "true" : "false"}
          className={overCapacity ? "chip-loadout-usage--over" : undefined}
        >
          <span>{t("chips.usage")}</span>
          <span>
            {used} /{" "}
            <select
              data-testid="chip-loadout-capacity"
              aria-label={t("chips.purchasedCapacity")}
              value={purchased}
              onChange={(event) => {
                const capacity = Number(event.currentTarget.value);
                if (!Number.isFinite(capacity)) return;
                runGuarded(() =>
                  applyChipLoadoutCapacity(slot, capacity, { overload }),
                );
              }}
            >
              {PURCHASED_CAPACITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
          <span className="chip-loadout-capacity-label">
            {t("chips.purchasedCapacity")}
          </span>
        </label>
      </div>

      <div className="panel-split">
        <div className="panel-split__side">
          <h3>{t("chips.fromLibrary")}</h3>
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
                    (CHIP_LIBRARY_CATEGORIES as readonly string[]).includes(
                      next,
                    )
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
          </div>
          <div className="table-wrap">
            <table className="slot-table">
              <thead>
                <tr>
                  <th className="col-name">{t("fields.name")}</th>
                  <th className="col-weight">{t("fields.weight")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {available.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-row">
                      {t("list.empty")}
                    </td>
                  </tr>
                ) : (
                  available.map((chip) => (
                    <tr key={chip.position}>
                      <td className="col-name">
                        {lookupChipName(chip.id.baseId, language)}
                      </td>
                      <td className="col-weight">{chip.weight}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            runGuarded(() =>
                              applyChipLoadoutEquip(
                                slot,
                                chip.position,
                                editSet,
                                { overload },
                              ),
                            )
                          }
                        >
                          {t("chips.equip")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-split__main">
          <h3>{t("chips.equipped")}</h3>
          <div className="table-wrap">
            <table className="slot-table">
              <thead>
                <tr>
                  <th className="col-name">{t("fields.name")}</th>
                  <th className="col-level">{t("fields.level")}</th>
                  <th className="col-weight">{t("fields.weight")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {equipped.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      {t("list.empty")}
                    </td>
                  </tr>
                ) : (
                  equipped.map((chip) => (
                    <tr key={chip.position}>
                      <td className="col-name">
                        {lookupChipName(chip.id.baseId, language)}
                      </td>
                      <td className="col-level">
                        {chip.id.hasLevels ? (
                          <input
                            aria-label={`${t("fields.level")} ${chip.position + 1}`}
                            type="number"
                            min={0}
                            max={8}
                            value={chip.level}
                            onChange={(event) => {
                              const level = Number(event.currentTarget.value);
                              if (!Number.isFinite(level)) return;
                              onSlotChange(
                                applyChipLoadoutLevel(
                                  slot,
                                  chip.position,
                                  level,
                                ),
                              );
                            }}
                          />
                        ) : null}
                      </td>
                      <td className="col-weight">
                        <input
                          aria-label={`${t("fields.weight")} ${chip.position + 1}`}
                          type="number"
                          min={0}
                          value={chip.weight}
                          onChange={(event) => {
                            const weight = Number(event.currentTarget.value);
                            if (!Number.isFinite(weight)) return;
                            runGuarded(() =>
                              applyChipLoadoutWeight(
                                slot,
                                chip.position,
                                weight,
                                { overload },
                              ),
                            );
                          }}
                        />
                      </td>
                      <td>
                        {chip.id.type === OS_PLUGIN_CHIP_TYPE ? null : (
                          <button
                            type="button"
                            onClick={() =>
                              onSlotChange(
                                applyChipLoadoutUnequip(
                                  slot,
                                  chip.position,
                                  editSet,
                                ),
                              )
                            }
                          >
                            {t("chips.unequip")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <section
        className="chip-loadout-stats"
        data-testid="chip-loadout-stats"
        aria-label={t("chips.statsPanel")}
      >
        <h3>{t("chips.statsPanel")}</h3>
        {stats.stackable.length === 0 &&
        stats.bestOf.length === 0 &&
        stats.listed.length === 0 ? (
          <p className="chip-stats-empty">{t("chips.stats.empty")}</p>
        ) : (
          <ul className="chip-stats-list">
            {stats.stackable.map((line) => {
              const baseId =
                VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === line.type)
                  ?.baseId ?? line.type;
              return (
                <li
                  key={`stack-${line.type}`}
                  className={
                    line.overflow > 0
                      ? "chip-stats-row chip-stats-row--overflow"
                      : "chip-stats-row"
                  }
                  data-testid="chip-stats-stackable"
                  data-chip-type={line.type}
                  data-overflow={line.overflow > 0 ? "true" : "false"}
                  data-cap-known={line.capKnown ? "true" : "false"}
                >
                  <span className="chip-stats-name">
                    {lookupChipName(baseId, language)}
                    {line.estimate ? (
                      <span className="chip-stats-estimate">
                        {" "}
                        ({t("chips.stats.estimate")})
                      </span>
                    ) : null}
                  </span>
                  <span className="chip-stats-value">
                    {formatStackableStatLine(line, language)}
                  </span>
                </li>
              );
            })}
            {stats.bestOf.map((line) => {
              const baseId =
                VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === line.type)
                  ?.baseId ?? line.type;
              return (
                <li
                  key={`best-${line.type}`}
                  className="chip-stats-row"
                  data-testid="chip-stats-bestof"
                  data-chip-type={line.type}
                >
                  <span className="chip-stats-name">
                    {lookupChipName(baseId, language)}
                    {line.estimate ? (
                      <span className="chip-stats-estimate">
                        {" "}
                        ({t("chips.stats.estimate")})
                      </span>
                    ) : null}
                  </span>
                  <span className="chip-stats-value">
                    {formatBestOfStatLine(line)}
                  </span>
                </li>
              );
            })}
            {stats.listed.map((line, index) => {
              const baseId =
                VANILLA_PLUGIN_CHIP_IDS.find((id) => id.type === line.type)
                  ?.baseId ?? line.type;
              return (
                <li
                  key={`list-${line.type}-${line.level}-${index}`}
                  className="chip-stats-row"
                  data-testid="chip-stats-listed"
                  data-chip-type={line.type}
                  data-role={line.role}
                >
                  <span className="chip-stats-name">
                    {lookupChipName(baseId, language)}
                    {line.estimate ? (
                      <span className="chip-stats-estimate">
                        {" "}
                        ({t("chips.stats.estimate")})
                      </span>
                    ) : null}
                  </span>
                  <span className="chip-stats-value">
                    {line.role === "system"
                      ? t("chips.stats.enabled")
                      : `Lv.${line.level}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
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
