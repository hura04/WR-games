// =============================================================
// 機械式時計の内部状態とタイムグラファーの測定値
// -------------------------------------------------------------
// タイムグラファーで測る3つの値
//   歩度（レート）: 1日に何秒進むか遅れるか（s/d）。+ は進み
//   振り角        : テンプが片側に何度回るか。整備直後で 270〜310° が健全
//   片振り        : 「チク」と「タク」の間隔のずれ（ms）。0.6ms 以下が目安
// 振り角は、ゼンマイの力・汚れ・油の状態で決まります。
// =============================================================

const between = (rand, a, b) => a + (b - a) * rand();

/**
 * 依頼の時計の内部状態を作る
 * @param {{ mainspring:'ok'|'fatigued', regulatorOffset?:number }} condition
 */
export function createMechanicalState(condition, rand = Math.random) {
  return {
    springHealth: condition.mainspring === 'fatigued' ? between(rand, 0.55, 0.65) : between(rand, 0.93, 0.98),
    dirt: between(rand, 0.75, 0.9), // 古い油と汚れ（1=ひどい）
    oil: between(rand, 0.1, 0.2), // 油の状態（1=新しく適量）
    regulator: condition.regulatorOffset ?? between(rand, -95, -80), // 緩急針の位置による歩度（s/d）
    beatOffset: between(rand, 2.2, 3.0) * (rand() < 0.5 ? -1 : 1), // ヒゲ持ちのずれ（ms）
    hairspringBent: false,
    running: true,
    oilScores: [],
  };
}

/** 振り角（度） */
export function amplitudeOf(st) {
  let a = 312 * (0.55 + 0.45 * st.springHealth) * (1 - 0.32 * st.dirt) * (0.62 + 0.38 * st.oil);
  if (st.hairspringBent) a -= 35;
  return Math.max(80, a);
}

/** 歩度（s/d）。振り角が低いと遅れやすい（等時性のずれ） */
export function rateOf(st) {
  const iso = 0.22 * (amplitudeOf(st) - 290);
  return st.regulator + iso + (st.hairspringBent ? 45 : 0);
}

/** 片振り（ms） */
export function beatErrorOf(st) {
  return Math.abs(st.beatOffset);
}

/** タイムグラファーの表示（少しの測定ゆらぎつき） */
export function measure(st, rand = Math.random) {
  return {
    rate: Math.round(rateOf(st) + between(rand, -1.5, 1.5)),
    amplitude: Math.round(amplitudeOf(st) + between(rand, -3, 3)),
    beatError: Math.round((beatErrorOf(st) + between(rand, -0.05, 0.05)) * 10) / 10,
  };
}

/** 注油の出来をまとめて油の状態にする */
export function applyOiling(st) {
  if (st.oilScores.length === 0) return;
  const avg = st.oilScores.reduce((a, b) => a + b, 0) / st.oilScores.length;
  st.oil = Math.max(0.2, avg);
}

/**
 * 最終検査の評価（0〜1）
 *   振り角 270°以上で満点、歩度 −2〜+8 s/d で満点、片振り 0.6ms 以下で満点
 */
export function finalScore(m) {
  const amp = m.amplitude >= 270 ? 1 : m.amplitude >= 240 ? 0.8 : m.amplitude >= 210 ? 0.55 : 0.3;
  const dev = m.rate < -2 ? -2 - m.rate : m.rate > 8 ? m.rate - 8 : 0;
  const rate = Math.max(0.2, 1 - dev / 20);
  const beat = m.beatError <= 0.6 ? 1 : m.beatError <= 1.0 ? 0.8 : m.beatError <= 2 ? 0.5 : 0.3;
  return (amp + rate + beat) / 3;
}
