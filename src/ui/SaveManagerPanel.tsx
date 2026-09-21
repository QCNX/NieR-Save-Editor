import {
  useEffect,
  useId,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

import { useI18n } from "../i18n";
import type {
  BackupHistoryItem,
  ReadySaveSummary,
  SaveSummary,
} from "./saveSummary";
import type { SaveReplacementPreview } from "./saveReplacement";
import { dialogKeyAction } from "./dialogKeyboard";

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
  backupHistory: readonly BackupHistoryItem[];
  historyError: string | null;
  historyLoading: boolean;
  historyTargetPath: string | null;
  canCreateBackup: boolean;
  replacementPreview: SaveReplacementPreview | null;
  replacementError: string | null;
  onClose: () => void;
  onCreateBackup: () => void;
  onRequestRestore: (item: BackupHistoryItem) => void;
  onImportReplacement: (file: File | undefined) => void;
  onCancelReplacement: () => void;
  onConfirmReplacement: () => void;
  onLoad: (path: string) => void;
  onOpenFile: (file: File | undefined) => void;
  onReload: () => void;
  onRescan: () => void;
  onSaveAs: () => void;
  onSaveChanges: () => void;
  onSelectHistoryTarget: (path: string) => void;
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

function reasonLabel(
  reason: BackupHistoryItem["entry"]["reason"],
  t: (key: string) => string,
): string {
  return t(`saveManager.backupReason.${reason}`);
}

function metadataLabel(
  status: BackupHistoryItem["entry"]["metadataStatus"],
  t: (key: string) => string,
): string {
  return t(`saveManager.metadata.${status}`);
}

function integrityLabel(
  status: BackupHistoryItem["entry"]["metadataStatus"],
  t: (key: string) => string,
): string {
  if (status === "ok") return t("saveManager.integrity.verified");
  if (status === "invalid") return t("saveManager.integrity.mismatch");
  return t("saveManager.integrity.unrecorded");
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
  backupHistory,
  historyError,
  historyLoading,
  historyTargetPath,
  canCreateBackup,
  replacementPreview,
  replacementError,
  onClose,
  onCreateBackup,
  onRequestRestore,
  onImportReplacement,
  onCancelReplacement,
  onConfirmReplacement,
  onLoad,
  onOpenFile,
  onReload,
  onRescan,
  onSaveAs,
  onSaveChanges,
  onSelectHistoryTarget,
}: SaveManagerPanelProps) {
  const { language, t } = useI18n();
  const inputId = useId();
  const importInputId = useId();
  const pageBusy = busy || replacementPreview !== null;
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const replacementOpen = replacementPreview !== null;

  useEffect(() => {
    if (!replacementOpen) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cancelButtonRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [replacementOpen]);

  function handleOpenFile(event: ChangeEvent<HTMLInputElement>) {
    onOpenFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    onImportReplacement(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    const action = dialogKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeIndex: focusable.indexOf(document.activeElement as HTMLElement),
      count: focusable.length,
    });
    if (action.type === "cancel") {
      event.preventDefault();
      if (!busy) onCancelReplacement();
    } else if (action.type === "focus") {
      event.preventDefault();
      focusable[action.index]?.focus();
    }
  }

  return (
    <div className="save-manager">
      <div
        className="save-manager-content"
        inert={replacementOpen ? true : undefined}
        aria-hidden={replacementOpen ? "true" : undefined}
      >
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
              disabled={pageBusy || !canSaveChanges}
              onClick={onSaveChanges}
            >
              {t("saveManager.saveChanges")}
            </button>
            <button
              type="button"
              className="save-action"
              disabled={pageBusy || !canReload}
              onClick={onReload}
            >
              {t("toolbar.reload")}
            </button>
            <button
              type="button"
              className="save-action"
              disabled={pageBusy || !canSaveAs}
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
                disabled={pageBusy}
                onChange={handleOpenFile}
              />
            </label>
            <button
              type="button"
              className="save-action"
              disabled={pageBusy || !canClose}
              onClick={onClose}
            >
              {t("toolbar.close")}
            </button>
            <button
              type="button"
              className="save-action"
              disabled={pageBusy}
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
                      disabled={pageBusy || summary.status !== "ready"}
                      onClick={() => onLoad(summary.path)}
                    >
                      {t("toolbar.loadSlot")}
                    </button>
                    <button
                      type="button"
                      aria-pressed={summary.path === historyTargetPath}
                      disabled={pageBusy}
                      onClick={() => onSelectHistoryTarget(summary.path)}
                    >
                      {t("saveManager.viewBackups")}
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
        <div className="save-history-heading-row">
          <div>
            <h2 id="save-manager-history">{t("saveManager.historyHeading")}</h2>
            {historyTargetPath ? (
              <p className="save-history-target" title={historyTargetPath}>
                {historyTargetPath.split(/[/\\]/).pop()}
              </p>
            ) : null}
          </div>
          <div className="save-history-actions">
            <button
              type="button"
              className="save-action"
              disabled={pageBusy || !canCreateBackup}
              onClick={onCreateBackup}
            >
              {t("saveManager.createBackup")}
            </button>
            <label className="save-action file-button" htmlFor={importInputId}>
              {t("replacement.import")}
              <input
                id={importInputId}
                type="file"
                accept=".dat,application/octet-stream"
                disabled={pageBusy || !canCreateBackup}
                onChange={handleImportFile}
              />
            </label>
          </div>
        </div>
        {replacementError && !replacementPreview ? (
          <p className="save-slot-error" role="alert">
            {replacementError}
          </p>
        ) : null}
        {dirty ? (
          <p className="save-backup-dirty-note">
            {t("saveManager.backupExcludesUnsaved")}
          </p>
        ) : null}
        {historyLoading ? (
          <p className="save-manager-empty" role="status">
            {t("saveManager.historyLoading")}
          </p>
        ) : historyError ? (
          <p className="save-slot-error" role="alert">
            {t("saveManager.historyError")}: {historyError}
          </p>
        ) : backupHistory.length === 0 ? (
          <p className="save-manager-empty">{t("saveManager.historyEmpty")}</p>
        ) : (
          <div className="save-history-list">
            {backupHistory.map((item) => {
              const { entry, summary } = item;
              const createdAt = new Intl.DateTimeFormat(language, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(entry.mtimeMs);
              const checksum = entry.sha256
                ? entry.sha256.slice(0, 12)
                : t("saveManager.integrityUnavailable");
              return (
                <article
                  className={`save-history-item save-history-item--${summary.status}`}
                  key={entry.path}
                  title={entry.path}
                >
                  <header className="save-history-item__header">
                    <div>
                      <strong>{reasonLabel(entry.reason, t)}</strong>
                      <span>{createdAt}</span>
                    </div>
                    <span className={`save-state save-state--${summary.status}`}>
                      {stateLabel(summary, t)}
                    </span>
                  </header>
                  <dl className="save-history-meta">
                    <div>
                      <dt>{t("saveManager.sourceFile")}</dt>
                      <dd>{entry.slotFileName}</dd>
                    </div>
                    <div>
                      <dt>{t("saveManager.size")}</dt>
                      <dd>
                        {new Intl.NumberFormat(language).format(entry.size)}{" "}
                        {t("saveManager.bytes")}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("saveManager.checksum")}</dt>
                      <dd>{checksum}</dd>
                    </div>
                    <div>
                      <dt>{t("saveManager.integrity")}</dt>
                      <dd>{integrityLabel(entry.metadataStatus, t)}</dd>
                    </div>
                    <div>
                      <dt>{t("saveManager.metadataStatus")}</dt>
                      <dd>{metadataLabel(entry.metadataStatus, t)}</dd>
                    </div>
                  </dl>
                  {summary.status === "ready" ? (
                    <>
                      <SummaryDetails summary={summary} />
                      <div className="save-history-item__actions">
                        <button
                          type="button"
                          className="save-action"
                          disabled={pageBusy || !canCreateBackup}
                          onClick={() => onRequestRestore(item)}
                        >
                          {t("replacement.restore")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="save-slot-error">
                      {summary.status === "unreadable" && summary.message
                        ? `${stateLabel(summary, t)}: ${summary.message}`
                        : stateLabel(summary, t)}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>
      {replacementPreview ? (
        <div className="replacement-dialog-backdrop">
          <section
            ref={dialogRef}
            className="replacement-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="replacement-dialog-title"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id="replacement-dialog-title">
              {t(`replacement.heading.${replacementPreview.kind}`)}
            </h2>
            <div className="replacement-preview-grid">
              <article>
                <h3>{t("replacement.source")}</h3>
                <strong>{replacementPreview.source.fileName}</strong>
                <SummaryDetails summary={replacementPreview.source} />
              </article>
              <span className="replacement-preview-arrow" aria-hidden="true">
                →
              </span>
              <article>
                <h3>{t("replacement.target")}</h3>
                <strong>{replacementPreview.target.fileName}</strong>
                <SummaryDetails summary={replacementPreview.target} />
              </article>
            </div>
            <p className="replacement-safety-note">
              {t("replacement.backupFirst")}
            </p>
            {replacementPreview.targetDirty ? (
              <p className="replacement-dirty-warning" role="alert">
                {t("replacement.discardDirty")}
              </p>
            ) : null}
            {replacementError ? (
              <p className="save-slot-error" role="alert">
                {replacementError}
              </p>
            ) : null}
            <div className="replacement-dialog-actions">
              <button
                type="button"
                ref={cancelButtonRef}
                className="save-action"
                disabled={busy}
                onClick={onCancelReplacement}
              >
                {t("replacement.cancel")}
              </button>
              <button
                type="button"
                className="save-action save-action--danger"
                disabled={busy}
                onClick={onConfirmReplacement}
              >
                {t(`replacement.confirm.${replacementPreview.kind}`)}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
