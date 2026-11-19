// 工程データの一覧。新しい工程ファイルを作ったら、ここに1行追加します。
import quartzBattery from './quartz_battery.js';
import mechanicalOverhaul from './mechanical_overhaul.js';

export const PROCEDURES = {
  [quartzBattery.id]: quartzBattery,
  [mechanicalOverhaul.id]: mechanicalOverhaul,
};

export function getProcedure(id) {
  return PROCEDURES[id] || null;
}
