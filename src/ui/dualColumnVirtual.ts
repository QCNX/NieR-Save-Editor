/** Row-major pairing for dual-column density lists. */
export function dualColumnRowPairs<T>(
  items: readonly T[],
): Array<[T, T | undefined]> {
  const pairs: Array<[T, T | undefined]> = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push([items[i]!, items[i + 1]]);
  }
  return pairs;
}

export type VisibleRowWindow = {
  /** Inclusive start row index. */
  start: number;
  /** Exclusive end row index. */
  end: number;
};

/**
 * Compute the virtual row window from scroll geometry.
 * `end` is exclusive; empty/invalid geometry yields `{ start: 0, end: 0 }`.
 */
export function visibleRowWindow(
  scrollTop: number,
  rowHeight: number,
  viewportHeight: number,
  overscan: number,
  rowCount: number,
): VisibleRowWindow {
  if (rowCount <= 0 || rowHeight <= 0) {
    return { start: 0, end: 0 };
  }
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const last = Math.ceil(
    (Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / rowHeight,
  );
  const start = Math.max(0, first - Math.max(0, overscan));
  const end = Math.min(rowCount, last + Math.max(0, overscan));
  return { start, end };
}

/** Fallback row height before ResizeObserver measures a real row. */
export const DUAL_COLUMN_DEFAULT_ROW_HEIGHT = 36;
/** Sensible viewport height when unmeasured (SSR / first paint). */
export const DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT = 480;
export const DUAL_COLUMN_OVERSCAN = 4;

/** Initial window used before the viewport is measured — must not be blank. */
export function initialVisibleRowWindow(rowCount: number): VisibleRowWindow {
  return visibleRowWindow(
    0,
    DUAL_COLUMN_DEFAULT_ROW_HEIGHT,
    DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT,
    DUAL_COLUMN_OVERSCAN,
    rowCount,
  );
}

/** @deprecated Prefer dualColumnRowPairs — kept for chip-library call sites/tests. */
export const chipLibraryRowPairs = dualColumnRowPairs;
/** @deprecated Prefer DUAL_COLUMN_DEFAULT_ROW_HEIGHT */
export const CHIP_LIBRARY_DEFAULT_ROW_HEIGHT = DUAL_COLUMN_DEFAULT_ROW_HEIGHT;
/** @deprecated Prefer DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT */
export const CHIP_LIBRARY_DEFAULT_VIEWPORT_HEIGHT =
  DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT;
/** @deprecated Prefer DUAL_COLUMN_OVERSCAN */
export const CHIP_LIBRARY_OVERSCAN = DUAL_COLUMN_OVERSCAN;
