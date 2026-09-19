import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SAVEFILE_SIZE_BYTES,
  load,
  type SlotData,
} from "./save";
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
import { EditorShell } from "./ui/EditorShell";
import { loadLocalSettings, saveLocalSettings } from "./ui/localSettings";
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

function App() {
  const [state, setState] = useState<EditorAppState>(() =>
    createInitialEditorState(),
  );
  const [slots, setSlots] = useState<SlotFile[]>([]);
  const [selectedSlotPath, setSelectedSlotPath] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
      setStatusMessage("当前为浏览器预览：请用「打开存档…」加载文件；槽位发现需 Tauri 桌面端。");
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
          ? "未找到 SlotData_*.dat（可设置自定义存档目录后重新扫描）。"
          : `已发现 ${found.length} 个槽位存档。`,
      );
      setSelectedSlotPath((prev) => {
        if (prev && found.some((s) => s.path === prev)) {
          return prev;
        }
        return found[0]?.path ?? "";
      });
    } catch (err) {
      if (err instanceof PermissionDeniedError) {
        setErrorMessage(`无法读取存档目录（权限不足）：${err.path}`);
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "扫描存档目录失败",
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
      setErrorMessage("当前环境无法按路径读取存档（需要 Tauri）。");
      return false;
    }
    setIoBusy(true);
    clearAlerts();
    try {
      const result = await reloadSave(persistHost, path);
      if (result.status !== "ok") {
        setErrorMessage(result.message);
        return false;
      }
      if (result.bytes.length !== SAVEFILE_SIZE_BYTES) {
        setErrorMessage(
          `存档大小无效：需要 ${SAVEFILE_SIZE_BYTES} 字节，实际 ${result.bytes.length} 字节。`,
        );
        return false;
      }
      const slot = load(result.bytes);
      setState((prev) => applyLoadedSlot(prev, path, slot));
      setStatusMessage(`已加载：${fileNameFromPath(path)}`);
      return true;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "加载存档失败");
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
        "当前有未保存的修改。切换槽位将丢弃这些修改，是否继续？",
      )
    ) {
      return;
    }
    await loadBytesFromPath(selectedSlotPath);
  }

  async function onReload() {
    if (!state.currentPath) {
      setErrorMessage("没有可重新加载的路径（请先从槽位列表加载，或另存为后再操作）。");
      return;
    }
    if (
      !confirmIfNeeded(
        "reload",
        "当前有未保存的修改。重新加载将丢弃这些修改，是否继续？",
      )
    ) {
      return;
    }
    await loadBytesFromPath(state.currentPath);
  }

  async function onOverwrite() {
    if (!persistHost || !state.currentPath || !state.slotData) {
      setErrorMessage("无法覆盖写入：需要已加载的槽位路径与存档数据（Tauri 桌面端）。");
      return;
    }
    if (
      !confirmIfNeeded(
        "overwrite",
        `即将备份并覆盖写入：\n${state.currentPath}\n\n是否继续？`,
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
        setStatusMessage(
          `已覆盖写入（备份：${fileNameFromPath(result.backupPath)}）。`,
        );
        return;
      }
      if (result.status === "backup") {
        setErrorMessage(`备份失败，已中止写入：${result.message}`);
        return;
      }
      setErrorMessage(result.message);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "覆盖写入失败");
    } finally {
      setIoBusy(false);
    }
  }

  async function onSaveAs() {
    if (!persistHost || !state.slotData) {
      setErrorMessage("无法另存为：需要已加载的存档数据（Tauri 桌面端）。");
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
        setStatusMessage("已取消另存为。");
        return;
      }
      if (result.status === "ok") {
        setState((prev) => applySaveAsSuccess(prev, result.path));
        setStatusMessage(`已另存为：${fileNameFromPath(result.path)}`);
        return;
      }
      setErrorMessage(result.message);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "另存为失败");
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
        "当前有未保存的修改。打开新文件将丢弃这些修改，是否继续？",
      )
    ) {
      return;
    }
    clearAlerts();
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== SAVEFILE_SIZE_BYTES) {
      setErrorMessage(
        `存档大小无效：需要 ${SAVEFILE_SIZE_BYTES} 字节，实际 ${bytes.length} 字节。`,
      );
      return;
    }
    try {
      const slot = load(bytes);
      // Browser file input has no absolute path — overwrite/reload need discovery or Save As.
      setState((prev) => applyLoadedSlot(prev, null, slot));
      setStatusMessage(`已打开：${file.name}（无磁盘路径；可另存为或从槽位列表加载以启用覆盖/重载）`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "无法加载存档");
    }
  }

  function onClose() {
    if (
      !confirmIfNeeded(
        "close",
        "当前有未保存的修改。关闭将丢弃这些修改，是否继续？",
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
      setErrorMessage("无法写入本地设置（localStorage 不可用）。");
      return;
    }
    const next = rootDraft.trim();
    saveLocalSettings(storage, { customSaveRoot: next });
    setCustomSaveRoot(next);
    setStatusMessage(
      next
        ? "已保存自定义存档目录，正在重新扫描…"
        : "已清除自定义存档目录，正在重新扫描…",
    );
  }

  const busy = discoverBusy || ioBusy;
  const canPathIo = Boolean(persistHost && state.currentPath && state.slotData);
  const canSaveAs = Boolean(persistHost && state.slotData);

  return (
    <main className="app-root">
      <div className="app-toolbar">
        <label className="toolbar-field">
          <span>槽位</span>
          <select
            value={selectedSlotPath}
            disabled={busy || slots.length === 0}
            onChange={(e) => setSelectedSlotPath(e.currentTarget.value)}
          >
            {slots.length === 0 ? (
              <option value="">（无 SlotData）</option>
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
          onClick={() => {
            void onSelectSlot();
          }}
        >
          加载槽位
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void refreshSlots();
          }}
        >
          重新扫描
        </button>
        <button
          type="button"
          disabled={busy || !canPathIo}
          onClick={() => {
            void onReload();
          }}
        >
          重新加载
        </button>
        <button
          type="button"
          disabled={busy || !canPathIo}
          onClick={() => {
            void onOverwrite();
          }}
        >
          覆盖写入
        </button>
        <button
          type="button"
          disabled={busy || !canSaveAs}
          onClick={() => {
            void onSaveAs();
          }}
        >
          另存为…
        </button>
        <label className="file-button">
          打开存档…
          <input
            type="file"
            accept=".dat,application/octet-stream"
            disabled={busy}
            onChange={(e) => {
              void onPickFile(e.currentTarget.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button type="button" disabled={busy || !state.slotData} onClick={onClose}>
          关闭存档
        </button>
      </div>

      <div className="app-toolbar app-toolbar--settings">
        <label className="toolbar-field toolbar-field--grow">
          <span>自定义存档目录</span>
          <input
            type="text"
            value={rootDraft}
            placeholder="%USERPROFILE%\Documents\My Games\NieR_Automata"
            disabled={busy}
            onChange={(e) => setRootDraft(e.currentTarget.value)}
          />
        </label>
        <button type="button" disabled={busy} onClick={onSaveCustomRoot}>
          保存目录并扫描
        </button>
        {state.currentPath ? (
          <span className="path-chip" title={state.currentPath}>
            当前：{fileNameFromPath(state.currentPath)}
          </span>
        ) : state.slotData ? (
          <span className="path-chip">当前：内存中（无路径）</span>
        ) : null}
        {state.dirty ? <span className="dirty-chip">已修改</span> : null}
      </div>

      {errorMessage ? (
        <p className="app-alert" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {statusMessage ? <p className="app-status">{statusMessage}</p> : null}

      {state.slotData ? (
        <EditorShell
          slot={state.slotData}
          dirty={state.dirty}
          onSlotChange={applySlotEdit}
        />
      ) : (
        <div className="app-empty">
          <h1>尼尔：自动人形 存档编辑器</h1>
          <p>
            从上方选择已发现的 SlotData 槽位并加载，或打开任意 PC
            存档文件以编辑金钱、经验、物品、武器与技能。
          </p>
          <p>
            覆盖写入会先备份到存档目录旁的{" "}
            <code>nier-save-editor-backup/</code>；浏览器预览仅支持内存编辑。
          </p>
        </div>
      )}
    </main>
  );
}

export default App;
