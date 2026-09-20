import { describe, expect, it } from "vitest";

import {
  changeAppLanguage,
  renderAppMessage,
  type AppMessage,
  type AppShellState,
} from "./App";
import { translate } from "./i18n";
import { SAVEFILE_SIZE_BYTES, load } from "./save";
import {
  applyClosed,
  applyEditedSlot,
  applyLoadedSlot,
  applyOverwriteSuccess,
  applySaveAsSuccess,
  createInitialEditorState,
} from "./ui/workflow";
import { formatWindowTitle } from "./ui/windowTitle";

describe("changeAppLanguage", () => {
  it("is a pure two-argument transition that preserves the active tab and loaded dirty workflow", () => {
    const slot = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
    const loaded = applyLoadedSlot(
      createInitialEditorState(),
      "synthetic/SlotData_0.dat",
      slot,
    );
    const workflow = applyEditedSlot(loaded, slot);
    const before: AppShellState = {
      language: "zh-CN",
      theme: "light",
      activeTab: "pods",
      workflow,
    };

    const after = changeAppLanguage(before, "en");

    expect(after.language).toBe("en");
    expect(after.theme).toBe("light");
    expect(after.activeTab).toBe("pods");
    expect(after.workflow).toBe(workflow);
    expect(after.workflow.slotData).toBe(slot);
    expect(after.workflow.dirty).toBe(true);
  });
});

describe("external workflow messages", () => {
  it("re-renders localized shell copy while retaining diagnostic detail", () => {
    const message: AppMessage = {
      key: "errors.loadFailed",
      detail: "synthetic host failure",
    };

    expect(renderAppMessage(message, (key) => translate("zh-CN", key))).toBe(
      "加载存档失败：synthetic host failure",
    );
    expect(renderAppMessage(message, (key) => translate("en", key))).toBe(
      "Failed to load save: synthetic host failure",
    );
  });
});

describe("window title workflow", () => {
  const appTitle = "NieR:Automata Save Editor";
  const unsavedLabel = "Unsaved changes";

  function titleFor(workflow: AppShellState["workflow"]): string {
    const pathParts = workflow.currentPath?.split(/[/\\]/) ?? [];
    const fileName = pathParts[pathParts.length - 1] ?? null;
    return formatWindowTitle({
      appTitle,
      dirty: workflow.dirty,
      fileName,
      unsavedLabel,
    });
  }

  it("marks edits immediately and clears only through successful clean transitions", () => {
    const slot = load(new Uint8Array(SAVEFILE_SIZE_BYTES));
    const loaded = applyLoadedSlot(
      createInitialEditorState(),
      "synthetic/SlotData_0.dat",
      slot,
    );
    const dirty = applyEditedSlot(loaded, slot);

    expect(titleFor(loaded)).toBe("SlotData_0.dat — NieR:Automata Save Editor");
    expect(titleFor(dirty)).toContain("● Unsaved changes");
    const failedOrCancelled = dirty; // no successful transition is applied
    expect(titleFor(failedOrCancelled)).toBe(
      "● Unsaved changes · SlotData_0.dat — NieR:Automata Save Editor",
    );

    expect(titleFor(applyOverwriteSuccess(dirty))).not.toContain("●");
    expect(titleFor(applyLoadedSlot(dirty, loaded.currentPath, slot))).not.toContain(
      "●",
    );
    expect(
      titleFor(applyLoadedSlot(dirty, "synthetic/SlotData_1.dat", slot)),
    ).toBe("SlotData_1.dat — NieR:Automata Save Editor");
    expect(titleFor(applySaveAsSuccess(dirty, "synthetic/copy.dat"))).toBe(
      "copy.dat — NieR:Automata Save Editor",
    );
    expect(titleFor(applyClosed(dirty))).toBe(appTitle);
  });
});
