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
  it("returns empty settings when nothing is stored", () => {
    expect(loadLocalSettings(memoryStorage())).toEqual({});
  });

  it("round-trips a custom save root for rediscovery", () => {
    const storage = memoryStorage();
    const settings: LocalSettings = {
      customSaveRoot: "%USERPROFILE%\\Documents\\My Games\\NieR_Automata",
    };
    saveLocalSettings(storage, settings);
    expect(loadLocalSettings(storage)).toEqual(settings);
  });

  it("ignores corrupt JSON and returns empty settings", () => {
    const storage = memoryStorage({
      "nier-save-editor.settings": "{not-json",
    });
    expect(loadLocalSettings(storage)).toEqual({});
  });

  it("clears customSaveRoot when saved as empty/whitespace", () => {
    const storage = memoryStorage();
    saveLocalSettings(storage, {
      customSaveRoot: "  %USERPROFILE%\\Documents\\My Games\\NieR_Automata  ",
    });
    expect(loadLocalSettings(storage).customSaveRoot).toBe(
      "%USERPROFILE%\\Documents\\My Games\\NieR_Automata",
    );
    saveLocalSettings(storage, { customSaveRoot: "   " });
    expect(loadLocalSettings(storage)).toEqual({});
  });
});
