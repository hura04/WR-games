// 手ブレ：ピンセットの先を通路からはみ出さずにゴールまで運ぶ
import { createPanel, bindCancel, tremorAt, clamp01 } from './common.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 520, height: 260 });
    const W = p.canvas.width, H = p.canvas.height;
    // 通路（ゆるいS字のベジェ曲線）を点列にする
    const P0 = { x: 50, y: 200 }, P1 = { x: 200, y: 20 }, P2 = { x: 320, y: 260 }, P3 = { x: 470, y: 70 };
    const path = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, u = 1 - t;
      path.push({
        x: u * u * u * P0.x + 3 * u * u * t * P1.x + 3 * u * t * t * P2.x + t * t * t * P3.x,
        y: u * u * u * P0.y + 3 * u * u * t * P1.y + 3 * u * t * t * P2.y + t * t * t * P3.y,
      });
    }
    const half = cfg.corridor / 2;
    const amp = (cfg.tremor ?? 5) * (ctx.tremor ?? 1);
    let mouse = { ...P0 }, tip = { ...P0 }, carrying = false, done = false, t = 0;
    let devSum = 0, devN = 0, maxIdx = 0;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const toLocal = (e) => {
      const r = p.canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    const nearest = (pt) => {
      let best = Infinity, idx = 0;
      path.forEach((q, i) => {
        const d = Math.hypot(q.x - pt.x, q.y - pt.y);
        if (d < best) { best = d; idx = i; }
      });
      return { d: best, idx };
    };
    p.on(p.canvas, 'mousedown', (e) => {
      const m = toLocal(e);
      if (Math.hypot(m.x - P0.x, m.y - P0.y) < 22) { carrying = true; mouse = m; }
    });
    p.on(p.canvas, 'mousemove', (e) => { mouse = toLocal(e); });
    p.on(window, 'mouseup', () => {
      if (carrying && !done) finish({ score: 0.2, failure: cfg.failure || null, message: '途中で離してしまった' });
    });
    p.status.textContent = '左の○を押したまま、通路に沿って右の◎まで運ぶ';
    p.loop((dt) => {
      if (done) return;
      t += dt;
      if (carrying) {
        tip = { x: mouse.x + tremorAt(t, 0.4) * amp, y: mouse.y + tremorAt(t, 2.9) * amp };
        const n = nearest(tip);
        // 通路を逆走したり飛び越えたりしないように、進んだ位置を記録
        if (n.idx > maxIdx + 15) { finish({ score: 0.2, failure: cfg.failure || null }); return; }
        maxIdx = Math.max(maxIdx, n.idx);
        devSum += n.d; devN++;
        if (n.d > half) { finish({ score: 0.15, failure: cfg.failure || null }); return; }
        if (Math.hypot(tip.x - P3.x, tip.y - P3.y) < 14) {
          const avg = devSum / Math.max(1, devN);
          const score = clamp01(1 - (avg / half) * 0.6);
          finish({ score, failure: score < (cfg.failOn ?? 0) ? cfg.failure : null });
          return;
        }
      }
      const g = p.g;
      g.clearRect(0, 0, W, H);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.strokeStyle = '#3d3630';
      g.lineWidth = cfg.corridor;
      g.beginPath();
      path.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)));
      g.stroke();
      g.strokeStyle = 'rgba(217,164,65,0.35)';
      g.lineWidth = 2;
      g.setLineDash([6, 6]);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle = '#5ab46e';
      g.beginPath(); g.arc(P0.x, P0.y, 16, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#d9a441'; g.lineWidth = 3;
      g.beginPath(); g.arc(P3.x, P3.y, 14, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(P3.x, P3.y, 6, 0, Math.PI * 2); g.stroke();
      // ピンセットの先
      const at = carrying ? tip : P0;
      g.strokeStyle = '#e8ecef'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(at.x - 4, at.y); g.lineTo(at.x - 26, at.y - 40);
      g.moveTo(at.x + 4, at.y); g.lineTo(at.x + 10, at.y - 44); g.stroke();
      g.fillStyle = '#c8ccd2';
      g.beginPath(); g.arc(at.x, at.y, 5, 0, Math.PI * 2); g.fill();
    });
  });
}
