import { useId, type ChangeEvent } from "react";

import { useI18n } from "../i18n";
import type { ReadySaveSummary, SaveSummary } from "./saveSummary";

export type SaveManagerPanelProps = {
  busy: boolean;
  current: ReadySaveSummary | null;
  currentPath: string | null;
  dirty: boolean;
  slots: readonly SaveSummary[];
  slotsLoading: boolean;
  canReload: boolean;
  canSaveAs: boolean;
  canSaveChanges: boolean;
  canClose: boolean;
  onClose: () => void;
  onLoad: (path: string) => void;
  onOpenFile: (file: File | undefined) => void;
  onReload: () => void;
  onRescan: () => void;
  onSaveAs: () => void;
  onSaveChanges: () => void;
};

function formatPlayTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainder = wholeSeconds % 60;
  return [hours, minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function stateLabel(summary: SaveSummary, t: (key: string) => string): string {
  if (summary.status === "ready") return t("saveManager.stateReady");
  if (summary.status === "invalid") return t("saveManager.stateInvalid");
  return t("saveManager.stateUnreadable");
}

type SummaryDetailsProps = {
  summary: ReadySaveSummary;
  includeModifiedTime?: boolean;
};

function SummaryDetails({
  summary,
  includeModifiedTime = false,
}: SummaryDetailsProps) {
  const { language, t } = useI18n();
  const characterName = summary.characterName ?? t("entity.unknown");
  const modified = summary.mtimeMs
    ? new Intl.DateTimeFormat(language, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(summary.mtimeMs)
    : t("saveManager.unknownTime");

  return (
    <dl className="save-summary-details">
      <div>
        <dt>{t("fields.characterName")}</dt>
        <dd>{characterName}</dd>
      </div>
      <div aria-label={`${t("fields.level")} ${summary.level}`}>
        <dt>{t("fields.level")}</dt>
        <dd>{summary.level}</dd>
      </div>
      <div>
        <dt>{t("saveManager.playTime")}</dt>
        <dd>{formatPlayTime(summary.playTimeSeconds)}</dd>
      </div>
      {includeModifiedTime ? (
        <div>
          <dt>{t("saveManager.modifiedTime")}</dt>
          <dd>{modified}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function SaveManagerPanel({
  busy,
  current,
  currentPath,
  dirty,
  slots,
  slotsLoading,
  canReload,
  canSaveAs,
  canSaveChanges,
  canClose,
  onClose,
  onLoad,
  onOpenFile,
  onReload,
  onRescan,
  onSaveAs,
  onSaveChanges,
}: SaveManagerPanelProps) {
  const { t } = useI18n();
  const inputId = useId();

  function handleOpenFile(event: ChangeEvent<HTMLInputElement>) {
    onOpenFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  return (
    <div className="save-manager">
      <section
        className="save-manager__section save-current"
        aria-labelledby="save-manager-current"
      >
        <h2 id="save-manager-current">{t("saveManager.currentHeading")}</h2>
        <div className="save-current-layout">
          <div className="save-current-card" title={currentPath ?? undefined}>
            {current ? (
              <>
                <div className="save-current-title-row">
                  <strong>{current.fileName}</strong>
                  <span className={dirty ? "dirty-chip" : "path-chip"}>
                    {dirty ? t("status.dirty") : t("status.clean")}
                  </span>
                </div>
                <SummaryDetails summary={current} />
              </>
            ) : (
              <p className="save-manager-empty">{t("saveManager.noCurrent")}</p>
            )}
          </div>

          <div className="save-actions" aria-label={t("saveManager.actions")}>
            <button
              type="button"
              className="save-action save-action--primary"
              disabled={busy || !canSaveChanges}
              onClick={onSaveChanges}
            >
              {t("saveManager.saveChanges")}
            </button>
            <button
              type="button"
              className="save-action"
              disabled={busy || !canReload}
              onClick={onReload}
            >
              {t("toolbar.reload")}
            </button>
            <button
              type="button"
              className="save-action"
              disabled={busy || !canSaveAs}
              onClick={onSaveAs}
            >
              {t("toolbar.saveAs")}
            </button>
            <label className="save-action file-button" htmlFor={inputId}>
              {t("toolbar.open")}
              <input
                id={inputId}
                type="file"
                accept=".dat,application/octet-stream"
                disabled={busy}
                onChange={handleOpenFile}
              />
            </label>
            <button
              type="button"
              className="save-action"
              disabled={busy || !canClose}
              onClick={onClose}
            >
              {t("toolbar.close")}
            </button>
            <button
              type="button"
              className="save-action"
              disabled={busy}
              onClick={onRescan}
            >
              {t("toolbar.rescan")}
            </button>
          </div>
        </div>
      </section>

      <section
        className="save-manager__section"
        aria-labelledby="save-manager-slots"
      >
        <h2 id="save-manager-slots">{t("saveManager.slotsHeading")}</h2>
        {slotsLoading ? (
          <p className="save-manager-empty" role="status">
            {t("saveManager.slotsLoading")}
          </p>
        ) : slots.length === 0 ? (
          <p className="save-manager-empty">{t("saveManager.noSlots")}</p>
        ) : (
          <div className="save-slot-grid">
            {slots.map((summary) => {
              const isCurrent = summary.path === currentPath;
              const cardClass = isCurrent
                ? "save-slot-card save-slot-card--current"
                : "save-slot-card";
              return (
                <article
                  className={cardClass}
                  key={summary.path}
                  title={summary.path}
                >
                  <header className="save-slot-card__header">
                    <h3>{summary.fileName}</h3>
                    <div className="save-slot-badges">
                      {isCurrent ? (
                        <span className="save-state save-state--current">
                          {t("status.current")}
                        </span>
                      ) : null}
                      <span className={`save-state save-state--${summary.status}`}>
                        {stateLabel(summary, t)}
                      </span>
                    </div>
                  </header>
                  {summary.status === "ready" ? (
                    <SummaryDetails summary={summary} includeModifiedTime />
                  ) : (
                    <p className="save-slot-error">
                      {summary.status === "unreadable" && summary.message
                        ? `${stateLabel(summary, t)}: ${summary.message}`
                        : stateLabel(summary, t)}
                    </p>
                  )}
                  <div className="save-slot-actions">
                    <button
                      type="button"
                      disabled={busy || summary.status !== "ready"}
                      onClick={() => onLoad(summary.path)}
                    >
                      {t("toolbar.loadSlot")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        className="save-manager__section"
        aria-labelledby="save-manager-history"
      >
        <h2 id="save-manager-history">{t("saveManager.historyHeading")}</h2>
        <p className="save-manager-empty">{t("saveManager.historyEmpty")}</p>
      </section>
    </div>
  );
}
