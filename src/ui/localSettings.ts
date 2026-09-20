/** Keys and shape for optional UI settings stored in localStorage. */

import { DEFAULT_LANGUAGE, type Language } from "../i18n/core";

export const LOCAL_SETTINGS_KEY = "nier-save-editor.settings";

export type UiTheme = "light" | "dark";

export type LocalSettings = {
  /** Language selected for shell and entity labels. */
  language?: Language;
  /** Extra SlotData search root (user-entered; not hard-coded private paths). */
  customSaveRoot?: string;
  /** Shell color theme. */
  theme?: UiTheme;
};

export type ResolvedLocalSettings = {
  language: Language;
  customSaveRoot?: string;
  theme: UiTheme;
};

export type SettingsStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export const DEFAULT_THEME: UiTheme = "dark";

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

function normalizeTheme(value: unknown): UiTheme {
  return value === "dark" || value === "light" ? value : DEFAULT_THEME;
}

export function loadLocalSettings(
  storage: SettingsStorage = globalThis.localStorage,
): ResolvedLocalSettings {
  try {
    const raw = storage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) {
      return { language: DEFAULT_LANGUAGE, theme: DEFAULT_THEME };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { language: DEFAULT_LANGUAGE, theme: DEFAULT_THEME };
    }
    const root = normalizeRoot(
      (parsed as { customSaveRoot?: unknown }).customSaveRoot,
    );
    const language = normalizeLanguage(
      (parsed as { language?: unknown }).language,
    );
    const theme = normalizeTheme((parsed as { theme?: unknown }).theme);
    return root
      ? { language, customSaveRoot: root, theme }
      : { language, theme };
  } catch {
    return { language: DEFAULT_LANGUAGE, theme: DEFAULT_THEME };
  }
}

export function saveLocalSettings(
  storage: SettingsStorage,
  settings: LocalSettings,
): void {
  const current = loadLocalSettings(storage);
  const language = normalizeLanguage(settings.language ?? current.language);
  const theme = normalizeTheme(settings.theme ?? current.theme);
  const root = Object.prototype.hasOwnProperty.call(settings, "customSaveRoot")
    ? normalizeRoot(settings.customSaveRoot)
    : current.customSaveRoot;
  const next: ResolvedLocalSettings = root
    ? { language, customSaveRoot: root, theme }
    : { language, theme };
  storage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
}
