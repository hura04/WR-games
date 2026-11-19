// =============================================================
// 道具データ
// -------------------------------------------------------------
// 新しい道具を足すときは、この配列に1つ追加するだけでOKです。
//   id       : プログラム内で使う名前（英数字、重複しないこと）
//   name     : 画面に出る名前
//   short    : ホットバー（下の10マス）に出る短い名前。| で改行
//   group    : 道具バーでの分類（表示順）
//   category : 道具の種類（同じ種類の上位版はグレード違いとして扱う予定）
//   grade    : グレード（1=入門）。第3段階で購入・アップグレードに使います
//   tremor   : 手ブレの倍率（小さいほどブレにくい）
//   desc     : 説明文
//   starter  : true なら最初から持っている
// =============================================================

/** ホットバーの最初の並び（1〜0キー）。道具箱から選ぶと入れ替わる */
export const DEFAULT_HOTBAR = ['hand', 'loupe', 'screwdriver_10', 'screwdriver_12', 'screwdriver_14', 'plastic_tweezers', 'metal_tweezers', 'oiler', 'timegrapher', 'spring_bar_tool'];
export const HOTBAR_SIZE = 10;

export const TOOL_GROUPS = ['基本', 'ドライバー', 'ピンセット', '外装', '計測', '注油・洗浄', '専用工具'];

export const TOOLS = [
  // ---- 基本 ----
  { id: 'hand', name: '手（指）', short: '手', group: '基本', category: 'hand', grade: 1, tremor: 1.0, starter: true,
    desc: '道具を使わずに指で触ります。リューズの操作などに。' },
  { id: 'loupe', name: 'ルーペで観察', short: 'ルーペ', group: '基本', category: 'loupe', grade: 1, tremor: 1.0, starter: true,
    desc: '部品をルーペでよく観察します（Lキー／ルーペボタンで拡大表示の切り替えもできます）。' },

  // ---- ドライバー（刃先の幅をネジの溝に合わせる） ----
  { id: 'screwdriver_08', name: 'ドライバー 0.8mm', short: 'ドライバー|0.8', group: 'ドライバー', category: 'screwdriver', size: 0.8, grade: 1, tremor: 1.0, starter: true,
    desc: 'いちばん細いドライバー。アンクル受けなどのごく小さなネジ用。' },
  { id: 'screwdriver_10', name: 'ドライバー 1.0mm', short: 'ドライバー|1.0', group: 'ドライバー', category: 'screwdriver', size: 1.0, grade: 1, tremor: 1.0, starter: true,
    desc: '電池押さえや文字盤足のネジなど、小さなネジ用。刃先がネジ溝に合っていないと滑って傷をつけます。' },
  { id: 'screwdriver_12', name: 'ドライバー 1.2mm', short: 'ドライバー|1.2', group: 'ドライバー', category: 'screwdriver', size: 1.2, grade: 1, tremor: 1.0, starter: true,
    desc: '受け（ブリッジ）を留めるネジ用。' },
  { id: 'screwdriver_14', name: 'ドライバー 1.4mm', short: 'ドライバー|1.4', group: 'ドライバー', category: 'screwdriver', size: 1.4, grade: 1, tremor: 1.0, starter: true,
    desc: '角穴車や回転錘のネジなど、やや大きいネジ用。' },

  // ---- ピンセット ----
  { id: 'plastic_tweezers', name: '樹脂ピンセット', short: 'ピンセット|樹脂', group: 'ピンセット', category: 'tweezers_plastic', grade: 1, tremor: 1.0, starter: true,
    desc: '電気を通さない樹脂製。電池をつまむときは必ずこれを使います（金属だとショートします）。' },
  { id: 'metal_tweezers', name: '金属ピンセット', short: 'ピンセット|金属', group: 'ピンセット', category: 'tweezers_metal', grade: 1, tremor: 1.0, starter: true,
    desc: '細かい部品をつまむ基本の道具。先端がそろっていないと部品が弾け飛びます。' },

  // ---- 外装 ----
  { id: 'spring_bar_tool', name: 'バネ棒外し', short: 'バネ棒外し', group: '外装', category: 'spring_bar', grade: 1, tremor: 1.0, starter: true,
    desc: 'ベルトを留めているバネ棒を縮めて外す道具。先端をラグとベルトのすき間に入れます。' },
  { id: 'case_knife', name: 'こじ開け', short: 'こじ開け', group: '外装', category: 'case_opener_snap', grade: 1, tremor: 1.0, starter: true,
    desc: 'こじ開け式（スナップバック）の裏蓋を開ける刃物。裏蓋の切り欠き「こじ口」に刃を差し込み、てこの原理で外します。' },
  { id: 'screw_opener', name: '裏蓋オープナー', short: '裏蓋|オープナー', group: '外装', category: 'case_opener_screw', grade: 1, tremor: 1.0, starter: true,
    desc: 'ねじ込み式（スクリューバック）の裏蓋の溝にツメを合わせて回す道具。こじ開け式には使えません。' },
  { id: 'case_press', name: '裏蓋圧入機', short: '裏蓋|圧入機', group: '外装', category: 'case_press', grade: 1, tremor: 1.0, starter: true,
    desc: 'こじ開け式の裏蓋を均等な力で押し込む道具。裏蓋に合った径の「コマ」を選んで使います。' },

  // ---- 計測 ----
  { id: 'battery_tester', name: '電池テスター', short: '電池|テスター', group: '計測', category: 'tester_battery', grade: 1, tremor: 1.0, starter: true,
    desc: 'ボタン電池の電圧を測ります。酸化銀電池は新品で約1.55V、1.50Vを下回ったら交換の目安です。' },
  { id: 'timegrapher', name: 'タイムグラファー', short: 'タイム|グラファー', group: '計測', category: 'timegrapher', grade: 1, tremor: 1.0, starter: true,
    desc: '機械式時計の「チクタク」をマイクで拾い、歩度（1日の進み遅れ）・振り角・片振りを測る機械。' },
  { id: 'water_tester', name: '防水テスター', short: '防水|テスター', group: '計測', category: 'water_tester', grade: 1, tremor: 1.0, starter: true,
    desc: '時計に空気圧をかけ、ケースのわずかな変形から空気漏れ（防水不良）を調べます。' },

  // ---- 注油・洗浄 ----
  { id: 'oiler', name: 'オイラー（油差し）', short: 'オイラー', group: '注油・洗浄', category: 'oiler', grade: 1, tremor: 1.0, starter: true,
    desc: '針のように細い先端に油を少しだけつけて、ほぞ穴などに差します。油の種類は差す場所で使い分けます。' },
  { id: 'silicone_grease', name: 'シリコングリス', short: 'グリス', group: '注油・洗浄', category: 'grease', grade: 1, tremor: 1.0, starter: true,
    desc: 'パッキンに薄く塗り、密着性を高めて劣化を防ぎます。塗りすぎはホコリを呼びます。' },
  { id: 'cleaning_basket', name: '洗浄かご', short: '洗浄かご', group: '注油・洗浄', category: 'basket', grade: 1, tremor: 1.0, starter: true,
    desc: '分解した部品を入れて洗浄機にかける網かご。小さな部品は仕切りのある小かごに。' },

  // ---- 専用工具 ----
  { id: 'hand_remover', name: '針外し', short: '針外し', group: '専用工具', category: 'hand_remover', grade: 1, tremor: 1.0, starter: true,
    desc: '針の根元の下に2本の爪を差し込み、真上に引き抜く道具。文字盤には必ず保護シートを。' },
  { id: 'dial_protector', name: '文字盤保護シート', short: '保護|シート', group: '専用工具', category: 'dial_protector', grade: 1, tremor: 1.0, starter: true,
    desc: '針を外すとき、文字盤に傷をつけないためにかぶせる薄いシート。' },
  { id: 'hand_press', name: '針付け工具', short: '針付け', group: '専用工具', category: 'hand_press', grade: 1, tremor: 1.0, starter: true,
    desc: '針を真上からまっすぐ押し込む道具。斜めに押すと針が曲がったり、文字盤に触れたりします。' },
  { id: 'mainspring_winder', name: 'ゼンマイ巻き上げ器', short: 'ゼンマイ|巻き上げ器', group: '専用工具', category: 'mainspring_winder', grade: 1, tremor: 1.0, starter: true,
    desc: 'ゼンマイを渦巻き状に巻いて、変形させずに香箱へ入れる道具。指で入れるとゼンマイが歪みます。' },
];

export function getTool(id) {
  return TOOLS.find((t) => t.id === id) || null;
}
