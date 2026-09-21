import { useI18n } from "../i18n";

type Props = {
  busy: boolean;
  rootDraft: string;
  onRootDraftChange: (value: string) => void;
  onSaveCustomRoot: () => void;
  backupDraft: string;
  onBackupDraftChange: (value: string) => void;
  onSaveCustomBackupRoot: () => void;
  canRevealBackupFolder: boolean;
  onRevealBackupFolder: () => void;
};

export function SettingsPanel({
  busy,
  rootDraft,
  onRootDraftChange,
  onSaveCustomRoot,
  backupDraft,
  onBackupDraftChange,
  onSaveCustomBackupRoot,
  canRevealBackupFolder,
  onRevealBackupFolder,
}: Props) {
  const { t } = useI18n();

  return (
    <section className="panel settings-panel">
      <section
        className="settings-card"
        aria-labelledby="settings-save-discovery"
      >
        <h2 id="settings-save-discovery">
          {t("settings.saveDiscoveryHeading")}
        </h2>
        <div className="settings-row">
          <label className="toolbar-field toolbar-field--grow">
            <span>{t("settings.customSaveRoot")}</span>
            <input
              type="text"
              value={rootDraft}
              placeholder={t("settings.customSaveRootPlaceholder")}
              disabled={busy}
              onChange={(event) =>
                onRootDraftChange(event.currentTarget.value)
              }
            />
          </label>
          <button type="button" disabled={busy} onClick={onSaveCustomRoot}>
            {t("settings.saveAndScan")}
          </button>
        </div>
      </section>
      <section
        className="settings-card"
        aria-labelledby="settings-backup-location"
      >
        <h2 id="settings-backup-location">
          {t("settings.backupLocationHeading")}
        </h2>
        <div className="settings-row">
          <label className="toolbar-field toolbar-field--grow">
            <span>{t("settings.customBackupRoot")}</span>
            <input
              type="text"
              value={backupDraft}
              placeholder={t("settings.customBackupRootPlaceholder")}
              disabled={busy}
              onChange={(event) =>
                onBackupDraftChange(event.currentTarget.value)
              }
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={onSaveCustomBackupRoot}
          >
            {t("settings.saveBackupRoot")}
          </button>
          <button
            type="button"
            disabled={busy || !canRevealBackupFolder}
            title={
              canRevealBackupFolder
                ? undefined
                : t("saveManager.openBackupFolderHint")
            }
            onClick={onRevealBackupFolder}
          >
            {t("saveManager.openBackupFolder")}
          </button>
        </div>
        <p className="settings-help">{t("settings.customBackupRootHelp")}</p>
      </section>
    </section>
  );
}
