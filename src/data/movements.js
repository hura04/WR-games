// =============================================================
// 機械式ムーブメントのデータ（部品の位置と大きさ）
// -------------------------------------------------------------
// 単位は mm。座標は「時計を表から見たとき」の向きで、
//   x : 3時方向が +（リューズ側）   z : 6時方向が +
// 裏蓋側から見ると左右が反対に見えます。
// layer : 地板の裏面からの高さ（裏蓋側へ向かって +）
// 3Dモデルは src/watch/MechanicalWatch.js がこの数値から作ります。
// =============================================================

export const MOVEMENTS = {
  tk28a: {
    name: 'TK-28A（自動巻き・25石）',
    diameter: 25.6,
    plateThickness: 2.0,
    beatsPerHour: 28800, // 1時間に28,800振動 = 1秒に8振動（4Hz）
    liftAngle: 50, // 振り角の計算に使う「ふり角度」
    jewels: 25,
    // 輪列（歯車）
    barrel: { pos: [4.6, -3.4], r: 5.3, layer: 0.2, h: 2.3, teeth: 84 },
    wheels: [
      { id: 'center_wheel', pos: [0, 0], r: 4.6, layer: 0.25, teeth: 80, pinion: 0.9 },
      { id: 'third_wheel', pos: [-4.4, -3.0], r: 3.6, layer: 0.85, teeth: 75, pinion: 0.75 },
      { id: 'fourth_wheel', pos: [0, 0], r: 3.8, layer: 1.45, teeth: 80, pinion: 0.7 },
      { id: 'escape_wheel', pos: [-5.8, 2.0], r: 2.3, layer: 1.25, teeth: 20, pinion: 0.55, club: true },
    ],
    pallet: { pivot: [-5.4, 4.7], toward: [-2.6, 7.4], layer: 1.45 },
    balance: { pos: [-2.6, 7.4], r: 4.5, layer: 1.9 },
    // 受け（ブリッジ）。cover は覆う円 [x, z, r] の集まりで、外形はそれを包む形
    bridges: {
      barrel_bridge: { cover: [[4.6, -3.4, 6.2], [9.2, -0.4, 2.8]], layer: 2.75, h: 0.8, screws: [[8.6, -6.0], [1.4, -8.4], [9.8, 1.8]], jewels: [] },
      train_bridge: { cover: [[0, 0, 2.4], [-4.4, -3.0, 2.0], [-5.8, 2.0, 1.8], [-1.6, -6.4, 1.8]], layer: 2.75, h: 0.8, screws: [[-1.4, -6.6], [-7.6, -0.8], [1.9, 1.6]], jewels: [[0, 0], [-4.4, -3.0], [-5.8, 2.0]] },
      pallet_bridge: { cover: [[-5.4, 4.7, 1.3], [-7.6, 5.6, 1.3]], layer: 2.55, h: 0.6, screws: [[-7.6, 5.6]], jewels: [[-5.4, 4.7]] },
      balance_cock: { cover: [[-2.6, 7.4, 2.0], [-7.4, 8.7, 1.9]], layer: 3.0, h: 0.8, screws: [[-7.4, 8.7]], jewels: [[-2.6, 7.4]] },
      auto_bridge: { cover: [[0, -2.0, 5.2], [-3.5, 2.5, 3.0], [3.8, 2.0, 3.0]], layer: 4.0, h: 0.6, screws: [[-5.6, -3.8], [4.8, -5.2], [0.5, 4.6]], jewels: [[0, 0]] },
    },
    ratchet: { pos: [4.6, -3.4], r: 4.0, layer: 3.55 },
    crownWheel: { pos: [9.6, -0.2], r: 1.9, layer: 3.55 },
    click: { pos: [7.2, -7.4] },
    settingLever: { pos: [10.3, 2.4] }, // オシドリの押し込み位置（裏から押す）
    dialScrews: [[-11.6, -2.6], [11.2, 4.8]],
    rotor: { r: 12.3, layer: 4.7, h: 0.8 },
    // 文字盤側（表）の部品
    hourWheel: { r: 3.6 },
    minuteWheel: { pos: [-2.4, 3.0], r: 2.2 },
  },
};

export function getMovement(id) {
  return MOVEMENTS[id] || null;
}
