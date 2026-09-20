import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import type { ReadySaveSummary, SaveSummary } from "./saveSummary";
import { SaveManagerPanel } from "./SaveManagerPanel";

const readySlot: ReadySaveSummary = {
  status: "ready",
  path: "~/saves/SlotData_0.dat",
  fileName: "SlotData_0.dat",
  slotNumber: 0,
  mtimeMs: Date.UTC(2026, 0, 2, 3, 4, 5),
  characterName: "2B",
  level: 30,
  playTimeSeconds: 3_661,
};

const invalidSlot: SaveSummary = {
  status: "invalid",
  path: "~/saves/SlotData_1.dat",
  fileName: "SlotData_1.dat",
  slotNumber: 1,
  mtimeMs: Date.UTC(2026, 0, 3),
  validation: {
    status: "invalid",
    reason: "invalid-size",
    expectedSize: 235_980,
    actualSize: 12,
  },
};

function renderPanel(
  props: Partial<React.ComponentProps<typeof SaveManagerPanel>> = {},
) {
  return renderToStaticMarkup(
    <I18nProvider language="en">
      <SaveManagerPanel
        busy={false}
        current={readySlot}
        currentPath={readySlot.path}
        dirty
        slots={[readySlot]}
        slotsLoading={false}
        canReload
        canSaveAs
        canSaveChanges
        canClose
        onClose={vi.fn()}
        onLoad={vi.fn()}
        onOpenFile={vi.fn()}
        onReload={vi.fn()}
        onRescan={vi.fn()}
        onSaveAs={vi.fn()}
        onSaveChanges={vi.fn()}
        {...props}
      />
    </I18nProvider>,
  );
}

describe("SaveManagerPanel", () => {
  it("organizes current save, slot overview, and backup history with one primary action", () => {
    const html = renderPanel();

    expect(html).toContain("Current save");
    expect(html).toContain("Save slots");
    expect(html).toContain("Backup history");
    expect(html).toContain("SlotData_0.dat");
    expect(html).toContain("2B");
    expect(html).toContain("Level 30");
    expect(html).toContain("01:01:01");
    expect(html).toContain("Modified");
    expect(html.match(/save-action--primary/g)).toHaveLength(1);
    expect(html).toContain(">Save changes</button>");
    expect(html).toContain('class="save-actions"');
    expect(html).toContain('class="save-slot-card save-slot-card--current"');
    expect(html).toContain("No backups yet");
  });

  it("keeps a valid slot loadable beside an independently invalid slot", () => {
    const html = renderPanel({ slots: [readySlot, invalidSlot] });

    expect(html).toContain("SlotData_0.dat");
    expect(html).toContain("SlotData_1.dat");
    expect(html).toContain("Validation failed");
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });

  it("locks conflicting actions while I/O is busy", () => {
    const html = renderPanel({ busy: true });

    expect(html.match(/disabled=""/g)).toHaveLength(7);
  });

  it("renders distinct loading and empty slot states", () => {
    const loading = renderPanel({ slots: [], slotsLoading: true });
    const empty = renderPanel({ slots: [], slotsLoading: false });

    expect(loading).toContain('role="status"');
    expect(loading).toContain("Reading save slots…");
    expect(empty).toContain("No save slots were found.");
  });
});
