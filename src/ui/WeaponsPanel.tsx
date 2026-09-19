import { useState } from "react";

import weaponsData from "../data/weapons.json";
import { translate, useI18n, type Language } from "../i18n";
import {
  parseWeapons,
  replaceWeaponId,
  writeWeaponAt,
  type SlotData,
  type WeaponItem,
} from "../save";
import { lookupWeaponName } from "../names";
import { filterSlots, IdChoiceControl, type IdChoice } from "./slotControls";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

export function filterWeaponRows(
  weapons: readonly WeaponItem[],
  query: string,
  occupiedOnly: boolean,
  language: Language,
): WeaponItem[] {
  return filterSlots(weapons, {
    query,
    occupiedOnly,
    getId: (weapon) => weapon.id,
    getLabel: (weapon) =>
      weapon.id === -1
        ? translate(language, "list.empty")
        : lookupWeaponName(weapon.id, language),
    isOccupied: (weapon) => weapon.id !== -1,
  });
}

export function availableWeaponChoices(
  weapons: readonly WeaponItem[],
  position: number,
  language: Language,
): IdChoice<number>[] {
  const currentId = weapons.find((weapon) => weapon.position === position)?.id;
  const occupiedIds = new Set(
    weapons
      .filter((weapon) => weapon.position !== position && weapon.id !== -1)
      .map((weapon) => weapon.id),
  );

  return Object.keys(weaponsData)
    .map(Number)
    .filter((id) => id === currentId || !occupiedIds.has(id))
    .map((id) => ({ id, label: lookupWeaponName(id, language) }));
}

export function WeaponsPanel({ slot, onSlotChange }: Props) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [occupiedOnly, setOccupiedOnly] = useState(true);
  const allWeapons = parseWeapons(slot.weapons);
  const weapons = filterWeaponRows(allWeapons, query, occupiedOnly, language);

  return (
    <section className="panel" aria-labelledby="weapons-heading">
      <h2 id="weapons-heading">{t("tabs.weapons")}</h2>
      <div className="settings-row">
        <label>
          <span>{t("list.search")}</span>
          <input
            type="search"
            aria-label={t("list.search")}
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
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("fields.name")}</th>
              <th>{t("fields.level")}</th>
            </tr>
          </thead>
          <tbody>
            {weapons.length === 0 ? (
              <tr>
                <td colSpan={2} className="empty-row">
                  {t("list.empty")}
                </td>
              </tr>
            ) : (
              weapons.map((weapon) => {
                const availableChoices = availableWeaponChoices(
                  allWeapons,
                  weapon.position,
                  language,
                );

                return (
                  <tr key={weapon.position}>
                    <td>
                      <IdChoiceControl
                        value={weapon.id}
                        emptyValue={-1}
                        choices={availableChoices}
                        labels={{
                          select: t("fields.name"),
                          clear: t("actions.clear"),
                          empty: t("list.empty"),
                          unknown: (id) => lookupWeaponName(id, language),
                        }}
                        onChange={(id) =>
                          onSlotChange({
                            ...slot,
                            weapons: writeWeaponAt(
                              slot.weapons,
                              replaceWeaponId(weapon, id),
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      {weapon.id === -1 ? null : (
                        <input
                          type="number"
                          min={1}
                          max={4}
                          value={weapon.level}
                          onChange={(event) => {
                            const level = Number(event.currentTarget.value);
                            if (!Number.isFinite(level)) return;
                            onSlotChange({
                              ...slot,
                              weapons: writeWeaponAt(slot.weapons, {
                                ...weapon,
                                level: level | 0,
                              }),
                            });
                          }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
