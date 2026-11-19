// =============================================================
// 道具データ
// -------------------------------------------------------------
// 新しい道具を足すときは、この配列に1つ追加するだけでOKです。
//   id       : プログラム内で使う名前（英数字、重複しないこと）
//   name     : 画面に出る名前
//   category : 道具の種類（同じ種類の上位版はグレード違いとして扱う予定）
//   grade    : グレード（1=入門）。第3段階で購入・アップグレードに使います
//   tremor   : 手ブレの倍率（小さいほどブレにくい）
//   desc     : 説明文
//   starter  : true なら最初から持っている
// =============================================================

export const TOOLS = [
  {
    id: 'hand',
    name: '手（指）',
    category: 'hand',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: '道具を使わずに指で触ります。リューズの操作などに。',
  },
  {
    id: 'case_knife',
    name: 'こじ開け',
    category: 'case_opener_snap',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: 'こじ開け式（スナップバック）の裏蓋を開けるための刃物。裏蓋の切り欠き「こじ口」に刃を差し込み、てこの原理で外します。',
  },
  {
    id: 'screw_opener',
    name: 'スクリューバックオープナー',
    category: 'case_opener_screw',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: 'ねじ込み式（スクリューバック）の裏蓋の溝にツメを合わせて回す道具。こじ開け式には使えません。',
  },
  {
    id: 'screwdriver_10',
    name: '精密ドライバー 1.0mm',
    category: 'screwdriver',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: '電池押さえなどの小さなネジ用。刃先の幅がネジ溝に合っていないと滑って傷をつけます。',
  },
  {
    id: 'plastic_tweezers',
    name: '樹脂ピンセット',
    category: 'tweezers_plastic',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: '電気を通さない樹脂製。電池をつまむときは必ずこれを使います（金属だとショートします）。',
  },
  {
    id: 'metal_tweezers',
    name: '金属ピンセット',
    category: 'tweezers_metal',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: '細かい部品をつまむ基本の道具。電気を通すので、電池まわりでは注意が必要です。',
  },
  {
    id: 'battery_tester',
    name: '電池テスター',
    category: 'tester_battery',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: 'ボタン電池の電圧を測ります。酸化銀電池は新品で約1.55V、1.50Vを下回ったら交換の目安です。',
  },
  {
    id: 'loupe',
    name: 'ルーペで観察',
    category: 'loupe',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: '部品をルーペでよく観察します（Lキーで拡大表示の切り替えもできます）。',
  },
  {
    id: 'silicone_grease',
    name: 'シリコングリス',
    category: 'grease',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: 'パッキンに薄く塗り、密着性を高めて劣化を防ぎます。塗りすぎはホコリを呼びます。',
  },
  {
    id: 'case_press',
    name: '裏蓋圧入機',
    category: 'case_press',
    grade: 1,
    tremor: 1.0,
    starter: true,
    desc: 'こじ開け式の裏蓋を均等な力で押し込む道具。裏蓋に合った径の「コマ」を選んで使います。',
  },
];

export function getTool(id) {
  return TOOLS.find((t) => t.id === id) || null;
}
