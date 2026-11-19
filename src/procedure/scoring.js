// =============================================================
// 評価と報酬の計算
// =============================================================

/** 仕上がり点（0〜100）を星（1〜5）に換算 */
export function qualityToStars(quality) {
  if (quality >= 90) return 5;
  if (quality >= 75) return 4;
  if (quality >= 60) return 3;
  if (quality >= 40) return 2;
  return 1;
}

/** 星ごとに、見積もり金額の何割を受け取れるか */
export const STAR_PAYOUT = { 5: 1.0, 4: 0.9, 3: 0.75, 2: 0.5, 1: 0.25 };

/**
 * 報酬を計算
 * @param {number} quoted   見積もり金額（円）
 * @param {number} stars    星
 * @param {number} extraCost 失敗による追加費用（円）
 * @param {number} lateDays  期限を過ぎた日数
 */
export function computeReward({ quoted, stars, extraCost = 0, lateDays = 0 }) {
  const latePenalty = Math.min(0.5, lateDays * 0.2);
  const gross = Math.round(quoted * STAR_PAYOUT[stars] * (1 - latePenalty));
  return { gross, extraCost, net: gross - extraCost };
}
