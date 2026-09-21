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

describe("save summary density", () => {
  it("packs save-slot meta as same-row label/value pairs", () => {
    expect(css).toMatch(
      /\.save-summary-details\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
    );
    expect(css).toMatch(
      /\.save-summary-details\s*>\s*div\s*\{[^}]*display:\s*flex/s,
    );
    expect(css).toMatch(
      /\.save-summary-details\s*dd\s*\{[^}]*margin:\s*0/s,
    );
  });
});

describe("content-width collection tables", () => {
  it("keeps collection-table scrollbars beside their columns", () => {
    expect(css).toMatch(
      /\.table-wrap--content-width\s*\{[^}]*align-self:\s*flex-start[^}]*width:\s*max-content[^}]*max-width:\s*100%/s,
    );
  });
});

describe("chip loadout three-column layout CSS", () => {
  it("opens wide enough that the default window keeps three columns", () => {
    // Default sized for the wider locale (English chrome); collapse stays ~900.
    expect(defaultWindow.width).toBeGreaterThan(900);
    expect(defaultWindow.width).toBeGreaterThanOrEqual(960);
    expect(defaultWindow.width).toBeLessThanOrEqual(1000);
    expect(defaultWindow.height).toBe(720);
    expect(chipLoadoutCollapsePx).toBeLessThan(defaultWindow.width);
    // Prefer ~900 (align with other splits); must stay clearly below default.
    expect(chipLoadoutCollapsePx).toBeLessThanOrEqual(900);
  });

  it("sizes all three chip-loadout columns to content (no fr void-feeding)", () => {
    const gridDecl = css.match(
      /\.panel-split--chip-loadout\s*\{[^}]*grid-template-columns:\s*([^;]+);/s,
    );
    expect(gridDecl?.[1]).toBeTruthy();
    const tracks = gridDecl![1].trim();
    // Three content-driven tracks — no 1.2fr / 1fr eating leftover chrome.
    expect(tracks.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(3);
    expect(tracks).not.toMatch(/\d+(?:\.\d+)?fr/);
    expect(tracks).toMatch(/max-content/);
  });

  it("lets dual-class library filters win stretch after shared list-toolbar", () => {
    const sharedIdx = css.search(/\.slot-list-toolbar,\s*\.list-toolbar\s*\{/);
    const dualIdx = css.search(/\.list-toolbar\.chip-loadout-library-filters\s*\{/);
    expect(sharedIdx).toBeGreaterThanOrEqual(0);
    expect(dualIdx).toBeGreaterThan(sharedIdx);

    const dualBlock = css
      .slice(dualIdx)
      .match(/\.list-toolbar\.chip-loadout-library-filters\s*\{[^}]+\}/)?.[0];
    expect(dualBlock).toMatch(/flex-direction:\s*column/);
    expect(dualBlock).toMatch(/flex-wrap:\s*nowrap/);
    expect(dualBlock).toMatch(/align-items:\s*stretch/);
  });

  it("clips horizontal overflow in chip-loadout and collection containers", () => {
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.table-wrap\s*\{[^}]*overflow-x:\s*hidden/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.table-wrap\s*\{[^}]*overflow-y:\s*auto/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__side\s*\{[^}]*overflow-x:\s*hidden/s,
    );
    // Collection tabs: clip on the fill panel (workspace chrome removed).
    expect(css).toMatch(
      /\.editor-tab-panel\s*>\s*\.panel--fill\s*\{[^}]*overflow-x:\s*hidden/s,
    );
    expect(css).not.toMatch(/\.collection-workspace\s*\{/);
  });

  it("flattens collection chrome so table-wrap is the primary frame", () => {
    // Tab soft surface replaces nested panel + workspace borders.
    expect(css).toMatch(
      /\.editor-tab-panel\s*>\s*\.panel--fill\s*\{[^}]*border:\s*none/s,
    );
    expect(css).toMatch(
      /\.editor-tab-panel\s*>\s*\.panel--fill\s*\{[^}]*padding:\s*0/s,
    );
    expect(css).toMatch(
      /\.panel-split--collection\s*\{[^}]*grid-template-columns:\s*max-content\s+max-content/s,
    );
    expect(css).toMatch(
      /\.panel-split__side--ungrouped\s*\{[^}]*border:\s*none/s,
    );
    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.panel-split--collection\s*\{[^}]*grid-template-columns:\s*1fr/s,
    );
  });

  it("reserves a stable scrollbar gutter so Equip/Unequip stay clear", () => {
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.table-wrap\s*\{[^}]*scrollbar-gutter:\s*stable/s,
    );
  });

  it("stacks loadout library filters and scopes search to the column", () => {
    expect(css).toMatch(
      /\.list-toolbar\.chip-loadout-library-filters\s*\{[^}]*flex-direction:\s*column/s,
    );
    expect(css).toMatch(
      /\.list-toolbar\.chip-loadout-library-filters\s+input\[type="search"\][\s\S]*?\{[^}]*width:\s*100%/s,
    );
    // Global list-toolbar search may stay fixed-width elsewhere.
    expect(css).toMatch(
      /\.list-toolbar input\[type="search"\][\s\S]*?width:\s*14rem/s,
    );
  });

  it("aligns chip stats names left and values right via a shared two-column grid", () => {
    const listBlock = css.match(/\.chip-stats-list\s*\{[^}]+\}/s)?.[0];
    expect(listBlock).toBeTruthy();
    expect(listBlock).toMatch(/display:\s*(?:inline-)?grid/);
    expect(listBlock).not.toMatch(/1fr/);
    const listTracks = listBlock!.match(/grid-template-columns:\s*([^;]+);/)?.[1]?.trim();
    expect(listTracks).toBeTruthy();
    expect(listTracks).toMatch(/auto|max-content/);
    expect(listTracks).not.toMatch(/1fr/);

    expect(css).toMatch(/\.chip-stats-row\s*\{[^}]*display:\s*contents/s);
    expect(css).toMatch(/\.chip-stats-name\s*\{[^}]*justify-self:\s*start/s);
    expect(css).toMatch(
      /\.chip-stats-value\s*\{[^}]*justify-self:\s*end[^}]*text-align:\s*right|\.chip-stats-value\s*\{[^}]*text-align:\s*right[^}]*justify-self:\s*end/s,
    );
    expect(css).toMatch(
      /\.chip-loadout-stats\s*\{[^}]*width:\s*max-content[^}]*max-width:\s*100%|\.chip-loadout-stats\s*\{[^}]*max-width:\s*100%[^}]*width:\s*max-content/s,
    );
    expect(css).toMatch(
      /\.chip-stats-list\s*\{[^}]*width:\s*max-content[^}]*max-width:\s*100%|\.chip-stats-list\s*\{[^}]*max-width:\s*100%[^}]*width:\s*max-content/s,
    );
  });
  it("keeps equipped and library tables content-sized so name↔level void stays gone", () => {
    expect(css).toMatch(/\.slot-table\s*\{[^}]*width:\s*max-content/s);
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__main\s*\{[^}]*width:\s*max-content/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__main\s*\{[^}]*max-width:\s*100%/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__main\s*>\s*\.table-wrap\s*\{[^}]*width:\s*max-content/s,
    );
    // Mirror content-sizing on the library side so the left track can shrink.
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__side\s*\{[^}]*width:\s*max-content/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__side\s*\{[^}]*max-width:\s*100%/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout\s+\.panel-split__side\s*>\s*\.table-wrap\s*\{[^}]*width:\s*max-content/s,
    );
  });

  it("collapses the chip loadout grid only when clearly narrow, without page overflow", () => {
    expect(css).toMatch(
      /@media \(max-width: 900px\)[\s\S]*\.panel-split--chip-loadout\s*\{[^}]*grid-template-columns:\s*[^}]*1fr/s,
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
    // Tight horizontal padding so ch widths fit digits + spinner under border-box.
    expect(css).toMatch(
      /\.panel-split--chip-loadout[\s\S]*?\.col-level input[\s\S]*?padding:\s*0\s+0\.(?:0\d|[1-3]\d?)em/s,
    );
    expect(css).toMatch(
      /\.panel-split--chip-loadout[\s\S]*?\.col-weight input[\s\S]*?padding:\s*0\s+0\.(?:0\d|[1-3]\d?)em/s,
    );
  });
});

describe("editor status bar chrome height", () => {
  it("keeps the footer compact with reduced vertical padding", () => {
    expect(css).toMatch(
      /\.editor-status-bar\s*\{[^}]*padding:\s*[0-4]px\s+\d+px/s,
    );
    expect(css).toMatch(
      /\.editor-status-bar\s*\{[^}]*gap:\s*(?:[4-9]|1[0-2])px/s,
    );
    // Theme toggle inside the bar should not re-inflate height.
    expect(css).toMatch(
      /\.theme-toggle\s*\{[^}]*padding:\s*[0-4]px\s+\d+px/s,
    );
  });
});
