export type WindowTitleParts = {
  appTitle: string;
  dirty: boolean;
  fileName: string | null;
  unsavedLabel: string;
};

export function formatWindowTitle({
  appTitle,
  dirty,
  fileName,
  unsavedLabel,
}: WindowTitleParts): string {
  const cleanTitle = fileName ? `${fileName} — ${appTitle}` : appTitle;
  if (!dirty) {
    return cleanTitle;
  }
  return fileName
    ? `● ${unsavedLabel} · ${cleanTitle}`
    : `● ${unsavedLabel} — ${appTitle}`;
}
