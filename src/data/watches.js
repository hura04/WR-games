// =============================================================
// 時計の機種データ
// -------------------------------------------------------------
// 寸法の単位はすべて mm（ミリメートル）です。
// 3Dモデルはこの数値から src/watch/ 以下のコードが自動で組み立てます。
//   movement   : 'quartz'（クォーツ） / 'mechanical'（機械式）
//   caliber    : 機械式のムーブメントの型（movements.js の id）
//   caseback   : 'snap'（こじ開け式） / 'screw'（ねじ込み式）
//   dialFinish : 'matte'（つや消し） / 'sunburst'（放射状の筋目）
//   crystal    : 'mineral'（ミネラルガラス） / 'sapphire'（サファイア）
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
    crystalDiameter: 29,
    crystal: 'mineral',
    battery: 'battery_sr626sw',
    gasket: 'gasket_28',
    dialColor: '#f1ede4',
    dialFinish: 'matte',
    caseColor: '#c9ccd1',
    handColor: '#2a3140',
    strapColor: '#5b3220',
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
    crystalDiameter: 29,
    crystal: 'mineral',
    battery: 'battery_sr626sw',
    gasket: 'gasket_28',
    dialColor: '#1f2228',
    dialFinish: 'sunburst',
    caseColor: '#d8c08a',
    handColor: '#f0e6cf',
    strapColor: '#1d1a18',
  },
  {
    id: 'auto_40_blue',
    name: '自動巻き三針 40mm 青文字盤（ねじ込み裏蓋）',
    brand: 'TOKIWA',
    movement: 'mechanical',
    caliber: 'tk28a',
    caseback: 'screw',
    caseDiameter: 40,
    caseThickness: 11.5,
    bezelHeight: 1.8,
    lugWidth: 20,
    lugLength: 8.5,
    casebackDiameter: 33,
    crystalDiameter: 32,
    crystal: 'sapphire',
    gasket: 'gasket_33',
    dialColor: '#1d3a6b',
    dialFinish: 'sunburst',
    caseColor: '#cdd1d6',
    handColor: '#e9ecef',
    strapColor: '#3b2416',
  },
  {
    id: 'auto_38_silver',
    name: '自動巻き三針 38mm 銀文字盤（ねじ込み裏蓋）',
    brand: 'TOKIWA',
    movement: 'mechanical',
    caliber: 'tk28a',
    caseback: 'screw',
    caseDiameter: 38,
    caseThickness: 11,
    bezelHeight: 1.6,
    lugWidth: 19,
    lugLength: 8,
    casebackDiameter: 33,
    crystalDiameter: 31,
    crystal: 'sapphire',
    gasket: 'gasket_33',
    dialColor: '#d9d8d2',
    dialFinish: 'sunburst',
    caseColor: '#c9ccd1',
    handColor: '#2a3140',
    secondColor: '#2a3140',
    strapColor: '#6b3b22',
  },
];

export function getWatch(id) {
  return WATCHES.find((w) => w.id === id) || null;
}
