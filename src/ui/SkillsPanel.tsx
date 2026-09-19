import type { SlotData } from "../save";
import {
  EMPTY_POD_PROGRAM_ID,
  EMPTY_PLUGIN_CHIP_ID,
  parsePluginChips,
  parsePodPrograms,
  serializePluginChips,
  setPluginChip,
} from "../save";
import { lookupChipName, lookupPodName, showsChipDiamond } from "../names";

type Props = {
  slot: SlotData;
  onSlotChange: (next: SlotData) => void;
};

export function SkillsPanel({ slot, onSlotChange }: Props) {
  const pods = parsePodPrograms(slot.podPrograms).filter(
    (p) => p.id !== EMPTY_POD_PROGRAM_ID,
  );
  const chips = parsePluginChips(slot.pluginChips).filter(
    (c) =>
      c.id.baseId !== EMPTY_PLUGIN_CHIP_ID.baseId ||
      c.id.baseCode !== EMPTY_PLUGIN_CHIP_ID.baseCode,
  );

  return (
    <section className="panel" aria-labelledby="skills-heading">
      <h2 id="skills-heading">技能</h2>

      <h3>POD 程序</h3>
      <div className="table-wrap table-wrap--compact">
        <table>
          <thead>
            <tr>
              <th>名称</th>
            </tr>
          </thead>
          <tbody>
            {pods.length === 0 ? (
              <tr>
                <td className="empty-row">（无 POD 程序）</td>
              </tr>
            ) : (
              pods.map((pod) => (
                <tr key={pod.position}>
                  <td>{lookupPodName(pod.id)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3>插件芯片</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>类型 / 名称</th>
              <th>等级</th>
              <th>重量</th>
              <th aria-label="最优重量标记" />
            </tr>
          </thead>
          <tbody>
            {chips.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-row">
                  （无插件芯片）
                </td>
              </tr>
            ) : (
              chips.map((chip) => (
                <tr key={chip.position}>
                  <td>
                    <span className="chip-type">T{chip.id.type}</span>{" "}
                    {lookupChipName(chip.id.baseId)}
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={chip.level}
                      onChange={(e) => {
                        const level = Number(e.currentTarget.value);
                        if (!Number.isFinite(level)) return;
                        const all = parsePluginChips(slot.pluginChips);
                        const next = setPluginChip(all, chip.position, {
                          level: level | 0,
                        });
                        onSlotChange({
                          ...slot,
                          pluginChips: serializePluginChips(next),
                        });
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={chip.weight}
                      onChange={(e) => {
                        const weight = Number(e.currentTarget.value);
                        if (!Number.isFinite(weight)) return;
                        const all = parsePluginChips(slot.pluginChips);
                        const next = setPluginChip(all, chip.position, {
                          weight: weight | 0,
                        });
                        onSlotChange({
                          ...slot,
                          pluginChips: serializePluginChips(next),
                        });
                      }}
                    />
                  </td>
                  <td className="diamond-cell">
                    {showsChipDiamond(chip) ? "◆" : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
