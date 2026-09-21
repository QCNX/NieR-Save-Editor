import { describe, expect, it } from "vitest";

import {
  changeAppLanguage,
  messageForDiscoveryFailure,
  renderAppMessage,
  type AppMessage,
  type AppShellState,
} from "./App";
import { PermissionDeniedError } from "./discovery";
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
  it("re-renders external failures using localized shell copy only", () => {
    const message: AppMessage = {
      key: "errors.loadFailed",
    };

    expect(renderAppMessage(message, (key) => translate("zh-CN", key))).toBe(
      "加载存档失败",
    );
    expect(renderAppMessage(message, (key) => translate("en", key))).toBe(
      "Failed to load save",
    );
  });

  it("localizes discovery failures without exposing host paths or messages", () => {
    const privatePath = String.raw`X:\private\SlotData_0.dat`;
    const denied = messageForDiscoveryFailure(
      new PermissionDeniedError(privatePath),
    );
    const unknown = messageForDiscoveryFailure(
      new Error(`native scan failed at ${privatePath}`),
    );

    for (const language of ["zh-CN", "en"] as const) {
      const t = (key: string) => translate(language, key);
      const deniedText = renderAppMessage(denied, t);
      const unknownText = renderAppMessage(unknown, t);
      expect(deniedText).toBe(translate(language, "errors.permissionDenied"));
      expect(unknownText).toBe(translate(language, "errors.scanFailed"));
      expect(deniedText).not.toContain(privatePath);
      expect(unknownText).not.toContain("native scan failed");
    }
  });
});

describe("window title workflow", () => {
  function titleFor(workflow: AppShellState["workflow"]): string {
    const pathParts = workflow.currentPath?.split(/[/\\]/) ?? [];
    const fileName = pathParts[pathParts.length - 1] ?? null;
    return formatWindowTitle({
      dirty: workflow.dirty,
      fileName,
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

    expect(titleFor(loaded)).toBe("SlotData_0.dat — NieR Save Editor");
    expect(titleFor(dirty)).toBe("SlotData_0.dat — NieR Save Editor*");
    const failedOrCancelled = dirty; // no successful transition is applied
    expect(titleFor(failedOrCancelled)).toBe(
      "SlotData_0.dat — NieR Save Editor*",
    );

    expect(titleFor(applyOverwriteSuccess(dirty))).not.toContain("*");
    expect(
      titleFor(applyLoadedSlot(dirty, loaded.currentPath, slot)),
    ).not.toContain("*");
    expect(
      titleFor(applyLoadedSlot(dirty, "synthetic/SlotData_1.dat", slot)),
    ).toBe("SlotData_1.dat — NieR Save Editor");
    expect(titleFor(applySaveAsSuccess(dirty, "synthetic/copy.dat"))).toBe(
      "copy.dat — NieR Save Editor",
    );
    expect(titleFor(applyClosed(dirty))).toBe("NieR Save Editor");
  });
});
