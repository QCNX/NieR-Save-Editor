import { useMemo, useState } from "react";

import weaponsData from "../data/weapons.json";
import { translate, useI18n, type Language } from "../i18n";
import {
  EMPTY_WEAPON_SLOT_ID,
  parseWeaponSlot,
  parseWeapons,
  replaceWeaponId,
  serializeWeaponSlot,
  setWeaponSlotAttack,
  writeWeaponAt,
  type SlotData,
  type WeaponItem,
} from "../save";
import { lookupWeaponName } from "../names";
import {
  estimateSelectWidthCh,
  filterSlots,
  IdChoiceControl,
  type IdChoice,
} from "./slotControls";

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

export function availableEquipmentWeaponChoices(
  weapons: readonly WeaponItem[],
  language: Language,
): IdChoice<number>[] {
  const ownedIds = new Set(
    weapons
      .map((weapon) => weapon.id)
      .filter((id) => id !== -1),
  );

  return [...ownedIds].map((id) => ({
    id,
    label: lookupWeaponName(id, language),
  }));
}

type WeaponEquipmentSet = "weaponSlot1" | "weaponSlot2";
type WeaponEquipmentAttack = "light" | "heavy";

export function updateWeaponEquipment(
  slot: SlotData,
  set: WeaponEquipmentSet,
  attack: WeaponEquipmentAttack,
  id: number,
): SlotData {
  const changed = setWeaponSlotAttack(parseWeaponSlot(slot[set]), attack, id);
  return { ...slot, [set]: serializeWeaponSlot(changed) };
}

export function WeaponsPanel({ slot, onSlotChange }: Props) {
  const { language, t } = useI18n();
  const [query, setQuery] = useState("");
  const [occupiedOnly, setOccupiedOnly] = useState(true);
  const allWeapons = parseWeapons(slot.weapons);
  const weapons = filterWeaponRows(allWeapons, query, occupiedOnly, language);
  const equipmentChoices = availableEquipmentWeaponChoices(
    allWeapons,
    language,
  );
  const weaponSelectWidthCh = useMemo(
    () =>
      estimateSelectWidthCh([
        t("list.empty"),
        ...Object.keys(weaponsData).map((id) =>
          lookupWeaponName(Number(id), language),
        ),
      ]),
    [language, t],
  );
  const equipmentSets = [
    {
      key: "weaponSlot1" as const,
      label: t("weapons.set1"),
      value: parseWeaponSlot(slot.weaponSlot1),
    },
    {
      key: "weaponSlot2" as const,
      label: t("weapons.set2"),
      value: parseWeaponSlot(slot.weaponSlot2),
    },
  ];

  return (
    <section className="panel panel--fill">
      <div className="collection-workspace collection-workspace--split">
        <div className="panel-split">
        <aside
          className="panel-split__side"
          aria-label={t("weapons.set1")}
        >
          <div className="pod-config-stack">
            {equipmentSets.map((set) => (
              <fieldset key={set.key} className="pod-config-card">
                <legend>{set.label}</legend>
                {(["light", "heavy"] as const).map((attack) => {
                  const attackLabel = t(`weapons.${attack}`);
                  const value =
                    attack === "light"
                      ? set.value.lightAttack
                      : set.value.heavyAttack;

                  return (
                    <label key={attack}>
                      <span>{attackLabel}</span>
                      <IdChoiceControl
                        value={value}
                        emptyValue={EMPTY_WEAPON_SLOT_ID}
                        choices={equipmentChoices}
                        selectWidthCh={weaponSelectWidthCh}
                        labels={{
                          select: `${set.label} ${attackLabel}`,
                          clear: t("actions.clear"),
                          empty: t("list.empty"),
                          unknown: (id) => lookupWeaponName(id, language),
                        }}
                        onChange={(id) =>
                          onSlotChange(
                            updateWeaponEquipment(slot, set.key, attack, id),
                          )
                        }
                      />
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </aside>

        <div className="panel-split__main">
          <h3>{t("fields.name")}</h3>
          <div className="list-toolbar">
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
                onChange={(event) =>
                  setOccupiedOnly(event.currentTarget.checked)
                }
              />
              {t("list.occupiedOnly")}
            </label>
          </div>
          <div className="table-wrap table-wrap--content-width">
            <table className="slot-table slot-table--weapons">
              <thead>
                <tr>
                  <th className="col-name">{t("fields.name")}</th>
                  <th className="col-level">{t("fields.level")}</th>
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
                        <td className="col-name">
                          <IdChoiceControl
                            value={weapon.id}
                            emptyValue={-1}
                            choices={availableChoices}
                            selectWidthCh={weaponSelectWidthCh}
                            labels={{
                              select: t("fields.name"),
                              clear: t("actions.clear"),
                              empty: t("list.empty"),
                              unknown: (id) =>
                                lookupWeaponName(id, language),
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
                        <td className="col-level">
                          {weapon.id === -1 ? null : (
                            <input
                              type="number"
                              min={1}
                              max={4}
                              value={weapon.level}
                              onChange={(event) => {
                                const level = Number(
                                  event.currentTarget.value,
                                );
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
        </div>
        </div>
      </div>
    </section>
  );
}
