/** Keys and shape for optional UI settings stored in localStorage. */

export const LOCAL_SETTINGS_KEY = "nier-save-editor.settings";

export type LocalSettings = {
  /** Extra SlotData search root (user-entered; not hard-coded private paths). */
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

export function loadLocalSettings(
  storage: SettingsStorage = globalThis.localStorage,
): LocalSettings {
  try {
    const raw = storage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const root = normalizeRoot(
      (parsed as { customSaveRoot?: unknown }).customSaveRoot,
    );
    return root ? { customSaveRoot: root } : {};
  } catch {
    return {};
  }
}

export function saveLocalSettings(
  storage: SettingsStorage,
  settings: LocalSettings,
): void {
  const root = normalizeRoot(settings.customSaveRoot);
  const next: LocalSettings = root ? { customSaveRoot: root } : {};
  storage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(next));
}
