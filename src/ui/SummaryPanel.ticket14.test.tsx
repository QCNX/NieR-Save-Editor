import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n";
import {
  getCharacterName,
  getDebugFlag,
  getPlayTime,
  getSteamId,
  load,
  parseEmilBulletsEquipped,
  parsePlayRecords,
  SAVEFILE_SIZE_BYTES,
} from "../save";
import { SummaryPanel, updateGeneralField } from "./SummaryPanel";

function emptySlot() {
  return load(new Uint8Array(SAVEFILE_SIZE_BYTES));
}

describe("ticket 14 General editor seam", () => {
  it("updates every General domain field through lossless public save APIs", () => {
    const original = emptySlot();
    let edited = updateGeneralField(original, {
      field: "steamId",
      value: "18446744073709551615",
    });
    edited = updateGeneralField(edited, {
      field: "characterName",
      value: "2B",
    });
    edited = updateGeneralField(edited, {
      field: "playTime",
      value: "-2147483648",
    });
    edited = updateGeneralField(edited, {
      field: "debugFlag",
      value: "15",
    });

    const counterValues = {
      itemsUsed: 11,
      itemsHarvested: 12,
      hackingGamesCompleted: 13,
      deaths: 14,
      opaqueCounterAtByte16: 15,
      opaqueCounterAtByte20: 16,
      enemiesKilled: 17,
    } as const;
    for (const [field, value] of Object.entries(counterValues)) {
      edited = updateGeneralField(edited, {
        field: field as keyof typeof counterValues,
        value: String(value),
      });
    }
    edited = updateGeneralField(edited, {
      field: "emilBulletsEquipped",
      value: true,
    });

    expect(getSteamId(edited)).toBe(0xffffffffffffffffn);
    expect(getCharacterName(edited)).toBe("2B");
    expect(getPlayTime(edited)).toBe(-0x80000000);
    expect(getDebugFlag(edited)).toBe(0x0f);
    expect(parsePlayRecords(edited.playRecords)).toEqual(counterValues);
    expect(parseEmilBulletsEquipped(edited.emilBulletsEquipped)).toEqual({
      equipped: true,
      rawValue: 1,
    });
    expect(edited.inventory).toBe(original.inventory);
    expect(edited.weapons).toBe(original.weapons);
  });

  it("ignores invalid decimal and enum edits without dirtying the slot", () => {
    const slot = emptySlot();

    expect(
      updateGeneralField(slot, { field: "steamId", value: "1.5" }),
    ).toBe(slot);
    expect(
      updateGeneralField(slot, {
        field: "steamId",
        value: "18446744073709551616",
      }),
    ).toBe(slot);
    expect(
      updateGeneralField(slot, { field: "playTime", value: "3.5" }),
    ).toBe(slot);
    expect(
      updateGeneralField(slot, { field: "characterName", value: "" }),
    ).toBe(slot);
    expect(
      updateGeneralField(slot, { field: "debugFlag", value: "170" }),
    ).toBe(slot);
    expect(
      updateGeneralField(slot, {
        field: "itemsUsed",
        value: "2147483648",
      }),
    ).toBe(slot);
  });

  it("renders all fields, seven Play Records, status choices, and Emil in English", () => {
    let slot = updateGeneralField(emptySlot(), {
      field: "steamId",
      value: "18446744073709551615",
    });
    slot = updateGeneralField(slot, { field: "characterName", value: "2B" });
    slot = updateGeneralField(slot, { field: "playTime", value: "3600" });

    const markup = renderToStaticMarkup(
      <I18nProvider language="en">
        <SummaryPanel slot={slot} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(markup).not.toContain(">General</h2>");
    expect(markup).toContain("SteamID");
    expect(markup).toContain('value="18446744073709551615"');
    expect(markup).toContain("Character name");
    expect(markup).toContain('value="2B"');
    expect(markup).toContain("Play time (seconds)");
    expect(markup).toContain("Money");
    expect(markup).toContain("Experience");
    expect(markup).toContain("Level");
    expect(markup).toContain("Debug Flag");
    for (const status of [
      "Disabled",
      "Debug Menu",
      "Chapter Select / Debug Room",
      "Fully Enabled",
    ]) {
      expect(markup).toContain(status);
    }
    expect(markup).toContain("Play Records");
    for (const label of [
      "Items used",
      "Items harvested",
      "Hacks completed",
      "Deaths",
      "Unknown counter 1",
      "Unknown counter 2",
      "Enemies killed",
    ]) {
      expect(markup).toContain(label);
    }
    expect(markup).toContain("Emil bullets equipped");
    expect(markup).toContain('type="checkbox"');
  });

  it("renders every General label and Debug status in Simplified Chinese", () => {
    const markup = renderToStaticMarkup(
      <I18nProvider language="zh-CN">
        <SummaryPanel slot={emptySlot()} onSlotChange={vi.fn()} />
      </I18nProvider>,
    );

    expect(markup).not.toContain(">概要</h2>");
    for (const label of [
      "角色名",
      "游戏时长（秒）",
      "调试标志",
      "禁用",
      "调试菜单",
      "章节选择 / 调试房间",
      "全部启用",
      "游玩记录",
      "使用物品数",
      "采集物品数",
      "完成骇入数",
      "死亡次数",
      "未知计数 1",
      "未知计数 2",
      "击杀敌人数",
      "已装备埃米尔子弹",
    ]) {
      expect(markup).toContain(label);
    }
  });
});
