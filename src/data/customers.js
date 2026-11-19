// =============================================================
// お客さんデータ（第1段階：電池交換の依頼）
// -------------------------------------------------------------
//   lines      : お客さんが症状を話すセリフ（順番に表示）
//   watch      : 持ち込む時計の機種（watches.js の id）
//   condition  : 時計の本当の状態（プレイヤーには見えない）
//     battery    : 'dead'（止まっている） / 'eol'（電池切れ予告で2秒運針）
//     preDamage  : 持ち込み時点ですでにある傷（null ならなし）
//   deadlineDays : 期限（日数）
//   difficulty : 難易度（1〜5）
// 第6段階でここからランダムに組み合わせて依頼を作る予定です。
// =============================================================

export const CUSTOMERS = [
  {
    id: 'c_sato',
    name: '佐藤さん',
    look: { body: '#6a7f9a', head: '#e9c9a8', hair: '#3a2b22' },
    lines: [
      'こんにちは。この時計、朝起きたら止まってしまっていて…。',
      '3年くらい前に電池を替えてもらったきりなんです。見てもらえますか？',
    ],
    watch: 'quartz_3hand_36',
    condition: { battery: 'dead', preDamage: null },
    deadlineDays: 2,
    difficulty: 1,
    thanks: 'わあ、ちゃんと動いてる！ありがとうございます。',
  },
  {
    id: 'c_tanaka',
    name: '田中さん',
    look: { body: '#8a5a44', head: '#dcb592', hair: '#888888' },
    lines: [
      'どうも。最近、秒針の動きがなんだか変でね。',
      'カクッ、カクッと2秒ずつ進むんだよ。壊れたのかな？',
    ],
    watch: 'quartz_3hand_36_black',
    condition: { battery: 'eol', preDamage: 'ベゼルの4時位置に小さな打痕がある' },
    deadlineDays: 3,
    difficulty: 1,
    thanks: 'おお、普通に1秒ずつ動くようになった。助かったよ。',
  },
  {
    id: 'c_yamamoto',
    name: '山本さん',
    look: { body: '#5c8a63', head: '#f0d2b4', hair: '#1c1c1c' },
    lines: [
      '仕事中に気づいたら止まってて…。',
      '雨の日もよく着けるので、ついでに防水のことも気になってます。',
    ],
    watch: 'quartz_3hand_36',
    condition: { battery: 'dead', preDamage: '裏蓋に細かいすり傷が多い' },
    deadlineDays: 1,
    difficulty: 2,
    thanks: 'パッキンまで替えてもらえて安心です。ありがとうございました！',
  },
];
