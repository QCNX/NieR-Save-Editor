import { useI18n } from "../i18n";

type Props = {
  busy: boolean;
  rootDraft: string;
  onRootDraftChange: (value: string) => void;
  onSaveCustomRoot: () => void;
};

export function SettingsPanel({
  busy,
  rootDraft,
  onRootDraftChange,
  onSaveCustomRoot,
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
            placeholder="%USERPROFILE%\Documents\My Games\NieR_Automata"
            disabled={busy}
            onChange={(event) => onRootDraftChange(event.currentTarget.value)}
          />
        </label>
        <button type="button" disabled={busy} onClick={onSaveCustomRoot}>
          {t("settings.saveAndScan")}
        </button>
      </div>
    </section>
  );
}
