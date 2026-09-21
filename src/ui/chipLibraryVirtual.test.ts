import { describe, expect, it } from "vitest";

import {
  CHIP_LIBRARY_DEFAULT_ROW_HEIGHT,
  CHIP_LIBRARY_DEFAULT_VIEWPORT_HEIGHT,
  CHIP_LIBRARY_OVERSCAN,
  chipLibraryRowPairs,
  initialVisibleRowWindow,
  visibleRowWindow,
} from "./chipLibraryVirtual";

describe("chipLibraryRowPairs", () => {
  it("pairs a filtered list row-major: left then right, then next row", () => {
    expect(chipLibraryRowPairs([0, 1, 2, 3, 4])).toEqual([
      [0, 1],
      [2, 3],
      [4, undefined],
    ]);
  });

  it("returns an empty list for an empty input", () => {
    expect(chipLibraryRowPairs([])).toEqual([]);
  });
});

describe("visibleRowWindow", () => {
  it("returns a viewport-sized window plus overscan", () => {
    // scrollTop 0, 36px rows, 180px viewport → 5 visible rows; overscan 2 → [0, 7)
    expect(visibleRowWindow(0, 36, 180, 2, 100)).toEqual({ start: 0, end: 7 });
  });

  it("shifts the window with scroll and clamps to rowCount", () => {
    // first visible ≈ floor(360/36)=10; last ≈ ceil((360+180)/36)=15; overscan 2 → [8, 17)
    expect(visibleRowWindow(360, 36, 180, 2, 20)).toEqual({
      start: 8,
      end: 17,
    });
    expect(visibleRowWindow(360, 36, 180, 2, 12)).toEqual({
      start: 8,
      end: 12,
    });
  });

  it("handles empty or invalid geometry without throwing", () => {
    expect(visibleRowWindow(0, 36, 180, 2, 0)).toEqual({ start: 0, end: 0 });
    expect(visibleRowWindow(0, 0, 180, 2, 10)).toEqual({ start: 0, end: 0 });
  });
});

describe("initialVisibleRowWindow", () => {
  it("uses the default unmeasured viewport so SSR is not blank", () => {
    const window = initialVisibleRowWindow(150);
    expect(window.start).toBe(0);
    expect(window.end).toBeGreaterThan(0);
    expect(window.end).toBe(
      visibleRowWindow(
        0,
        CHIP_LIBRARY_DEFAULT_ROW_HEIGHT,
        CHIP_LIBRARY_DEFAULT_VIEWPORT_HEIGHT,
        CHIP_LIBRARY_OVERSCAN,
        150,
      ).end,
    );
    // Enough rows that category samples / first occupied chips stay visible.
    expect(window.end).toBeGreaterThanOrEqual(10);
  });
});
