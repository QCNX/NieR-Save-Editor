import { useI18n } from "../i18n";

type Props = {
  busy: boolean;
  rootDraft: string;
  onRootDraftChange: (value: string) => void;
  onSaveCustomRoot: () => void;
  backupDraft: string;
  onBackupDraftChange: (value: string) => void;
  onSaveCustomBackupRoot: () => void;
};

export function SettingsPanel({
  busy,
  rootDraft,
  onRootDraftChange,
  onSaveCustomRoot,
  backupDraft,
  onBackupDraftChange,
  onSaveCustomBackupRoot,
}: Props) {
  const { t } = useI18n();

  return (
    <section className="panel settings-panel">
      <div className="settings-row">
        <label className="toolbar-field toolbar-field--grow">
          <span>{t("settings.customSaveRoot")}</span>
          <input
            type="text"
            value={rootDraft}
            placeholder={t("settings.customSaveRootPlaceholder")}
            disabled={busy}
            onChange={(event) => onRootDraftChange(event.currentTarget.value)}
          />
        </label>
        <button type="button" disabled={busy} onClick={onSaveCustomRoot}>
          {t("settings.saveAndScan")}
        </button>
      </div>
      <div className="settings-row">
        <label className="toolbar-field toolbar-field--grow">
          <span>{t("settings.customBackupRoot")}</span>
          <input
            type="text"
            value={backupDraft}
            placeholder={t("settings.customBackupRootPlaceholder")}
            disabled={busy}
            onChange={(event) => onBackupDraftChange(event.currentTarget.value)}
          />
        </label>
        <button type="button" disabled={busy} onClick={onSaveCustomBackupRoot}>
          {t("settings.saveBackupRoot")}
        </button>
      </div>
      <p className="settings-help">{t("settings.customBackupRootHelp")}</p>
    </section>
  );
}
