import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import { SAVEFILE_SIZE_BYTES, load } from "../save";
import { EditorShell } from "./EditorShell";
import { SettingsPanel } from "./SettingsPanel";

const slot = load(new Uint8Array(SAVEFILE_SIZE_BYTES));

function renderShell(language: "zh-CN" | "en", activeTab: "general" | "settings") {
  return renderToStaticMarkup(
    <I18nProvider language={language}>
      <EditorShell
        activeTab={activeTab}
        dirty
        notices={<p role="status">notice</p>}
        onSlotChange={vi.fn()}
        onTabChange={vi.fn()}
        settings={
          <SettingsPanel
            busy={false}
            rootDraft=""
            onRootDraftChange={vi.fn()}
            onSaveCustomRoot={vi.fn()}
          />
        }
        slot={slot}
        toolbar={<section aria-label="save toolbar">save controls</section>}
      />
    </I18nProvider>,
  );
}

describe("EditorShell tabs", () => {
  it("keeps save controls above the five editing tabs without a Save tab", () => {
    const html = renderShell("en", "general");

    expect(html.indexOf('aria-label="save toolbar"')).toBeLessThan(
      html.indexOf('role="tablist"'),
    );
    expect(html.match(/role="tab"/g)).toHaveLength(5);
    expect(html).toContain(">General</button>");
    expect(html).toContain(">Items</button>");
    expect(html).toContain(">Weapons</button>");
    expect(html).toContain(">Skills</button>");
    expect(html).toContain(">Settings</button>");
    expect(html).not.toContain(">Save</button>");
  });

  it("renders the custom save root only inside the Settings tab", () => {
    const general = renderShell("en", "general");
    const settings = renderShell("en", "settings");

    expect(general).not.toContain("Custom save folder");
    expect(settings).toContain("Custom save folder");
    expect(settings).toContain("Save folder and scan");
  });

  it("translates shell labels without changing the controlled active tab", () => {
    const html = renderShell("zh-CN", "settings");

    expect(html).toContain('aria-selected="true">设置</button>');
    expect(html).toContain("自定义存档目录");
    expect(html).toContain("已修改");
  });
});
