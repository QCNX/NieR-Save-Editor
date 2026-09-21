export const WINDOW_TITLE_BRAND = "NieR Save Editor";

export type WindowTitleParts = {
  dirty: boolean;
  fileName: string | null;
};

export type ApplyWindowTitleOptions = WindowTitleParts & {
  setDocumentTitle?: (title: string) => void;
  setNativeTitle?: (title: string) => void | Promise<void>;
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

export function applyWindowTitle({
  dirty,
  fileName,
  setDocumentTitle = (title) => {
    document.title = title;
  },
  setNativeTitle,
}: ApplyWindowTitleOptions): string {
  const title = formatWindowTitle({ dirty, fileName });
  setDocumentTitle(title);
  if (setNativeTitle) {
    try {
      const result = setNativeTitle(title);
      if (result != null && typeof (result as Promise<void>).then === "function") {
        void (result as Promise<void>).catch(() => {
          /* soft-fail outside Tauri / when setTitle rejects */
        });
      }
    } catch {
      /* soft-fail outside Tauri / when setTitle throws */
    }
  }
  return title;
}
