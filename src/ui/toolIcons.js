// =============================================================
// 道具の絵（ホットバー・道具箱・ショップで使う）
// -------------------------------------------------------------
// すべてコードで描いた SVG（外部の画像ファイルは使わない）。
// 大きさは 48×48 の座標で描き、表示のときに拡大・縮小する。
// 道具データ（tools.js）の icon の名前でここの絵を選ぶ。
// =============================================================

const STEEL = '#cfd5dc';
const STEEL_DARK = '#7d8894';
const BRASS = '#d9a441';
const OUT = '#1a140f'; // 輪郭線

/** ドライバー：太さで刃先の幅を変え、軸の色と数字でサイズが分かるように */
function screwdriver(size) {
  const colors = { 0.8: '#c0392b', 1.0: '#e0a526', 1.2: '#2e8b57', 1.4: '#2f6db5' };
  const c = colors[size] || '#888';
  const tip = 1.2 + size * 1.8; // 刃先の幅
  // 左上が持ち手、右下が刃先。サイズの数字は左下に
  return `
    <g transform="rotate(-45 26 22)">
      <rect x="21.5" y="-2" width="9" height="20" rx="2.5" fill="${STEEL}" stroke="${OUT}" stroke-width="1.2"/>
      <path d="M23.5 0v16M26 0v16M28.5 0v16" stroke="${STEEL_DARK}" stroke-width="0.9"/>
      <rect x="22.5" y="18" width="7" height="3.5" fill="${c}" stroke="${OUT}" stroke-width="1"/>
      <rect x="25" y="21.5" width="2" height="17" fill="${STEEL}" stroke="${OUT}" stroke-width="0.8"/>
      <path d="M${26 - tip / 2} 38.5h${tip}l-0.5 4.5h-${tip - 1}z" fill="${STEEL_DARK}" stroke="${OUT}" stroke-width="0.8"/>
    </g>
    <rect x="1" y="33" width="19" height="13" rx="3" fill="${c}" stroke="${OUT}" stroke-width="0.8"/>
    <text x="10.5" y="43" font-size="10" font-weight="bold" text-anchor="middle" fill="#fff" font-family="sans-serif">${size.toFixed(1)}</text>`;
}

/** ピンセット：2本の脚が先で閉じる形。樹脂は先が白く太い、金属は全部銀色で細い */
function tweezers(plastic) {
  const legs = `
      <path d="M17 4 L23 41 L24 44 L24 4 Z" fill="${STEEL}" stroke="${OUT}" stroke-width="1"/>
      <path d="M31 4 L25 41 L24 44 L24 4 Z" fill="${STEEL}" stroke="${OUT}" stroke-width="1"/>
      <path d="M17 4h14v4h-14z" fill="${STEEL_DARK}" stroke="${OUT}" stroke-width="1"/>
      <path d="M19.2 15l3 0.4M28.8 15l-3 0.4" stroke="${STEEL_DARK}" stroke-width="1"/>`;
  const tips = plastic
    ? `<path d="M20.6 27 L23.4 43 L24 45 L24.6 43 L27.4 27 Z" fill="#f6efdc" stroke="${OUT}" stroke-width="1.1"/>
       <path d="M21 27h6" stroke="#c9bfa5" stroke-width="1.2"/>`
    : `<path d="M22.6 34 L24 45 L25.4 34" fill="none" stroke="#eef2f5" stroke-width="0.8"/>`;
  return `<g transform="rotate(-35 24 24)">${legs}${tips}</g>`;
}

const ICONS = {
  hand: () => `
    <path d="M17 44c-3-4-7-9-8-13-0.6-2 1.6-3.2 3-1.8l4.5 4.5V11c0-1.8 1.3-3 2.9-3s2.9 1.2 2.9 3v13V8.5c0-1.8 1.3-3 2.9-3s2.9 1.2 2.9 3V24V10.5c0-1.8 1.3-3 2.9-3s2.9 1.2 2.9 3V26v-9c0-1.6 1.2-2.8 2.7-2.8S42 15.4 42 17v14c0 6-3 10-6 13z"
      fill="#f0c9a0" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>`,
  loupe: () => `
    <rect x="12" y="6" width="24" height="10" rx="2" fill="#262626" stroke="${OUT}" stroke-width="1.2"/>
    <path d="M10 16h28l-3 18H13z" fill="#353535" stroke="${OUT}" stroke-width="1.2"/>
    <ellipse cx="24" cy="36" rx="12" ry="5" fill="#9fd3ef" stroke="${OUT}" stroke-width="1.2"/>
    <ellipse cx="20" cy="35" rx="4" ry="1.3" fill="#fff" opacity="0.8"/>
    <path d="M14 11h20" stroke="#4a4a4a" stroke-width="1"/>`,
  screwdriver_08: () => screwdriver(0.8),
  screwdriver_10: () => screwdriver(1.0),
  screwdriver_12: () => screwdriver(1.2),
  screwdriver_14: () => screwdriver(1.4),
  tweezers_plastic: () => tweezers(true),
  tweezers_metal: () => tweezers(false),
  spring_bar: () => `
    <g transform="rotate(-40 24 24)">
      <rect x="20" y="10" width="8" height="26" rx="3" fill="#2b2b2b" stroke="${OUT}" stroke-width="1.2"/>
      <path d="M22 4v6M26 4v6" stroke="${STEEL}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M24 36v8" stroke="${STEEL}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M22.4 44h3.2" stroke="${STEEL}" stroke-width="1.6"/>
    </g>`,
  case_opener_snap: () => `
    <g transform="rotate(-40 24 24)">
      <rect x="19" y="20" width="10" height="24" rx="3" fill="#7a4b2a" stroke="${OUT}" stroke-width="1.2"/>
      <path d="M21 4 h6 v16 h-6z" fill="${STEEL}" stroke="${OUT}" stroke-width="1.1"/>
      <path d="M21 4 l3 -2 l3 2" fill="${STEEL}" stroke="${OUT}" stroke-width="1.1"/>
      <path d="M22 26v14M26 26v14" stroke="#5c3720" stroke-width="1"/>
    </g>`,
  case_opener_screw: () => `
    <circle cx="24" cy="24" r="13" fill="none" stroke="${STEEL_DARK}" stroke-width="5"/>
    <circle cx="24" cy="24" r="13" fill="none" stroke="${OUT}" stroke-width="0.8" opacity="0.6"/>
    <path d="M4 24h7M37 24h7" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"/>
    <rect x="21.5" y="8" width="5" height="6" fill="${BRASS}" stroke="${OUT}" stroke-width="0.9"/>
    <rect x="11" y="30" width="5" height="6" fill="${BRASS}" stroke="${OUT}" stroke-width="0.9" transform="rotate(-60 13.5 33)"/>
    <rect x="32" y="30" width="5" height="6" fill="${BRASS}" stroke="${OUT}" stroke-width="0.9" transform="rotate(60 34.5 33)"/>`,
  case_press: () => `
    <rect x="9" y="40" width="30" height="5" rx="1" fill="#3a3a3a" stroke="${OUT}" stroke-width="1.1"/>
    <rect x="12" y="8" width="4" height="33" fill="#4a4a4a" stroke="${OUT}" stroke-width="1"/>
    <rect x="12" y="6" width="22" height="6" rx="1" fill="#4a4a4a" stroke="${OUT}" stroke-width="1"/>
    <rect x="27" y="12" width="3" height="14" fill="${STEEL}" stroke="${OUT}" stroke-width="0.9"/>
    <rect x="23" y="26" width="11" height="4" rx="1" fill="#e9e3d2" stroke="${OUT}" stroke-width="0.9"/>
    <rect x="22" y="34" width="13" height="6" rx="1" fill="#e9e3d2" stroke="${OUT}" stroke-width="0.9"/>
    <path d="M32 9 L44 3" stroke="#c0392b" stroke-width="3" stroke-linecap="round"/>`,
  tester_battery: () => `
    <rect x="9" y="5" width="30" height="38" rx="4" fill="#f2c230" stroke="${OUT}" stroke-width="1.2"/>
    <rect x="13" y="9" width="22" height="15" rx="2" fill="#eef4ea" stroke="${OUT}" stroke-width="1"/>
    <path d="M15 21a10 10 0 0 1 18 0" fill="none" stroke="#999" stroke-width="1"/>
    <path d="M24 22 L30 13" stroke="#c0392b" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="18" cy="33" r="3.5" fill="#c0392b" stroke="${OUT}" stroke-width="1"/>
    <circle cx="30" cy="33" r="3.5" fill="#222" stroke="${OUT}" stroke-width="1"/>`,
  timegrapher: () => `
    <rect x="4" y="11" width="40" height="28" rx="3" fill="#e9e6df" stroke="${OUT}" stroke-width="1.2"/>
    <rect x="8" y="15" width="26" height="18" rx="1.5" fill="#0d1a12" stroke="${OUT}" stroke-width="1"/>
    <path d="M10 27 L15 26.5 L20 25.8 L25 25 L32 24" stroke="#4cff7a" stroke-width="1.2" fill="none"/>
    <path d="M10 22 L16 21.8 L22 21.2 L32 20.6" stroke="#4cff7a" stroke-width="1.2" fill="none"/>
    <circle cx="39" cy="19" r="2" fill="#555"/><circle cx="39" cy="26" r="2" fill="#555"/>
    <rect x="12" y="39" width="6" height="3" fill="#777"/><rect x="30" y="39" width="6" height="3" fill="#777"/>`,
  water_tester: () => `
    <rect x="8" y="22" width="32" height="20" rx="3" fill="#5f6e7c" stroke="${OUT}" stroke-width="1.2"/>
    <rect x="12" y="10" width="24" height="14" rx="7" fill="#b8dcef" stroke="${OUT}" stroke-width="1.1" opacity="0.95"/>
    <circle cx="24" cy="17" r="4" fill="${STEEL}" stroke="${OUT}" stroke-width="0.9"/>
    <circle cx="16" cy="32" r="6" fill="#fff" stroke="${OUT}" stroke-width="1"/>
    <path d="M16 32 L19.5 28.5" stroke="#c0392b" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="27" y="29" width="9" height="6" rx="1" fill="#2a2a2a"/>`,
  oiler: () => `
    <g transform="rotate(-40 24 24)">
      <rect x="21" y="3" width="6" height="26" rx="2.5" fill="#2c4f7a" stroke="${OUT}" stroke-width="1.1"/>
      <path d="M21 9h6M21 13h6" stroke="#4a6f9a" stroke-width="1"/>
      <path d="M22.5 29 L24 43 L25.5 29 Z" fill="${STEEL}" stroke="${OUT}" stroke-width="0.9"/>
    </g>
    <path d="M37 33c-2 3-3 5-3 6.5a3 3 0 0 0 6 0c0-1.5-1-3.5-3-6.5z" fill="${BRASS}" stroke="${OUT}" stroke-width="1"/>`,
  grease: () => `
    <ellipse cx="24" cy="16" rx="15" ry="5" fill="#ececec" stroke="${OUT}" stroke-width="1.2"/>
    <path d="M9 16v20c0 3 6.7 6 15 6s15-3 15-6V16" fill="#f7f7f7" stroke="${OUT}" stroke-width="1.2"/>
    <ellipse cx="24" cy="16" rx="11" ry="3.4" fill="#dfe9f2" stroke="#9fb4c6" stroke-width="0.8"/>
    <rect x="13" y="25" width="22" height="9" rx="1" fill="#2f6db5"/>
    <text x="24" y="32" font-size="5.5" text-anchor="middle" fill="#fff" font-family="sans-serif" font-weight="bold">GREASE</text>`,
  basket: () => `
    <path d="M8 18h32l-3 24H11z" fill="#d3d7db" stroke="${OUT}" stroke-width="1.2"/>
    <path d="M12 18l2 24M18 18l1 24M24 18v24M30 18l-1 24M36 18l-2 24M9.5 26h29M10.5 34h27" stroke="#8a939c" stroke-width="0.9"/>
    <path d="M14 18c0-9 20-9 20 0" fill="none" stroke="${STEEL_DARK}" stroke-width="2.2"/>`,
  hand_remover: () => `
    <path d="M10 42 L22 20 M38 42 L26 20" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"/>
    <path d="M22 20 L23.6 6 M26 20 L24.4 6" stroke="${STEEL}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M20 6h8" stroke="${STEEL_DARK}" stroke-width="2"/>
    <circle cx="24" cy="21" r="2.6" fill="${BRASS}" stroke="${OUT}" stroke-width="0.9"/>`,
  dial_protector: () => `
    <circle cx="24" cy="25" r="17" fill="#e8f2f7" stroke="${OUT}" stroke-width="1.2" opacity="0.95"/>
    <circle cx="24" cy="25" r="17" fill="none" stroke="#9fc4d8" stroke-width="2" opacity="0.6"/>
    <path d="M24 25 L24 8" stroke="${OUT}" stroke-width="1.3"/>
    <circle cx="24" cy="25" r="2.4" fill="#fff" stroke="${OUT}" stroke-width="1.1"/>
    <path d="M14 18l3 2M33 31l-3-2" stroke="#b9d3e0" stroke-width="1.5"/>`,
  hand_press: () => `
    <rect x="10" y="41" width="28" height="4" rx="1" fill="#3a3a3a" stroke="${OUT}" stroke-width="1"/>
    <rect x="14" y="34" width="20" height="7" rx="2" fill="#d6d1c4" stroke="${OUT}" stroke-width="1"/>
    <rect x="20" y="4" width="8" height="8" rx="2" fill="#c0392b" stroke="${OUT}" stroke-width="1.1"/>
    <rect x="22.5" y="12" width="3" height="16" fill="${STEEL}" stroke="${OUT}" stroke-width="0.9"/>
    <path d="M21 28h6l-1.5 4h-3z" fill="${STEEL_DARK}" stroke="${OUT}" stroke-width="0.9"/>
    <path d="M24 37 L24 33 M24 37 L29 35" stroke="#1a1a1a" stroke-width="1.2"/>`,
  mainspring_winder: () => `
    <rect x="6" y="34" width="36" height="8" rx="2" fill="#4a4a4a" stroke="${OUT}" stroke-width="1.1"/>
    <circle cx="22" cy="22" r="11" fill="#cfa45a" stroke="${OUT}" stroke-width="1.2"/>
    <path d="M22 22m-2 0a2 2 0 1 0 4 0a4 4 0 1 0 -8 0a6 6 0 1 0 12 0a8 8 0 1 0 -16 0" fill="none" stroke="#6b4a1a" stroke-width="1"/>
    <path d="M33 22h7v-8" stroke="${STEEL}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <circle cx="40" cy="13" r="2.6" fill="#2b2b2b"/>`,
};

const cache = new Map();

/** 道具の絵の SVG 文字列（48×48） */
export function toolIconSvg(tool) {
  const key = tool?.icon || tool?.category;
  if (cache.has(key)) return cache.get(key);
  const draw = ICONS[key];
  const body = draw ? draw() : `<rect x="8" y="8" width="32" height="32" rx="6" fill="#555"/><text x="24" y="30" font-size="14" text-anchor="middle" fill="#fff">?</text>`;
  const svg = `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
  cache.set(key, svg);
  return svg;
}

/** 絵の名前の一覧（テスト用） */
export const ICON_NAMES = Object.keys(ICONS);
