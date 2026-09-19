import type { SlotData } from "../save";

/** PC SlotData only for this MVP. */
export type SaveFormat = "pc";

export type EditorAppState = {
  currentPath: string | null;
  slotData: SlotData | null;
  dirty: boolean;
  format: SaveFormat;
};

export type ConfirmAction =
  | "reload"
  | "overwrite"
  | "switch-slot"
  | "open-file"
  | "close";

export function createInitialEditorState(): EditorAppState {
  return {
    currentPath: null,
    slotData: null,
    dirty: false,
    format: "pc",
  };
}

/**
 * Confirm policy for the slot workflow.
 * Discarding dirty memory needs a prompt; overwrite always prompts
 * before writing the live game save (backup still runs after confirm).
 */
export function needsConfirm(action: ConfirmAction, dirty: boolean): boolean {
  if (action === "overwrite") {
    return true;
  }
  return dirty;
}

export function applyLoadedSlot(
  _state: EditorAppState,
  path: string | null,
  slot: SlotData,
): EditorAppState {
  return {
    currentPath: path,
    slotData: slot,
    dirty: false,
    format: "pc",
  };
}

export function applyEditedSlot(
  state: EditorAppState,
  slot: SlotData,
): EditorAppState {
  return { ...state, slotData: slot, dirty: true, format: "pc" };
}

export function applyOverwriteSuccess(state: EditorAppState): EditorAppState {
  return { ...state, dirty: false, format: "pc" };
}

export function applySaveAsSuccess(
  state: EditorAppState,
  path: string,
): EditorAppState {
  return { ...state, currentPath: path, dirty: false, format: "pc" };
}

export function applyClosed(_state: EditorAppState): EditorAppState {
  return createInitialEditorState();
}
