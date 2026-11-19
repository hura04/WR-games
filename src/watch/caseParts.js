// =============================================================
// 腕時計の外装（ケース・ラグ・ベゼル・風防・リューズ・文字盤・針・ベルト・裏蓋）
// クォーツでも機械式でも共通。寸法は watches.js の機種データから。
// -------------------------------------------------------------
// 座標の決まり（単位 mm）
//   +Y : 文字盤側（表）  −Y : 裏蓋側（裏）
//   −Z : 12時方向        +X : 3時方向（リューズ側）
// =============================================================
import * as THREE from 'three';
import { discGeometry, ringGeometry } from './geometry.js';
import { dialTexture, casebackTexture, leatherTexture, brushedTexture } from './textures.js';

export const metal = (color, rough = 0.25, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, ...extra });
export const plain = (color, rough = 0.7, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
/**
 * 細い部品（パッキンなど）用の「見えない当たり判定」。
 * 見た目は変えずに、クリック・タップを受ける範囲だけ広げる。
 * tube：当たり判定の太さ(mm)、flat：厚み方向の縮め具合（ケースや裏蓋の邪魔をしないため）
 */
export function addRingHitArea(mesh, radius, tube, flat = 0.45) {
  const hit = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, 64), HIT_MAT);
  hit.scale.set(1, 1, flat);
  hit.userData.hitArea = true;
  mesh.add(hit);
  return hit;
}

/** 部品idをつける（中のメッシュのうち、まだidのないもの全部に） */
export function tag(obj, partId) {
  obj.traverse((o) => {
    if (o.isMesh) {
      if (!o.userData.partId) o.userData.partId = partId;
      if (o.userData.hitArea) return;
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  obj.userData.partId = partId;
  obj.name = partId;
  return obj;
}

/** 断面の点列（r, y）を回転させて作る立体。点は「内側の下 → 外側 → 内側の上」の順 */
function lathe(points, segments = 96) {
  const geo = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
  geo.computeVertexNormals();
  return geo;
}

/** ギザギザ（ローレット）のついたリューズ */
function crownGeometry(r, len, teeth = 36) {
  const geo = new THREE.CylinderGeometry(r, r, len, teeth * 4, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr < r * 0.99 || Math.abs(y) > len / 2 - 0.25) continue; // ふたの面はそのまま
    const a = Math.atan2(z, x);
    const k = Math.sin(a * teeth) > 0 ? 1 : 0.9;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** 先のとがった針（バトン型）。根元が中心、先端が −Z */
function handShape(len, width, tail = 0.15) {
  const s = new THREE.Shape();
  const t = len * tail;
  s.moveTo(-width * 0.5, t);
  s.lineTo(-width * 0.42, -len * 0.92);
  s.lineTo(0, -len);
  s.lineTo(width * 0.42, -len * 0.92);
  s.lineTo(width * 0.5, t);
  s.absarc(0, t, width * 0.5, 0, Math.PI, false);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.06, bevelSegments: 2 });
  geo.rotateX(Math.PI / 2); // 形の Y → Z（先端が −Z）、厚みは −Y 方向
  geo.translate(0, 0.2, 0); // 厚みを上向きにそろえる
  return geo;
}

/**
 * 外装を組み立てる
 * @param {object} def 機種データ
 * @param {(id:string, obj:THREE.Object3D, parent?:THREE.Object3D)=>THREE.Object3D} add 部品登録関数
 * @param {THREE.Group} root
 */
export function buildExterior(def, add, root) {
  const R = def.caseDiameter / 2;
  const H = def.caseThickness;
  const yBack = -H / 2;
  const yFront = H / 2;
  const bezelH = def.bezelHeight ?? 1.6;
  const crystalR = def.crystalDiameter / 2;
  const backR = def.casebackDiameter / 2;
  const brushed = brushedTexture('x');
  const caseMat = metal(def.caseColor, 0.18, { roughnessMap: brushed });
  const polished = metal(def.caseColor, 0.08);

  // ---- ケース（胴）：側面がふくらんだ断面を回転 ----
  const innerLow = backR - 0.6;
  const innerHigh = crystalR + 0.4;
  const yMid = yFront - bezelH;
  const caseGeo = lathe([
    [innerLow, yBack],
    [R - 1.1, yBack],
    [R - 0.45, yBack + 0.35],
    [R - 0.05, yBack + 1.3],
    [R, (yBack + yMid) / 2],
    [R - 0.05, yMid - 0.6],
    [R - 0.3, yMid],
    [innerHigh, yMid],
    [innerHigh, yBack + 3.2],
    [innerLow, yBack + 3.0],
    [innerLow, yBack],
  ]);
  const caseGroup = new THREE.Group();
  caseGroup.add(new THREE.Mesh(caseGeo, polished));

  // ---- ラグ：横から見た形を押し出して作る ----
  const lugT = 2.3;
  const lugLen = def.lugLength ?? 7.5;
  const lugTop = yMid - 0.2;
  const prof = new THREE.Shape();
  prof.moveTo(-1.5, lugTop);
  prof.bezierCurveTo(lugLen * 0.4, lugTop, lugLen * 0.75, lugTop - 0.6, lugLen, lugTop - 2.0);
  prof.lineTo(lugLen, lugTop - 3.6);
  prof.bezierCurveTo(lugLen * 0.6, lugTop - 3.5, lugLen * 0.3, yBack + 1.6, -1.5, yBack + 1.2);
  prof.closePath();
  const lugGeo = new THREE.ExtrudeGeometry(prof, { depth: lugT, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.25, bevelSegments: 3, curveSegments: 16 });
  lugGeo.translate(0, 0, -lugT / 2);
  lugGeo.rotateY(-Math.PI / 2); // 形の X → +Z（6時方向）
  for (const sx of [-1, 1])
    for (const side of [1, -1]) {
      const lug = new THREE.Mesh(lugGeo, caseMat);
      lug.position.set(sx * (def.lugWidth / 2 + lugT / 2), 0, side * (R - 1.6));
      if (side < 0) lug.rotation.y = Math.PI;
      caseGroup.add(lug);
    }
  add('case', caseGroup, root);

  // ---- ベゼル（斜めに面取りした輪） ----
  const bezel = new THREE.Mesh(
    lathe([
      [crystalR + 0.1, yMid],
      [R - 0.3, yMid],
      [R - 0.5, yMid + bezelH * 0.6],
      [crystalR + 1.0, yFront],
      [crystalR + 0.1, yFront],
      [crystalR + 0.1, yMid],
    ]),
    polished,
  );
  add('bezel', bezel, root);

  // ---- 風防（サファイアは平ら、ミネラルは少しドーム） ----
  const crystal = new THREE.Mesh(
    discGeometry(crystalR + 0.05, 1.1),
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0, roughness: 0.02, ior: def.crystal === 'sapphire' ? 1.77 : 1.52, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false }),
  );
  crystal.position.y = yFront - 1.1;
  add('crystal', crystal, root);

  // ---- 文字盤（印刷はテクスチャ、インデックスは立体） ----
  const dialY = yFront - (def.dialDepth ?? 3.0);
  const dialR = crystalR + 0.3;
  const dialGroup = new THREE.Group();
  const dialGeo = new THREE.CircleGeometry(dialR, 96);
  dialGeo.rotateX(-Math.PI / 2);
  const dialMat = new THREE.MeshStandardMaterial({ map: dialTexture(def), metalness: def.dialFinish === 'sunburst' ? 0.55 : 0.05, roughness: def.dialFinish === 'sunburst' ? 0.35 : 0.65 });
  const dialFace = new THREE.Mesh(dialGeo, dialMat);
  const dialDisc = new THREE.Mesh(discGeometry(dialR, 0.35), plain('#888', 0.5));
  dialDisc.position.y = -0.36;
  dialGroup.add(dialFace, dialDisc);
  const idxMat = metal(def.handColor === '#f0e6cf' ? '#e8d9a8' : '#e6e8eb', 0.12);
  const lume = plain('#efe9d2', 0.6, { emissive: '#3a5a3a', emissiveIntensity: 0.15 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const len = i % 3 === 0 ? dialR * 0.2 : dialR * 0.15;
    const count = i === 0 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(i % 3 === 0 ? 1.1 : 0.8, 0.35, len), idxMat);
      const off = count === 2 ? (k - 0.5) * 1.5 : 0;
      const rr = dialR * 0.8;
      marker.position.set(Math.sin(a) * rr + Math.cos(a) * off, 0.18, -Math.cos(a) * rr + Math.sin(a) * off);
      marker.rotation.y = -a;
      dialGroup.add(marker);
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, len * 0.6), lume);
      dot.position.copy(marker.position);
      dot.position.y = 0.38;
      dot.rotation.y = -a;
      dialGroup.add(dot);
    }
  }
  dialGroup.position.y = dialY;
  add('dial', dialGroup, root);

  // ---- 針 ----
  const handMat = metal(def.handColor, 0.12);
  const handsGroup = new THREE.Group();
  const mkHand = (len, width, y, lumeOn = true) => {
    const pivot = new THREE.Group();
    pivot.add(new THREE.Mesh(handShape(len, width), handMat));
    if (lumeOn) {
      const l = new THREE.Mesh(handShape(len * 0.62, width * 0.45, -0.3), lume);
      l.position.y = 0.17;
      pivot.add(l);
    }
    pivot.position.y = y;
    handsGroup.add(pivot);
    return pivot;
  };
  const hourHand = mkHand(dialR * 0.55, 1.3, 0.55);
  const minuteHand = mkHand(dialR * 0.86, 1.0, 0.8);
  const secondHand = new THREE.Group();
  const secMat = metal(def.secondColor || '#b83a2c', 0.3);
  const secBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, dialR * 1.15), secMat);
  secBar.position.z = -dialR * 0.33;
  const counter = new THREE.Mesh(discGeometry(0.9, 0.1, 20), secMat);
  counter.position.z = dialR * 0.18;
  const hub = new THREE.Mesh(discGeometry(0.75, 0.3, 20), secMat);
  secondHand.add(secBar, counter, hub);
  secondHand.position.y = 1.05;
  handsGroup.add(secondHand);
  handsGroup.position.y = dialY;
  add('hands', handsGroup, root);

  // ---- リューズ（ギザギザ付き）と巻真のパイプ ----
  const crownR = def.crownRadius ?? 2.6;
  const crownGroup = new THREE.Group();
  const crown = new THREE.Mesh(crownGeometry(crownR, 2.8), polished);
  crown.rotation.z = Math.PI / 2;
  crown.position.x = R + 2.0;
  const capGeo = new THREE.CircleGeometry(crownR * 0.75, 32);
  capGeo.rotateY(Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, metal(def.caseColor, 0.05));
  cap.position.x = R + 3.41;
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.6, 20), caseMat);
  tube.rotation.z = Math.PI / 2;
  tube.position.x = R + 0.4;
  crownGroup.add(crown, cap, tube);
  crownGroup.position.y = (yBack + yMid) / 2;
  add('crown', crownGroup, root);

  // ---- 裏蓋 ----
  const cbGroup = new THREE.Group();
  const cbThick = def.caseback === 'screw' ? 1.6 : 1.0;
  const cbBody = new THREE.Mesh(
    lathe([
      [0, -cbThick],
      [backR - 1.2, -cbThick],
      [backR - 0.3, -cbThick + 0.4],
      [backR, -0.2],
      [backR, 0],
      [0, 0],
    ], 96),
    metal('#c3c7cc', 0.2),
  );
  const faceGeo = new THREE.CircleGeometry(backR - 1.3, 96);
  faceGeo.rotateX(Math.PI / 2);
  const cbFace = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: casebackTexture(def), metalness: 0.9, roughness: 0.28 }));
  cbFace.position.y = -cbThick - 0.01;
  const cbStep = new THREE.Mesh(ringGeometry(backR - 0.6, backR - 1.4, 0.6), metal('#b9bdc3', 0.3));
  cbGroup.add(cbBody, cbFace, cbStep);
  cbGroup.position.y = yBack;
  add('caseback', cbGroup, root);

  let notchOrSlots;
  if (def.caseback === 'screw') {
    // ねじ込み式：ふちに6か所の溝（オープナーのツメを掛ける）
    notchOrSlots = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const slot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.6), plain('#2a2c30', 0.6));
      slot.position.set(Math.cos(a) * (backR - 0.8), -cbThick + 0.2, Math.sin(a) * (backR - 0.8));
      slot.rotation.y = -a + Math.PI / 2;
      notchOrSlots.add(slot);
    }
    tag(notchOrSlots, 'caseback_slot');
    cbGroup.add(notchOrSlots);
  } else {
    // こじ開け式：こじ口（ふちの切り欠き）
    notchOrSlots = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 2.0), plain('#26282c', 0.6));
    const a = Math.PI / 2 + 0.38;
    notchOrSlots.position.set(Math.cos(a) * (backR - 0.5), -cbThick - 0.1, Math.sin(a) * (backR - 0.5));
    notchOrSlots.rotation.y = -a + Math.PI / 2;
    tag(notchOrSlots, 'caseback_notch');
    cbGroup.add(notchOrSlots);
  }

  // ---- 革ベルト（12時側＝尾錠つき、6時側＝穴あり） ----
  const strapGroup = new THREE.Group();
  const leather = leatherTexture(def.strapColor || '#5b3220');
  const strapEdge = plain(def.strapColor || '#5b3220', 0.8);
  const strapMat = new THREE.MeshStandardMaterial({ map: leather, roughness: 0.75 });
  const mkSeg = (len, w0, w1, thick) => {
    const s = new THREE.Shape();
    s.moveTo(-w0 / 2, 0);
    s.lineTo(w0 / 2, 0);
    s.lineTo(w1 / 2, len);
    s.lineTo(-w1 / 2, len);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 2 });
    geo.rotateX(Math.PI / 2); // 形の Y → +Z、厚みは −Y
    geo.translate(0, thick / 2, 0);
    // UV を長さ方向に合わせる
    const uv = geo.attributes.uv, p = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + w0 / 2) / w0, p.getZ(i) / 30);
    return new THREE.Mesh(geo, [strapMat, strapEdge]);
  };
  const lugEnd = R - 1.6 + lugLen - 1.2;
  const strapY = lugTop - 2.9;
  const hinges = [];
  for (const side of [1, -1]) {
    const hinge = new THREE.Group();
    hinge.position.set(0, strapY, side * lugEnd);
    hinge.rotation.order = 'YXZ'; // 向きを決めてから垂らす
    if (side < 0) hinge.rotation.y = Math.PI;
    const segA = mkSeg(14, def.lugWidth - 0.4, def.lugWidth - 1.2, 3.4);
    const knee = new THREE.Group();
    knee.position.z = 14;
    const segB = mkSeg(side > 0 ? 62 : 38, def.lugWidth - 1.2, def.lugWidth - 3.5, 3.0);
    knee.add(segB);
    hinge.add(segA, knee);
    if (side > 0) {
      for (let i = 0; i < 6; i++) {
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.6, 12), plain('#1a0f08', 0.9));
        hole.position.set(0, -1.4, 22 + i * 6);
        knee.add(hole);
      }
    } else {
      const buckle = new THREE.Mesh(new THREE.TorusGeometry(def.lugWidth * 0.42, 0.7, 10, 4, Math.PI * 2), metal(def.caseColor, 0.15));
      buckle.rotation.x = Math.PI / 2;
      buckle.rotation.z = Math.PI / 4;
      buckle.scale.set(1, 0.75, 1);
      buckle.position.set(0, -1.4, 38);
      const keeper = new THREE.Mesh(new THREE.BoxGeometry(def.lugWidth - 2.2, 4.4, 4), strapEdge);
      keeper.position.set(0, -1.5, 30);
      knee.add(buckle, keeper);
    }
    strapGroup.add(hinge);
    hinges.push({ hinge, knee });
  }
  add('strap', strapGroup, root);

  /** ベルトを重力の向きに合わせて垂らす（up: 表が上なら 1、裏が上なら −1） */
  function droop(up) {
    for (const { hinge, knee } of hinges) {
      hinge.rotation.x = 0.45 * up;
      knee.rotation.x = -0.45 * up;
    }
  }
  droop(1);

  let lastSecond = -1;
  function setHands(date, mode) {
    const s = date.getSeconds() + (mode === 'sweep' ? date.getMilliseconds() / 1000 : 0);
    const m = date.getMinutes() + s / 60;
    const h = (date.getHours() % 12) + m / 60;
    hourHand.rotation.y = -(h / 12) * Math.PI * 2;
    minuteHand.rotation.y = -(m / 60) * Math.PI * 2;
    if (mode === 'running' || mode === 'sweep') secondHand.rotation.y = -(s / 60) * Math.PI * 2;
    if (mode === 'eol') {
      const si = Math.floor(s);
      secondHand.rotation.y = -((si - (si % 2)) / 60) * Math.PI * 2;
    }
    const tick = Math.floor(s) !== lastSecond;
    lastSecond = Math.floor(s);
    return tick;
  }

  return { yBack, yFront, yMid, dialY, R, backR, setHands, droop, strapY };
}
