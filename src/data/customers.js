// =============================================================
// お客さんデータ
// -------------------------------------------------------------
//   look       : 見た目（肌・髪の色と髪型・服・背の高さ・メガネ）
//                hairStyle: 'short' / 'bob' / 'long' / 'balding'
//   lines      : お客さんが症状を話すセリフ（順番に表示）
//   watch      : 持ち込む時計の機種（watches.js の id）
//   condition  : 時計の本当の状態（プレイヤーには見えない）
//     battery    : 'dead'（止まっている） / 'eol'（電池切れ予告で2秒運針）  ※クォーツ
//     mainspring : 'ok' / 'fatigued'（へたり）  ※機械式
//     preDamage  : 持ち込み時点ですでにある傷（null ならなし）
//   deadlineDays : 期限（日数）
//   difficulty : 難易度（1〜5）
// 第6段階でここからランダムに組み合わせて依頼を作る予定です。
// =============================================================

export const CUSTOMERS = [
  {
    id: 'c_sato',
    name: '佐藤さん',
    look: { skin: '#e9c9a8', hair: '#3a2b22', hairStyle: 'bob', top: '#6a7f9a', jacket: null, bottom: '#2f3440', height: 1.62, glasses: false },
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
    id: 'c_kimura',
    name: '木村さん',
    look: { skin: '#e2bd98', hair: '#1c1c1c', hairStyle: 'short', top: '#e8e4da', jacket: '#2e3a52', bottom: '#2a2a30', height: 1.76, glasses: true },
    lines: [
      'すみません、この自動巻きの時計なんですが…。',
      '最近、1日に2分くらい遅れるんです。買ってから7年、一度も整備に出していなくて。',
    ],
    watch: 'auto_40_blue',
    condition: { mainspring: 'ok', preDamage: 'ラグの6時側に小さなすり傷がある' },
    deadlineDays: 7,
    difficulty: 3,
    thanks: '遅れなくなりました！ 裏蓋の中まできれいにしてもらって…ありがとうございます。',
  },
  {
    id: 'c_tanaka',
    name: '田中さん',
    look: { skin: '#dcb592', hair: '#8c8c8c', hairStyle: 'balding', top: '#8a5a44', jacket: null, bottom: '#3d3328', height: 1.68, glasses: true },
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
    id: 'c_ishikawa',
    name: '石川さん',
    look: { skin: '#f0d2b4', hair: '#5a3a24', hairStyle: 'long', top: '#7a4a6a', jacket: '#d8cbb5', bottom: '#3a3030', height: 1.6, glasses: false },
    lines: [
      'この時計、父から譲ってもらったものなんです。',
      'リューズで巻いても、半日くらいで止まってしまって…。前はもっと長く動いていたそうなんですけど。',
    ],
    watch: 'auto_38_silver',
    condition: { mainspring: 'fatigued', preDamage: null },
    deadlineDays: 10,
    difficulty: 4,
    thanks: '丸一日以上動くようになりました。父にも見せます…本当にありがとうございました。',
  },
  {
    id: 'c_yamamoto',
    name: '山本さん',
    look: { skin: '#f0d2b4', hair: '#1c1c1c', hairStyle: 'short', top: '#5c8a63', jacket: null, bottom: '#2f3440', height: 1.72, glasses: false },
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
