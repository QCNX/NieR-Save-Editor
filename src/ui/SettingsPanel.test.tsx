import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import { SettingsPanel } from "./SettingsPanel";

function renderSettings(
  props: Partial<React.ComponentProps<typeof SettingsPanel>> = {},
) {
  return renderToStaticMarkup(
    <I18nProvider language="en">
      <SettingsPanel
        busy={false}
        rootDraft=""
        onRootDraftChange={vi.fn()}
        onSaveCustomRoot={vi.fn()}
        backupDraft=""
        onBackupDraftChange={vi.fn()}
        onSaveCustomBackupRoot={vi.fn()}
        canRevealBackupFolder
        onRevealBackupFolder={vi.fn()}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("SettingsPanel", () => {
  it("groups save discovery and backup location into labelled settings cards", () => {
    const html = renderSettings();

    expect(html).toContain('class="settings-card"');
    expect(html).toContain("Save discovery");
    expect(html).toContain("Backup location");
    expect(html).toContain(">Save and rescan</button>");
    expect(html).toContain(">Save backup location</button>");
  });

  it("offers open backup folder beside the backup-root field", () => {
    const html = renderSettings({ canRevealBackupFolder: true });
    const openButton = html.match(
      /<button[^>]*>Open backup folder<\/button>/,
    )?.[0];

    expect(openButton).toBeDefined();
    expect(openButton).not.toContain("disabled");
  });

  it("disables open backup folder without reveal context", () => {
    const html = renderSettings({ canRevealBackupFolder: false });
    const openButton = html.match(
      /<button[^>]*>Open backup folder<\/button>/,
    )?.[0];

    expect(openButton).toBeDefined();
    expect(openButton).toContain("disabled");
  });
});
