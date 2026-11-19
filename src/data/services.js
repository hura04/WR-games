// =============================================================
// 見積もりで選べる作業メニュー
//   price      : お客さんに請求する金額（円）
//   procedure  : 実際の作業工程（src/data/procedures/ のid）
//   movement   : このメニューが出る時計の種類
//   requiresAny: このメニューは、ここに挙げたメニューのどれかとセットでしか選べない
//   setsFlag   : 選ぶと工程のフラグが立つ（例：ゼンマイ交換）
//   available  : false の作業は、まだこの工房では受けられない
// =============================================================

export const SERVICES = [
  {
    id: 'battery_change',
    name: '電池交換',
    price: 1500,
    procedure: 'quartz_battery',
    movement: ['quartz'],
    available: true,
  },
  {
    id: 'mech_overhaul',
    name: 'オーバーホール（分解掃除）',
    price: 25000,
    procedure: 'mechanical_overhaul',
    movement: ['mechanical'],
    available: true,
  },
  {
    id: 'gasket_change',
    name: '裏蓋パッキン交換',
    price: 500,
    requiresAny: ['battery_change', 'mech_overhaul'],
    movement: ['quartz', 'mechanical'],
    available: true,
  },
  {
    id: 'mainspring_change',
    name: 'ゼンマイ交換',
    price: 4000,
    requiresAny: ['mech_overhaul'],
    movement: ['mechanical'],
    setsFlag: 'replaceMainspring',
    available: true,
  },
  {
    id: 'quartz_overhaul',
    name: 'クォーツ分解掃除（オーバーホール）',
    price: 12000,
    movement: ['quartz'],
    available: false,
    unavailableReason: '必要な道具がまだ揃っていません（第5段階以降）',
  },
];

export function getService(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

/** その時計の種類で選べるメニュー */
export function servicesFor(movement) {
  return SERVICES.filter((s) => !s.movement || s.movement.includes(movement));
}
