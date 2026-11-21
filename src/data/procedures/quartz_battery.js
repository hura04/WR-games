// =============================================================
// 工程データ：クォーツ腕時計の電池交換（こじ開け式裏蓋）
// -------------------------------------------------------------
// 1つの工程（step）に書く項目
//   id        : 工程のid
//   name      : 画面に出る工程名
//   needs     : 先に終わっていないといけない工程のid（順番の決まり）
//   target    : クリックする部品のid（src/watch/ で作る部品の名前）
//   tool      : 正しい道具のid（tools.js）
//   wrongTools: 間違った道具を使ったときに起きること
//               { 道具id: '失敗の種類(failures.js)' または { message: '…' } }
//   minigames : 作業の操作（順番に行う）。type は src/procedure/minigames/ を参照
//               failOn  : 点数がこれ未満なら失敗
//               failure : そのとき起きる失敗の種類
//   weight    : 操作の出来が仕上がり点に与える重み（初期値10）
//   onDone    : 終わったときの見た目の変化（src/bench/BenchMode.js が処理）
//   explain   : なぜこの作業をするのか（解説）
//   hint      : ガイドに表示するひとこと
//   consumes  : 使う消耗品 { 消耗品id: 個数 }
//   when      : 見積もり内容で工程が変わるとき { service: 'gasket_change', is: true }
// =============================================================

export default {
  id: 'quartz_battery',
  name: 'クォーツ腕時計の電池交換',
  movement: 'quartz',
  startSide: 'back', // 作業台に置いたとき裏蓋を上にする
  steps: [
    {
      id: 'open_caseback',
      name: '裏蓋を開ける',
      needs: [],
      target: 'caseback_notch',
      targetHint: { caseback: 'こじ開けの刃は、裏蓋のふちにある切り欠き「こじ口」に差し込みます。こじ口を探してクリックしてください。' },
      tool: 'case_knife',
      wrongTools: {
        screwdriver_10: 'scratch',
        metal_tweezers: 'scratch',
        screw_opener: { message: 'この裏蓋には溝がありません。こじ開け式なのでオープナーのツメは掛かりません。' },
      },
      minigames: [
        {
          type: 'angle',
          title: '刃の角度を合わせる',
          instruction: 'マウスを上下に動かして、刃を「こじ口」に浅い角度で当てます。緑の範囲でクリック。',
          targetMin: 10,
          targetMax: 20,
          failOn: 0.35,
          failure: 'scratch',
        },
        {
          type: 'pressure',
          title: 'てこで押し上げる',
          instruction: '左ボタンを押している間、力が強くなります。緑の範囲を保って、ゲージを満タンに。強すぎると刃が滑ります。',
          zoneMin: 0.55,
          zoneMax: 0.75,
          holdSeconds: 1.2,
          failure: 'scratch',
        },
      ],
      onDone: { move: 'caseback', to: 'tray_a' },
      explain:
        'こじ開け式の裏蓋は、ケースのふちにパチンとはめ込まれています。こじ口に刃を浅く差し込み、てこの原理で少しずつ持ち上げます。角度が立ちすぎたり力を入れすぎると、刃が滑ってケースや指を傷つけます。',
      hint: '「こじ開け」を持って、裏蓋のふちの切り欠きをクリック',
    },
    {
      id: 'remove_old_gasket',
      name: '古いパッキンを外す',
      needs: ['open_caseback'],
      target: 'gasket',
      tool: 'plastic_tweezers',
      wrongTools: {
        metal_tweezers: 'scratch',
        case_knife: 'scratch',
      },
      minigames: [
        {
          type: 'steady',
          title: 'パッキンをつまみ上げる',
          instruction: 'ピンセットの先（○）を、手ブレに気をつけながらゴール（◎）まで運びます。ドラッグで移動。通路からはみ出さないように。',
          corridor: 34,
          tremor: 5,
          failOn: 0.3,
          failure: 'drop',
        },
      ],
      onDone: { move: 'gasket', to: 'tray_b' },
      explain:
        'パッキン（ゴムの輪）は年月とともに硬くなり、防水性が落ちます。電池交換のときに状態を確かめ、必要なら交換します。金属の工具でこじるとパッキンの溝（ケース側）に傷がつくので、樹脂ピンセットを使います。',
      hint: '「樹脂ピンセット」で黒いゴムの輪をクリック',
    },
    {
      id: 'measure_old_battery',
      name: '古い電池の電圧を測る',
      needs: ['open_caseback'],
      target: 'battery',
      tool: 'battery_tester',
      minigames: [
        {
          type: 'reading',
          title: '電池テスターの判定',
          instruction: 'テスターの表示を読んで判断してください。',
          source: 'oldBattery',
          question: 'この電池はどうしますか？',
          options: [
            { label: '電圧不足。交換する', correctIf: 'low' },
            { label: 'まだ使える。電池以外を疑う', correctIf: 'ok' },
          ],
          failure: 'wrong_judgement',
        },
      ],
      explain:
        '酸化銀電池は、使っている間ほぼ1.55Vを保ち、寿命の終わりに急に電圧が下がります。1.50Vを切っていれば交換時期です。電圧が十分なのに止まっているなら、回路やコイル、輪列（歯車）の故障を疑います。',
      hint: '「電池テスター」で銀色の電池をクリック',
    },
    {
      id: 'loosen_clamp_screw',
      name: '電池押さえのネジをゆるめる',
      needs: ['measure_old_battery'],
      target: 'clamp_screw',
      tool: 'screwdriver_10',
      wrongTools: {
        metal_tweezers: 'scratch',
        case_knife: 'scratch',
      },
      minigames: [
        {
          type: 'pressure',
          title: 'ネジをゆるめる',
          instruction: 'ドライバーを押しつける力を緑の範囲に保ちながら回します。弱いと刃が浮き、強すぎると滑ります。',
          zoneMin: 0.35,
          zoneMax: 0.6,
          holdSeconds: 1.0,
          failure: 'slip',
        },
      ],
      onDone: { rotate: 'battery_clamp', angle: 0.9 },
      explain:
        '電池は「電池押さえ」という金属板で固定されています。小さなネジは、ドライバーを真上から軽く押しつけて回すのが基本。押しつけが弱いと刃が溝から浮いて滑り、ネジの頭や受けに傷をつけます。',
      hint: '「ドライバー 1.0mm」で電池押さえの小さなネジをクリック',
    },
    {
      id: 'remove_battery',
      name: '古い電池を取り出す',
      needs: ['loosen_clamp_screw'],
      target: 'battery',
      tool: 'plastic_tweezers',
      wrongTools: {
        metal_tweezers: 'short',
        case_knife: 'short',
        screwdriver_10: 'short',
      },
      minigames: [
        {
          type: 'steady',
          title: '電池を取り出す',
          instruction: 'ドラッグで電池をゴール（部品トレイ）まで運びます。',
          corridor: 30,
          tremor: 6,
          failOn: 0.3,
          failure: 'drop',
        },
      ],
      onDone: { move: 'battery', to: 'tray_c' },
      explain:
        '金属ピンセットで電池をつまむと、電池の＋極（側面と上面）と−極（底面）をつないでショートさせてしまいます。必ず樹脂（プラスチック）製のピンセットを使います。',
      hint: '「樹脂ピンセット」で電池をクリック',
    },
    {
      id: 'measure_new_battery',
      name: '新しい電池の電圧を確かめる',
      needs: ['remove_battery'],
      target: 'new_battery',
      tool: 'battery_tester',
      minigames: [
        {
          type: 'reading',
          title: '新しい電池の確認',
          instruction: '新品でも、長く保管された電池は弱っていることがあります。',
          source: 'newBattery',
          question: 'この新しい電池は使えますか？',
          options: [
            { label: '使える', correctIf: 'ok' },
            { label: '使えない', correctIf: 'low' },
          ],
          failure: 'wrong_judgement',
        },
      ],
      explain:
        '新品の電池でも、保管状態が悪いと電圧が下がっていることがあります。入れる前に測っておけば、「電池を替えたのに動かない」という二度手間を防げます。',
      hint: '「電池テスター」で、マットの上の新しい電池をクリック',
    },
    {
      id: 'insert_new_battery',
      name: '新しい電池を入れる',
      needs: ['measure_new_battery'],
      target: 'battery_socket',
      tool: 'plastic_tweezers',
      consumes: { battery_sr626sw: 1 },
      wrongTools: {
        metal_tweezers: 'short',
      },
      minigames: [
        {
          type: 'choice',
          title: '電池の向き',
          question: '電池はどちらの面を上にして入れますか？',
          options: [
            { label: '＋（刻印のある面）を上', correct: true },
            { label: '－（無地の面）を上', correct: false },
          ],
          failure: 'reversed_battery',
        },
        {
          type: 'steady',
          title: '電池をはめる',
          instruction: '電池を電池室（ゴール）まで運びます。',
          corridor: 28,
          tremor: 6,
          failOn: 0.3,
          failure: 'drop',
        },
      ],
      onDone: { show: 'battery_new_installed', hide: 'new_battery' },
      explain:
        'この機種の電池は＋極（刻印面）を上にして入れます。皮脂がつくと接触不良や腐食の原因になるので、素手では触らず、樹脂ピンセットで扱います。',
      hint: '「樹脂ピンセット」で空になった電池室をクリック',
    },
    {
      id: 'tighten_clamp_screw',
      name: '電池押さえのネジを締める',
      needs: ['insert_new_battery'],
      target: 'clamp_screw',
      tool: 'screwdriver_10',
      wrongTools: {
        metal_tweezers: 'scratch',
      },
      minigames: [
        {
          type: 'pressure',
          title: 'ネジを締める',
          instruction: '電池押さえを戻して、ネジを締めます。締めすぎに注意。',
          zoneMin: 0.35,
          zoneMax: 0.6,
          holdSeconds: 1.0,
          failure: 'slip',
        },
      ],
      onDone: { rotate: 'battery_clamp', angle: 0 },
      explain:
        '電池押さえはしっかり、でも締めすぎないように。小さなネジは締めすぎるとネジ山がつぶれ、次の交換で外せなくなることがあります。',
      hint: '「ドライバー 1.0mm」で電池押さえのネジをクリック',
    },
    {
      id: 'ac_reset',
      name: 'ACリセット',
      needs: ['tighten_clamp_screw'],
      target: 'ac_terminal',
      tool: 'metal_tweezers',
      wrongTools: {
        plastic_tweezers: { message: '樹脂ピンセットは電気を通さないので、端子どうしをつなげません。' },
      },
      minigames: [
        {
          type: 'hold',
          title: '端子をつなぐ',
          instruction: '金属ピンセットで「AC」端子と電池押さえを、ボタンを押している間つなぎます。約2秒つないだら離す。',
          unit: '秒',
          rate: 1, // 1秒に1単位たまる
          max: 5,
          windowMin: 1.5,
          windowMax: 3.0,
          failure: 'bad_reset',
        },
      ],
      explain:
        '電池を入れ替えた直後は、ICが正しく起動しないことがあります。多くの機種では、AC（オールクリア）端子と電池押さえ（＋極）を金属ピンセットで約2秒つなぐことで回路をリセットします。方法は機種ごとの技術資料に従います。',
      hint: '「金属ピンセット」で金色の小さな「AC」端子をクリック',
    },
    {
      id: 'check_running',
      name: '動いているか確認する',
      needs: ['ac_reset'],
      target: 'coil',
      targetAlso: ['step_rotor', 'movement_plate', 'circuit'],
      tool: 'loupe',
      minigames: [],
      message: 'ルーペでのぞくと、ステップモーターのローターが1秒ごとにピクッと回っている。正常に動き出した。',
      explain:
        'クォーツ時計は、ICが1秒ごとにコイルへ電気を送り、磁石のローター（ステップモーター）を180°ずつ回して針を進めます。ローターの動きを確認すれば、電池・回路・モーターが正常に働いているとわかります。',
      hint: '「ルーペ」を持って、コイルやムーブメントをクリック',
    },
    {
      id: 'install_new_gasket',
      name: '新しいパッキンにグリスを塗って装着する',
      when: { service: 'gasket_change', is: true },
      needs: ['check_running', 'remove_old_gasket'],
      target: 'gasket_seat',
      targetAlso: ['case'], // 溝はケースの一部なのでケースでもOK
      tool: 'silicone_grease',
      consumes: { gasket_28: 1 },
      minigames: [
        {
          type: 'hold',
          title: 'グリスを塗る',
          instruction: 'ボタンを押している間グリスが出ます。薄く均一な量（緑の範囲）で離してください。',
          unit: '%',
          rate: 40,
          max: 100,
          windowMin: 35,
          windowMax: 60,
          failureLow: 'too_little_grease',
          failure: 'too_much_grease',
        },
      ],
      onDone: { show: 'gasket_new' },
      explain:
        '新しいパッキンにシリコングリスを薄く塗ってから溝にはめます。グリスはゴムの乾燥を防ぎ、裏蓋との密着をよくします。塗りすぎるとホコリが付き、かえって劣化を早めます。',
      hint: '「シリコングリス」でケースのパッキン溝をクリック',
    },
    {
      id: 'reinstall_old_gasket',
      name: '古いパッキンを戻す',
      when: { service: 'gasket_change', is: false },
      needs: ['check_running', 'remove_old_gasket'],
      target: 'gasket_seat',
      targetAlso: ['case'],
      tool: 'plastic_tweezers',
      autoFailure: 'old_gasket',
      minigames: [],
      onDone: { show: 'gasket_old_back' },
      explain:
        '見積もりにパッキン交換が入っていないので、古いパッキンを戻します。硬くなったパッキンは防水性が低く、お客さんの満足度も下がります。受付でパッキン交換を提案しておくのが良い仕事です。',
      hint: '「樹脂ピンセット」でケースのパッキン溝をクリック',
    },
    {
      id: 'close_caseback',
      name: '裏蓋を閉める',
      needs: ['install_new_gasket|reinstall_old_gasket'],
      target: 'caseback',
      tool: 'case_press',
      wrongTools: {
        hand: { message: '指の力では均等に押し込めず、パッキンを噛んでしまう恐れがあります。裏蓋圧入機を使いましょう。' },
        case_knife: { message: 'こじ開けは開けるための道具です。閉めるには裏蓋圧入機を使います。' },
      },
      minigames: [
        {
          type: 'choice',
          title: 'コマの選択',
          question: '裏蓋（直径28.0mm）を押すコマはどれを使いますか？',
          options: [
            { label: '直径22mm', correct: false, failure: 'dent' },
            { label: '直径26.5mm', correct: true },
            { label: '直径31mm', correct: false, failure: 'scratch' },
          ],
        },
        {
          type: 'pressure',
          title: '圧入する',
          instruction: 'ハンドルを押し下げる力を緑の範囲に保ちます。パチンと入ったら完了。強すぎると風防が割れます。',
          zoneMin: 0.6,
          zoneMax: 0.78,
          holdSeconds: 1.0,
          failure: 'crack',
        },
      ],
      onDone: { move: 'caseback', to: 'home' },
      explain:
        '裏蓋は圧入機で均等に押し込みます。コマ（押し当てる部品）は裏蓋のふちを押せる、裏蓋より少し小さい径を選びます。小さすぎると中央がへこみ、大きすぎるとケースに当たって傷がつきます。表側のコマで風防を支えるので、力を入れすぎると風防が割れることもあります。',
      hint: '「裏蓋圧入機」で、トレイに置いた裏蓋をクリック',
    },
    {
      id: 'set_time',
      name: '時刻を合わせる',
      needs: ['close_caseback'],
      target: 'crown',
      tool: 'hand',
      minigames: [
        {
          type: 'hold',
          title: '時刻合わせ',
          instruction: 'リューズを引いて回します。ボタンを押している間、針が進みます。現在時刻（緑の範囲）で離してください。',
          unit: '分',
          rate: 60,
          max: 240,
          windowMin: 115,
          windowMax: 125,
          failure: null,
          weight: 3,
        },
      ],
      explain:
        'リューズを2段目まで引いて時刻を合わせ、押し戻します。秒針がちょうど12時の位置に来たときにリューズを押し込むと、時報に秒まで合わせられます。',
      hint: '「手」で3時位置のリューズをクリック',
    },
  ],
};
