import type { SlotData } from "../save";
import { SummaryPanel } from "./SummaryPanel";
import { InventoryPanel } from "./InventoryPanel";
import { WeaponsPanel } from "./WeaponsPanel";
import { SkillsPanel } from "./SkillsPanel";

type Props = {
  slot: SlotData;
  dirty: boolean;
  onSlotChange: (next: SlotData) => void;
};

export function EditorShell({ slot, dirty, onSlotChange }: Props) {
  return (
    <div className="editor-shell">
      <header className="editor-header">
        <h1>尼尔：自动人形 存档编辑器</h1>
        <p className="status-line">
          {dirty ? "状态：已修改（未写入磁盘）" : "状态：未修改"}
        </p>
      </header>

      <div className="editor-layout">
        <SummaryPanel slot={slot} onSlotChange={onSlotChange} />
        <div className="editor-columns">
          <InventoryPanel slot={slot} onSlotChange={onSlotChange} />
          <WeaponsPanel slot={slot} onSlotChange={onSlotChange} />
        </div>
        <SkillsPanel slot={slot} onSlotChange={onSlotChange} />
      </div>
    </div>
  );
}
