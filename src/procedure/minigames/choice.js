// 選択：正しい選択肢を選ぶ（電池の向き、コマの径など）
import { createPanel, bindCancel } from './common.js';

export function run(container, cfg) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 10, height: 10 });
    p.canvas.style.display = 'none';
    let done = false;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    p.status.textContent = cfg.question;
    cfg.options.forEach((opt) => {
      const b = document.createElement('button');
      b.textContent = opt.label;
      b.onclick = () =>
        finish(opt.correct ? { score: 1, failure: null } : { score: 0.3, failure: opt.failure || cfg.failure || null });
      p.buttons.appendChild(b);
    });
  });
}
