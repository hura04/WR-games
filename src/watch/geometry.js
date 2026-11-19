// =============================================================
// 時計部品の形を作る関数（単位は mm）
// どの機種でも使い回せるように、寸法を引数で受け取ります。
// =============================================================
import * as THREE from 'three';

/** ドーナツ型の板（リング）を厚み付きで作る。Y軸が上。y=0 が底面 */
export function ringGeometry(outerR, innerR, height, bevel = 0, segments = 64) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height - bevel * 2,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: segments,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return geo;
}

/** 円板（y=0 が底面） */
export function discGeometry(r, height, segments = 64) {
  const geo = new THREE.CylinderGeometry(r, r, height, segments);
  geo.translate(0, height / 2, 0);
  return geo;
}

/**
 * 歯車（インボリュート曲線を簡略化した台形の歯）
 * @param {number} teeth  歯数
 * @param {number} module モジュール（歯の大きさ。ピッチ円直径 = 歯数 × モジュール）
 * @param {number} thickness 厚さ
 * @param {object} opt { hole: 軸穴の半径, spokes: スポーク数 }
 */
export function gearGeometry(teeth, module, thickness, opt = {}) {
  const pitchR = (teeth * module) / 2;
  const outerR = pitchR + module;
  const rootR = pitchR - 1.25 * module;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [rootR, a],
      [rootR, a + step * 0.15],
      [outerR, a + step * 0.32],
      [outerR, a + step * 0.52],
      [rootR, a + step * 0.7],
    ];
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  const holeR = opt.hole ?? module * 1.2;
  const hole = new THREE.Path();
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  // スポーク（肉抜き）
  const spokes = opt.spokes ?? (teeth > 30 ? 4 : 0);
  if (spokes > 0) {
    const inR = holeR + module * 2;
    const outR = rootR - module * 1.5;
    if (outR > inR + module) {
      const w = (Math.PI * 2) / spokes;
      for (let i = 0; i < spokes; i++) {
        const p = new THREE.Path();
        const a0 = i * w + w * 0.18;
        const a1 = (i + 1) * w - w * 0.18;
        p.absarc(0, 0, outR, a0, a1, false);
        p.absarc(0, 0, inR, a1, a0, true);
        shape.holes.push(p);
      }
    }
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 6 });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** マイナスネジの頭（溝つき） */
export function screwHead(r, height) {
  const g = new THREE.Group();
  const head = new THREE.Mesh(discGeometry(r, height, 24));
  g.add(head);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 2.05, height * 0.5, r * 0.35));
  slot.position.y = height * 0.8;
  g.add(slot);
  return { group: g, head, slot };
}

/** 角を丸めた板（マットやトレイ用） */
export function roundedBoxGeometry(w, h, d, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}
