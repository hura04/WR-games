// =============================================================
// 失敗の種類
//   quality : 仕上がり点（100点満点）から引かれる点数
//   cost    : 追加でかかる費用（円）。部品の買い直しなど
//   message : 起きたときに表示する文
//   retry   : true なら、その工程は完了せず、もう一度やり直しになる
// =============================================================

export const FAILURES = {
  scratch: {
    label: '傷',
    quality: 15,
    cost: 0,
    message: '道具が滑って、ケースに傷がついてしまった…',
  },
  slip: {
    label: 'ドライバーの滑り',
    quality: 10,
    cost: 0,
    message: 'ドライバーが滑り、ネジの頭と受けに小さな傷がついた…',
  },
  short: {
    label: 'ショート',
    quality: 12,
    cost: 0,
    message: '金属ピンセットが電池の＋と−に触れてショート！電池と回路に負担がかかった…',
  },
  drop: {
    label: '部品の落下',
    quality: 3,
    cost: 0,
    message: '部品を落としてしまった。マットの上で見つかったので拾い直した。',
  },
  lost: {
    label: '部品の紛失',
    quality: 8,
    cost: 300,
    message: '部品が弾け飛んで見つからない！予備の部品を使った（費用がかかります）。',
  },
  dent: {
    label: '裏蓋の変形',
    quality: 20,
    cost: 0,
    message: 'コマが小さすぎて、裏蓋の中央がへこんでしまった…',
  },
  crack: {
    label: '風防の破損',
    quality: 30,
    cost: 1500,
    message: '力を入れすぎて風防（ガラス）が割れてしまった！交換が必要だ…',
  },
  wrong_judgement: {
    label: '判定ミス',
    quality: 10,
    cost: 0,
    message: '測定結果の判断を誤った。',
  },
  too_much_grease: {
    label: 'グリスの塗りすぎ',
    quality: 6,
    cost: 0,
    message: 'グリスを塗りすぎた。はみ出したグリスにホコリが付きやすくなる…',
  },
  too_little_grease: {
    label: 'グリス不足',
    quality: 6,
    cost: 0,
    message: 'グリスが足りず、パッキンが乾いたままだ。劣化や防水不良の原因になる。',
  },
  bad_reset: {
    label: 'リセット不良',
    quality: 5,
    cost: 0,
    message: 'リセットがうまくいかなかった。もう一度やり直そう。',
    retry: true, // この失敗のあとは工程をやり直す
  },
  reversed_battery: {
    label: '電池の逆向き',
    quality: 8,
    cost: 0,
    message: '電池を逆向きに入れかけた！向きを確かめて、もう一度入れ直そう。',
    retry: true,
  },
  old_gasket: {
    label: '古いパッキンの再使用',
    quality: 12,
    cost: 0,
    message: '硬くなった古いパッキンを戻した。防水性が落ちたままだ。',
  },
};
