import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  IdChoiceControl,
  encodeChoiceId,
  filterSlots,
  resolveIdChoiceSelection,
  type IdChoiceControlProps,
} from "./index";

type TestSlot = {
  id: number;
  label: string;
  occupied: boolean;
};

const slots: readonly TestSlot[] = [
  { id: 101, label: "Small Recovery", occupied: true },
  { id: 202, label: "Large Recovery", occupied: false },
  { id: 909, label: "Shock Wave", occupied: true },
];

describe("filterSlots", () => {
  it("matches injected labels and raw IDs without changing the source order", () => {
    const byLabel = filterSlots(slots, {
      query: "  RECOVERY ",
      occupiedOnly: false,
      getId: (slot) => slot.id,
      getLabel: (slot) => slot.label,
      isOccupied: (slot) => slot.occupied,
    });
    const byId = filterSlots(slots, {
      query: "909",
      occupiedOnly: false,
      getId: (slot) => slot.id,
      getLabel: (slot) => slot.label,
      isOccupied: (slot) => slot.occupied,
    });

    expect(byLabel.map((slot) => slot.id)).toEqual([101, 202]);
    expect(byId.map((slot) => slot.id)).toEqual([909]);
    expect(slots.map((slot) => slot.id)).toEqual([101, 202, 909]);
  });

  it("combines occupied-only filtering with the query", () => {
    const result = filterSlots(slots, {
      query: "recovery",
      occupiedOnly: true,
      getId: (slot) => slot.id,
      getLabel: (slot) => slot.label,
      isOccupied: (slot) => slot.occupied,
    });

    expect(result.map((slot) => slot.id)).toEqual([101]);
  });
});

describe("IdChoiceControl", () => {
  const labels = {
    select: "Item ID",
    clear: "Clear slot",
    empty: "Empty",
    unknown: (id: number) => `Unknown (${id})`,
  };

  function props(
    overrides: Partial<IdChoiceControlProps<number>> = {},
  ): IdChoiceControlProps<number> {
    return {
      value: 101,
      emptyValue: -1,
      choices: [
        { id: 101, label: "Small Recovery" },
        { id: 202, label: "Large Recovery" },
      ],
      labels,
      onChange: () => undefined,
      ...overrides,
    };
  }

  it("keeps an unknown current ID visible with a caller-provided label", () => {
    const html = renderToStaticMarkup(
      <IdChoiceControl {...props({ value: 777 })} />,
    );

    expect(html).toContain("Unknown (777)");
    expect(html).toContain("value=\"number:777\" selected=\"\"");
  });

  it("resolves a serialized selection back to its typed ID", () => {
    const selected = resolveIdChoiceSelection(encodeChoiceId(202), props());

    expect(selected).toBe(202);
  });

  it("resolves a clear action to the caller-provided empty ID", () => {
    const cleared = resolveIdChoiceSelection(null, props());

    expect(cleared).toBe(-1);
  });
});
