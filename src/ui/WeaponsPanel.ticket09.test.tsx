import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  EMPTY_WEAPON_SLOT_ID,
  EMPTY_WEAPON_BYTES,
  SAVEFILE_SIZE_BYTES,
  WEAPONS_ITEM_SIZE_BYTES,
  WEAPONS_SIZE_ITEMS,
  load,
  parseWeaponSlot,
  parseWeapons,
  replaceWeaponId,
  setWeaponSlotAttack,
  serializeWeaponSlot,
  writeWeaponAt,
} from "../save";
import {
  availableEquipmentWeaponChoices,
  updateWeaponEquipment,
  WeaponsPanel,
} from "./WeaponsPanel";

function equippedSlot() {
  const loaded = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
  const emptyWeapons = loaded.weapons.slice();
  for (let index = 0; index < WEAPONS_SIZE_ITEMS; index++) {
    emptyWeapons.set(EMPTY_WEAPON_BYTES, index * WEAPONS_ITEM_SIZE_BYTES);
  }
  const weapons = parseWeapons(emptyWeapons);
  const first = weapons[0];
  const second = weapons[1];
  if (!first || !second) throw new Error("Synthetic save has no weapon slots");

  const owned = writeWeaponAt(
    writeWeaponAt(emptyWeapons, replaceWeaponId(first, 0x42e)),
    replaceWeaponId(second, 0x42f),
  );
  const set1 = setWeaponSlotAttack(
    parseWeaponSlot(loaded.weaponSlot1),
    "light",
    0x42e,
  );
  return {
    ...loaded,
    weapons: owned,
    weaponSlot1: serializeWeaponSlot(set1),
  };
}

describe("ticket 09 weapon equipment editor seam", () => {
  it("offers only owned weapon IDs with localized names", () => {
    const weapons = parseWeapons(equippedSlot().weapons);

    expect(availableEquipmentWeaponChoices(weapons, "en")).toEqual([
      { id: 0x42e, label: "Virtuous Contract" },
      { id: 0x42f, label: "Cruel Oath" },
    ]);
    expect(availableEquipmentWeaponChoices(weapons, "zh-CN")).toEqual([
      { id: 0x42e, label: "纯白契约" },
      { id: 0x42f, label: "漆黑誓约" },
    ]);
  });

  it("updates one equipment attack through SlotData without changing ownership", () => {
    const original = equippedSlot();
    const changed = updateWeaponEquipment(original, "weaponSlot2", "heavy", 0x42f);

    expect(changed.weapons).toBe(original.weapons);
    expect(changed.weaponSlot1).toBe(original.weaponSlot1);
    expect(parseWeaponSlot(changed.weaponSlot2)).toMatchObject({
      lightAttack: EMPTY_WEAPON_SLOT_ID,
      heavyAttack: 0x42f,
    });

    const cleared = updateWeaponEquipment(
      changed,
      "weaponSlot2",
      "heavy",
      EMPTY_WEAPON_SLOT_ID,
    );
    expect(parseWeaponSlot(cleared.weaponSlot2).heavyAttack).toBe(
      EMPTY_WEAPON_SLOT_ID,
    );
  });

  it("renders Set 1/Set 2 light and heavy selectors from the actual panel", () => {
    const onSlotChange = vi.fn();
    const english = renderToStaticMarkup(
      <I18nProvider language="en">
        <WeaponsPanel slot={equippedSlot()} onSlotChange={onSlotChange} />
      </I18nProvider>,
    );
    const chinese = renderToStaticMarkup(
      <I18nProvider language="zh-CN">
        <WeaponsPanel slot={equippedSlot()} onSlotChange={onSlotChange} />
      </I18nProvider>,
    );

    expect(english).toContain("Set 1");
    expect(english).toContain('aria-label="Set 1 Light attack"');
    expect(english).toContain('aria-label="Set 1 Heavy attack"');
    expect(english).toContain('aria-label="Set 2 Light attack"');
    expect(english).toContain('aria-label="Set 2 Heavy attack"');
    expect(english).toContain("Virtuous Contract");
    expect(english).toContain("Cruel Oath");
    expect(english).toContain("(Empty)");
    expect(english).toContain('class="table-wrap table-wrap--content-width"');
    expect(english).toContain('class="panel panel--fill"');
    expect(english).toContain(
      'class="panel-split panel-split--collection"',
    );
    expect(english).toContain("panel-split__side--ungrouped");
    expect(english).toContain("pod-config-card");
    expect(english).not.toContain("collection-workspace");
    expect(english).not.toMatch(
      /panel-split__main">\s*<h3>Name<\/h3>/,
    );
    expect(english).toContain('<th class="col-name">Name</th>');
    expect(chinese).toContain("装备组 1");
    expect(chinese).toContain('aria-label="装备组 2 重攻击"');
    expect(chinese).toContain("纯白契约");
  });
});
