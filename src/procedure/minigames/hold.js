// 適量・タイミング：押している間に値がたまり、緑の範囲で離す
import { createPanel, bindCancel, drawGauge, clamp01 } from './common.js';

export function run(container, cfg) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg);
    let value = 0, held = false, started = false, done = false, t = 0;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const judge = () => {
      const { windowMin: a, windowMax: b } = cfg;
      const mid = (a + b) / 2, half = (b - a) / 2;
      if (value >= a && value <= b) return { score: 1 - (Math.abs(value - mid) / half) * 0.2, failure: null };
      const off = value < a ? a - value : value - b;
      const score = clamp01(0.7 - off / (cfg.max * 0.3));
      const failure = value < a ? (cfg.failureLow ?? cfg.failure ?? null) : (cfg.failure ?? null);
      return { score, failure };
    };
    const press = () => { if (!started) { started = true; held = true; } };
    const release = () => { if (held) { held = false; finish(judge()); } };
    p.on(p.canvas, 'mousedown', (e) => { if (e.button === 0) press(); });
    p.on(window, 'mouseup', release);
    p.on(window, 'keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); press(); } });
    p.on(window, 'keyup', (e) => { if (e.code === 'Space') release(); });
    p.status.textContent = '左ボタン（またはスペース）を押している間たまる → 緑の範囲で離す';
    p.loop((dt) => {
      if (done) return;
      t += dt;
      if (held) value = Math.min(cfg.max, value + cfg.rate * dt);
      if (held && value >= cfg.max) release();
      p.canvas.dataset.value = value.toFixed(3); // 動作確認用
      const g = p.g, W = p.canvas.width;
      g.clearRect(0, 0, W, p.canvas.height);
      drawGauge(g, 40, 80, W - 80, 36, value / cfg.max, cfg.windowMin / cfg.max, cfg.windowMax / cfg.max);
      g.fillStyle = '#e9dfc8';
      g.font = '22px sans-serif';
      const shown = cfg.unit === '秒' ? value.toFixed(1) : Math.round(value);
      g.fillText(`${shown} ${cfg.unit || ''}`, 40, 60);
      g.font = '13px sans-serif';
      g.fillText(`目標 ${cfg.windowMin}〜${cfg.windowMax} ${cfg.unit || ''}`, 40, 150);
    });
  });
}
