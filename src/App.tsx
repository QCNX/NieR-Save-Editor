import { useState } from "react";
import {
  SAVEFILE_SIZE_BYTES,
  load,
  type SlotData,
} from "./save";
import { EditorShell } from "./ui/EditorShell";
import "./ui/editor.css";

function App() {
  const [slotData, setSlotData] = useState<SlotData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  function applySlot(next: SlotData) {
    setSlotData(next);
    setDirty(true);
  }

  async function onPickFile(file: File | undefined) {
    setLoadError(null);
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length !== SAVEFILE_SIZE_BYTES) {
      setLoadError(
        `存档大小无效：需要 ${SAVEFILE_SIZE_BYTES} 字节，实际 ${bytes.length} 字节。`,
      );
      return;
    }
    try {
      setSlotData(load(bytes));
      setDirty(false);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "无法加载存档");
    }
  }

  return (
    <main className="app-root">
      <div className="app-toolbar">
        <label className="file-button">
          打开存档…
          <input
            type="file"
            accept=".dat,application/octet-stream"
            onChange={(e) => {
              void onPickFile(e.currentTarget.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button
          type="button"
          disabled={!slotData}
          onClick={() => {
            setSlotData(null);
            setDirty(false);
            setLoadError(null);
          }}
        >
          关闭存档
        </button>
        {loadError ? <span role="alert">{loadError}</span> : null}
      </div>

      {slotData ? (
        <EditorShell
          slot={slotData}
          dirty={dirty}
          onSlotChange={applySlot}
        />
      ) : (
        <div className="app-empty">
          <h1>尼尔：自动人形 存档编辑器</h1>
          <p>请打开 PC 槽位存档以编辑金钱、经验、物品、武器与技能。</p>
          <p>本版本仅在内存中编辑，不会写入磁盘。</p>
        </div>
      )}
    </main>
  );
}

export default App;
