import type { SlotData } from "../save";
import {
  getMoney,
  getXp,
  levelFromXp,
  setLevel,
  setMoney,
  setXp,
} from "../save";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

export function SummaryPanel({ slot, onSlotChange }: Props) {
  const money = getMoney(slot);
  const xp = getXp(slot);
  const level = levelFromXp(xp);

  return (
    <section className="panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading">概要</h2>
      <div className="summary-grid">
        <label>
          <span>金钱</span>
          <input
            type="number"
            min={0}
            value={money}
            onChange={(e) => {
              const value = Number(e.currentTarget.value);
              if (!Number.isFinite(value)) return;
              onSlotChange(setMoney(slot, value >>> 0));
            }}
          />
        </label>
        <label>
          <span>经验</span>
          <input
            type="number"
            min={0}
            value={xp}
            onChange={(e) => {
              const value = Number(e.currentTarget.value);
              if (!Number.isFinite(value)) return;
              onSlotChange(setXp(slot, value >>> 0));
            }}
          />
        </label>
        <label>
          <span>等级</span>
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={level}
            onChange={(e) => {
              const next = setLevel(slot, Number(e.currentTarget.value));
              if (next !== slot) onSlotChange(next);
            }}
          />
        </label>
      </div>
    </section>
  );
}
