// 点検：部品の様子を見て判断する
// ctx.data: { text, draw: 'mainspring_ok' | 'mainspring_fatigued', options: [{ label, correct, value }] }
import { createPanel, bindCancel } from './common.js';

function drawMainspring(g, W, H, healthy) {
  g.fillStyle = '#efe9dc';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#4a4d52';
  g.lineWidth = 3;
  g.beginPath();
  if (healthy) {
    // 健全：大きく開いたS字（2つの渦が反対向き）
    for (let i = 0; i <= 400; i++) {
      const tt = i / 400;
      const a = tt * Math.PI * 5;
      const r = 8 + tt * 70;
      const x = W * 0.32 + Math.cos(a) * r * 0.9;
      const y = H * 0.5 + Math.sin(a) * r * 0.9;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    for (let i = 0; i <= 200; i++) {
      const tt = i / 200;
      const a = Math.PI - tt * Math.PI * 2.2;
      const r = 70 - tt * 45;
      g.lineTo(W * 0.62 + Math.cos(a) * r, H * 0.5 - Math.sin(a) * r);
    }
  } else {
    // へたり：小さく巻いたまま縮こまっている
    for (let i = 0; i <= 500; i++) {
      const tt = i / 500;
      const a = tt * Math.PI * 14;
      const r = 6 + tt * 48;
      const x = W * 0.5 + Math.cos(a) * r;
      const y = H * 0.5 + Math.sin(a) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
  }
  g.stroke();
  g.fillStyle = '#6d6556';
  g.font = '12px sans-serif';
  g.fillText('香箱から取り出したゼンマイ（自然に開いた状態）', 12, H - 10);
}

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, { ...cfg, instruction: ctx.data.text }, { width: 520, height: 220 });
    let done = false;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    if (ctx.data.draw?.startsWith('mainspring')) drawMainspring(p.g, p.canvas.width, p.canvas.height, ctx.data.draw === 'mainspring_ok');
    p.status.textContent = cfg.question;
    ctx.data.options.forEach((opt) => {
      const b = document.createElement('button');
      b.textContent = opt.label;
      b.onclick = () => finish({ score: opt.correct ? 1 : 0.3, failure: opt.correct ? null : cfg.failure || null, correct: opt.correct, value: opt.value });
      p.buttons.appendChild(b);
    });
  });
}
