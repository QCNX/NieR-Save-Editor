export const WINDOW_TITLE_BRAND = "NieR Save Editor";

export type WindowTitleParts = {
  dirty: boolean;
  fileName: string | null;
};

export function formatWindowTitle({
  dirty,
  fileName,
}: WindowTitleParts): string {
  const cleanTitle = fileName
    ? `${fileName} — ${WINDOW_TITLE_BRAND}`
    : WINDOW_TITLE_BRAND;
  return dirty ? `${cleanTitle}*` : cleanTitle;
}
