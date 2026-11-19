// 注油：①場所に合った油を選ぶ → ②オイラーで適量を差す（押している間に油が出る）
import { createPanel, bindCancel, drawGauge, clamp01 } from './common.js';
import { OILS, getOil } from '../../data/oils.js';

export function run(container, cfg) {
  return new Promise((resolve) => {
    const p = createPanel(container, { ...cfg, instruction: cfg.instruction + ' まず油を選んでください。' });
    let done = false, chosen = null, value = 0, held = false, started = false;
    const failures = [];
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const WMIN = 45, WMAX = 65, MAX = 100, RATE = 38;
    p.status.textContent = 'どの油を使いますか？';
    OILS.forEach((o) => {
      const b = document.createElement('button');
      b.textContent = o.name;
      b.onclick = () => {
        chosen = o;
        if (o.id !== cfg.oil) failures.push('wrong_oil');
        p.buttons.innerHTML = '';
        p.status.textContent = 'ゲージを押している間、油が出ます。穴石の油だまりの半分〜3分の2（緑）で離す';
      };
      p.buttons.appendChild(b);
    });
    const release = () => {
      if (!held) return;
      held = false;
      let score = 1 - Math.abs(value - (WMIN + WMAX) / 2) / ((WMAX - WMIN) / 2) * 0.2;
      if (value < WMIN) { failures.push('too_little_oil'); score = clamp01(0.7 - (WMIN - value) / 40); }
      if (value > WMAX) { failures.push('too_much_oil'); score = clamp01(0.7 - (value - WMAX) / 40); }
      if (chosen.id !== cfg.oil) score *= 0.4;
      finish({ score, failures, oilId: chosen.id });
    };
    p.on(p.canvas, 'pointerdown', (e) => {
      if (!chosen || started || e.button !== 0) return;
      started = held = true;
      p.canvas.setPointerCapture?.(e.pointerId);
    });
    p.on(window, 'pointerup', release);
    p.on(window, 'pointercancel', release);
    p.on(window, 'keydown', (e) => { if (e.code === 'Space' && chosen && !started) { e.preventDefault(); started = held = true; } });
    p.on(window, 'keyup', (e) => { if (e.code === 'Space') release(); });
    p.loop((dt) => {
      if (done) return;
      if (held) value = Math.min(MAX, value + RATE * dt);
      if (held && value >= MAX) release();
      const g = p.g, W = p.canvas.width, H = p.canvas.height;
      g.clearRect(0, 0, W, H);
      // 穴石の断面：くぼみ（油だまり）と、たまっていく油
      const cx = W / 2, cy = 120;
      g.fillStyle = '#c8c3b8';
      g.fillRect(cx - 160, cy, 320, 50);
      g.fillStyle = '#b0102a';
      g.beginPath();
      g.moveTo(cx - 70, cy); g.lineTo(cx + 70, cy); g.lineTo(cx + 40, cy + 40); g.lineTo(cx - 40, cy + 40); g.closePath();
      g.fill();
      g.fillStyle = '#1a1511';
      g.beginPath();
      g.ellipse(cx, cy, 60, 20, 0, 0, Math.PI);
      g.fill();
      const oilColor = chosen ? chosen.color : '#d9b45a';
      const r = (value / 100) * 85;
      g.fillStyle = oilColor;
      g.globalAlpha = 0.85;
      g.beginPath();
      g.ellipse(cx, cy, r, Math.min(20, r * 0.35), 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      // オイラーの先
      g.strokeStyle = '#d0d4d8';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx, cy - 6); g.lineTo(cx + 60, cy - 90); g.stroke();
      drawGauge(g, 40, 205, W - 80, 22, value / MAX, WMIN / MAX, WMAX / MAX);
      g.fillStyle = '#e9dfc8';
      g.font = '14px sans-serif';
      g.fillText(chosen ? `使う油：${chosen.name}` : '油を選んでください', 20, 24);
      g.fillText(`油の量 ${Math.round(value)}%`, 20, 46);
      p.canvas.dataset.value = value.toFixed(2); // 動作確認用
    });
  });
}

export const correctOilName = (id) => getOil(id)?.name;
