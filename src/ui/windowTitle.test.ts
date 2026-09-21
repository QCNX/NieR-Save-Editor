import { describe, expect, it, vi } from "vitest";

import {
  WINDOW_TITLE_BRAND,
  applyWindowTitle,
  formatWindowTitle,
} from "./windowTitle";

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

describe("applyWindowTitle", () => {
  it("formats, assigns document.title, and returns the same string", () => {
    const setDocumentTitle = vi.fn();
    const title = applyWindowTitle({
      dirty: true,
      fileName: "SlotData_0.dat",
      setDocumentTitle,
    });

    expect(title).toBe("SlotData_0.dat — NieR Save Editor*");
    expect(setDocumentTitle).toHaveBeenCalledTimes(1);
    expect(setDocumentTitle).toHaveBeenCalledWith(title);
  });

  it("forwards the formatted title to an optional native setTitle host", () => {
    const setDocumentTitle = vi.fn();
    const setNativeTitle = vi.fn();

    const title = applyWindowTitle({
      dirty: false,
      fileName: "SlotData_1.dat",
      setDocumentTitle,
      setNativeTitle,
    });

    expect(title).toBe("SlotData_1.dat — NieR Save Editor");
    expect(setNativeTitle).toHaveBeenCalledTimes(1);
    expect(setNativeTitle).toHaveBeenCalledWith(title);
  });

  it("soft-fails when the native setTitle host throws", () => {
    const setDocumentTitle = vi.fn();
    const setNativeTitle = vi.fn(() => {
      throw new Error("no native window");
    });

    expect(() =>
      applyWindowTitle({
        dirty: false,
        fileName: null,
        setDocumentTitle,
        setNativeTitle,
      }),
    ).not.toThrow();
    expect(setDocumentTitle).toHaveBeenCalledWith("NieR Save Editor");
  });

  it("soft-fails when the native setTitle host rejects", async () => {
    const setDocumentTitle = vi.fn();
    const setNativeTitle = vi.fn(() =>
      Promise.reject(new Error("setTitle failed")),
    );

    expect(() =>
      applyWindowTitle({
        dirty: true,
        fileName: null,
        setDocumentTitle,
        setNativeTitle,
      }),
    ).not.toThrow();
    expect(setDocumentTitle).toHaveBeenCalledWith("NieR Save Editor*");

    await Promise.resolve();
  });
});
