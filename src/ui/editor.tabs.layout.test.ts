// @ts-expect-error Vitest runs in Node; the browser build intentionally omits Node typings.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./editor.css", import.meta.url), "utf8");

describe("shell tab row chrome layout", () => {
  it("keeps shell tab labels readable beside dirty meta at Deck-ish widths", () => {
    // Long en labels + dirty chip must not clip; stack meta by ~1280 and never hide tab text.
    expect(css).toMatch(
      /@media \(max-width: (1[2-9]\d{2}|[2-9]\d{3})px\)[\s\S]*?\.editor-tabs-row\s*\{[^}]*flex-wrap:\s*wrap/s,
    );
    expect(css).toMatch(
      /@media \(max-width: (1[2-9]\d{2}|[2-9]\d{3})px\)[\s\S]*?\.editor-tabs-meta\s*\{[^}]*width:\s*100%/s,
    );
    expect(css).toMatch(/\.editor-tabs\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(css).not.toMatch(/\.editor-tabs\s*\{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/\.editor-tabs button\s*\{[^}]*white-space:\s*nowrap/s);
  });
});
