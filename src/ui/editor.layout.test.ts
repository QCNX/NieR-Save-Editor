// @ts-expect-error Vitest runs in Node; the browser build intentionally omits Node typings.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./editor.css", import.meta.url), "utf8");
const tauriConf = JSON.parse(
  readFileSync(new URL("../../src-tauri/tauri.conf.json", import.meta.url), "utf8"),
) as { app: { windows: Array<{ width: number; height: number; minWidth: number }> } };

const defaultWindow = tauriConf.app.windows[0];
const chipLoadoutCollapseMatch = css.match(
  /@media \(max-width: (\d+)px\)[\s\S]*?\.panel-split--chip-loadout\s*\{[^}]*grid-template-columns:\s*[^}]*1fr/s,
);
const chipLoadoutCollapsePx = chipLoadoutCollapseMatch
  ? Number(chipLoadoutCollapseMatch[1])
  : NaN;

describe("responsive editor layout", () => {
  it.each([
    [1280, 800],
    [760, 800],
    [430, 800],
  ])("keeps save content within a %ix%i viewport", () => {
    expect(css).toMatch(/\.save-manager\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*\.save-current-layout\s*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toMatch(/@media \(max-width: 430px\)[\s\S]*\.save-actions,[\s\S]*grid-template-columns:\s*1fr/s);
    expect(css).toMatch(/\.editor-tab-panel\s*\{[^}]*overflow-x:\s*hidden/s);
    expect(css).toMatch(/\.editor-tab-panel\s*\{[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.table-wrap\s*\{[^}]*overflow:\s*auto/s);
    expect(css).toContain("@media (max-height: 800px)");
  });

  it("defines focus-visible and both light and dark theme paths", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toMatch(/:root\s*\{[^}]*--ui-panel:/s);
  });
});

describe("chip loadout three-column layout CSS", () => {
  it("opens wide enough that the default window keeps three columns", () => {
    expect(defaultWindow.width).toBeGreaterThanOrEqual(1280);
    expect(defaultWindow.width).toBeLessThanOrEqual(1400);
    expect(defaultWindow.height).toBe(720);
    expect(chipLoadoutCollapsePx).toBeLessThan(defaultWindow.width);
    expect(chipLoadoutCollapsePx).toBeLessThanOrEqual(1100);
  });

  it("defines a three-track chip loadout grid for wide viewports", () => {
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s*\{[^}]*grid-template-columns:\s*[^;]*minmax[^;]*minmax[^;]*minmax/s,
    );
  });

  it("collapses the chip loadout grid only when clearly narrow, without page overflow", () => {
    expect(css).toMatch(
      /@media \(max-width: 1[01]\d{2}px\)[\s\S]*\.panel-split--chip-loadout\s*\{[^}]*grid-template-columns:\s*[^}]*1fr/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s*\{[^}]*min-width:\s*0/s,
    );
  });

  it("right-aligns stats values and sizes level/cost inputs in ch units", () => {
    expect(css).toMatch(/\.chip-stats-value\s*\{[^}]*text-align:\s*right/s);
    expect(css).toMatch(
      /\.panel-split--chip-loadout[\s\S]*?\.col-level input[\s\S]*?width:\s*[0-9.]+ch/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout[\s\S]*?\.col-weight input[\s\S]*?width:\s*[0-9.]+ch/s,
    );
  });
});
