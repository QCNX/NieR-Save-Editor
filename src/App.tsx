import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  SAVEFILE_SIZE_BYTES,
  load,
  type SlotData,
} from "./save";
import {
  I18nProvider,
  useI18n,
  type Language,
  type MessageKey,
} from "./i18n";
import {
  createTauriDiscoveryHost,
  discoverHostSlotDataFiles,
  PermissionDeniedError,
  type SlotFile,
} from "./discovery";
import {
  createTauriPersistHost,
  overwriteSave,
  reloadSave,
  saveAsSave,
  type PersistHost,
} from "./persist";
import { EditorShell, type EditorTab } from "./ui/EditorShell";
import { SettingsPanel } from "./ui/SettingsPanel";
import {
  loadLocalSettings,
  saveLocalSettings,
} from "./ui/localSettings";
import {
  applyClosed,
  applyEditedSlot,
  applyLoadedSlot,
  applyOverwriteSuccess,
  applySaveAsSuccess,
  createInitialEditorState,
  needsConfirm,
  type EditorAppState,
} from "./ui/workflow";
import "./ui/editor.css";

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

function fileNameFromPath(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export type AppShellState = {
  language: Language;
  activeTab: EditorTab;
  workflow: EditorAppState;
};

export function changeAppLanguage(
  state: AppShellState,
  language: Language,
): AppShellState {
  return { ...state, language };
}

function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (message, [key, value]) =>
      message.split(`{${key}}`).join(String(value)),
    template,
  );
}

type AppMessage =
  | { key: MessageKey; values?: Record<string, string | number> }
  | { text: string };

function renderAppMessage(
  message: AppMessage,
  t: (key: string) => string,
): string {
  return "text" in message
    ? message.text
    : formatMessage(t(message.key), message.values ?? {});
}

type AppContentProps = {
  shellState: AppShellState;
  onActiveTabChange: (tab: EditorTab) => void;
  onWorkflowChange: Dispatch<SetStateAction<EditorAppState>>;
};

function AppContent({
  shellState,
  onActiveTabChange,
  onWorkflowChange,
}: AppContentProps) {
  const { language, setLanguage, t } = useI18n();
  const { activeTab, workflow: state } = shellState;
  const setState = onWorkflowChange;
  const [slots, setSlots] = useState<SlotFile[]>([]);
  const [selectedSlotPath, setSelectedSlotPath] = useState("");
  const [statusMessage, setStatusMessage] = useState<AppMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<AppMessage | null>(null);
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [ioBusy, setIoBusy] = useState(false);
  const [customSaveRoot, setCustomSaveRoot] = useState(() => {
    const storage = defaultStorage();
    return storage ? (loadLocalSettings(storage).customSaveRoot ?? "") : "";
  });
  const [rootDraft, setRootDraft] = useState(customSaveRoot);

  const tauri = useMemo(() => isTauriRuntime(), []);
  const persistHost: PersistHost | null = useMemo(
    () => (tauri ? createTauriPersistHost() : null),
    [tauri],
  );

  const refreshSlots = useCallback(async () => {
    setErrorMessage(null);
    if (!tauri) {
      setSlots([]);
      setStatusMessage({ key: "status.preview" });
      return;
    }
    setDiscoverBusy(true);
    try {
      const host = createTauriDiscoveryHost();
      const found = await discoverHostSlotDataFiles(host, {
        extraRoots: customSaveRoot ? [customSaveRoot] : [],
      });
      found.sort((a, b) => a.path.localeCompare(b.path));
      setSlots(found);
      setStatusMessage(
        found.length === 0
          ? { key: "status.noSlotsFound" }
          : { key: "status.slotsFound", values: { count: found.length } },
      );
      setSelectedSlotPath((prev) => {
        if (prev && found.some((s) => s.path === prev)) {
          return prev;
        }
        return found[0]?.path ?? "";
      });
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        setErrorMessage({
          key: "errors.permissionDenied",
          values: { path: err.path },
        });
      } else {
        setErrorMessage(
          err instanceof Error
            ? { text: err.message }
            : { key: "errors.scanFailed" },
        );
      }
      setSlots([]);
    } finally {
      setDiscoverBusy(false);
    }
  }, [tauri, customSaveRoot]);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  function clearAlerts() {
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function confirmIfNeeded(
    action: Parameters<typeof needsConfirm>[0],
    message: string,
  ): boolean {
    if (!needsConfirm(action, state.dirty)) {
      return true;
    }
    return window.confirm(message);
  }

  function applySlotEdit(next: SlotData) {
    setState((prev) => applyEditedSlot(prev, next));
  }

  async function loadBytesFromPath(path: string): Promise<boolean> {
    if (!persistHost) {
      setErrorMessage({ key: "errors.pathReadUnavailable" });
      return false;
    }
    setIoBusy(true);
    clearAlerts();
    try {
      const result = await reloadSave(persistHost, path);
      if (result.status !== "ok") {
        setErrorMessage({ text: result.message });
        return false;
      }
      if (result.bytes.length !== SAVEFILE_SIZE_BYTES) {
        setErrorMessage({
          key: "errors.invalidSize",
          values: {
            expected: SAVEFILE_SIZE_BYTES,
            actual: result.bytes.length,
          },
        });
        return false;
      }
      const slot = load(result.bytes);
      setState((prev) => applyLoadedSlot(prev, path, slot));
      setStatusMessage({
        key: "status.loaded",
        values: { name: fileNameFromPath(path) },
      });
      return true;
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? { text: err.message } : { key: "errors.loadFailed" },
      );
      return false;
    } finally {
      setIoBusy(false);
    }
  }

  async function onSelectSlot() {
    if (!selectedSlotPath) {
      return;
    }
    if (
      !confirmIfNeeded(
        "switch-slot",
        t("confirm.switchSlot"),
      )
    ) {
      return;
    }
    await loadBytesFromPath(selectedSlotPath);
  }

  async function onReload() {
    if (!state.currentPath) {
      setErrorMessage({ key: "errors.noReloadPath" });
      return;
    }
    if (
      !confirmIfNeeded(
        "reload",
        t("confirm.reload"),
      )
    ) {
      return;
    }
    await loadBytesFromPath(state.currentPath);
  }

  async function onOverwrite() {
    if (!persistHost || !state.currentPath || !state.slotData) {
      setErrorMessage({ key: "errors.overwriteUnavailable" });
      return;
    }
    if (
      !confirmIfNeeded(
        "overwrite",
        formatMessage(t("confirm.overwrite"), { path: state.currentPath }),
      )
    ) {
      return;
    }
    setIoBusy(true);
    clearAlerts();
    try {
      const result = await overwriteSave(
        persistHost,
        state.currentPath,
        state.slotData,
      );
      if (result.status === "ok") {
        setState((prev) => applyOverwriteSuccess(prev));
        setStatusMessage({
          key: "status.overwriteSuccess",
          values: { name: fileNameFromPath(result.backupPath) },
        });
        return;
      }
      if (result.status === "backup") {
        setErrorMessage({
          key: "errors.backupFailed",
          values: { message: result.message },
        });
        return;
      }
      setErrorMessage({ text: result.message });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? { text: err.message }
          : { key: "errors.overwriteFailed" },
      );
    } finally {
      setIoBusy(false);
    }
  }

  async function onSaveAs() {
    if (!persistHost || !state.slotData) {
      setErrorMessage({ key: "errors.saveAsUnavailable" });
      return;
    }
    setIoBusy(true);
    clearAlerts();
    try {
      const defaultName = state.currentPath
        ? fileNameFromPath(state.currentPath)
        : "SlotData_0.dat";
      const result = await saveAsSave(persistHost, state.slotData, {
        defaultName,
      });
      if (result.status === "cancelled") {
        setStatusMessage({ key: "status.saveAsCancelled" });
        return;
      }
      if (result.status === "ok") {
        setState((prev) => applySaveAsSuccess(prev, result.path));
        setStatusMessage({
          key: "status.savedAs",
          values: { name: fileNameFromPath(result.path) },
        });
        return;
      }
      setErrorMessage({ text: result.message });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? { text: err.message }
          : { key: "errors.saveAsFailed" },
      );
    } finally {
      setIoBusy(false);
    }
  }

  async function onPickFile(file: File | undefined) {
    if (!file) {
      return;
    }
    if (
      !confirmIfNeeded(
        "open-file",
        t("confirm.openFile"),
      )
    ) {
      return;
    }
    clearAlerts();
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== SAVEFILE_SIZE_BYTES) {
      setErrorMessage({
        key: "errors.invalidSize",
        values: { expected: SAVEFILE_SIZE_BYTES, actual: bytes.length },
      });
      return;
    }
    try {
      const slot = load(bytes);
      // Browser file input has no absolute path — overwrite/reload need discovery or Save As.
      setState((prev) => applyLoadedSlot(prev, null, slot));
      setStatusMessage({
        key: "status.openedFileNoPath",
        values: { name: file.name },
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? { text: err.message } : { key: "errors.loadFailed" },
      );
    }
  }

  function onClose() {
    if (
      !confirmIfNeeded(
        "close",
        t("confirm.close"),
      )
    ) {
      return;
    }
    setState(applyClosed(state));
    clearAlerts();
  }

  function onSaveCustomRoot() {
    const storage = defaultStorage();
    if (!storage) {
      setErrorMessage({ key: "errors.settingsUnavailable" });
      return;
    }
    const next = rootDraft.trim();
    saveLocalSettings(storage, { customSaveRoot: next });
    setCustomSaveRoot(next);
    setStatusMessage({
      key: next ? "status.customRootSaved" : "status.customRootCleared",
    });
  }

  const busy = discoverBusy || ioBusy;
  const canPathIo = Boolean(persistHost && state.currentPath && state.slotData);
  const canSaveAs = Boolean(persistHost && state.slotData);

  return (
    <main className="app-root">
      <EditorShell
        activeTab={activeTab}
        dirty={state.dirty}
        onSlotChange={applySlotEdit}
        onTabChange={onActiveTabChange}
        slot={state.slotData}
        toolbar={
          <div className="app-toolbar" aria-label={t("app.title")}>
            <label className="toolbar-field">
              <span>{t("toolbar.slot")}</span>
              <select
                value={selectedSlotPath}
                disabled={busy || slots.length === 0}
                onChange={(event) =>
                  setSelectedSlotPath(event.currentTarget.value)
                }
              >
                {slots.length === 0 ? (
                  <option value="">{t("toolbar.noSlots")}</option>
                ) : (
                  slots.map((slot) => (
                    <option key={slot.path} value={slot.path}>
                      {fileNameFromPath(slot.path)}
                    </option>
                  ))
                )}
              </select>
            </label>
            <button
              type="button"
              disabled={busy || !selectedSlotPath}
              onClick={() => void onSelectSlot()}
            >
              {t("toolbar.loadSlot")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refreshSlots()}
            >
              {t("toolbar.rescan")}
            </button>
            <button
              type="button"
              disabled={busy || !canPathIo}
              onClick={() => void onReload()}
            >
              {t("toolbar.reload")}
            </button>
            <button
              type="button"
              disabled={busy || !canPathIo}
              onClick={() => void onOverwrite()}
            >
              {t("toolbar.overwrite")}
            </button>
            <button
              type="button"
              disabled={busy || !canSaveAs}
              onClick={() => void onSaveAs()}
            >
              {t("toolbar.saveAs")}
            </button>
            <label className="file-button">
              {t("toolbar.open")}
              <input
                type="file"
                accept=".dat,application/octet-stream"
                disabled={busy}
                onChange={(event) => {
                  void onPickFile(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button
              type="button"
              disabled={busy || !state.slotData}
              onClick={onClose}
            >
              {t("toolbar.close")}
            </button>
            <label className="toolbar-field language-switch">
              <span>{t(`language.${language}`)}</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.currentTarget.value as Language)}
              >
                <option value="zh-CN">{t("language.zh-CN")}</option>
                <option value="en">{t("language.en")}</option>
              </select>
            </label>
            {state.currentPath ? (
              <span className="path-chip" title={state.currentPath}>
                {t("status.current")}：{fileNameFromPath(state.currentPath)}
              </span>
            ) : state.slotData ? (
              <span className="path-chip">
                {t("status.current")}：{t("status.inMemory")}
              </span>
            ) : null}
            {state.dirty ? (
              <span className="dirty-chip">{t("status.dirty")}</span>
            ) : null}
          </div>
        }
        notices={
          <>
            {errorMessage ? (
              <p className="app-alert" role="alert">
                {renderAppMessage(errorMessage, t)}
              </p>
            ) : null}
            {statusMessage ? (
              <p className="app-status">{renderAppMessage(statusMessage, t)}</p>
            ) : null}
          </>
        }
        settings={
          <SettingsPanel
            busy={busy}
            rootDraft={rootDraft}
            onRootDraftChange={setRootDraft}
            onSaveCustomRoot={onSaveCustomRoot}
          />
        }
        empty={
          <div className="app-empty">
            <p>{t("empty.intro")}</p>
            <p>{t("empty.backup")}</p>
          </div>
        }
      />
    </main>
  );
}

function App() {
  const [shellState, setShellState] = useState<AppShellState>(() => {
    const storage = defaultStorage();
    return {
      language: storage ? loadLocalSettings(storage).language : "zh-CN",
      activeTab: "general",
      workflow: createInitialEditorState(),
    };
  });

  const changeLanguage = useCallback((nextLanguage: Language) => {
    const storage = defaultStorage();
    if (storage) {
      saveLocalSettings(storage, { language: nextLanguage });
    }
    setShellState((current) => changeAppLanguage(current, nextLanguage));
  }, []);

  const changeActiveTab = useCallback((activeTab: EditorTab) => {
    setShellState((current) => ({ ...current, activeTab }));
  }, []);

  const changeWorkflow: Dispatch<SetStateAction<EditorAppState>> = useCallback(
    (update) => {
      setShellState((current) => ({
        ...current,
        workflow:
          typeof update === "function" ? update(current.workflow) : update,
      }));
    },
    [],
  );

  return (
    <I18nProvider
      language={shellState.language}
      onLanguageChange={changeLanguage}
    >
      <AppContent
        shellState={shellState}
        onActiveTabChange={changeActiveTab}
        onWorkflowChange={changeWorkflow}
      />
    </I18nProvider>
  );
}

export default App;
