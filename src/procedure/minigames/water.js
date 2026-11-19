// 防水テスト：テスト圧を選ぶ → 加圧して、圧力が保たれるか（漏れがないか）を見る
// ctx.data: { leak: true/false }
import { createPanel, bindCancel } from './common.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 520, height: 220 });
    let done = false, phase = 'choose', t = 0, pressure = 0, target = 0;
    const failures = [];
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    p.status.textContent = 'テスト圧を選んでください';
    cfg.options.forEach((bar) => {
      const b = document.createElement('button');
      b.textContent = `${bar} 気圧`;
      b.onclick = () => {
        if (bar !== cfg.rating) failures.push('wrong_test_pressure');
        target = cfg.rating; // 間違えても正しい圧でやり直す
        phase = 'press';
        p.buttons.innerHTML = '';
        p.status.textContent = bar === cfg.rating ? '加圧中…' : `${bar}気圧は合っていない。${cfg.rating}気圧でやり直して加圧中…`;
      };
      p.buttons.appendChild(b);
    });
    p.loop((dt) => {
      if (done) return;
      const g = p.g, W = p.canvas.width, H = p.canvas.height;
      if (phase !== 'choose') t += dt;
      if (phase === 'press') {
        pressure = Math.min(target, pressure + dt * target * 0.8);
        if (pressure >= target) { phase = 'hold'; t = 0; p.status.textContent = '圧力を保って様子を見ています…'; }
      } else if (phase === 'hold') {
        if (ctx.data.leak) pressure = Math.max(0, pressure - dt * 1.4);
        if (t > 2.5) {
          phase = 'result';
          const leak = ctx.data.leak;
          if (leak) failures.push('water_leak');
          p.status.textContent = leak ? '圧力が下がっていく…空気漏れあり（防水不良）' : '圧力は一定。漏れなし。防水検査 合格！';
          const ok = document.createElement('button');
          ok.className = 'primary';
          ok.textContent = '検査を終える';
          ok.onclick = () => finish({ score: leak ? 0.2 : failures.length ? 0.85 : 1, failures, leak });
          p.buttons.appendChild(ok);
        }
      }
      g.fillStyle = '#1a1511';
      g.fillRect(0, 0, W, H);
      // 圧力計
      const cx = W / 2, cy = 150, r = 100;
      g.strokeStyle = '#8a7a62';
      g.lineWidth = 3;
      g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
      for (let i = 0; i <= 20; i += 2) {
        const a = Math.PI + (i / 20) * Math.PI;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.stroke();
        g.fillStyle = '#b8a98f';
        g.font = '11px sans-serif';
        g.fillText(String(i), cx + Math.cos(a) * (r + 12) - 6, cy + Math.sin(a) * (r + 12) + 4);
      }
      const a = Math.PI + (pressure / 20) * Math.PI;
      g.strokeStyle = '#e0705c';
      g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 14), cy + Math.sin(a) * (r - 14)); g.stroke();
      g.fillStyle = '#e9dfc8';
      g.font = '16px sans-serif';
      g.fillText(`${pressure.toFixed(1)} 気圧`, cx - 34, cy + 30);
      p.canvas.dataset.value = phase;
    });
  });
}
