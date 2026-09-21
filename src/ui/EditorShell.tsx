import type { ReactNode } from "react";

import { useI18n, type Language } from "../i18n";
import type { SlotData } from "../save";
import { InventoryPanel } from "./InventoryPanel";
import type { UiTheme } from "./localSettings";
import { ChipLoadoutPanel, ChipsPanel, PodsPanel } from "./SkillsPanel";
import { SummaryPanel } from "./SummaryPanel";
import { WeaponsPanel } from "./WeaponsPanel";

export type EditorTab =
  | "save"
  | "general"
  | "items"
  | "weapons"
  | "pods"
  | "chipLibrary"
  | "chipLoadout"
  | "settings";

const EDITOR_TABS: readonly EditorTab[] = [
  "save",
  "general",
  "items",
  "weapons",
  "pods",
  "chipLibrary",
  "chipLoadout",
  "settings",
];

const TABS_WITHOUT_SLOT: ReadonlySet<EditorTab> = new Set(["save", "settings"]);

type Props = {
  activeTab: EditorTab;
  currentFileName: string | null;
  dirty: boolean;
  modalOpen?: boolean;
  empty?: ReactNode;
  notices?: ReactNode;
  onSlotChange: (next: SlotData) => void;
  onTabChange: (tab: EditorTab) => void;
  onThemeChange: (theme: UiTheme) => void;
  saveManager: ReactNode;
  settings: ReactNode;
  slot: SlotData | null;
  theme: UiTheme;
};

export function EditorShell({
  activeTab,
  currentFileName,
  dirty,
  modalOpen = false,
  empty,
  notices,
  onSlotChange,
  onTabChange,
  onThemeChange,
  saveManager,
  settings,
  slot,
  theme,
}: Props) {
  const { language, setLanguage, t } = useI18n();
  const panelId = `editor-panel-${activeTab}`;
  const dark = theme === "dark";

  let content: ReactNode = empty;
  if (activeTab === "save") {
    content = saveManager;
  } else if (activeTab === "settings") {
    content = settings;
  } else if (slot) {
    content =
      activeTab === "general" ? (
        <SummaryPanel slot={slot} onSlotChange={onSlotChange} />
      ) : activeTab === "items" ? (
        <InventoryPanel slot={slot} onSlotChange={onSlotChange} />
      ) : activeTab === "weapons" ? (
        <WeaponsPanel slot={slot} onSlotChange={onSlotChange} />
      ) : activeTab === "pods" ? (
        <PodsPanel slot={slot} onSlotChange={onSlotChange} />
      ) : activeTab === "chipLibrary" ? (
        <ChipsPanel slot={slot} onSlotChange={onSlotChange} />
      ) : (
        <ChipLoadoutPanel slot={slot} onSlotChange={onSlotChange} />
      );
  }

  return (
    <div className="editor-shell">
      <div
        className="editor-tabs-row"
        inert={modalOpen ? true : undefined}
        aria-hidden={modalOpen ? "true" : undefined}
      >
        <nav className="editor-tabs" role="tablist" aria-label={t("app.title")}>
          {EDITOR_TABS.map((tab) => {
            const selected = tab === activeTab;
            const disabled = !slot && !TABS_WITHOUT_SLOT.has(tab);
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
      </div>

      {notices}

      <section
        className="editor-tab-panel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={`editor-tab-${activeTab}`}
      >
        {content}
      </section>

      <footer
        className="editor-status-bar"
        inert={modalOpen ? true : undefined}
        aria-hidden={modalOpen ? "true" : undefined}
      >
        <span className="editor-status-file" aria-live="polite">
          {currentFileName ?? t("status.noFile")}
        </span>
        <span
          className={dirty ? "dirty-chip" : "path-chip"}
          aria-live="polite"
        >
          {dirty ? t("status.dirty") : t("status.clean")}
        </span>
        <button
          type="button"
          className="theme-toggle"
          aria-pressed={dark}
          aria-label={t("theme.toggle")}
          title={t("theme.toggle")}
          onClick={() => onThemeChange(dark ? "light" : "dark")}
        >
          {dark ? t("theme.light") : t("theme.dark")}
        </button>
        <label className="toolbar-field language-switch">
          <select
            value={language}
            aria-label={t("language.label")}
            onChange={(event) =>
              setLanguage(event.currentTarget.value as Language)
            }
          >
            <option value="zh-CN">{t("language.zh-CN")}</option>
            <option value="en">{t("language.en")}</option>
          </select>
        </label>
      </footer>
    </div>
  );
}
