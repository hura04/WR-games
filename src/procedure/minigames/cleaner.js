// 洗浄機：かごを入れる槽の順番と時間を決める
//   正しい順番：洗浄液 → すすぎ1 → すすぎ2 → 乾燥
//   時間（ゲーム内の分）：洗浄 4〜6分、すすぎ 2〜4分、乾燥 4〜6分
import { createPanel, bindCancel, drawGauge } from './common.js';

const JARS = [
  { id: 'wash', name: '洗浄液', min: 4, max: 6 },
  { id: 'rinse1', name: 'すすぎ1', min: 2, max: 4 },
  { id: 'rinse2', name: 'すすぎ2', min: 2, max: 4 },
  { id: 'dry', name: '乾燥', min: 4, max: 6 },
];
const ORDER = ['wash', 'rinse1', 'rinse2', 'dry'];

export function run(container, cfg, ctx = {}) {
  return new Promise((resolve) => {
    const p = createPanel(container, cfg, { width: 520, height: 200 });
    let done = false, seq = [], current = null, value = 0, held = false;
    const times = [];
    const finish = (r) => { if (done) return; done = true; p.close(); resolve(r); };
    bindCancel(p, finish);
    const showChoices = () => {
      p.buttons.innerHTML = '';
      p.status.textContent = seq.length === 0 ? '最初にかごを入れる槽は？' : `${seq.length + 1}番目の槽は？（${seq.map((s) => JARS.find((j) => j.id === s).name).join(' → ')}）`;
      JARS.filter((j) => !seq.includes(j.id)).forEach((j) => {
        const b = document.createElement('button');
        b.textContent = j.name;
        b.onclick = () => { current = j; value = 0; p.buttons.innerHTML = ''; p.status.textContent = `${j.name}：ゲージを押している間かごを入れておく → 緑の範囲で離す`; };
        p.buttons.appendChild(b);
      });
    };
    const release = () => {
      if (!held) return;
      held = false;
      times.push({ jar: current, minutes: value });
      seq.push(current.id);
      current = null;
      if (seq.length === JARS.length) {
        const orderOk = seq.every((s, i) => s === ORDER[i]);
        const timingScores = times.map(({ jar, minutes }) => (minutes >= jar.min && minutes <= jar.max ? 1 : Math.max(0.3, 1 - Math.min(Math.abs(minutes - jar.min), Math.abs(minutes - jar.max)) / 4)));
        const timing = timingScores.reduce((a, b) => a + b, 0) / timingScores.length;
        const score = (orderOk ? 1 : 0.4) * timing;
        const failures = orderOk && timing >= 0.6 ? [] : ['bad_cleaning'];
        finish({ score, failures, orderOk });
      } else showChoices();
    };
    p.on(p.canvas, 'pointerdown', (e) => { if (current && e.button === 0) { held = true; p.canvas.setPointerCapture?.(e.pointerId); } });
    p.on(window, 'pointerup', release);
    p.on(window, 'pointercancel', release);
    p.on(window, 'keydown', (e) => { if (e.code === 'Space' && current) { e.preventDefault(); held = true; } });
    p.on(window, 'keyup', (e) => { if (e.code === 'Space') release(); });
    showChoices();
    p.loop((dt) => {
      if (done) return;
      if (held) value = Math.min(10, value + dt * (ctx.speed ?? 1.6));
      if (held && value >= 10) release();
      const g = p.g, W = p.canvas.width, H = p.canvas.height;
      g.clearRect(0, 0, W, H);
      JARS.forEach((j, i) => {
        const x = 40 + i * 115;
        const used = seq.includes(j.id);
        g.fillStyle = current?.id === j.id ? '#3d6a80' : used ? '#2a3a40' : '#24323a';
        g.fillRect(x, 20, 90, 90);
        g.fillStyle = 'rgba(180,220,240,0.35)';
        g.fillRect(x + 6, 45, 78, 60);
        g.fillStyle = '#e9dfc8';
        g.font = '13px sans-serif';
        g.fillText(j.name, x + 10, 38);
        if (used) g.fillText(`${seq.indexOf(j.id) + 1}番目 ✓`, x + 14, 80);
      });
      if (current) {
        drawGauge(g, 40, 140, W - 80, 24, value / 10, current.min / 10, current.max / 10);
        g.fillStyle = '#e9dfc8';
        g.fillText(`${value.toFixed(1)} 分（目安 ${current.min}〜${current.max}分）`, 40, 130);
      }
      p.canvas.dataset.value = value.toFixed(2);
    });
  });
}
