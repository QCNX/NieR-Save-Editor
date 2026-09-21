import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  SAVEFILE_SIZE_BYTES,
  load,
  serialize,
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
} from "./discovery";
import {
  createTauriPersistHost,
  overwriteSave,
  reloadSave,
  saveAsSave,
  type PersistHost,
  type SaveManagementHost,
} from "./persist";
import { EditorShell, type EditorTab } from "./ui/EditorShell";
import { SaveManagerPanel } from "./ui/SaveManagerPanel";
import {
  summarizeDiscoveredSaves,
  summarizeBackupHistory,
  summarizeSave,
  type BackupHistoryItem,
  type ReadySaveSummary,
  type SaveSummary,
} from "./ui/saveSummary";
import {
  executeSaveReplacement,
  prepareSaveReplacement,
  sha256SaveBytes,
  type PreparedSaveReplacement,
  type SaveReplacementPreview,
} from "./ui/saveReplacement";
import { formatManagedError } from "./ui/managedError";
import { SettingsPanel } from "./ui/SettingsPanel";
import {
  loadLocalSettings,
  saveLocalSettings,
  type UiTheme,
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
import { formatWindowTitle } from "./ui/windowTitle";
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
  theme: UiTheme;
  activeTab: EditorTab;
  workflow: EditorAppState;
};

export function changeAppLanguage(
  state: AppShellState,
  language: Language,
): AppShellState {
  return { ...state, language };
}

export function changeAppTheme(
  state: AppShellState,
  theme: UiTheme,
): AppShellState {
  return { ...state, theme };
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

export type AppMessage = {
  key: MessageKey;
  values?: Record<string, string | number>;
  detail?: string;
};

export function renderAppMessage(
  message: AppMessage,
  t: (key: string) => string,
): string {
  const localizedMessage = formatMessage(
    t(message.key),
    message.values ?? {},
  );
  return message.detail
    ? formatMessage(t("message.withDetail"), {
        message: localizedMessage,
        detail: message.detail,
      })
    : localizedMessage;
}

type AppContentProps = {
  shellState: AppShellState;
  onActiveTabChange: (tab: EditorTab) => void;
  onThemeChange: (theme: UiTheme) => void;
  onWorkflowChange: Dispatch<SetStateAction<EditorAppState>>;
};

function AppContent({
  shellState,
  onActiveTabChange,
  onThemeChange,
  onWorkflowChange,
}: AppContentProps) {
  const { t } = useI18n();
  const { activeTab, theme, workflow: state } = shellState;
  const setState = onWorkflowChange;
  const [slotSummaries, setSlotSummaries] = useState<SaveSummary[]>([]);
  const [historyTargetPath, setHistoryTargetPath] = useState<string | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const historyRequestId = useRef(0);
  const manualBackupBusy = useRef(false);
  const replacementBusy = useRef(false);
  const [preparedReplacement, setPreparedReplacement] =
    useState<PreparedSaveReplacement | null>(null);
  const [replacementError, setReplacementError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<AppMessage | null>(null);
  const [errorMessage, setErrorMessage] = useState<AppMessage | null>(null);
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const [currentTargetSha256, setCurrentTargetSha256] = useState<string | null>(
    null,
  );
  const [discoverBusy, setDiscoverBusy] = useState(false);
  const [ioBusy, setIoBusy] = useState(false);
  const [customSaveRoot, setCustomSaveRoot] = useState(() => {
    const storage = defaultStorage();
    return storage ? (loadLocalSettings(storage).customSaveRoot ?? "") : "";
  });
  const [rootDraft, setRootDraft] = useState(customSaveRoot);

  const tauri = useMemo(() => isTauriRuntime(), []);
  const persistHost: (PersistHost & SaveManagementHost) | null = useMemo(
    () => (tauri ? createTauriPersistHost() : null),
    [tauri],
  );

  const currentFileName = state.currentPath
    ? fileNameFromPath(state.currentPath)
    : openedFileName;

  useEffect(() => {
    document.title = formatWindowTitle({
      appTitle: t("app.title"),
      dirty: state.dirty,
      fileName: currentFileName,
      unsavedLabel: t("window.unsavedChanges"),
    });
  }, [currentFileName, state.dirty, t]);

  const refreshSlots = useCallback(async () => {
    setErrorMessage(null);
    if (!tauri) {
      setSlotSummaries([]);
      setStatusMessage({ key: "status.preview" });
      return;
    }
    setDiscoverBusy(true);
    setSlotSummaries([]);
    try {
      const host = createTauriDiscoveryHost();
      const found = await discoverHostSlotDataFiles(host, {
        extraRoots: customSaveRoot ? [customSaveRoot] : [],
      });
      found.sort((a, b) => a.path.localeCompare(b.path));
      if (persistHost) {
        const summaries = await summarizeDiscoveredSaves(
          found,
          async (path) => {
            const result = await persistHost.readFile(path);
            if (result.status !== "ok") {
              throw new Error(
                formatManagedError(
                  { phase: "check-target", status: result.status },
                  t,
                ),
              );
            }
            return result.bytes;
          },
        );
        setSlotSummaries(summaries);
        setHistoryTargetPath((previous) => {
          if (
            previous &&
            summaries.some((summary) => summary.path === previous)
          ) {
            return previous;
          }
          return (
            summaries.find((summary) => summary.status === "ready")?.path ??
            null
          );
        });
      }
      setStatusMessage(
        found.length === 0
          ? { key: "status.noSlotsFound" }
          : { key: "status.slotsFound", values: { count: found.length } },
      );
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        setErrorMessage({
          key: "errors.permissionDenied",
          values: { path: err.path },
        });
      } else {
        setErrorMessage(
          err instanceof Error
            ? { key: "errors.scanFailed", detail: err.message }
            : { key: "errors.scanFailed" },
        );
      }
      setSlotSummaries([]);
    } finally {
      setDiscoverBusy(false);
    }
  }, [tauri, customSaveRoot, persistHost]);

  useEffect(() => {
    void refreshSlots();
  }, [refreshSlots]);

  const refreshBackupHistory = useCallback(
    async (sourcePath: string | null) => {
      const requestId = ++historyRequestId.current;
      setHistoryError(null);
      if (!persistHost || !sourcePath) {
        setBackupHistory([]);
        setHistoryLoading(false);
        return;
      }
      setHistoryLoading(true);
      try {
        const listed = await persistHost.listBackups(sourcePath);
        if (requestId !== historyRequestId.current) return;
        if (listed.status !== "ok") {
          setBackupHistory([]);
          setHistoryError(formatManagedError(listed, t));
          return;
        }
        const history = await summarizeBackupHistory(
          listed.backups,
          async (path) => {
            const read = await persistHost.readFile(path);
            if (read.status !== "ok") {
              throw new Error(formatManagedError({
                phase: "read-backup",
                status: read.status,
              }, t));
            }
            return read.bytes;
          },
        );
        if (requestId !== historyRequestId.current) return;
        setBackupHistory(history);
      } catch (error) {
        if (requestId !== historyRequestId.current) return;
        setBackupHistory([]);
        setHistoryError(
          error instanceof Error
            ? error.message
            : formatManagedError(
                { phase: "list-backups", status: "error" },
                t,
              ),
        );
      } finally {
        if (requestId === historyRequestId.current) {
          setHistoryLoading(false);
        }
      }
    },
    [persistHost, t],
  );

  useEffect(() => {
    void refreshBackupHistory(historyTargetPath);
  }, [historyTargetPath, refreshBackupHistory]);

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
        setErrorMessage({ key: "errors.loadFailed" });
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
      setCurrentTargetSha256(
        result.sha256 ?? (await sha256SaveBytes(result.bytes)),
      );
      setOpenedFileName(fileNameFromPath(path));
      setHistoryTargetPath(path);
      setStatusMessage({
        key: "status.loaded",
        values: { name: fileNameFromPath(path) },
      });
      return true;
    } catch {
      setErrorMessage({ key: "errors.loadFailed" });
      return false;
    } finally {
      setIoBusy(false);
    }
  }

  async function onSelectSlot(path: string) {
    if (
      !confirmIfNeeded(
        "switch-slot",
        t("confirm.switchSlot"),
      )
    ) {
      return;
    }
    await loadBytesFromPath(path);
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
        currentTargetSha256 ?? undefined,
      );
      if (result.status === "ok") {
        let nextSha256 = result.sha256 ?? null;
        if (!nextSha256) {
          const readback = await persistHost.readFile(result.path);
          if (readback.status === "ok") {
            nextSha256 =
              readback.sha256 ?? (await sha256SaveBytes(readback.bytes));
          }
        }
        setCurrentTargetSha256(nextSha256);
        setState((prev) => applyOverwriteSuccess(prev));
        if (historyTargetPath === state.currentPath) {
          await refreshBackupHistory(state.currentPath);
        } else {
          setHistoryTargetPath(state.currentPath);
        }
        setStatusMessage({
          key: "status.overwriteSuccess",
          values: { name: fileNameFromPath(result.backupPath) },
        });
        return;
      }
      if ("phase" in result) {
        setErrorMessage({
          key: "errors.overwriteFailed",
          detail: formatManagedError(result, t),
        });
        return;
      }
      if (result.status === "backup") {
        setErrorMessage({
          key: "errors.backupFailed",
        });
        return;
      }
      setErrorMessage({
        key: "errors.overwriteFailed",
      });
    } catch (err) {
      setErrorMessage({ key: "errors.overwriteFailed" });
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
        const readback = await persistHost.readFile(result.path);
        setCurrentTargetSha256(
          readback.status === "ok"
            ? readback.sha256 ?? (await sha256SaveBytes(readback.bytes))
            : await sha256SaveBytes(serialize(state.slotData)),
        );
        setState((prev) => applySaveAsSuccess(prev, result.path));
        setOpenedFileName(fileNameFromPath(result.path));
        setStatusMessage({
          key: "status.savedAs",
          values: { name: fileNameFromPath(result.path) },
        });
        return;
      }
      setErrorMessage({ key: "errors.saveAsFailed" });
    } catch (err) {
      setErrorMessage({ key: "errors.saveAsFailed" });
    } finally {
      setIoBusy(false);
    }
  }

  async function onCreateBackup() {
    if (manualBackupBusy.current) {
      return;
    }
    const target = historyTargetPath
      ? slotSummaries.find((summary) => summary.path === historyTargetPath)
      : undefined;
    if (!persistHost || !historyTargetPath || target?.status !== "ready") {
      setHistoryError(t("errors.manualBackupUnavailable"));
      return;
    }
    manualBackupBusy.current = true;
    setIoBusy(true);
    setHistoryError(null);
    clearAlerts();
    try {
      const result = await persistHost.createVersionedBackup(
        historyTargetPath,
        "manual",
      );
      if (result.status !== "ok") {
        setHistoryError(formatManagedError(result, t));
        return;
      }
      await refreshBackupHistory(historyTargetPath);
      setStatusMessage({
        key: "status.manualBackupSuccess",
        values: { name: fileNameFromPath(result.backup.path) },
      });
    } catch {
      setHistoryError(formatManagedError({
        phase: "backup-target",
        status: "error",
      }, t));
    } finally {
      manualBackupBusy.current = false;
      setIoBusy(false);
    }
  }

  function replacementFailure(
    phase: Parameters<typeof formatManagedError>[0]["phase"],
    status: Parameters<typeof formatManagedError>[0]["status"],
  ) {
    setReplacementError(formatManagedError({ phase, status }, t));
  }

  async function prepareRestore(item: BackupHistoryItem) {
    if (
      preparedReplacement ||
      replacementBusy.current ||
      !persistHost ||
      !historyTargetPath
    ) {
      return;
    }
    const target = slotSummaries.find(
      (summary) => summary.path === historyTargetPath,
    );
    if (target?.status !== "ready" || item.summary.status !== "ready") {
      setReplacementError(t("replacement.error.invalidSourceOrTarget"));
      return;
    }
    replacementBusy.current = true;
    setIoBusy(true);
    setReplacementError(null);
    try {
      const result = await prepareSaveReplacement(persistHost, {
        kind: "restore",
        sourcePath: item.entry.path,
        sourceMtimeMs: item.entry.mtimeMs,
        expectedSourceSha256: item.entry.sha256,
        targetPath: target.path,
        targetMtimeMs: target.mtimeMs,
      });
      if (result.status === "error") {
        replacementFailure(result.phase, result.failureStatus);
        return;
      }
      setPreparedReplacement(result);
    } catch {
      replacementFailure("validate-source", "error");
    } finally {
      replacementBusy.current = false;
      setIoBusy(false);
    }
  }

  async function prepareImport(file: File | undefined) {
    if (
      !file ||
      preparedReplacement ||
      replacementBusy.current ||
      !persistHost ||
      !historyTargetPath
    ) {
      return;
    }
    const target = slotSummaries.find(
      (summary) => summary.path === historyTargetPath,
    );
    if (target?.status !== "ready") {
      setReplacementError(t("replacement.error.invalidSourceOrTarget"));
      return;
    }
    replacementBusy.current = true;
    setIoBusy(true);
    setReplacementError(null);
    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const result = await prepareSaveReplacement(persistHost, {
        kind: "import",
        sourcePath: file.name,
        sourceMtimeMs: file.lastModified,
        sourceBytes,
        targetPath: target.path,
        targetMtimeMs: target.mtimeMs,
      });
      if (result.status === "error") {
        replacementFailure(result.phase, result.failureStatus);
        return;
      }
      setPreparedReplacement(result);
    } catch {
      replacementFailure("validate-source", "error");
    } finally {
      replacementBusy.current = false;
      setIoBusy(false);
    }
  }

  function cancelReplacement() {
    if (replacementBusy.current) return;
    setPreparedReplacement(null);
    setReplacementError(null);
  }

  async function confirmReplacement() {
    if (!preparedReplacement || !persistHost || replacementBusy.current) {
      return;
    }
    replacementBusy.current = true;
    setIoBusy(true);
    setReplacementError(null);
    clearAlerts();
    const targetPath = preparedReplacement.preview.target.path;
    try {
      const result = await executeSaveReplacement(persistHost, {
        kind: preparedReplacement.kind,
        targetPath,
        sourceBytes: preparedReplacement.sourceBytes,
        expectedSourceSha256: preparedReplacement.expectedSourceSha256,
        expectedTargetSha256: preparedReplacement.expectedTargetSha256,
      });
      if (result.status === "error") {
        replacementFailure(result.phase, result.failureStatus);
        return;
      }

      if (state.currentPath === targetPath) {
        const replacedSlot = load(result.bytes);
        setCurrentTargetSha256(
          result.sha256 ?? (await sha256SaveBytes(result.bytes)),
        );
        setState((previous) =>
          applyLoadedSlot(previous, targetPath, replacedSlot),
        );
        setOpenedFileName(fileNameFromPath(targetPath));
      }
      setPreparedReplacement(null);
      setHistoryTargetPath(targetPath);
      await refreshSlots();
      await refreshBackupHistory(targetPath);
      setStatusMessage({
        key:
          preparedReplacement.kind === "restore"
            ? "status.restoreSuccess"
            : "status.importSuccess",
        values: { name: fileNameFromPath(targetPath) },
      });
    } catch {
      replacementFailure("verify-target", "error");
    } finally {
      replacementBusy.current = false;
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
      setCurrentTargetSha256(null);
      setOpenedFileName(file.name);
      setStatusMessage({
        key: "status.openedFileNoPath",
        values: { name: file.name },
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? { key: "errors.loadFailed", detail: err.message }
          : { key: "errors.loadFailed" },
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
    setOpenedFileName(null);
    setCurrentTargetSha256(null);
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
  const currentSummary = useMemo<ReadySaveSummary | null>(() => {
    if (!state.slotData) {
      return null;
    }
    const path = state.currentPath ?? openedFileName ?? "memory.dat";
    const discovered = state.currentPath
      ? slotSummaries.find((summary) => summary.path === state.currentPath)
      : undefined;
    const summary = summarizeSave({
      path,
      mtimeMs: discovered?.mtimeMs ?? 0,
      bytes: serialize(state.slotData),
    });
    return summary.status === "ready" ? summary : null;
  }, [openedFileName, slotSummaries, state.currentPath, state.slotData]);
  const historyTarget = historyTargetPath
    ? slotSummaries.find((summary) => summary.path === historyTargetPath)
    : undefined;
  const replacementPreview: SaveReplacementPreview | null = preparedReplacement
    ? {
        kind: preparedReplacement.kind,
        source: preparedReplacement.preview.source,
        target: preparedReplacement.preview.target,
        targetDirty:
          state.dirty &&
          state.currentPath === preparedReplacement.preview.target.path,
      }
    : null;

  return (
    <main className="app-root">
      <EditorShell
        activeTab={activeTab}
        dirty={state.dirty}
        modalOpen={replacementPreview !== null}
        onSlotChange={applySlotEdit}
        onTabChange={onActiveTabChange}
        onThemeChange={onThemeChange}
        slot={state.slotData}
        theme={theme}
        saveManager={
          <SaveManagerPanel
            busy={busy}
            current={currentSummary}
            currentPath={state.currentPath}
            dirty={state.dirty}
            slots={slotSummaries}
            slotsLoading={discoverBusy}
            canReload={canPathIo}
            canSaveAs={canSaveAs}
            canSaveChanges={canPathIo}
            canClose={Boolean(state.slotData)}
            backupHistory={backupHistory}
            historyError={historyError}
            historyLoading={historyLoading}
            historyTargetPath={historyTargetPath}
            canCreateBackup={Boolean(
              persistHost && historyTarget?.status === "ready",
            )}
            replacementPreview={replacementPreview}
            replacementError={replacementError}
            onClose={onClose}
            onCreateBackup={() => void onCreateBackup()}
            onRequestRestore={(item) => void prepareRestore(item)}
            onImportReplacement={(file) => void prepareImport(file)}
            onCancelReplacement={cancelReplacement}
            onConfirmReplacement={() => void confirmReplacement()}
            onLoad={(path) => void onSelectSlot(path)}
            onOpenFile={(file) => void onPickFile(file)}
            onReload={() => void onReload()}
            onRescan={() => {
              void refreshSlots();
              void refreshBackupHistory(historyTargetPath);
            }}
            onSaveAs={() => void onSaveAs()}
            onSaveChanges={() => void onOverwrite()}
            onSelectHistoryTarget={setHistoryTargetPath}
          />
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
    const settings = storage ? loadLocalSettings(storage) : null;
    return {
      language: settings?.language ?? "zh-CN",
      theme: settings?.theme ?? "dark",
      activeTab: "save",
      workflow: createInitialEditorState(),
    };
  });

  useEffect(() => {
    document.documentElement.dataset.theme = shellState.theme;
  }, [shellState.theme]);

  const changeLanguage = useCallback((nextLanguage: Language) => {
    const storage = defaultStorage();
    if (storage) {
      saveLocalSettings(storage, { language: nextLanguage });
    }
    setShellState((current) => changeAppLanguage(current, nextLanguage));
  }, []);

  const changeTheme = useCallback((nextTheme: UiTheme) => {
    const storage = defaultStorage();
    if (storage) {
      saveLocalSettings(storage, { theme: nextTheme });
    }
    setShellState((current) => changeAppTheme(current, nextTheme));
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
        onThemeChange={changeTheme}
        onWorkflowChange={changeWorkflow}
      />
    </I18nProvider>
  );
}

export default App;
