import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import type {
  BackupHistoryItem,
  ReadySaveSummary,
  SaveSummary,
} from "./saveSummary";
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
        backupHistory={[]}
        historyError={null}
        historyLoading={false}
        historyTargetPath={readySlot.path}
        canCreateBackup
        onClose={vi.fn()}
        onCreateBackup={vi.fn()}
        onLoad={vi.fn()}
        onOpenFile={vi.fn()}
        onReload={vi.fn()}
        onRescan={vi.fn()}
        onSaveAs={vi.fn()}
        onSaveChanges={vi.fn()}
        onSelectHistoryTarget={vi.fn()}
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

    expect(html.match(/disabled=""/g)).toHaveLength(9);
  });

  it("renders distinct loading and empty slot states", () => {
    const loading = renderPanel({ slots: [], slotsLoading: true });
    const empty = renderPanel({ slots: [], slotsLoading: false });

    expect(loading).toContain('role="status"');
    expect(loading).toContain("Reading save slots…");
    expect(empty).toContain("No save slots were found.");
  });

  it("shows newest backup details and clearly marks invalid legacy history", () => {
    const backupHistory: BackupHistoryItem[] = [
      {
        entry: {
          path: "~/backups/SlotData_0/new.dat",
          slotFileName: "SlotData_0.dat",
          reason: "manual",
          size: 235_980,
          mtimeMs: 200,
          sha256: "abcdef0123456789",
          metadataStatus: "ok",
        },
        summary: {
          ...readySlot,
          path: "~/backups/SlotData_0/new.dat",
          fileName: "new.dat",
          mtimeMs: 200,
        },
      },
      {
        entry: {
          path: "~/backups/SlotData_0/invalid-sidecar.dat",
          slotFileName: "SlotData_0.dat",
          reason: "manual",
          size: 235_980,
          mtimeMs: 150,
          sha256: "fedcba9876543210",
          metadataStatus: "invalid",
        },
        summary: {
          ...readySlot,
          path: "~/backups/SlotData_0/invalid-sidecar.dat",
          fileName: "invalid-sidecar.dat",
          mtimeMs: 150,
        },
      },
      {
        entry: {
          path: "~/backups/legacy/SlotData_0.dat",
          slotFileName: "SlotData_0.dat",
          reason: "legacy",
          size: 12,
          mtimeMs: 100,
          sha256: "",
          metadataStatus: "legacy",
        },
        summary: {
          ...invalidSlot,
          path: "~/backups/legacy/SlotData_0.dat",
          fileName: "SlotData_0.dat",
          mtimeMs: 100,
        },
      },
    ];

    const html = renderPanel({ backupHistory, dirty: true });

    expect(html).toContain("Manual backup");
    expect(html).toContain("Legacy backup");
    expect(html).toContain("235,980 bytes");
    expect(html).toContain("abcdef012345");
    expect(html).toContain("Metadata available");
    expect(html).toContain("Invalid metadata");
    expect(html).toContain("Legacy metadata");
    expect(html).toContain("Verified");
    expect(html).toContain("Mismatch");
    expect(html).toContain("Not recorded");
    expect(html).toContain("Validation failed");
    expect(html).toContain("Unsaved editor changes are not included");
    expect(html.indexOf("new.dat")).toBeLessThan(
      html.indexOf("Legacy backup"),
    );
  });

  it("renders separate backup loading, error, and empty states", () => {
    const loading = renderPanel({ historyLoading: true });
    const failed = renderPanel({ historyError: "synthetic history failure" });
    const empty = renderPanel();

    expect(loading).toContain("Reading backup history…");
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("synthetic history failure");
    expect(empty).toContain("No backups yet");
  });
});
