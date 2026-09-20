import { describe, expect, it } from "vitest";

import { formatWindowTitle } from "./windowTitle";

describe("formatWindowTitle", () => {
  it("uses only the localized app title when no save is open", () => {
    expect(
      formatWindowTitle({
        appTitle: "尼尔：自动人形 存档编辑器",
        dirty: false,
        fileName: null,
        unsavedLabel: "有未保存修改",
      }),
    ).toBe("尼尔：自动人形 存档编辑器");
  });

  it("prefixes a clean open file name to the localized app title", () => {
    expect(
      formatWindowTitle({
        appTitle: "NieR:Automata Save Editor",
        dirty: false,
        fileName: "SlotData_1.dat",
        unsavedLabel: "Unsaved changes",
      }),
    ).toBe("SlotData_1.dat — NieR:Automata Save Editor");
  });

  it("makes an unsaved save unmistakable in either language", () => {
    expect(
      formatWindowTitle({
        appTitle: "尼尔：自动人形 存档编辑器",
        dirty: true,
        fileName: "SlotData_2.dat",
        unsavedLabel: "有未保存修改",
      }),
    ).toBe("● 有未保存修改 · SlotData_2.dat — 尼尔：自动人形 存档编辑器");

    expect(
      formatWindowTitle({
        appTitle: "NieR:Automata Save Editor",
        dirty: true,
        fileName: "SlotData_2.dat",
        unsavedLabel: "Unsaved changes",
      }),
    ).toBe("● Unsaved changes · SlotData_2.dat — NieR:Automata Save Editor");
  });

  it("can mark a pathless in-memory save dirty without inventing a file name", () => {
    expect(
      formatWindowTitle({
        appTitle: "NieR:Automata Save Editor",
        dirty: true,
        fileName: null,
        unsavedLabel: "Unsaved changes",
      }),
    ).toBe("● Unsaved changes — NieR:Automata Save Editor");
  });
});
