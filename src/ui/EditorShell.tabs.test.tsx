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
  options: { modalOpen?: boolean; theme?: "light" | "dark" } = {},
) {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <EditorShell
        activeTab={activeTab}
        dirty
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

  it("places the dark-mode toggle left of the language switch on the tab row", () => {
    const html = renderShell("en", "general");

    expect(html).toContain('aria-label="Toggle color theme"');
    expect(html).toContain(">Light</button>");
    expect(html).toContain('aria-label="Language"');
    expect(html.indexOf('aria-label="Toggle color theme"')).toBeLessThan(
      html.indexOf('aria-label="Language"'),
    );
  });

  it("keeps dirty and clean status chips inside the tab-row meta, after the tablist", () => {
    const dirty = renderShell("en", "general");
    const clean = renderToStaticMarkup(
      <I18nProvider language="en">
        <EditorShell
          activeTab="general"
          dirty={false}
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
            />
          }
          slot={slot}
          theme="dark"
          saveManager={
            <section aria-label="save manager">save controls</section>
          }
        />
      </I18nProvider>,
    );

    expect(dirty).toContain('class="editor-tabs-meta"');
    expect(dirty).toContain('class="dirty-chip"');
    expect(dirty).toContain(">Modified</span>");
    expect(clean).toContain('class="path-chip"');
    expect(clean).toContain(">Unmodified</span>");
    expect(dirty.indexOf('role="tablist"')).toBeLessThan(
      dirty.indexOf('class="dirty-chip"'),
    );
    expect(dirty.indexOf('class="editor-tabs-meta"')).toBeLessThan(
      dirty.indexOf('class="dirty-chip"'),
    );
  });

  it("renders the custom save root only inside the Settings tab", () => {
    const general = renderShell("en", "general");
    const settings = renderShell("en", "settings");

    expect(general).not.toContain("Custom save folder");
    expect(settings).toContain("Custom save folder");
    expect(settings).toContain("Save folder and scan");
    expect(settings).toContain("Backup folder");
    expect(settings).toContain("nier-save-editor-backup");
    expect(settings).toContain('class="settings-help"');
  });

  it("translates shell labels without changing the controlled active tab", () => {
    const html = renderShell("zh-CN", "settings");

    expect(html).toContain('aria-selected="true">设置</button>');
    expect(html).toContain(">存档</button>");
    expect(html).toContain("自定义存档目录");
    expect(html).toContain("已修改");
    expect(html).toContain('aria-label="语言"');
    expect(html).toContain(">亮色</button>");
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
