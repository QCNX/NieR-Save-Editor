// @ts-expect-error Vitest runs in Node; the browser build intentionally omits Node typings.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./editor.css", import.meta.url), "utf8");

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
