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
import { messagesEn } from "./messages.en";
import { messagesZhCN } from "./messages.zh-CN";

function TranslationProbe() {
  const { language, t } = useI18n();
  return createElement("span", null, `${language}:${t("tabs.general")}`);
}

describe("i18n public API", () => {
  it("keeps catalog keys and interpolation placeholders in exact parity", () => {
    expect(Object.keys(messagesEn).sort()).toEqual(
      Object.keys(messagesZhCN).sort(),
    );
    const placeholders = (message: string) =>
      Array.from(message.matchAll(/\{([^}]+)\}/g), (match) => match[1]).sort();
    for (const key of Object.keys(messagesZhCN) as (keyof typeof messagesZhCN)[]) {
      expect(placeholders(messagesEn[key]), key).toEqual(
        placeholders(messagesZhCN[key]),
      );
    }
  });
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

  it("labels chip cost, capacity, and Stats Panel keys for both catalogs", () => {
    expect(translate("zh-CN", "tabs.chipLibrary")).toBe("芯片库");
    expect(translate("zh-CN", "tabs.chipLoadout")).toBe("芯片配装");
    expect(translate("en", "tabs.chipLibrary")).toBe("Chip Library");
    expect(translate("en", "tabs.chipLoadout")).toBe("Chip Loadout");
    expect(translate("zh-CN", "fields.weight")).toBe("占用");
    expect(translate("en", "fields.weight")).toBe("Cost");
    expect(translate("zh-CN", "chips.storageCapacity")).toBe("储存容量");
    expect(translate("zh-CN", "chips.purchasedCapacity")).toBe("已购容量");
    expect(translate("en", "chips.storageCapacity")).toBe("Storage");
    expect(translate("en", "chips.purchasedCapacity")).toBe("Purchased");
    expect(translate("zh-CN", "chips.statsPanel")).toBe("数值面板");
    expect(translate("en", "chips.statsPanel")).toBe("Stats Panel");
    expect(translate("zh-CN", "chips.category.all")).toBe("全部");
    expect(translate("en", "chips.category.attack")).toBe("Attack");
    expect(translate("zh-CN", "chips.category.hacking")).toBe("黑客");
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
      "saveManager.viewBackups",
      "saveManager.createBackup",
      "saveManager.backupExcludesUnsaved",
      "saveManager.historyLoading",
      "saveManager.historyError",
      "saveManager.sourceFile",
      "saveManager.size",
      "saveManager.bytes",
      "saveManager.checksum",
      "saveManager.integrity",
      "saveManager.integrityUnavailable",
      "saveManager.integrity.verified",
      "saveManager.integrity.mismatch",
      "saveManager.integrity.unrecorded",
      "saveManager.metadataStatus",
      "saveManager.metadata.ok",
      "saveManager.metadata.missing",
      "saveManager.metadata.invalid",
      "saveManager.metadata.legacy",
      "saveManager.metadata.unreadable",
      "saveManager.backupReason.manual",
      "saveManager.backupReason.before-save",
      "saveManager.backupReason.before-import",
      "saveManager.backupReason.before-restore",
      "saveManager.backupReason.legacy",
      "saveManager.phase.validate-source",
      "saveManager.phase.check-target",
      "saveManager.phase.backup-target",
      "saveManager.phase.stage-write",
      "saveManager.phase.replace-target",
      "saveManager.phase.verify-target",
      "saveManager.phase.list-backups",
      "saveManager.phase.read-backup",
      "replacement.import",
      "replacement.restore",
      "replacement.heading.restore",
      "replacement.heading.import",
      "replacement.source",
      "replacement.target",
      "replacement.backupFirst",
      "replacement.discardDirty",
      "replacement.cancel",
      "replacement.confirm.restore",
      "replacement.confirm.import",
      "replacement.error.invalidSourceOrTarget",
      "replacement.error.invalidSource",
      "replacement.error.sourceChanged",
      "replacement.error.invalidTarget",
      "replacement.error.verificationMismatch",
      "replacement.error.prepareFailed",
      "replacement.error.writeFailed",
      "status.manualBackupSuccess",
      "status.restoreSuccess",
      "status.importSuccess",
      "errors.manualBackupUnavailable",
      "errors.manualBackupFailed",
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
