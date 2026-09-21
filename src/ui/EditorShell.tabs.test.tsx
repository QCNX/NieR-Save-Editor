import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  INVENTORY_SIZE_ITEMS,
  SAVEFILE_CORPSE_INVENTORY_START_BYTE,
  SAVEFILE_INVENTORY_START_BYTE,
  SAVEFILE_SIZE_BYTES,
  load,
} from "../save";
import { EditorShell } from "./EditorShell";
import { SettingsPanel } from "./SettingsPanel";

function makeRenderableSlot() {
  const bytes = new Uint8Array(SAVEFILE_SIZE_BYTES);
  const view = new DataView(bytes.buffer);
  for (const inventoryStart of [
    SAVEFILE_INVENTORY_START_BYTE,
    SAVEFILE_CORPSE_INVENTORY_START_BYTE,
  ]) {
    for (let index = 0; index < INVENTORY_SIZE_ITEMS; index += 1) {
      view.setUint32(inventoryStart + index * 12 + 4, 0xffff_ffff, true);
    }
  }
  return load(bytes);
}

const slot = makeRenderableSlot();

function renderShell(
  language: "zh-CN" | "en",
  activeTab: React.ComponentProps<typeof EditorShell>["activeTab"],
  loadedSlot = slot,
  options: {
    currentFileName?: string | null;
    dirty?: boolean;
    modalOpen?: boolean;
    theme?: "light" | "dark";
  } = {},
) {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <EditorShell
        activeTab={activeTab}
        currentFileName={
          options.currentFileName === undefined
            ? "SlotData_0.dat"
            : options.currentFileName
        }
        dirty={options.dirty ?? true}
        modalOpen={options.modalOpen}
        notices={<p role="status">notice</p>}
        onSlotChange={vi.fn()}
        onTabChange={vi.fn()}
        onThemeChange={vi.fn()}
        settings={
          <SettingsPanel
            busy={false}
            rootDraft=""
            onRootDraftChange={vi.fn()}
            onSaveCustomRoot={vi.fn()}
            backupDraft=""
            onBackupDraftChange={vi.fn()}
            onSaveCustomBackupRoot={vi.fn()}
            canRevealBackupFolder={false}
            onRevealBackupFolder={vi.fn()}
          />
        }
        slot={loadedSlot}
        theme={options.theme ?? "dark"}
        saveManager={
          <section aria-label="save manager">save controls</section>
        }
      />
    </I18nProvider>,
  );
}

describe("EditorShell tabs", () => {
  it("puts Save beside the editing tabs and keeps I/O inside the Save panel", () => {
    const html = renderShell("en", "save");

    expect(html.match(/role="tab"/g)).toHaveLength(8);
    expect(html).toContain('aria-selected="true">Save</button>');
    expect(html).toContain(">General</button>");
    expect(html).toContain(">Items</button>");
    expect(html).toContain(">Weapons</button>");
    expect(html).toContain(">POD</button>");
    expect(html).toContain(">Chip Library</button>");
    expect(html).toContain(">Chip Loadout</button>");
    expect(html).toContain(">Settings</button>");
    expect(html).not.toContain(">Chips</button>");
    expect(html).not.toContain(">Skills</button>");
    expect(html).toContain('aria-label="save manager"');
    expect(html.indexOf('role="tablist"')).toBeLessThan(
      html.indexOf('aria-label="save manager"'),
    );
  });

  it("renders Chip Library and Chip Loadout as zh top-level tabs", () => {
    const html = renderShell("zh-CN", "save");

    expect(html).toContain(">芯片库</button>");
    expect(html).toContain(">芯片配装</button>");
    expect(html).not.toContain(">芯片</button>");
  });

  it("keeps library editing under Chip Library and shows the loadout panel under Chip Loadout", () => {
    const library = renderShell("en", "chipLibrary");
    const loadout = renderShell("en", "chipLoadout");

    expect(library).toContain('id="editor-tab-chipLibrary"');
    expect(library).toContain(
      'role="tabpanel" id="editor-panel-chipLibrary" aria-labelledby="editor-tab-chipLibrary"',
    );
    expect(library).toContain("Show occupied only");
    expect(library).toContain("Cost");
    expect(library.indexOf("Level")).toBeLessThan(library.indexOf("Cost"));

    expect(loadout).toContain('id="editor-tab-chipLoadout"');
    expect(loadout).toContain(
      'role="tabpanel" id="editor-panel-chipLoadout" aria-labelledby="editor-tab-chipLoadout"',
    );
    expect(loadout).toContain('data-testid="chip-loadout-panel"');
    expect(loadout).not.toContain('data-testid="chip-loadout-placeholder"');
  });

  it("keeps the tab row as tabs only without theme, language, or dirty meta", () => {
    const html = renderShell("en", "general");
    const tabsRowEnd = html.indexOf('class="editor-tab-panel"');
    const tabsRow = html.slice(0, tabsRowEnd);

    expect(tabsRow).toContain('role="tablist"');
    expect(tabsRow).not.toContain('class="editor-tabs-meta"');
    expect(tabsRow).not.toContain('aria-label="Toggle color theme"');
    expect(tabsRow).not.toContain('aria-label="Language"');
    expect(tabsRow).not.toContain('class="dirty-chip"');
    expect(tabsRow).not.toContain(">Modified</span>");
  });

  it("puts file name, dirty chip, theme, and unlabeled language select in a footer status bar", () => {
    const dirty = renderShell("en", "general", slot, {
      currentFileName: "SlotData_0.dat",
      dirty: true,
    });
    const clean = renderShell("en", "general", slot, {
      currentFileName: null,
      dirty: false,
    });

    expect(dirty).toContain('class="editor-status-bar"');
    expect(dirty).toContain(">SlotData_0.dat</span>");
    expect(dirty).toContain('class="dirty-chip"');
    expect(dirty).toContain(">Modified</span>");
    expect(dirty).toContain('aria-label="Toggle color theme"');
    expect(dirty).toContain('aria-label="Language"');
    expect(dirty).not.toContain(">Language</span>");
    expect(dirty.indexOf('class="editor-tab-panel"')).toBeLessThan(
      dirty.indexOf('class="editor-status-bar"'),
    );
    expect(dirty.indexOf('aria-label="Toggle color theme"')).toBeLessThan(
      dirty.indexOf('aria-label="Language"'),
    );

    expect(clean).toContain(">No file</span>");
    expect(clean).toContain('class="path-chip"');
    expect(clean).toContain(">Unmodified</span>");
  });

  it("renders the custom save root only inside the Settings tab", () => {
    const general = renderShell("en", "general");
    const settings = renderShell("en", "settings");

    expect(general).not.toContain("Custom save folder");
    expect(settings).toContain("Custom save folder");
    expect(settings).toContain("Save and rescan");
    expect(settings).toContain("Backup folder");
    expect(settings).toContain("nier-save-editor-backup");
    expect(settings).toContain('class="settings-help"');
  });

  it("translates shell labels without changing the controlled active tab", () => {
    const html = renderShell("zh-CN", "settings", slot, {
      currentFileName: null,
    });

    expect(html).toContain('aria-selected="true">设置</button>');
    expect(html).toContain(">存档</button>");
    expect(html).toContain("自定义存档目录");
    expect(html).toContain("已修改");
    expect(html).toContain('aria-label="语言"');
    expect(html).not.toContain(">语言</span>");
    expect(html).toContain(">亮色</button>");
    expect(html).toContain(">无文件</span>");
  });

  it("does not repeat any non-save tab label at any content heading level", () => {
    for (const [tab, label] of [
      ["general", "General"],
      ["items", "Items"],
      ["weapons", "Weapons"],
      ["pods", "POD"],
      ["chipLibrary", "Chip Library"],
      ["chipLoadout", "Chip Loadout"],
      ["settings", "Settings"],
    ] as const) {
      const html = renderShell("en", tab);
      const headings = Array.from(
        html.matchAll(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/g),
        (match) => match[1],
      );
      expect(headings, tab).not.toContain(label);
    }

    const inventory = renderShell("en", "items");
    expect(inventory).toContain('id="editor-tab-items"');
    expect(inventory).toContain(
      'role="tabpanel" id="editor-panel-items" aria-labelledby="editor-tab-items"',
    );
  });

  it("makes tabs and shell controls inert while the replacement dialog is open", () => {
    const html = renderShell("en", "save", slot, { modalOpen: true });

    expect(html).toContain('class="editor-tabs-row" inert="" aria-hidden="true"');
  });

  it("keeps the same semantic tab structure in both themes", () => {
    const light = renderShell("en", "save", slot, { theme: "light" });
    const dark = renderShell("en", "save", slot, { theme: "dark" });

    expect(light.match(/role="tab"/g)).toHaveLength(8);
    expect(dark.match(/role="tab"/g)).toHaveLength(8);
    expect(light).toContain('aria-pressed="false"');
    expect(dark).toContain('aria-pressed="true"');
  });
});
