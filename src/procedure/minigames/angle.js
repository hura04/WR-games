// 角度：マウスの上下で刃の角度を変え、緑の範囲でクリック
import { createPanel, bindCancel, tremorAt, clamp01 } from './common.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg);
    let angle = 30, mouseAngle = 30, done = false, t = 0;
    const jitter = 2.5 * (ctx.tremor ?? 1);
    const MAXA = 60;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    p.on(p.canvas, 'mousemove', (e) => {
      const r = p.canvas.getBoundingClientRect();
      const y = (e.clientY - r.top) / r.height;
      mouseAngle = (1 - y) * MAXA;
    });
    p.on(p.canvas, 'click', () => {
      const a = angle;
      const mid = (cfg.targetMin + cfg.targetMax) / 2;
      const half = (cfg.targetMax - cfg.targetMin) / 2;
      let score;
      if (a >= cfg.targetMin && a <= cfg.targetMax) score = 1 - (Math.abs(a - mid) / half) * 0.2;
      else score = clamp01(0.8 - (Math.abs(a - mid) - half) / 15);
      finish({ score, failure: score < (cfg.failOn ?? 0) ? cfg.failure : null });
    });
    p.status.textContent = 'マウスを上下に動かして角度を調整し、クリックで決定';
    p.loop((dt) => {
      if (done) return;
      t += dt;
      angle = Math.max(0, Math.min(MAXA, mouseAngle + tremorAt(t, 0.7) * jitter));
      const g = p.g, W = p.canvas.width, H = p.canvas.height;
      g.clearRect(0, 0, W, H);
      // ケースの断面（横から見た図）
      const ox = 300, oy = 150;
      g.fillStyle = '#9da3aa';
      g.fillRect(ox, oy, 200, 40); // ケース
      g.fillStyle = '#c2c6cc';
      g.fillRect(ox - 10, oy + 40, 210, 14); // 裏蓋
      g.fillStyle = '#3a3d42';
      g.fillRect(ox - 10, oy + 36, 18, 6); // こじ口
      // 目標範囲の扇形
      g.fillStyle = 'rgba(90,180,110,0.35)';
      g.beginPath();
      g.moveTo(ox, oy + 40);
      g.arc(ox, oy + 40, 260, Math.PI + (cfg.targetMin * Math.PI) / 180, Math.PI + (cfg.targetMax * Math.PI) / 180);
      g.closePath();
      g.fill();
      // 刃
      const rad = (angle * Math.PI) / 180;
      g.save();
      g.translate(ox, oy + 40);
      g.rotate(Math.PI + rad);
      g.fillStyle = '#d8dde3';
      g.fillRect(0, -3, 150, 6);
      g.fillStyle = '#6b4a2f';
      g.fillRect(150, -9, 110, 18);
      g.restore();
      g.fillStyle = '#e9dfc8';
      g.font = '18px sans-serif';
      g.fillText(`角度 ${angle.toFixed(0)}°`, 20, 40);
      g.font = '13px sans-serif';
      g.fillText(`目標 ${cfg.targetMin}〜${cfg.targetMax}°`, 20, 62);
    });
  });
}
