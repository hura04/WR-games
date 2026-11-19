// =============================================================
// ミニゲームの共通部品（パネル・ゲージ・手ブレの揺れ）
// 各ミニゲームは run(container, cfg, ctx) を持ち、
//   Promise<{ score: 0..1, failure: string|null, cancelled?: boolean }>
// を返します。
//   cfg : 工程データの minigames の1件
//   ctx : { tremor: 手ブレ倍率, data: 測定値などの追加情報 }
// =============================================================

export function createPanel(container, cfg, { width = 520, height = 240 } = {}) {
  container.innerHTML = '';
  container.classList.add('show');
  const el = document.createElement('div');
  el.className = 'mg-panel';
  el.innerHTML = `
    <div class="mg-title">${cfg.title || ''}</div>
    <div class="mg-inst">${cfg.instruction || ''}</div>
    <canvas width="${width}" height="${height}"></canvas>
    <div class="mg-status"></div>
    <div class="mg-buttons"></div>
    <button class="mg-cancel">やめる（Esc）</button>`;
  container.appendChild(el);
  const canvas = el.querySelector('canvas');
  canvas.style.touchAction = 'none'; // タッチでスクロールやズームが起きないように
  const ctx2d = canvas.getContext('2d');
  const status = el.querySelector('.mg-status');
  const buttons = el.querySelector('.mg-buttons');
  const cancelBtn = el.querySelector('.mg-cancel');
  let raf = 0;
  const cleanups = [];
  const api = {
    el, canvas, g: ctx2d, status, buttons, cancelBtn,
    loop(fn) {
      let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        fn(dt, now / 1000);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    /** キャンバス上の位置（キャンバスの画素単位）に変換 */
    local(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
    },
    on(target, type, fn, opt) {
      target.addEventListener(type, fn, opt);
      cleanups.push(() => target.removeEventListener(type, fn, opt));
    },
    close() {
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      container.classList.remove('show');
      container.innerHTML = '';
    },
  };
  return api;
}

/** 中止（Escキーかボタン）を待てるようにする */
export function bindCancel(panel, finish) {
  panel.on(panel.cancelBtn, 'click', () => finish({ score: 0, failure: null, cancelled: true }));
  panel.on(window, 'keydown', (e) => {
    if (e.key === 'Escape') finish({ score: 0, failure: null, cancelled: true });
  });
}

/** なめらかな手ブレ（いくつかのsin波の合成）。-1..1 程度 */
export function tremorAt(t, seed = 0) {
  return (
    Math.sin(t * 7.3 + seed) * 0.5 +
    Math.sin(t * 13.1 + seed * 2.1) * 0.3 +
    Math.sin(t * 23.7 + seed * 3.7) * 0.2
  );
}

/** 横向きのゲージを描く */
export function drawGauge(g, x, y, w, h, value, zoneMin, zoneMax, { danger = null } = {}) {
  g.fillStyle = '#2a2622';
  g.fillRect(x, y, w, h);
  if (danger !== null) {
    g.fillStyle = 'rgba(200,60,50,0.55)';
    g.fillRect(x + w * danger, y, w * (1 - danger), h);
  }
  g.fillStyle = 'rgba(90,180,110,0.75)';
  g.fillRect(x + w * zoneMin, y, w * (zoneMax - zoneMin), h);
  g.fillStyle = '#f2e6c9';
  g.fillRect(x + w * Math.max(0, Math.min(1, value)) - 2, y - 6, 4, h + 12);
  g.strokeStyle = '#8a7a62';
  g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
