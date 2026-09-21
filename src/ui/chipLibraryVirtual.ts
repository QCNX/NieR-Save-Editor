/** Row-major pairing for Chip Library dual-column density. */
export function chipLibraryRowPairs<T>(
  chips: readonly T[],
): Array<[T, T | undefined]> {
  const pairs: Array<[T, T | undefined]> = [];
  for (let i = 0; i < chips.length; i += 2) {
    pairs.push([chips[i]!, chips[i + 1]]);
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
export const CHIP_LIBRARY_DEFAULT_ROW_HEIGHT = 36;
/** Sensible viewport height when unmeasured (SSR / first paint). */
export const CHIP_LIBRARY_DEFAULT_VIEWPORT_HEIGHT = 480;
export const CHIP_LIBRARY_OVERSCAN = 4;

/** Initial window used before the viewport is measured — must not be blank. */
export function initialVisibleRowWindow(rowCount: number): VisibleRowWindow {
  return visibleRowWindow(
    0,
    CHIP_LIBRARY_DEFAULT_ROW_HEIGHT,
    CHIP_LIBRARY_DEFAULT_VIEWPORT_HEIGHT,
    CHIP_LIBRARY_OVERSCAN,
    rowCount,
  );
}
