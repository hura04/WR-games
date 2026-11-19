// =============================================================
// 時計の機種データ
// -------------------------------------------------------------
// 寸法の単位はすべて mm（ミリメートル）です。
// 3Dモデルはこの数値から src/watch/ 以下のコードが自動で組み立てます。
//   caseback : 'snap'（こじ開け式） / 'screw'（ねじ込み式）
//   movement : ムーブメントの種類（'quartz' / 'mechanical' など）
// =============================================================

export const WATCHES = [
  {
    id: 'quartz_3hand_36',
    name: 'クォーツ三針 36mm（こじ開け裏蓋）',
    brand: 'TOKIWA',
    movement: 'quartz',
    caseback: 'snap',
    caseDiameter: 36,
    caseThickness: 9,
    lugWidth: 18,
    casebackDiameter: 28,
    crystalDiameter: 30,
    battery: 'battery_sr626sw',
    gasket: 'gasket_28',
    dialColor: '#f3efe6',
    caseColor: '#c9ccd1',
    handColor: '#1d2330',
  },
  {
    id: 'quartz_3hand_36_black',
    name: 'クォーツ三針 36mm 黒文字盤（こじ開け裏蓋）',
    brand: 'TOKIWA',
    movement: 'quartz',
    caseback: 'snap',
    caseDiameter: 36,
    caseThickness: 9,
    lugWidth: 18,
    casebackDiameter: 28,
    crystalDiameter: 30,
    battery: 'battery_sr626sw',
    gasket: 'gasket_28',
    dialColor: '#1f2228',
    caseColor: '#d8c08a',
    handColor: '#f0e6cf',
  },
];

export function getWatch(id) {
  return WATCHES.find((w) => w.id === id) || null;
}
