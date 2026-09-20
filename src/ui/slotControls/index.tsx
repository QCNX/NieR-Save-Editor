import type { ChangeEvent, CSSProperties } from "react";

export type SlotFilterOptions<T> = {
  query: string;
  occupiedOnly: boolean;
  getId: (slot: T) => string | number;
  getLabel: (slot: T) => string;
  isOccupied: (slot: T) => boolean;
};

/**
 * Filter slot rows by caller-provided display text and occupancy semantics.
 * The returned rows retain their input order and the input array is untouched.
 */
export function filterSlots<T>(
  slots: readonly T[],
  options: SlotFilterOptions<T>,
): T[] {
  const query = options.query.trim().toLocaleLowerCase();

  return slots.filter((slot) => {
    if (options.occupiedOnly && !options.isOccupied(slot)) return false;
    if (query.length === 0) return true;

    const label = options.getLabel(slot).toLocaleLowerCase();
    const id = String(options.getId(slot)).toLocaleLowerCase();
    return label.includes(query) || id.includes(query);
  });
}

export type ChoiceId = string | number;

export type IdChoice<TId extends ChoiceId> = {
  id: TId;
  label: string;
};

export type IdChoiceLabels<TId extends ChoiceId> = {
  select: string;
  clear: string;
  empty: string;
  unknown: (id: TId) => string;
};

export type IdChoiceSelection<TId extends ChoiceId> = {
  value: TId;
  emptyValue: TId;
  choices: readonly IdChoice<TId>[];
};

export type IdChoiceControlProps<TId extends ChoiceId> =
  IdChoiceSelection<TId> & {
    labels: IdChoiceLabels<TId>;
    onChange: (id: TId) => void;
    disabled?: boolean;
    /** When false, only the select is rendered (caller owns Clear). Default true. */
    showClear?: boolean;
    /**
     * Shared select width in `ch` units. When set, every control in a column
     * can stay equal regardless of the current row's filtered choices.
     */
    selectWidthCh?: number;
  };

/** Encode a typed choice ID for a DOM option value without number/string collisions. */
export function encodeChoiceId(id: ChoiceId): string {
  return `${typeof id}:${String(id)}`;
}

/**
 * Approximate select width in `ch` units from the longest visible label,
 * with redundancy for the native dropdown affordance and CJK glyph width.
 */
export function estimateSelectWidthCh(
  labels: readonly string[],
  redundancyCh = 8,
  maxCh = 56,
): number {
  let longest = 0;
  for (const label of labels) {
    let width = 0;
    for (const char of label) {
      width += /[\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/.test(char)
        ? 2.2
        : 1.05;
    }
    longest = Math.max(longest, width);
  }
  return Math.min(maxCh, Math.max(10, Math.ceil(longest + redundancyCh)));
}

function selectableChoices<TId extends ChoiceId>({
  value,
  emptyValue,
  choices,
}: IdChoiceSelection<TId>): Map<string, TId> {
  const emptyKey = encodeChoiceId(emptyValue);
  const result = new Map<string, TId>();
  result.set(emptyKey, emptyValue);

  for (const choice of choices) {
    const key = encodeChoiceId(choice.id);
    if (!result.has(key)) result.set(key, choice.id);
  }

  const valueKey = encodeChoiceId(value);
  if (!result.has(valueKey)) result.set(valueKey, value);
  return result;
}

/**
 * Resolve a DOM selection to its typed ID. `null` is the public clear action;
 * an unrecognised serialized value leaves the current value unchanged.
 */
export function resolveIdChoiceSelection<TId extends ChoiceId>(
  serializedValue: string | null,
  selection: IdChoiceSelection<TId>,
): TId {
  if (serializedValue === null) return selection.emptyValue;
  return selectableChoices(selection).get(serializedValue) ?? selection.value;
}

/**
 * Generic ID selector used by slot editors. IDs stay typed across the DOM
 * string boundary, and an unknown current ID remains visible and selectable.
 */
export function IdChoiceControl<TId extends ChoiceId>({
  value,
  emptyValue,
  choices,
  labels,
  onChange,
  disabled = false,
  showClear = true,
  selectWidthCh,
}: IdChoiceControlProps<TId>) {
  const selection = { value, emptyValue, choices };
  const emptyKey = encodeChoiceId(emptyValue);
  const valueKey = encodeChoiceId(value);
  const choicesByKey = new Map<string, IdChoice<TId>>();

  for (const choice of choices) {
    const key = encodeChoiceId(choice.id);
    if (key !== emptyKey && !choicesByKey.has(key)) {
      choicesByKey.set(key, choice);
    }
  }

  if (valueKey !== emptyKey && !choicesByKey.has(valueKey)) {
    choicesByKey.set(valueKey, {
      id: value,
      label: labels.unknown(value),
    });
  }

  const widthLabels = [
    labels.empty,
    ...[...choicesByKey.values()].map((choice) => choice.label),
  ];
  const selectStyle: CSSProperties = {
    width: `${selectWidthCh ?? estimateSelectWidthCh(widthLabels)}ch`,
  };

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onChange(resolveIdChoiceSelection(event.currentTarget.value, selection));
  }

  return (
    <span
      className={
        showClear
          ? "slot-id-choice"
          : "slot-id-choice slot-id-choice--select-only"
      }
    >
      <select
        aria-label={labels.select}
        value={valueKey}
        onChange={handleChange}
        disabled={disabled}
        style={selectStyle}
      >
        <option value={emptyKey}>{labels.empty}</option>
        {[...choicesByKey.entries()].map(([key, choice]) => (
          <option key={key} value={key}>
            {choice.label}
          </option>
        ))}
      </select>
      {showClear ? (
        <button
          type="button"
          onClick={() => onChange(resolveIdChoiceSelection(null, selection))}
          disabled={disabled || valueKey === emptyKey}
        >
          {labels.clear}
        </button>
      ) : null}
    </span>
  );
}
