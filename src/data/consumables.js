// =============================================================
// 消耗品データ（電池・パッキン・油など）
//   stock : ゲーム開始時の在庫数
//   price : 1個あたりの仕入れ値（円）。第3段階のショップで使います
// =============================================================

export const CONSUMABLES = [
  {
    id: 'battery_sr626sw',
    name: '酸化銀電池 SR626SW',
    price: 200,
    stock: 5,
    desc: '直径6.8mm・厚さ2.6mm。腕時計で最も多く使われるサイズの一つ。公称電圧1.55V。',
  },
  {
    id: 'gasket_28',
    name: '裏蓋パッキン 内径28mm',
    price: 100,
    stock: 5,
    desc: '裏蓋とケースのすき間をふさぐゴムの輪。年数が経つと硬くなり、防水性が落ちます。',
  },
];

export function getConsumable(id) {
  return CONSUMABLES.find((c) => c.id === id) || null;
}
