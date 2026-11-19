// タイムグラファーの画面を描く（受付・調整・最終検査で共通）
//   紙テープのように、1振動ごとの点が横に流れていく表示
//   ・線の傾き = 歩度（右上がりは進み、右下がりは遅れ）
//   ・線が2本に分かれる幅 = 片振り
export function drawTimegrapher(g, W, H, m, t, { mode = null, pos = 0 } = {}) {
  g.fillStyle = '#0e1612';
  g.fillRect(0, 0, W, H);
  // 上部の数値表示
  g.fillStyle = '#16231c';
  g.fillRect(0, 0, W, 52);
  g.font = 'bold 22px "Courier New", monospace';
  const vals = [
    ['歩度', `${m.rate > 0 ? '+' : ''}${m.rate} s/d`, Math.abs(m.rate - 2.5) <= 2.5 ? '#7ef0a4' : '#f0d27e'],
    ['振り角', `${m.amplitude}°`, m.amplitude >= 270 ? '#7ef0a4' : m.amplitude >= 220 ? '#f0d27e' : '#f08a7e'],
    ['片振り', `${m.beatError.toFixed(1)} ms`, m.beatError <= 0.6 ? '#7ef0a4' : '#f0d27e'],
  ];
  vals.forEach(([k, v, c], i) => {
    const x = 16 + i * (W / 3);
    g.fillStyle = '#7f9a8a';
    g.font = '12px sans-serif';
    g.fillText(k, x, 18);
    g.fillStyle = c;
    g.font = 'bold 22px "Courier New", monospace';
    g.fillText(v, x, 44);
  });
  g.fillStyle = '#5a7466';
  g.font = '11px sans-serif';
  g.fillText('28800 A/h  ふり角度 50°', W - 150, H - 8);
  // 目盛り線
  const top = 60, h = H - top - 20;
  g.strokeStyle = 'rgba(126,240,164,0.12)';
  for (let i = 0; i <= 8; i++) {
    g.beginPath();
    g.moveTo(0, top + (h * i) / 8);
    g.lineTo(W, top + (h * i) / 8);
    g.stroke();
  }
  // 点の列（チク・タク）
  const slope = -m.rate * 0.012; // 進みで右上がり
  const sep = Math.min(h * 0.45, m.beatError * 18);
  const scroll = (t * 60) % 4;
  const amp = m.amplitude;
  const noise = amp < 220 ? 3 : amp < 260 ? 1.6 : 0.7; // 振り角が低いと点がばらつく
  for (let x = 0; x < W; x += 4) {
    const xx = x - scroll;
    const base = top + h / 2 + slope * (xx - W / 2);
    for (const s of [-1, 1]) {
      let y = base + (s * sep) / 2 + Math.sin(xx * 0.37 + s) * noise;
      y = top + ((((y - top) % h) + h) % h);
      g.fillStyle = s < 0 ? '#7ef0a4' : '#a4f0d0';
      g.fillRect(xx, y, 2, 2);
    }
  }
  if (mode) {
    g.fillStyle = '#d9a441';
    g.font = '12px sans-serif';
    g.fillText(mode === 'beat' ? 'ヒゲ持ちの位置' : '緩急針  − ←　→ ＋', 16, H - 8);
    g.fillRect(150, H - 14, 160, 3);
    g.fillStyle = '#f1e8d6';
    g.fillRect(150 + ((pos + 1) / 2) * 160 - 3, H - 19, 6, 12);
  }
}
