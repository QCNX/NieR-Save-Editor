import type { SlotData } from "../save";
import { parseWeapons, writeWeaponAt } from "../save";
import { lookupWeaponName } from "../names";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

export function WeaponsPanel({ slot, onSlotChange }: Props) {
  const weapons = parseWeapons(slot.weapons).filter((w) => w.id !== -1);

  return (
    <section className="panel" aria-labelledby="weapons-heading">
      <h2 id="weapons-heading">武器</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>等级</th>
            </tr>
          </thead>
          <tbody>
            {weapons.length === 0 ? (
              <tr>
                <td colSpan={2} className="empty-row">
                  （无武器）
                </td>
              </tr>
            ) : (
              weapons.map((weapon) => (
                <tr key={weapon.position}>
                  <td>{lookupWeaponName(weapon.id)}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={weapon.level}
                      onChange={(e) => {
                        const level = Number(e.currentTarget.value);
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
