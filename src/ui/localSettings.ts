/** Keys and shape for optional UI settings stored in localStorage. */

import { DEFAULT_LANGUAGE, type Language } from "../i18n/core";

export const LOCAL_SETTINGS_KEY = "nier-save-editor.settings";

export type LocalSettings = {
  /** Language selected for shell and entity labels. */
  language?: Language;
  /** Extra SlotData search root (user-entered; not hard-coded private paths). */
  customSaveRoot?: string;
};

export type ResolvedLocalSettings = {
  language: Language;
  customSaveRoot?: string;
};

export type SettingsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function normalizeRoot(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeLanguage(value: unknown): Language {
  return value === "en" || value === "zh-CN" ? value : DEFAULT_LANGUAGE;
}

export function loadLocalSettings(
  storage: SettingsStorage = globalThis.localStorage,
): ResolvedLocalSettings {
  try {
    const raw = storage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) {
      return { language: DEFAULT_LANGUAGE };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { language: DEFAULT_LANGUAGE };
    }
    const root = normalizeRoot(
      (parsed as { customSaveRoot?: unknown }).customSaveRoot,
    );
    const language = normalizeLanguage(
      (parsed as { language?: unknown }).language,
    );
    return root
      ? { language, customSaveRoot: root }
      : { language };
  } catch {
    return { language: DEFAULT_LANGUAGE };
  }
}

export function saveLocalSettings(
  storage: SettingsStorage,
  settings: LocalSettings,
): void {
  const current = loadLocalSettings(storage);
  const language = normalizeLanguage(settings.language ?? current.language);
  const root = Object.prototype.hasOwnProperty.call(settings, "customSaveRoot")
    ? normalizeRoot(settings.customSaveRoot)
    : current.customSaveRoot;
  const next: ResolvedLocalSettings = root
    ? { language, customSaveRoot: root }
    : { language };
  storage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
}
