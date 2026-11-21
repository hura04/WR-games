// =============================================================
// 道具のグレード（ショップ端末で買えるアップグレード）
// -------------------------------------------------------------
// 同じ種類の道具（例：ドライバー4本）は「一式」でまとめてグレードが上がります。
//   tools    : この一式に入る道具の id（tools.js）
//   grades   : 2・3 番目のグレード（1 は最初から持っている入門用）
//     price      : 値段（円）
//     reputation : 買うのに必要な評判（腕の立つ店にしか卸さない高級品）
//     tremor     : 手ブレの倍率（1 = 入門用。小さいほどブレにくい）
//     loupeMag   : ルーペの倍率
//     oilRate    : オイラーから油が出る速さの倍率（小さいほど量を合わせやすい）
//     desc       : ショップに出る説明
// =============================================================

export const GRADE_NAMES = { 1: '入門用', 2: '中級', 3: 'プロ用' };

export const UPGRADES = [
  {
    id: 'screwdrivers',
    name: 'ドライバー一式',
    tools: ['screwdriver_08', 'screwdriver_10', 'screwdriver_12', 'screwdriver_14'],
    icon: 'screwdriver_12',
    grades: {
      2: { price: 8000, reputation: 0, tremor: 0.75, desc: '刃先が硬く欠けにくい鋼。持ち手の回り（天座）がなめらかで、押す力が安定します。' },
      3: { price: 24000, reputation: 8, tremor: 0.5, desc: 'スイス製のプロ用。刃先を研ぎ直せる交換式で、ネジ溝にぴったり合い、ほとんどブレません。' },
    },
  },
  {
    id: 'tweezers',
    name: 'ピンセット（樹脂・金属）',
    tools: ['plastic_tweezers', 'metal_tweezers'],
    icon: 'tweezers_metal',
    grades: {
      2: { price: 6000, reputation: 0, tremor: 0.75, desc: '先端の合わせが正確で、小さな部品をつまんでも滑りにくい。' },
      3: { price: 18000, reputation: 8, tremor: 0.5, desc: '非磁性の特殊合金。先端が髪の毛ほど細く、テンプやアンクルも安心して運べます。' },
    },
  },
  {
    id: 'loupe',
    name: 'ルーペ',
    tools: ['loupe'],
    icon: 'loupe',
    grades: {
      2: { price: 5000, reputation: 0, loupeMag: 6, desc: '6倍。ネジの溝や歯車の歯先がはっきり見えます。' },
      3: { price: 15000, reputation: 5, loupeMag: 10, desc: '10倍のガラスレンズ。ほぞの摩耗や油の量まで見分けられます。' },
    },
  },
  {
    id: 'oiler',
    name: 'オイラー',
    tools: ['oiler'],
    icon: 'oiler',
    grades: {
      2: { price: 7000, reputation: 0, oilRate: 0.75, desc: '先端が細く、一度に出る油が少ない。適量に合わせやすくなります。' },
      3: { price: 20000, reputation: 8, oilRate: 0.55, desc: '自動注油器。押す時間で油の量を細かく調整できます。' },
    },
  },
  {
    id: 'hand_tools',
    name: '針外し・針付け工具',
    tools: ['hand_remover', 'hand_press'],
    icon: 'hand_remover',
    grades: {
      2: { price: 6000, reputation: 0, tremor: 0.75, desc: '先端に樹脂のカバー。文字盤に触れても傷がつきにくい。' },
      3: { price: 16000, reputation: 5, tremor: 0.5, desc: '台に固定して使う精密タイプ。まっすぐ真上に力がかかります。' },
    },
  },
  {
    id: 'case_tools',
    name: '外装工具（バネ棒外し・こじ開け・裏蓋オープナー・裏蓋圧入機）',
    tools: ['spring_bar_tool', 'case_knife', 'screw_opener', 'case_press'],
    icon: 'case_opener_screw',
    grades: {
      2: { price: 5000, reputation: 0, tremor: 0.75, desc: '刃先とピンの精度が高く、ケースに当たっても滑りにくい。' },
      3: { price: 14000, reputation: 5, tremor: 0.5, desc: 'ケースを固定する台つき。両手で安定して力をかけられます。' },
    },
  },
];

export function getUpgrade(id) {
  return UPGRADES.find((u) => u.id === id) || null;
}

/** その道具が入っている一式（なければ null） */
export function upgradeForTool(toolId) {
  return UPGRADES.find((u) => u.tools.includes(toolId)) || null;
}
