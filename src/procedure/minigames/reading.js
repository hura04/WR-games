// 測定値を読んで判断する（電池テスターなど）
import { createPanel, bindCancel } from './common.js';

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 520, height: 200 });
    let done = false;
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const { value, unit = 'V', verdict } = ctx.data; // verdict: 'ok' | 'low'
    p.canvas.dataset.value = String(value); // 動作確認用
    // テスターの画面
    const g = p.g, W = p.canvas.width;
    g.fillStyle = '#2b2b2b';
    g.fillRect(110, 20, 300, 160);
    g.fillStyle = '#9fb59a';
    g.fillRect(130, 40, 260, 90);
    g.fillStyle = '#1d2a1b';
    g.font = 'bold 60px "Courier New", monospace';
    g.textAlign = 'right';
    g.fillText(value.toFixed(2), 345, 108);
    g.font = 'bold 26px sans-serif';
    g.fillText(unit, 380, 108);
    g.textAlign = 'left';
    g.fillStyle = '#ddd';
    g.font = '13px sans-serif';
    g.fillText('BATTERY TESTER  /  SR・LR', 140, 160);
    g.textAlign = 'center';
    g.fillStyle = '#e9dfc8';
    g.fillText('', W / 2, 0);
    p.status.textContent = cfg.question;
    cfg.options.forEach((opt) => {
      const b = document.createElement('button');
      b.textContent = opt.label;
      b.onclick = () => {
        const correct = opt.correctIf === verdict;
        finish({ score: correct ? 1 : 0, failure: correct ? null : cfg.failure, correct, answer: opt.correctIf });
      };
      p.buttons.appendChild(b);
    });
  });
}
