import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SAVEFILE_SIZE_BYTES, load, setXp } from "../save";
import { SummaryPanel } from "./SummaryPanel";

describe("SummaryPanel writable level", () => {
  it("shows level 1-99 as an editable number input alongside experience", () => {
    const slot = setXp(load(new Uint8Array(SAVEFILE_SIZE_BYTES)), 55412);

    const markup = renderToStaticMarkup(
      <SummaryPanel slot={slot} onSlotChange={vi.fn()} />,
    );

    expect(markup).toContain("<span>经验</span><input type=\"number\"");
    expect(markup).toContain(
      "<span>等级</span><input type=\"number\" min=\"1\" max=\"99\" step=\"1\" value=\"30\"/>",
    );
  });
});
