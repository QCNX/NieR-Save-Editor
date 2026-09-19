import { minimumWeightForLevel } from "../save/pluginChips";

/**
 * Whether a chip row should show ◆ (weight at or under the minimum for its level).
 */
export function showsChipDiamond(chip: {
  level: number;
  weight: number;
}): boolean {
  return chip.weight <= minimumWeightForLevel(chip.level);
}
