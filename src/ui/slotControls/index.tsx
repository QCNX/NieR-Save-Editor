import type { ChangeEvent } from "react";

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
  };

/** Encode a typed choice ID for a DOM option value without number/string collisions. */
export function encodeChoiceId(id: ChoiceId): string {
  return `${typeof id}:${String(id)}`;
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

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    onChange(resolveIdChoiceSelection(event.currentTarget.value, selection));
  }

  return (
    <span className="slot-id-choice">
      <select
        aria-label={labels.select}
        value={valueKey}
        onChange={handleChange}
        disabled={disabled}
      >
        <option value={emptyKey}>{labels.empty}</option>
        {[...choicesByKey.entries()].map(([key, choice]) => (
          <option key={key} value={key}>
            {choice.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(resolveIdChoiceSelection(null, selection))}
        disabled={disabled || valueKey === emptyKey}
      >
        {labels.clear}
      </button>
    </span>
  );
}
