// 工程データの一覧。新しい工程ファイルを作ったら、ここに1行追加します。
import quartzBattery from './quartz_battery.js';

export const PROCEDURES = {
  [quartzBattery.id]: quartzBattery,
};

export function getProcedure(id) {
  return PROCEDURES[id] || null;
}
