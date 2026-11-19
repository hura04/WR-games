// =============================================================
// 見積もりで選べる作業メニュー
//   price     : お客さんに請求する金額（円）
//   procedure : 実際の作業工程（src/data/procedures/ のid）
//   requires  : この作業メニューが成立するために必要な別メニュー
//   available : false の作業は、まだこの工房では受けられない
// =============================================================

export const SERVICES = [
  {
    id: 'battery_change',
    name: '電池交換',
    price: 1500,
    procedure: 'quartz_battery',
    available: true,
  },
  {
    id: 'gasket_change',
    name: '裏蓋パッキン交換',
    price: 500,
    requires: 'battery_change',
    available: true,
  },
  {
    id: 'quartz_overhaul',
    name: 'クォーツ分解掃除（オーバーホール）',
    price: 12000,
    available: false,
    unavailableReason: '必要な道具がまだ揃っていません',
  },
];

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null;
}
