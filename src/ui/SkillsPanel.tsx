import { useState } from "react";

import { useI18n, type Language } from "../i18n";
import {
  EMPTY_PLUGIN_CHIP_ID,
  EMPTY_POD_PROGRAM_ID,
  parsePluginChips,
  parsePodPrograms,
  POD_PROGRAM_IDS,
  replacePluginChipType,
  serializePluginChips,
  serializePodPrograms,
  setPluginChip,
  setPodProgramId,
  VANILLA_PLUGIN_CHIP_IDS,
  type PluginChip,
  type PodProgram,
  type SlotData,
} from "../save";
import { lookupChipName, lookupPodName, showsChipDiamond } from "../names";
import {
  filterSlots,
  IdChoiceControl,
  type IdChoice,
} from "./slotControls";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

function chipIsOccupied(chip: PluginChip): boolean {
  return chip.id.type !== EMPTY_PLUGIN_CHIP_ID.type;
}

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
): PluginChip[] {
  return filterSlots(chips, {
    query,
    occupiedOnly,
    getId: (chip) => chip.id.type,
    getLabel: (chip) => lookupChipName(chip.id.baseId, language),
    isOccupied: chipIsOccupied,
  });
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

function pluginChipChoices(language: Language): IdChoice<number>[] {
  return VANILLA_PLUGIN_CHIP_IDS.map((id) => ({
    id: id.type,
    label: lookupChipName(id.baseId, language),
  }));
}

export function SkillsPanel({ slot, onSlotChange }: Props) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [occupiedOnly, setOccupiedOnly] = useState(false);
  const allPods = parsePodPrograms(slot.podPrograms);
  const allChips = parsePluginChips(slot.pluginChips);
  const pods = filterPodProgramRows(allPods, query, occupiedOnly, language);
  const chips = filterPluginChipRows(
    allChips,
    query,
    occupiedOnly,
    language,
  );
  const chipChoices = pluginChipChoices(language);
  const choiceLabels = {
    clear: t("actions.clear"),
    empty: t("list.empty"),
    unknown: (id: number) => `${t("entity.unknown")} (T${id})`,
  };

  return (
    <section className="panel" aria-labelledby="skills-heading">
      <h2 id="skills-heading">{t("tabs.skills")}</h2>

      <div className="list-toolbar">
        <label>
          {t("list.search")}
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
            onChange={(event) => setOccupiedOnly(event.currentTarget.checked)}
          />
          {t("list.occupiedOnly")}
        </label>
      </div>

      <h3>{t("skills.podPrograms")}</h3>
      <div className="table-wrap table-wrap--compact">
        <table>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
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
                  <td>
                    <IdChoiceControl
                      value={pod.id}
                      emptyValue={EMPTY_POD_PROGRAM_ID}
                      choices={availablePodProgramChoices(
                        allPods,
                        pod.position,
                        language,
                      )}
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

      <h3>{t("skills.pluginChips")}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.level")}</th>
              <th>{t("fields.weight")}</th>
              <th aria-label="◆" />
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
                  <td>
                    <IdChoiceControl
                      value={chip.id.type}
                      emptyValue={EMPTY_PLUGIN_CHIP_ID.type}
                      choices={chipChoices}
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
                  <td>
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
                  <td>
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
