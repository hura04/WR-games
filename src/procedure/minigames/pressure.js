// 力加減：押している間は力が上がり、離すと下がる。緑の範囲を保つとゲージがたまる。
import { createPanel, bindCancel, drawGauge, tremorAt, clamp01 } from './common.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg);
    let force = 0, progress = 0, outTime = 0, held = false, done = false, t = 0;
    const tremor = 0.035 * (ctx.tremor ?? 1);
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    p.on(p.canvas, 'mousedown', (e) => { if (e.button === 0) held = true; });
    p.on(window, 'mouseup', () => { held = false; });
    p.on(window, 'keydown', (e) => { if (e.code === 'Space') { held = true; e.preventDefault(); } });
    p.on(window, 'keyup', (e) => { if (e.code === 'Space') held = false; });
    p.status.textContent = '左ボタン（またはスペース）を押して力を入れる';
    p.loop((dt) => {
      if (done) return;
      t += dt;
      force += (held ? 0.5 : -0.7) * dt;
      force = clamp01(force);
      const shown = clamp01(force + tremorAt(t, 1.3) * tremor * (force > 0.05 ? 1 : 0));
      p.canvas.dataset.value = shown.toFixed(3); // 動作確認用
      const inZone = shown >= cfg.zoneMin && shown <= cfg.zoneMax;
      if (inZone) progress += dt / cfg.holdSeconds;
      else if (force > 0.05) outTime += dt;
      const g = p.g, W = p.canvas.width;
      g.clearRect(0, 0, W, p.canvas.height);
      g.fillStyle = '#e9dfc8';
      g.font = '15px sans-serif';
      g.fillText('力', 20, 60);
      drawGauge(g, 50, 40, W - 80, 30, shown, cfg.zoneMin, cfg.zoneMax, { danger: 0.92 });
      g.fillText('進み具合', 20, 140);
      g.fillStyle = '#2a2622';
      g.fillRect(100, 122, W - 130, 24);
      g.fillStyle = '#d9a441';
      g.fillRect(100, 122, (W - 130) * clamp01(progress), 24);
      if (shown > 0.92) {
        finish({ score: 0.2, failure: cfg.failure || null });
        return;
      }
      if (progress >= 1) finish({ score: clamp01(1 - outTime / (cfg.holdSeconds * 4)), failure: null });
      if (t > 20) finish({ score: 0.3, failure: null });
    });
  });
}
