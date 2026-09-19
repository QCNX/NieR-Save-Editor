import { describe, expect, it } from "vitest";
import {
  applyClosed,
  applyEditedSlot,
  applyLoadedSlot,
  applyOverwriteSuccess,
  applySaveAsSuccess,
  createInitialEditorState,
  needsConfirm,
  type EditorAppState,
} from "./workflow";
import type { SlotData } from "../save";

/** Minimal stand-in — workflow helpers only pass SlotData through. */
function fakeSlot(tag: string): SlotData {
  return { __tag: tag } as unknown as SlotData;
}

describe("createInitialEditorState", () => {
  it("starts with no path, no slot, clean, and PC format", () => {
    expect(createInitialEditorState()).toEqual({
      currentPath: null,
      slotData: null,
      dirty: false,
      format: "pc",
    });
  });
});

describe("needsConfirm", () => {
  it("asks before reload, switch, open, or close when dirty", () => {
    expect(needsConfirm("reload", true)).toBe(true);
    expect(needsConfirm("switch-slot", true)).toBe(true);
    expect(needsConfirm("open-file", true)).toBe(true);
    expect(needsConfirm("close", true)).toBe(true);
  });

  it("skips discard confirms when clean", () => {
    expect(needsConfirm("reload", false)).toBe(false);
    expect(needsConfirm("switch-slot", false)).toBe(false);
    expect(needsConfirm("open-file", false)).toBe(false);
    expect(needsConfirm("close", false)).toBe(false);
  });

  it("always confirms overwrite before writing the live save", () => {
    expect(needsConfirm("overwrite", false)).toBe(true);
    expect(needsConfirm("overwrite", true)).toBe(true);
  });
});

describe("editor state transitions", () => {
  it("loads a slot path and clears dirty", () => {
    const dirty: EditorAppState = {
      currentPath: "%USERPROFILE%\\Documents\\My Games\\NieR_Automata\\SlotData_0.dat",
      slotData: fakeSlot("old"),
      dirty: true,
      format: "pc",
    };
    const path =
      "%USERPROFILE%\\Documents\\My Games\\NieR_Automata\\SlotData_1.dat";
    expect(applyLoadedSlot(dirty, path, fakeSlot("new"))).toEqual({
      currentPath: path,
      slotData: fakeSlot("new"),
      dirty: false,
      format: "pc",
    });
  });

  it("marks dirty on in-memory edits without changing path", () => {
    const base = applyLoadedSlot(
      createInitialEditorState(),
      "~/saves/SlotData_0.dat",
      fakeSlot("a"),
    );
    expect(applyEditedSlot(base, fakeSlot("b"))).toEqual({
      currentPath: "~/saves/SlotData_0.dat",
      slotData: fakeSlot("b"),
      dirty: true,
      format: "pc",
    });
  });

  it("clears dirty after successful overwrite", () => {
    const dirty = applyEditedSlot(
      applyLoadedSlot(
        createInitialEditorState(),
        "~/saves/SlotData_0.dat",
        fakeSlot("a"),
      ),
      fakeSlot("edited"),
    );
    expect(applyOverwriteSuccess(dirty)).toEqual({
      currentPath: "~/saves/SlotData_0.dat",
      slotData: fakeSlot("edited"),
      dirty: false,
      format: "pc",
    });
  });

  it("updates path and clears dirty after Save As", () => {
    const dirty = applyEditedSlot(
      applyLoadedSlot(
        createInitialEditorState(),
        "~/saves/SlotData_0.dat",
        fakeSlot("a"),
      ),
      fakeSlot("edited"),
    );
    expect(applySaveAsSuccess(dirty, "~/exports/SlotData_copy.dat")).toEqual({
      currentPath: "~/exports/SlotData_copy.dat",
      slotData: fakeSlot("edited"),
      dirty: false,
      format: "pc",
    });
  });

  it("closes to the initial empty state", () => {
    const open = applyLoadedSlot(
      createInitialEditorState(),
      "~/saves/SlotData_0.dat",
      fakeSlot("a"),
    );
    expect(applyClosed(open)).toEqual(createInitialEditorState());
  });
});
