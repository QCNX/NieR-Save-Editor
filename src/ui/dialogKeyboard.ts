export type DialogKeyInput = {
  key: string;
  shiftKey: boolean;
  activeIndex: number;
  count: number;
};

export type DialogKeyAction =
  | { type: "none" }
  | { type: "cancel" }
  | { type: "focus"; index: number };

export function dialogKeyAction(input: DialogKeyInput): DialogKeyAction {
  if (input.key === "Escape") return { type: "cancel" };
  if (input.key !== "Tab" || input.count < 1) return { type: "none" };
  if (!input.shiftKey && input.activeIndex === input.count - 1) {
    return { type: "focus", index: 0 };
  }
  if (input.shiftKey && input.activeIndex <= 0) {
    return { type: "focus", index: input.count - 1 };
  }
  return { type: "none" };
}
