// タイムグラファーを見ながらの調整
//   mode 'beat' : ヒゲ持ちを回して片振りを0に近づける
//   mode 'rate' : 緩急針を動かして歩度を 0〜+5 秒/日 に合わせる
// ctx.data: { pos: 現在の位置(-1..1), measureAt(pos) → { rate, amplitude, beatError } }
import { createPanel, bindCancel, tremorAt } from './common.js';
import { drawTimegrapher } from './timegrapherScreen.js';

export function scoreBeat(be) {
  if (be <= 0.3) return 1;
  if (be <= 0.6) return 0.85;
  if (be <= 1.0) return 0.6;
  return 0.3;
}
export function scoreRate(rate) {
  if (rate >= 0 && rate <= 5) return 1;
  if (rate >= -3 && rate <= 10) return 0.8;
  const off = rate < 0 ? -rate : rate - 5;
  return Math.max(0.2, 0.8 - off / 40);
}

export function run(container, cfg, ctx) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 560, height: 280 });
    let pos = ctx.data.pos, done = false, t = 0, dragging = false, lastX = 0;
    const jitter = 0.004 * (ctx.tremor ?? 1);
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const clampPos = (v) => Math.max(-1, Math.min(1, v));
    p.on(p.canvas, 'pointerdown', (e) => { dragging = true; lastX = e.clientX; p.canvas.setPointerCapture?.(e.pointerId); });
    p.on(window, 'pointerup', () => (dragging = false));
    p.on(p.canvas, 'pointermove', (e) => {
      if (!dragging) return;
      const r = p.canvas.getBoundingClientRect();
      pos = clampPos(pos + ((e.clientX - lastX) / r.width) * 0.5);
      lastX = e.clientX;
    });
    const step = (d) => () => (pos = clampPos(pos + d));
    for (const [label, d] of [['◀◀', -0.05], ['◀', -0.01], ['▶', 0.01], ['▶▶', 0.05]]) {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = step(d);
      p.buttons.appendChild(b);
    }
    const ok = document.createElement('button');
    ok.className = 'primary';
    ok.textContent = 'この位置で決定';
    ok.onclick = () => {
      const m = ctx.data.measureAt(pos);
      const score = cfg.mode === 'beat' ? scoreBeat(m.beatError) : scoreRate(m.rate);
      finish({ score, pos, measurement: m });
    };
    p.buttons.appendChild(ok);
    p.status.textContent = cfg.mode === 'beat' ? '左右にドラッグ／ボタンでヒゲ持ちを回す。2本の線を1本に重ねる' : '左右にドラッグ／ボタンで緩急針を動かす。線を水平（やや右上がり）に';
    p.loop((dt) => {
      if (done) return;
      t += dt;
      if (dragging) pos = clampPos(pos + tremorAt(t * 3, 1.7) * jitter);
      const m = ctx.data.measureAt(pos);
      drawTimegrapher(p.g, p.canvas.width, p.canvas.height, m, t, { mode: cfg.mode, pos });
      p.canvas.dataset.value = JSON.stringify(m); // 動作確認用
      p.canvas.dataset.pos = pos.toFixed(3);
    });
  });
}
