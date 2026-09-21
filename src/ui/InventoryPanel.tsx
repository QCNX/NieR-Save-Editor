import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import itemsData from "../data/items.json";
import { useI18n, type Language } from "../i18n";
import { lookupItemName } from "../names";
import {
  parseInventory,
  serializeInventory,
  setInventoryItem,
  setInventoryItemId,
  type InventoryItem,
  type SlotData,
} from "../save";
import {
  DUAL_COLUMN_DEFAULT_ROW_HEIGHT,
  DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT,
  DUAL_COLUMN_OVERSCAN,
  dualColumnRowPairs,
  visibleRowWindow,
} from "./dualColumnVirtual";
import {
  filterSlots,
  IdChoiceControl,
  type IdChoice,
} from "./slotControls";

export type InventoryKind = "main" | "corpse";
export type InventorySlotEdit = { id: number } | { quantity: number };

type InventoryRow = {
  item: InventoryItem;
  label: string;
};

type ItemNameEntry = { en: string; zh: string };
const itemNames = itemsData as Record<string, ItemNameEntry>;

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

function inventoryRegion(slot: SlotData, kind: InventoryKind): Uint8Array {
  return kind === "main" ? slot.inventory : slot.corpseInventory;
}

/** Apply one row edit while retaining the other inventory region by identity. */
export function updateInventorySlot(
  slot: SlotData,
  kind: InventoryKind,
  index: number,
  edit: InventorySlotEdit,
): SlotData {
  const items = parseInventory(inventoryRegion(slot, kind));
  const nextItems =
    "id" in edit
      ? setInventoryItemId(items, index, edit.id)
      : setInventoryItem(items, index, { quantity: edit.quantity | 0 });
  const nextRegion = serializeInventory(nextItems);

  return kind === "main"
    ? { ...slot, inventory: nextRegion }
    : { ...slot, corpseInventory: nextRegion };
}

/** Rows displayed by the panel after localized search and occupancy filtering. */
export function inventoryRows(
  items: readonly InventoryItem[],
  query: string,
  occupiedOnly: boolean,
  language: Language,
): InventoryRow[] {
  const rows = items.map((item) => ({
    item,
    label: item.id === -1 ? "" : lookupItemName(item.id, language),
  }));

  return filterSlots(rows, {
    query,
    occupiedOnly,
    getId: (row) => row.item.id,
    getLabel: (row) => row.label,
    isOccupied: (row) => row.item.id !== -1,
  });
}

export function inventoryItemChoices(
  items: readonly InventoryItem[],
  currentId: number,
  language: Language,
): IdChoice<number>[] {
  const occupiedIds = new Set(
    items.filter((item) => item.id !== -1).map((item) => item.id),
  );

  return Object.entries(itemNames)
    .map(([rawId, names]) => ({
      id: Number(rawId),
      label: language === "zh-CN" ? names.zh : names.en,
    }))
    .filter((choice) => choice.id === currentId || !occupiedIds.has(choice.id))
    .sort((left, right) => left.label.localeCompare(right.label, language));
}

function inventoryColumnHeaders(t: (key: string) => string): ReactNode {
  return (
    <table className="slot-table dual-column-cell-table">
      <thead>
        <tr>
          <th className="col-name">{t("fields.name")}</th>
          <th className="col-clear">{t("actions.clear")}</th>
          <th className="col-qty">{t("fields.quantity")}</th>
        </tr>
      </thead>
    </table>
  );
}

export function InventoryPanel({ slot, onSlotChange }: Props) {
  const { language, t } = useI18n();
  const [kind, setKind] = useState<InventoryKind>("main");
  const [query, setQuery] = useState("");
  const [occupiedOnly, setOccupiedOnly] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT,
  );
  const [rowHeight, setRowHeight] = useState(DUAL_COLUMN_DEFAULT_ROW_HEIGHT);
  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);

  const items = parseInventory(inventoryRegion(slot, kind));
  const rows = inventoryRows(items, query, occupiedOnly, language);
  const pairs = useMemo(() => dualColumnRowPairs(rows), [rows]);

  const rowWindow = visibleRowWindow(
    scrollTop,
    rowHeight,
    viewportHeight,
    DUAL_COLUMN_OVERSCAN,
    pairs.length,
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      setViewportHeight(
        viewport.clientHeight || DUAL_COLUMN_DEFAULT_VIEWPORT_HEIGHT,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const row = measureRowRef.current;
    if (!row) return;
    const height = row.getBoundingClientRect().height;
    if (height > 0 && Math.abs(height - rowHeight) > 0.5) {
      setRowHeight(height);
    }
  }, [rowWindow.start, rowWindow.end, pairs.length, rowHeight]);

  useLayoutEffect(() => {
    const maxScroll = Math.max(0, pairs.length * rowHeight - viewportHeight);
    if (scrollTop > maxScroll) {
      setScrollTop(maxScroll);
      const viewport = viewportRef.current;
      if (viewport) viewport.scrollTop = maxScroll;
    }
  }, [pairs.length, rowHeight, viewportHeight, scrollTop]);

  // Kind / filter change: jump back to top.
  useLayoutEffect(() => {
    setScrollTop(0);
    const viewport = viewportRef.current;
    if (viewport) viewport.scrollTop = 0;
  }, [kind, query, occupiedOnly]);

  function renderItemCell(row: InventoryRow | undefined): ReactNode {
    if (!row) {
      return (
        <div
          className="dual-column-pair__col dual-column-pair__col--empty"
          aria-hidden="true"
        />
      );
    }
    const { item } = row;
    return (
      <div className="dual-column-pair__col">
        <table className="slot-table dual-column-cell-table">
          <tbody>
            <tr>
              <td className="col-name">
                <IdChoiceControl
                  value={item.id}
                  emptyValue={-1}
                  choices={inventoryItemChoices(items, item.id, language)}
                  showClear={false}
                  labels={{
                    select: `${t("fields.name")} (${item.position})`,
                    clear: t("actions.clear"),
                    empty: t("list.empty"),
                    unknown: (id) => lookupItemName(id, language),
                  }}
                  onChange={(id) =>
                    onSlotChange(
                      updateInventorySlot(slot, kind, item.position, { id }),
                    )
                  }
                />
              </td>
              <td className="col-clear">
                <button
                  type="button"
                  className="slot-clear-button"
                  aria-label={`${t("actions.clear")} (${item.position})`}
                  disabled={item.id === -1}
                  onClick={() =>
                    onSlotChange(
                      updateInventorySlot(slot, kind, item.position, {
                        id: -1,
                      }),
                    )
                  }
                >
                  {t("actions.clear")}
                </button>
              </td>
              <td className="col-qty">
                {item.id === -1 ? null : (
                  <input
                    aria-label={`${t("fields.quantity")} (${item.position})`}
                    type="number"
                    min={0}
                    value={item.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.currentTarget.value);
                      if (!Number.isFinite(quantity)) return;
                      onSlotChange(
                        updateInventorySlot(slot, kind, item.position, {
                          quantity,
                        }),
                      );
                    }}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const visiblePairs = pairs.slice(rowWindow.start, rowWindow.end);

  return (
    <section className="panel panel--fill panel--dual-column panel--inventory">
      <div className="slot-list-toolbar">
        <button
          type="button"
          aria-pressed={kind === "main"}
          onClick={() => setKind("main")}
        >
          {t("inventory.main")}
        </button>
        <button
          type="button"
          aria-pressed={kind === "corpse"}
          onClick={() => setKind("corpse")}
        >
          {t("inventory.corpse")}
        </button>
        <label>
          <span>{t("list.search")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={occupiedOnly}
            onChange={(event) => setOccupiedOnly(event.currentTarget.checked)}
          />
          <span>{t("list.occupiedOnly")}</span>
        </label>
      </div>
      <div className="dual-column-shell">
        <div className="dual-column-virtual__head">
          <div className="dual-column-pair dual-column-pair--head">
            <div className="dual-column-pair__col">
              {inventoryColumnHeaders(t)}
            </div>
            <div className="dual-column-pair__rule" aria-hidden="true" />
            <div className="dual-column-pair__col" aria-hidden="true">
              {inventoryColumnHeaders(t)}
            </div>
          </div>
        </div>
        <div
          className="table-wrap dual-column-virtual"
          ref={viewportRef}
          onScroll={(event) => {
            setScrollTop(event.currentTarget.scrollTop);
          }}
        >
          {rows.length === 0 ? (
            <div className="empty-row dual-column-empty">{t("list.empty")}</div>
          ) : (
            <div
              className="dual-column-virtual__spacer"
              style={{ height: pairs.length * rowHeight }}
            >
              <div
                className="dual-column-virtual__window"
                style={{
                  transform: `translateY(${rowWindow.start * rowHeight}px)`,
                }}
              >
                {visiblePairs.map((pair, index) => {
                  const [left, right] = pair;
                  const rowIndex = rowWindow.start + index;
                  return (
                    <div
                      key={left.item.position}
                      className="dual-column-pair dual-column-pair--row"
                      ref={index === 0 ? measureRowRef : undefined}
                      data-row-index={rowIndex}
                    >
                      {renderItemCell(left)}
                      <div
                        className="dual-column-pair__rule"
                        aria-hidden="true"
                      />
                      {renderItemCell(right)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
