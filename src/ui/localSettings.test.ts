import { describe, expect, it } from "vitest";
import {
  loadLocalSettings,
  saveLocalSettings,
  type LocalSettings,
} from "./localSettings";

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    _store: store,
  };
}

describe("localSettings", () => {
  it("defaults deterministically to Simplified Chinese and dark theme when nothing is stored", () => {
    expect(loadLocalSettings(memoryStorage())).toEqual({
      language: "zh-CN",
      theme: "dark",
    });
  });

  it("loads a legacy custom save root with the default language", () => {
    const storage = memoryStorage();
    const settings: LocalSettings = {
      customSaveRoot: "synthetic/saves/NieR_Automata",
    };
    saveLocalSettings(storage, settings);
    expect(loadLocalSettings(storage)).toEqual({
      language: "zh-CN",
      theme: "dark",
      customSaveRoot: settings.customSaveRoot,
    });
  });

  it("ignores corrupt JSON and returns default settings", () => {
    const storage = memoryStorage({
      "nier-save-editor.settings": "{not-json",
    });
    expect(loadLocalSettings(storage)).toEqual({
      language: "zh-CN",
      theme: "dark",
    });
  });

  it("clears customSaveRoot when saved as empty/whitespace", () => {
    const storage = memoryStorage();
    saveLocalSettings(storage, {
      customSaveRoot: "  synthetic/saves/NieR_Automata  ",
    });
    expect(loadLocalSettings(storage).customSaveRoot).toBe(
      "synthetic/saves/NieR_Automata",
    );
    saveLocalSettings(storage, { customSaveRoot: "   " });
    expect(loadLocalSettings(storage)).toEqual({
      language: "zh-CN",
      theme: "dark",
    });
  });

  it("persists language changes without losing a legacy custom root", () => {
    const root = "synthetic/saves/NieR_Automata";
    const storage = memoryStorage({
      "nier-save-editor.settings": JSON.stringify({ customSaveRoot: root }),
    });

    saveLocalSettings(storage, { language: "en" });

    expect(loadLocalSettings(storage)).toEqual({
      language: "en",
      theme: "dark",
      customSaveRoot: root,
    });
  });

  it("falls back to Simplified Chinese for an unsupported stored language", () => {
    const storage = memoryStorage({
      "nier-save-editor.settings": JSON.stringify({ language: "fr" }),
    });
    expect(loadLocalSettings(storage)).toEqual({
      language: "zh-CN",
      theme: "dark",
    });
  });

  it("persists an explicit light theme without losing language", () => {
    const storage = memoryStorage();
    saveLocalSettings(storage, { language: "en", theme: "light" });
    expect(loadLocalSettings(storage)).toEqual({
      language: "en",
      theme: "light",
    });
  });

  it("persists a custom backup root beside an existing save root", () => {
    const storage = memoryStorage();
    saveLocalSettings(storage, {
      customSaveRoot: "synthetic/saves/NieR_Automata",
      customBackupRoot: "  synthetic/backups/custom-root  ",
    });
    expect(loadLocalSettings(storage)).toEqual({
      language: "zh-CN",
      theme: "dark",
      customSaveRoot: "synthetic/saves/NieR_Automata",
      customBackupRoot: "synthetic/backups/custom-root",
    });
  });

  it("clears customBackupRoot when saved as empty/whitespace", () => {
    const storage = memoryStorage();
    saveLocalSettings(storage, {
      customBackupRoot: "synthetic/backups/custom-root",
    });
    expect(loadLocalSettings(storage).customBackupRoot).toBe(
      "synthetic/backups/custom-root",
    );
    saveLocalSettings(storage, { customBackupRoot: "   " });
    expect(loadLocalSettings(storage)).toEqual({
      language: "zh-CN",
      theme: "dark",
    });
  });

  it("persists language changes without losing a custom backup root", () => {
    const storage = memoryStorage({
      "nier-save-editor.settings": JSON.stringify({
        customBackupRoot: "synthetic/backups/custom-root",
      }),
    });

    saveLocalSettings(storage, { language: "en" });

    expect(loadLocalSettings(storage)).toEqual({
      language: "en",
      theme: "dark",
      customBackupRoot: "synthetic/backups/custom-root",
    });
  });
});
