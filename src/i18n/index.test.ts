import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_LANGUAGE,
  I18nProvider,
  SUPPORTED_LANGUAGES,
  translate,
  useI18n,
} from "./index";

function TranslationProbe() {
  const { language, t } = useI18n();
  return createElement("span", null, `${language}:${t("tabs.general")}`);
}

describe("i18n public API", () => {
  it("translates the same shell key in both supported languages", () => {
    expect(DEFAULT_LANGUAGE).toBe("zh-CN");
    expect(SUPPORTED_LANGUAGES).toEqual(["zh-CN", "en"]);
    expect(translate("zh-CN", "tabs.general")).toBe("概要");
    expect(translate("en", "tabs.general")).toBe("General");
  });

  it("returns an unknown key unchanged", () => {
    expect(translate("zh-CN", "missing.example")).toBe("missing.example");
    expect(translate("en", "missing.example")).toBe("missing.example");
  });

  it("provides the selected language and translator through React context", () => {
    const html = renderToStaticMarkup(
      createElement(
        I18nProvider,
        { language: "en" },
        createElement(TranslationProbe),
      ),
    );
    expect(html).toContain("en:General");
  });

  it("covers the shared shell and list-control vocabulary", () => {
    expect(translate("zh-CN", "window.unsavedChanges")).toBe("有未保存修改");
    expect(translate("en", "window.unsavedChanges")).toBe("Unsaved changes");
    expect(translate("zh-CN", "toolbar.open")).toBe("打开存档…");
    expect(translate("en", "tabs.settings")).toBe("Settings");
    expect(translate("zh-CN", "list.occupiedOnly")).toBe("仅显示占用");
    expect(translate("en", "actions.clear")).toBe("Clear");
    expect(translate("zh-CN", "entity.unknown")).toBe("未知");
    expect(translate("en", "entity.unknown")).toBe("Unknown");
  });

  it("provides English text for every save-workflow and empty-state message", () => {
    const workflowKeys = [
      "status.preview",
      "status.noSlotsFound",
      "status.slotsFound",
      "errors.permissionDenied",
      "errors.scanFailed",
      "errors.pathReadUnavailable",
      "errors.invalidSize",
      "status.loaded",
      "errors.loadFailed",
      "confirm.switchSlot",
      "errors.noReloadPath",
      "confirm.reload",
      "errors.overwriteUnavailable",
      "confirm.overwrite",
      "status.overwriteSuccess",
      "errors.backupFailed",
      "errors.overwriteFailed",
      "errors.saveAsUnavailable",
      "status.saveAsCancelled",
      "status.savedAs",
      "errors.saveAsFailed",
      "confirm.openFile",
      "status.openedFileNoPath",
      "confirm.close",
      "errors.settingsUnavailable",
      "status.customRootSaved",
      "status.customRootCleared",
      "empty.intro",
      "empty.backup",
      "saveManager.currentHeading",
      "saveManager.slotsHeading",
      "saveManager.historyHeading",
      "saveManager.actions",
      "saveManager.saveChanges",
      "saveManager.noCurrent",
      "saveManager.noSlots",
      "saveManager.slotsLoading",
      "saveManager.historyEmpty",
      "saveManager.playTime",
      "saveManager.modifiedTime",
      "saveManager.unknownTime",
      "saveManager.stateReady",
      "saveManager.stateInvalid",
      "saveManager.stateUnreadable",
    ] as const;

    for (const key of workflowKeys) {
      const message = translate("en", key);
      expect(message, key).not.toBe(key);
      expect(message, key).not.toMatch(/[\u3400-\u9fff]/u);
    }
  });

  it("covers all General field and Debug status labels in both languages", () => {
    const keys = [
      "fields.steamId",
      "fields.characterName",
      "fields.playTimeSeconds",
      "fields.debugFlag",
      "general.playRecords",
      "general.itemsUsed",
      "general.itemsHarvested",
      "general.hacksCompleted",
      "general.deaths",
      "general.unknownCounter1",
      "general.unknownCounter2",
      "general.enemiesKilled",
      "general.emilBulletsEquipped",
      "debug.disabled",
      "debug.menu",
      "debug.chapterSelect",
      "debug.fullyEnabled",
    ] as const;

    for (const key of keys) {
      expect(translate("zh-CN", key), key).not.toBe(key);
      expect(translate("en", key), key).not.toBe(key);
    }
  });
});
