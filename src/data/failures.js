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
  // ---- 機械式オーバーホールの失敗 ----
  dial_scratch: {
    label: '文字盤の傷',
    quality: 25,
    cost: 0,
    message: '針外しの爪が文字盤に当たって、文字盤に傷がついてしまった！（保護シートを使えば防げた）',
  },
  hand_bent: {
    label: '針の曲がり',
    quality: 12,
    cost: 800,
    message: '針が曲がってしまった。修正に時間と費用がかかる…',
  },
  hairspring_bent: {
    label: 'ヒゲゼンマイの変形',
    quality: 25,
    cost: 3000,
    message: 'テンプが揺れてヒゲゼンマイが絡まり、変形してしまった！ 修正（または交換）が必要だ…',
  },
  pivot_broken: {
    label: 'ほぞ折れ',
    quality: 25,
    cost: 2500,
    message: 'ゼンマイの力が残ったまま輪列が一気に回り、歯車の「ほぞ」が折れてしまった！（先にゼンマイの力を抜くべきだった）',
  },
  screw_damage: {
    label: 'ネジ山の損傷',
    quality: 10,
    cost: 500,
    message: '回す向きを間違えてネジを締め込み、ネジ山を傷めてしまった。丸穴車のネジは逆ネジ（左ネジ）だ。',
  },
  wrong_oil: {
    label: '油の種類違い',
    quality: 8,
    cost: 0,
    message: '場所に合わない油を差してしまった。粘度が合わず、油切れや抵抗の原因になる…',
  },
  too_much_oil: {
    label: '油の差しすぎ',
    quality: 6,
    cost: 0,
    message: '油が多すぎて穴石の外まで広がった。広がった油はすぐに切れてしまう…',
  },
  too_little_oil: {
    label: '油不足',
    quality: 6,
    cost: 0,
    message: '油が少なすぎる。すぐに油切れを起こして摩耗の原因になる…',
  },
  bad_cleaning: {
    label: '洗浄不良',
    quality: 12,
    cost: 0,
    message: '洗浄の手順が正しくなく、古い油や汚れが残ってしまった…',
  },
  mainspring_kink: {
    label: 'ゼンマイの歪み',
    quality: 15,
    cost: 2500,
    message: '指でゼンマイを押し込んだら歪んでしまった。巻き上げ器を使うべきだった…（新しいゼンマイを使い直した）',
  },
  water_leak: {
    label: '防水不良',
    quality: 20,
    cost: 0,
    message: '防水テストで空気漏れが見つかった。このままでは水が入ってしまう…',
  },
  wrong_test_pressure: {
    label: 'テスト圧の設定ミス',
    quality: 5,
    cost: 0,
    message: '防水性能に合わない圧力でテストしてしまった。正しい圧力でやり直した。',
  },
  wrong_diagnosis: {
    label: '点検の判断ミス',
    quality: 10,
    cost: 0,
    message: '部品の状態の判断を誤った。',
  },
};
