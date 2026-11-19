// 簡単なアニメーション（値を時間をかけて変える）
const active = new Set();

export function tween({ duration = 0.5, onUpdate, onDone, ease = easeInOut }) {
  const t = { elapsed: 0, duration, onUpdate, onDone, ease };
  active.add(t);
  return t;
}

export function updateTweens(dt) {
  for (const t of active) {
    t.elapsed += dt;
    const k = Math.min(1, t.elapsed / t.duration);
    t.onUpdate(t.ease(k));
    if (k >= 1) {
      active.delete(t);
      t.onDone?.();
    }
  }
}

export const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
