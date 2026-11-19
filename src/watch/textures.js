// =============================================================
// 文字盤や刻印を Canvas に描いてテクスチャにする
// =============================================================
import * as THREE from 'three';

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function isDark(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  return r * 0.3 + gg * 0.59 + b * 0.11 < 128;
}

/** 文字盤（12時が上） */
export function dialTexture(def) {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    const ink = isDark(def.dialColor) ? '#e8e2d2' : '#1d2330';
    const grad = g.createRadialGradient(c, c * 0.8, 10, c, c, c);
    grad.addColorStop(0, def.dialColor);
    grad.addColorStop(1, shade(def.dialColor, -18));
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    g.translate(c, c);
    // 分目盛り
    for (let i = 0; i < 60; i++) {
      g.save();
      g.rotate((i / 60) * Math.PI * 2);
      g.fillStyle = ink;
      if (i % 5 === 0) g.fillRect(-9, -c * 0.95, 18, c * 0.13);
      else g.fillRect(-2, -c * 0.95, 4, c * 0.05);
      g.restore();
    }
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.font = `600 ${s * 0.055}px "Times New Roman", serif`;
    g.fillText(def.brand, 0, -c * 0.42);
    g.font = `${s * 0.03}px sans-serif`;
    g.fillText('QUARTZ', 0, c * 0.45);
    g.fillText('WATER RESIST', 0, c * 0.78);
  });
}

/** 裏蓋の刻印（ヘアライン風の同心円＋文字） */
export function casebackTexture() {
  return canvasTexture(1024, (g, s) => {
    const c = s / 2;
    g.fillStyle = '#b9bdc3';
    g.fillRect(0, 0, s, s);
    for (let r = 4; r < c; r += 3) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,95,100'},${0.05 + Math.random() * 0.08})`;
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(60,64,70,0.75)';
    g.textAlign = 'center';
    g.font = `${s * 0.045}px sans-serif`;
    g.fillText('STAINLESS STEEL', c, c - s * 0.12);
    g.fillText('WATER RESIST 3BAR', c, c);
    g.font = `${s * 0.035}px sans-serif`;
    g.fillText('No. 7Q21-0A40  JAPAN MOVT', c, c + s * 0.11);
  });
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
  });
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
  });
}

/** 木目 */
export function woodTexture(base = '#7a5236') {
  const tex = canvasTexture(512, (g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '40,22,10' : '160,110,70'},${0.05 + Math.random() * 0.12})`;
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      const y = Math.random() * s;
      g.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 6);
      g.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v + amt));
  const r = cl((n >> 16) & 255), g = cl((n >> 8) & 255), b = cl(n & 255);
  return `rgb(${r},${g},${b})`;
}
