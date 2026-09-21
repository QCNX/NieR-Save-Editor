import { describe, expect, it } from "vitest";

import { dialogKeyAction } from "./dialogKeyboard";

describe("dialogKeyAction", () => {
  it("maps Escape to cancellation", () => {
    expect(
      dialogKeyAction({ key: "Escape", shiftKey: false, activeIndex: 0, count: 2 }),
    ).toEqual({ type: "cancel" });
  });

  it("wraps Tab focus within the dialog in both directions", () => {
    expect(
      dialogKeyAction({ key: "Tab", shiftKey: false, activeIndex: 1, count: 2 }),
    ).toEqual({ type: "focus", index: 0 });
    expect(
      dialogKeyAction({ key: "Tab", shiftKey: true, activeIndex: 0, count: 2 }),
    ).toEqual({ type: "focus", index: 1 });
  });

  it("leaves ordinary keys and interior tab movement to the browser", () => {
    expect(
      dialogKeyAction({ key: "Enter", shiftKey: false, activeIndex: 0, count: 2 }),
    ).toEqual({ type: "none" });
    expect(
      dialogKeyAction({ key: "Tab", shiftKey: false, activeIndex: 0, count: 2 }),
    ).toEqual({ type: "none" });
  });
});
