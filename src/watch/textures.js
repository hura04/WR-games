// =============================================================
// Canvas に描いて作るテクスチャ（外部の画像ファイルは使わない）
// 文字盤・刻印・仕上げ模様（コート・ド・ジュネーブ、ペルラージュ）・
// 木目・しっくい・革など
// =============================================================
import * as THREE from 'three';

const cache = new Map();

/** Canvas に描いてテクスチャを作る。key を渡すと同じものを使い回す */
export function canvasTexture(size, draw, { key, repeat, color = true, w } = {}) {
  if (key && cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w || size;
  c.height = size;
  const g = c.getContext('2d');
  draw(g, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  if (key) cache.set(key, tex);
  return tex;
}

// 再現できる乱数（毎回同じ模様にするため）
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  return r * 0.3 + gg * 0.59 + b * 0.11 < 128;
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v + amt));
  const r = cl((n >> 16) & 255), g = cl((n >> 8) & 255), b = cl(n & 255);
  return `rgb(${r},${g},${b})`;
}

// ------------------------------------------------------------
// 文字盤：サンバースト（放射状の筋目）か、マット。印刷の目盛りと文字
//   立体のインデックスと針は caseParts.js でジオメトリとして作る
// ------------------------------------------------------------
export function dialTexture(def) {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    const ink = isDark(def.dialColor) ? '#e8e2d2' : '#202634';
    g.fillStyle = def.dialColor;
    g.fillRect(0, 0, s, s);
    if (def.dialFinish === 'sunburst') {
      // 中心から放射状の細い筋。光の当たり方で明暗が変わるように見せる
      for (let i = 0; i < 1440; i++) {
        const a = (i / 1440) * Math.PI * 2;
        const lit = 0.5 + 0.5 * Math.cos(a * 2 - 0.6);
        g.strokeStyle = `rgba(255,255,255,${0.02 + lit * 0.09})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(c, c);
        g.lineTo(c + Math.cos(a) * c * 1.5, c + Math.sin(a) * c * 1.5);
        g.stroke();
      }
    } else {
      const r = rng(7);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},0.035)`;
        g.fillRect(r() * s, r() * s, 1.5, 1.5);
      }
    }
    // ふちの影（見返しの影）
    const vg = g.createRadialGradient(c, c, c * 0.82, c, c, c);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = vg;
    g.fillRect(0, 0, s, s);
    g.translate(c, c);
    // 分目盛り（ミニッツトラック）
    g.strokeStyle = ink;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, c * 0.955, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 60; i++) {
      g.save();
      g.rotate((i / 60) * Math.PI * 2);
      g.fillStyle = ink;
      if (i % 5 !== 0) g.fillRect(-1.6, -c * 0.955, 3.2, c * 0.045);
      g.restore();
    }
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.font = `600 ${s * 0.052}px "Times New Roman", serif`;
    g.fillText(def.brand, 0, -c * 0.38);
    g.font = `${s * 0.026}px sans-serif`;
    g.fillText(def.movement === 'mechanical' ? 'AUTOMATIC' : 'QUARTZ', 0, -c * 0.3);
    g.font = `${s * 0.022}px sans-serif`;
    g.fillText(def.movement === 'mechanical' ? '25 JEWELS' : 'WATER RESIST', 0, c * 0.45);
    if (def.movement === 'mechanical') g.fillText('100m / 330ft', 0, c * 0.5);
  });
}

// ------------------------------------------------------------
// 裏蓋の刻印
// ------------------------------------------------------------
export function casebackTexture(def = {}) {
  const screw = def.caseback === 'screw';
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#c3c7cc';
    g.fillRect(0, 0, s, s);
    const r = rng(3);
    for (let rr = 4; rr < c; rr += 2) {
      g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '80,85,92'},${0.04 + r() * 0.08})`;
      g.beginPath();
      g.arc(c, c, rr, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(55,60,66,0.8)';
    g.textAlign = 'center';
    g.font = `${s * 0.042}px sans-serif`;
    const lines = screw
      ? ['STAINLESS STEEL', 'SCREW BACK', 'WATER RESISTANT 10 BAR', 'AUTOMATIC  CAL. TK-28A']
      : ['STAINLESS STEEL', 'WATER RESIST 3BAR', 'No. 7Q21-0A40  JAPAN MOVT'];
    lines.forEach((t, i) => g.fillText(t, c, c - s * 0.12 + i * s * 0.075));
  }, { key: screw ? 'cb-screw' : 'cb-snap' });
}

/** 電池の＋面 */
export function batteryTexture(label = 'SR626SW') {
  return canvasTexture(256, (g, s) => {
    const c = s / 2;
    const grad = g.createRadialGradient(c * 0.8, c * 0.7, 5, c, c, c);
    grad.addColorStop(0, '#f4f5f7');
    grad.addColorStop(1, '#9ea3aa');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.fillStyle = '#4a4f57';
    g.textAlign = 'center';
    g.font = `bold ${s * 0.2}px sans-serif`;
    g.fillText('+', c, c - s * 0.08);
    g.font = `${s * 0.11}px sans-serif`;
    g.fillText(label, c, c + s * 0.12);
    g.fillText('1.55V', c, c + s * 0.25);
  }, { key: 'battery-' + label });
}

/** 小さな文字ラベル（AC端子など） */
export function labelTexture(text, bg = '#d4a94a', fg = '#3a2a08') {
  return canvasTexture(128, (g, s) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, s, s);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `bold ${s * 0.45}px sans-serif`;
    g.fillText(text, s / 2, s / 2);
  }, { key: `label-${text}-${bg}` });
}

// ------------------------------------------------------------
// ムーブメントの仕上げ模様
// ------------------------------------------------------------
/** コート・ド・ジュネーブ（受けの平行な波模様） */
export function genevaStripesTexture(base = '#d7d4cc') {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const stripe = s / 6;
    for (let i = 0; i < 7; i++) {
      const x0 = i * stripe;
      const grad = g.createLinearGradient(x0, 0, x0 + stripe, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0.0)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.18)');
      g.fillStyle = grad;
      g.fillRect(x0, 0, stripe, s);
    }
  }, { key: 'geneva-' + base, repeat: [1, 1] });
}

/** ペルラージュ（地板のうろこ状の円模様） */
export function perlageTexture(base = '#cfccc4') {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const step = s / 12;
    for (let y = 0; y <= 13; y++)
      for (let x = 0; x <= 13; x++) {
        const cx = x * step + (y % 2) * step * 0.5;
        const cy = y * step * 0.8;
        const grad = g.createRadialGradient(cx - step * 0.15, cy - step * 0.15, 1, cx, cy, step * 0.62);
        grad.addColorStop(0, 'rgba(255,255,255,0.32)');
        grad.addColorStop(0.7, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        g.fillStyle = grad;
        g.beginPath();
        g.arc(cx, cy, step * 0.62, 0, Math.PI * 2);
        g.fill();
      }
  }, { key: 'perlage-' + base, repeat: [2, 2] });
}

/** 回転錘（ローター）の刻印 */
export function rotorTexture(brand) {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#c9c6be';
    g.fillRect(0, 0, s, s);
    // 円弧状のコート・ド・ジュネーブ
    for (let r = 40; r < c; r += 26) {
      g.strokeStyle = 'rgba(255,255,255,0.25)';
      g.lineWidth = 10;
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.08)';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(c, c, r + 8, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#7a5a1e';
    g.textAlign = 'center';
    g.font = `bold ${s * 0.05}px serif`;
    g.fillText(brand, c, c + s * 0.27);
    g.font = `${s * 0.03}px sans-serif`;
    g.fillText('AUTOMATIC  25 JEWELS', c, c + s * 0.32);
    g.fillText('SWISS-STYLE FINISH  ·  TK-28A', c, c + s * 0.36);
  }, { key: 'rotor-' + brand });
}

/** ヘアライン（ブラッシュ仕上げ）の筋目。roughnessMap 用 */
export function brushedTexture(dir = 'x') {
  return canvasTexture(256, (g, s) => {
    g.fillStyle = '#6a6a6a';
    g.fillRect(0, 0, s, s);
    const r = rng(11);
    for (let i = 0; i < 700; i++) {
      const v = Math.floor(80 + r() * 90);
      g.strokeStyle = `rgb(${v},${v},${v})`;
      g.globalAlpha = 0.5;
      g.beginPath();
      const p = r() * s;
      if (dir === 'x') { g.moveTo(0, p); g.lineTo(s, p); } else { g.moveTo(p, 0); g.lineTo(p, s); }
      g.stroke();
    }
  }, { key: 'brushed-' + dir, color: false, repeat: [1, 1] });
}

// ------------------------------------------------------------
// 工房の材質
// ------------------------------------------------------------
/** 木目 */
export function woodTexture(base = '#7a5236', seed = 1) {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const r = rng(seed);
    for (let i = 0; i < 110; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? '40,22,10' : '170,120,80'},${0.04 + r() * 0.12})`;
      g.lineWidth = 1 + r() * 3;
      g.beginPath();
      const y = r() * s;
      g.moveTo(0, y);
      for (let x = 0; x <= s; x += 24) g.lineTo(x, y + Math.sin(x / 70 + i) * 5);
      g.stroke();
    }
  }, { key: `wood-${base}-${seed}`, repeat: [1, 1] });
}

/** フローリング（板の継ぎ目つき） */
export function plankTexture(base = '#6b4630') {
  return canvasTexture(1024, (g, s) => {
    const r = rng(5);
    const rows = 8;
    const h = s / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * s * 0.5;
      while (x < s) {
        const len = s * (0.35 + r() * 0.4);
        g.fillStyle = shade(base, Math.floor((r() - 0.5) * 30));
        g.fillRect(x, i * h, len, h);
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(${r() < 0.5 ? '35,20,10' : '160,110,70'},${0.05 + r() * 0.1})`;
          g.lineWidth = 1 + r() * 2;
          g.beginPath();
          const yy = i * h + r() * h;
          g.moveTo(x, yy);
          g.bezierCurveTo(x + len * 0.3, yy + (r() - 0.5) * 8, x + len * 0.6, yy + (r() - 0.5) * 8, x + len, yy);
          g.stroke();
        }
        g.fillStyle = 'rgba(20,10,5,0.6)';
        g.fillRect(x, i * h, 2, h);
        x += len;
      }
      g.fillStyle = 'rgba(20,10,5,0.55)';
      g.fillRect(0, i * h, s, 2);
    }
  }, { key: 'planks-' + base, repeat: [3, 3] });
}

/** しっくい壁（細かいムラ） */
export function plasterTexture(base = '#ddd2bd') {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const r = rng(9);
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '120,100,80' : '255,250,240'},${0.03 + r() * 0.05})`;
      const rr = 2 + r() * 14;
      g.beginPath();
      g.arc(r() * s, r() * s, rr, 0, Math.PI * 2);
      g.fill();
    }
  }, { key: 'plaster-' + base, repeat: [4, 2] });
}

/** 革ベルト（シボ＋ステッチ）。横長 */
export function leatherTexture(base = '#6b3b22', stitch = '#e9dcc0') {
  return canvasTexture(256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,230,200'},${0.03 + r() * 0.05})`;
      g.beginPath();
      g.arc(r() * w, r() * h, 1 + r() * 2.5, 0, Math.PI * 2);
      g.fill();
    }
    // ふちのステッチ（ベルトの長さ方向 = 縦）
    g.strokeStyle = stitch;
    g.lineWidth = 4;
    g.setLineDash([14, 9]);
    for (const x of [w * 0.12, w * 0.88]) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  }, { key: `leather-${base}`, w: 128 });
}

/** ゴム/作業マットのざらつき */
export function matTexture(base = '#2f6b57') {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    const r = rng(4);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},0.04)`;
      g.fillRect(r() * s, r() * s, 2, 2);
    }
    // 目盛りの線（作業マットによくある方眼）
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 2;
    for (let i = 0; i <= s; i += s / 8) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke();
    }
  }, { key: 'mat-' + base, repeat: [3, 2] });
}

/** 文字の看板・ラベル（横長） */
export function signTexture(text, { bg = '#2a1d12', fg = '#e7c477', font = 'serif', w = 1024, h = 256 } = {}) {
  return canvasTexture(h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `bold ${h * 0.5}px ${font}`;
    g.fillText(text, w / 2, h / 2);
  }, { key: `sign-${text}-${bg}`, w });
}

/** 壁掛け時計の文字盤（ローマ数字） */
export function clockFaceTexture(color = '#f4ecd8', ink = '#222') {
  return canvasTexture(512, (g, s) => {
    const c = s / 2;
    g.fillStyle = color;
    g.fillRect(0, 0, s, s);
    g.translate(c, c);
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `${s * 0.09}px serif`;
    const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    roman.forEach((t, i) => {
      const a = (i / 12) * Math.PI * 2;
      g.fillText(t, Math.sin(a) * c * 0.76, -Math.cos(a) * c * 0.76);
    });
    for (let i = 0; i < 60; i++) {
      g.save();
      g.rotate((i / 60) * Math.PI * 2);
      g.fillRect(-1.5, -c * 0.96, 3, i % 5 ? c * 0.04 : c * 0.07);
      g.restore();
    }
  }, { key: `clockface-${color}` });
}
