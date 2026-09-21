import { describe, expect, it } from "vitest";

import { WINDOW_TITLE_BRAND, formatWindowTitle } from "./windowTitle";

describe("formatWindowTitle", () => {
  it("uses the fixed English brand when no save is open", () => {
    expect(WINDOW_TITLE_BRAND).toBe("NieR Save Editor");
    expect(
      formatWindowTitle({
        dirty: false,
        fileName: null,
      }),
    ).toBe("NieR Save Editor");
  });

  it("prefixes a clean open file name to the brand", () => {
    expect(
      formatWindowTitle({
        dirty: false,
        fileName: "SlotData_0.dat",
      }),
    ).toBe("SlotData_0.dat — NieR Save Editor");
  });

  it("marks dirty with a trailing asterisk only", () => {
    expect(
      formatWindowTitle({
        dirty: true,
        fileName: "SlotData_0.dat",
      }),
    ).toBe("SlotData_0.dat — NieR Save Editor*");

    expect(
      formatWindowTitle({
        dirty: true,
        fileName: null,
      }),
    ).toBe("NieR Save Editor*");
  });

  it("never puts localized unsaved prose or a bullet into the OS title", () => {
    const dirty = formatWindowTitle({
      dirty: true,
      fileName: "SlotData_2.dat",
    });
    expect(dirty).not.toContain("●");
    expect(dirty).not.toContain("Unsaved");
    expect(dirty).not.toContain("未保存");
  });
});
