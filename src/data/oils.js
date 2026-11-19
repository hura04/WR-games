// =============================================================
// 油の種類（注油のミニゲームで選ぶ選択肢）
//   consumable : 使ったときに減る消耗品の id
// どの場所にどの油を使うかは、各工程の minigames（type: 'oil'）に書きます。
// =============================================================

export const OILS = [
  { id: 'oil_fine', name: '低粘度油（さらさら）', consumable: 'oil_fine', color: '#e8d9a0' },
  { id: 'oil_medium', name: '中粘度油', consumable: 'oil_medium', color: '#d9b45a' },
  { id: 'oil_pallet', name: 'アンクル爪石用油', consumable: 'oil_pallet', color: '#c98a5a' },
  { id: 'grease_keyless', name: '巻き上げ用グリス', consumable: 'grease_keyless', color: '#e6e6e0' },
  { id: 'grease_barrel', name: '香箱内壁用ブレーキグリス', consumable: 'grease_barrel', color: '#bfc6cc' },
];

export function getOil(id) {
  return OILS.find((o) => o.id === id) || null;
}
