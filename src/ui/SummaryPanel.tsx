import { useI18n } from "../i18n";
import {
  DEBUG_FLAG_VALUES,
  getCharacterName,
  getDebugFlag,
  getMoney,
  getPlayTime,
  getSteamId,
  getXp,
  levelFromXp,
  parseEmilBulletsEquipped,
  parsePlayRecords,
  serializeEmilBulletsEquipped,
  serializePlayRecords,
  setCharacterName,
  setDebugFlag,
  setEmilBulletsEquipped,
  setLevel,
  setMoney,
  setPlayTime,
  setSteamId,
  setXp,
  type PlayRecords,
  type SlotData,
} from "../save";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

type PlayRecordField = keyof PlayRecords;

export type GeneralFieldEdit =
  | {
      field: "steamId" | "characterName" | "playTime" | "debugFlag";
      value: string;
    }
  | { field: PlayRecordField; value: string }
  | { field: "emilBulletsEquipped"; value: boolean };

const PLAY_RECORD_FIELDS: ReadonlyArray<{
  field: PlayRecordField;
  label: string;
}> = [
  { field: "itemsUsed", label: "general.itemsUsed" },
  { field: "itemsHarvested", label: "general.itemsHarvested" },
  { field: "hackingGamesCompleted", label: "general.hacksCompleted" },
  { field: "deaths", label: "general.deaths" },
  { field: "opaqueCounterAtByte16", label: "general.unknownCounter1" },
  { field: "opaqueCounterAtByte20", label: "general.unknownCounter2" },
  { field: "enemiesKilled", label: "general.enemiesKilled" },
];

const DEBUG_FLAG_LABELS = new Map<number, string>([
  [0x00, "debug.disabled"],
  [0x0b, "debug.menu"],
  [0x07, "debug.chapterSelect"],
  [0x0f, "debug.fullyEnabled"],
]);

function parseDecimalInteger(value: string, signed: boolean): number | null {
  const pattern = signed ? /^-?\d+$/u : /^\d+$/u;
  if (!pattern.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Apply one General-domain edit, returning the same slot for invalid input. */
export function updateGeneralField(
  slot: SlotData,
  edit: GeneralFieldEdit,
): SlotData {
  try {
    switch (edit.field) {
      case "steamId":
        if (!/^\d+$/u.test(edit.value)) return slot;
        return setSteamId(slot, BigInt(edit.value));
      case "characterName":
        return edit.value.length === 0
          ? slot
          : setCharacterName(slot, edit.value);
      case "playTime": {
        const seconds = parseDecimalInteger(edit.value, true);
        return seconds === null ? slot : setPlayTime(slot, seconds);
      }
      case "debugFlag": {
        const value = parseDecimalInteger(edit.value, false);
        return value === null ? slot : setDebugFlag(slot, value);
      }
      case "emilBulletsEquipped":
        return {
          ...slot,
          emilBulletsEquipped: serializeEmilBulletsEquipped(
            setEmilBulletsEquipped(edit.value),
          ),
        };
      default: {
        const value = parseDecimalInteger(edit.value, true);
        if (value === null) return slot;
        const records = parsePlayRecords(slot.playRecords);
        return {
          ...slot,
          playRecords: serializePlayRecords({
            ...records,
            [edit.field]: value,
          }),
        };
      }
    }
  } catch {
    return slot;
  }
}

export function SummaryPanel({ slot, onSlotChange }: Props) {
  const { t } = useI18n();
  const money = getMoney(slot);
  const xp = getXp(slot);
  const level = levelFromXp(xp);
  const debugFlag = getDebugFlag(slot);
  const playRecords = parsePlayRecords(slot.playRecords);
  const emilBullets = parseEmilBulletsEquipped(slot.emilBulletsEquipped);
  const debugFlagIsKnown = (DEBUG_FLAG_VALUES as readonly number[]).includes(
    debugFlag,
  );

  const commitGeneralEdit = (edit: GeneralFieldEdit) => {
    const next = updateGeneralField(slot, edit);
    if (next !== slot) onSlotChange(next);
  };

  return (
    <section className="panel" aria-labelledby="summary-heading">
      <h2 id="summary-heading">{t("tabs.general")}</h2>
      <div className="summary-grid">
        <label>
          <span>{t("fields.steamId")}</span>
          <input
            type="text"
            inputMode="numeric"
            value={getSteamId(slot).toString()}
            onChange={(event) =>
              commitGeneralEdit({
                field: "steamId",
                value: event.currentTarget.value,
              })
            }
          />
        </label>
        <label>
          <span>{t("fields.characterName")}</span>
          <input
            type="text"
            value={getCharacterName(slot)}
            onChange={(event) =>
              commitGeneralEdit({
                field: "characterName",
                value: event.currentTarget.value,
              })
            }
          />
        </label>
        <label>
          <span>{t("fields.playTimeSeconds")}</span>
          <input
            type="number"
            min={-0x80000000}
            max={0x7fffffff}
            step={1}
            value={getPlayTime(slot)}
            onChange={(event) =>
              commitGeneralEdit({
                field: "playTime",
                value: event.currentTarget.value,
              })
            }
          />
        </label>
        <label>
          <span>{t("fields.money")}</span>
          <input
            type="number"
            min={0}
            value={money}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (!Number.isFinite(value)) return;
              onSlotChange(setMoney(slot, value >>> 0));
            }}
          />
        </label>
        <label>
          <span>{t("fields.experience")}</span>
          <input
            type="number"
            min={0}
            value={xp}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (!Number.isFinite(value)) return;
              onSlotChange(setXp(slot, value >>> 0));
            }}
          />
        </label>
        <label>
          <span>{t("fields.level")}</span>
          <input
            type="number"
            min={1}
            max={99}
            step={1}
            value={level}
            onChange={(event) => {
              const next = setLevel(slot, Number(event.currentTarget.value));
              if (next !== slot) onSlotChange(next);
            }}
          />
        </label>
        <label>
          <span>{t("fields.debugFlag")}</span>
          <select
            value={debugFlag}
            onChange={(event) =>
              commitGeneralEdit({
                field: "debugFlag",
                value: event.currentTarget.value,
              })
            }
          >
            {!debugFlagIsKnown ? (
              <option value={debugFlag}>{`${t("debug.unknown")} (0x${debugFlag
                .toString(16)
                .padStart(2, "0")})`}</option>
            ) : null}
            {DEBUG_FLAG_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(DEBUG_FLAG_LABELS.get(value) ?? "debug.unknown")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3>{t("general.playRecords")}</h3>
      <div className="summary-grid">
        {PLAY_RECORD_FIELDS.map(({ field, label }) => (
          <label key={field}>
            <span>{t(label)}</span>
            <input
              type="number"
              min={-0x80000000}
              max={0x7fffffff}
              step={1}
              value={playRecords[field]}
              onChange={(event) =>
                commitGeneralEdit({
                  field,
                  value: event.currentTarget.value,
                })
              }
            />
          </label>
        ))}
      </div>

      <label>
        <input
          type="checkbox"
          checked={emilBullets.equipped === true}
          onChange={(event) =>
            commitGeneralEdit({
              field: "emilBulletsEquipped",
              value: event.currentTarget.checked,
            })
          }
        />
        {t("general.emilBulletsEquipped")}
        {emilBullets.equipped === null
          ? ` — ${t("general.unknownRawValue")} (${emilBullets.rawValue})`
          : null}
      </label>
    </section>
  );
}
