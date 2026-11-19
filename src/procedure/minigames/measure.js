// タイムグラファーで測るだけ（受付の診断・最終検査）
// ctx.data: { m: { rate, amplitude, beatError }, score?: 0..1 }
import { createPanel, bindCancel } from './common.js';
import { drawTimegrapher } from './timegrapherScreen.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 560, height: 280 });
    let done = false, t = 0;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const m = ctx.data.m;
    p.status.textContent = ctx.data.comment || '';
    const ok = document.createElement('button');
    ok.className = 'primary';
    ok.textContent = '測定を終える';
    ok.onclick = () => finish({ score: ctx.data.score ?? 1, measurement: m });
    p.buttons.appendChild(ok);
    p.loop((dt) => {
      if (done) return;
      t += dt;
      drawTimegrapher(p.g, p.canvas.width, p.canvas.height, m, t);
      p.canvas.dataset.value = JSON.stringify(m);
    });
  });
}
