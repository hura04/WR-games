// =============================================================
// クォーツ時計の内部状態と測定値のシミュレーション
// -------------------------------------------------------------
// 時計ごとに「本当の状態」を持たせ、測定器はそこから値を出します。
// 酸化銀電池（SR系）の特性：
//   新品 ≒ 1.55〜1.58V、使用中はほぼ平坦、寿命末期に急低下
//   交換の目安 1.50V 未満
// =============================================================

export const BATTERY_REPLACE_THRESHOLD = 1.5;

/** 0〜1 の乱数を返す関数を受け取り、範囲内の値を作る */
const between = (rand, a, b) => a + (b - a) * rand();

/**
 * 依頼の時計の内部状態を作る
 * @param {{battery:'dead'|'eol'}} condition
 * @param {() => number} rand
 */
export function createQuartzState(condition, rand = Math.random) {
  const oldVoltage =
    condition.battery === 'eol' ? between(rand, 1.38, 1.46) : between(rand, 0.85, 1.25);
  // 新しい電池：ほとんどは良品。まれに保管劣化品（1/8の確率）
  const newVoltage = rand() < 0.125 ? between(rand, 1.3, 1.44) : between(rand, 1.55, 1.59);
  return {
    oldVoltage: round3(oldVoltage),
    newVoltage: round3(newVoltage),
    running: condition.battery === 'eol' ? 'eol' : 'stopped',
  };
}

const round3 = (v) => Math.round(v * 1000) / 1000;

/** テスターの表示値（わずかな測定ゆらぎつき） */
export function readVoltage(trueVoltage, rand = Math.random) {
  return Math.round((trueVoltage + between(rand, -0.004, 0.004)) * 100) / 100;
}

/** 電圧が十分かどうか */
export function judgeVoltage(v) {
  return v >= BATTERY_REPLACE_THRESHOLD ? 'ok' : 'low';
}
