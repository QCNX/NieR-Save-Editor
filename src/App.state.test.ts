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
  applyEditedSlot,
  applyLoadedSlot,
  createInitialEditorState,
} from "./ui/workflow";

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
      activeTab: "skills",
      workflow,
    };

    const after = changeAppLanguage(before, "en");

    expect(after.language).toBe("en");
    expect(after.activeTab).toBe("skills");
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
