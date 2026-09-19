import type { ReactNode } from "react";

import { useI18n } from "../i18n";
import type { SlotData } from "../save";
import { InventoryPanel } from "./InventoryPanel";
import { SkillsPanel } from "./SkillsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { WeaponsPanel } from "./WeaponsPanel";

export type EditorTab =
  | "general"
  | "items"
  | "weapons"
  | "skills"
  | "settings";

const EDITOR_TABS: readonly EditorTab[] = [
  "general",
  "items",
  "weapons",
  "skills",
  "settings",
];

type Props = {
  activeTab: EditorTab;
  dirty: boolean;
  empty?: ReactNode;
  notices?: ReactNode;
  onSlotChange: (next: SlotData) => void;
  onTabChange: (tab: EditorTab) => void;
  settings: ReactNode;
  slot: SlotData | null;
  toolbar: ReactNode;
};

export function EditorShell({
  activeTab,
  dirty,
  empty,
  notices,
  onSlotChange,
  onTabChange,
  settings,
  slot,
  toolbar,
}: Props) {
  const { t } = useI18n();
  const panelId = `editor-panel-${activeTab}`;

  let content: ReactNode = empty;
  if (activeTab === "settings") {
    content = settings;
  } else if (slot) {
    content =
      activeTab === "general" ? (
        <SummaryPanel slot={slot} onSlotChange={onSlotChange} />
      ) : activeTab === "items" ? (
        <InventoryPanel slot={slot} onSlotChange={onSlotChange} />
      ) : activeTab === "weapons" ? (
        <WeaponsPanel slot={slot} onSlotChange={onSlotChange} />
      ) : (
        <SkillsPanel slot={slot} onSlotChange={onSlotChange} />
      );
  }

  return (
    <div className="editor-shell">
      <div className="save-toolbar-region">{toolbar}</div>

      <header className="editor-header">
        <h1>{t("app.title")}</h1>
        <p className="status-line">
          {dirty ? t("status.dirty") : t("status.clean")}
        </p>
      </header>

      {notices}

      <nav className="editor-tabs" role="tablist" aria-label={t("app.title")}>
        {EDITOR_TABS.map((tab) => {
          const selected = tab === activeTab;
          const disabled = !slot && tab !== "settings";
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`editor-tab-${tab}`}
              aria-controls={`editor-panel-${tab}`}
              aria-selected={selected}
              disabled={disabled}
              onClick={() => onTabChange(tab)}
            >
              {t(`tabs.${tab}`)}
            </button>
          );
        })}
      </nav>

      <section
        className="editor-tab-panel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`editor-tab-${activeTab}`}
      >
        {content}
      </section>
    </div>
  );
}
