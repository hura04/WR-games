// 角度：上下にドラッグ（マウスなら動かすだけ）して角度を合わせ、決める
//   マウス：クリックで決定 / タッチ：指を離したら決定（または「決定」ボタン）
import { createPanel, bindCancel, tremorAt, clamp01 } from './common.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg);
    const MIN = cfg.min ?? 0;
    const MAX = cfg.max ?? 60;
    let target = (MIN + MAX) / 2, angle = target, done = false, t = 0, touching = false;
    const jitter = 2.5 * (ctx.tremor ?? 1);
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const setFrom = (e) => {
      const y = p.local(e).y / p.canvas.height;
      target = MIN + (1 - y) * (MAX - MIN);
    };
    const commit = () => {
      const a = angle;
      const mid = (cfg.targetMin + cfg.targetMax) / 2;
      const half = (cfg.targetMax - cfg.targetMin) / 2;
      let score;
      if (a >= cfg.targetMin && a <= cfg.targetMax) score = 1 - (Math.abs(a - mid) / half) * 0.2;
      else score = clamp01(0.8 - (Math.abs(a - mid) - half) / 15);
      finish({ score, failure: score < (cfg.failOn ?? 0) ? cfg.failure : null });
    };
    p.on(p.canvas, 'pointermove', (e) => { if (e.pointerType === 'mouse' || touching) setFrom(e); });
    p.on(p.canvas, 'pointerdown', (e) => {
      if (e.pointerType !== 'mouse') { touching = true; setFrom(e); p.canvas.setPointerCapture?.(e.pointerId); }
    });
    p.on(p.canvas, 'pointerup', (e) => {
      if (e.pointerType === 'mouse') commit();
      else { touching = false; commit(); }
    });
    const ok = document.createElement('button');
    ok.textContent = 'この角度で決定';
    ok.onclick = commit;
    p.buttons.appendChild(ok);
    p.status.textContent = '上下に動かして角度を合わせる（マウスはクリック、タッチは指を離すと決定）';
    p.loop((dt) => {
      if (done) return;
      t += dt;
      angle = Math.max(MIN, Math.min(MAX, target + tremorAt(t, 0.7) * jitter));
      const g = p.g, W = p.canvas.width, H = p.canvas.height;
      g.clearRect(0, 0, W, H);
      const ox = W * 0.62, oy = H * 0.68;
      // 作業面（横から見た図）
      g.fillStyle = '#9da3aa';
      g.fillRect(ox - 10, oy, 200, 40);
      g.fillStyle = '#3a3d42';
      g.fillRect(ox - 10, oy - 4, 18, 6);
      // 目標範囲の扇形
      const toRad = (deg) => Math.PI + (deg * Math.PI) / 180;
      g.fillStyle = 'rgba(90,180,110,0.35)';
      g.beginPath();
      g.moveTo(ox, oy);
      g.arc(ox, oy, 230, toRad(cfg.targetMin), toRad(cfg.targetMax));
      g.closePath();
      g.fill();
      // 道具
      g.save();
      g.translate(ox, oy);
      g.rotate(toRad(angle));
      g.fillStyle = '#d8dde3';
      g.fillRect(0, -3, 140, 6);
      g.fillStyle = '#6b4a2f';
      g.fillRect(140, -9, 90, 18);
      g.restore();
      g.fillStyle = '#e9dfc8';
      g.font = '18px sans-serif';
      g.fillText(`角度 ${angle.toFixed(0)}°`, 20, 34);
      g.font = '13px sans-serif';
      g.fillText(`目標 ${cfg.targetMin}〜${cfg.targetMax}°`, 20, 56);
      p.canvas.dataset.value = angle.toFixed(1); // 動作確認用
    });
  });
}
