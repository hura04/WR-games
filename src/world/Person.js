// =============================================================
// お客さんの人物モデル（ジオメトリの組み合わせ。単位 m）
//   look: { skin, hair, hairStyle, top, jacket, bottom, height, glasses }
//   hairStyle: 'short' | 'bob' | 'long' | 'balding'
// 動き：歩く・息をする・まばたき・こちらを見る・話す（うなずき＋身ぶり）
// =============================================================
import * as THREE from 'three';

const std = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 胴体：腰から肩までのなめらかな断面を回転させる（前後に少しつぶす） */
function torsoGeometry(scale = 1) {
  const pts = [
    [0.0, 0.0], [0.15, 0.0], [0.165, 0.06], [0.155, 0.18], [0.145, 0.26], [0.16, 0.36], [0.19, 0.44], [0.2, 0.49], [0.16, 0.54], [0.07, 0.57], [0.0, 0.575],
  ].map(([r, y]) => new THREE.Vector2(r * scale, y));
  const g = new THREE.LatheGeometry(pts, 28);
  g.scale(1, 1, 0.62);
  g.computeVertexNormals();
  return g;
}

export function createPerson(look) {
  const H = look.height || 1.68;
  const k = H / 1.7; // 身長に合わせた縮尺
  const root = new THREE.Group();
  const body = new THREE.Group(); // 呼吸で少し上下する部分
  root.add(body);
  const skin = std(look.skin, 0.65);
  const hairMat = std(look.hair, 0.9);
  const topMat = std(look.top, 0.85);
  const jacketMat = look.jacket ? std(look.jacket, 0.8) : null;
  const bottomMat = std(look.bottom, 0.85);
  const shoeMat = std('#1e1a17', 0.5);

  // ---- 脚（腰を支点に振る） ----
  const hipY = 0.86 * k;
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.09 * k, hipY, 0);
    const thigh = mesh(new THREE.CapsuleGeometry(0.068 * k, 0.36 * k, 6, 12), bottomMat, 0, -0.22 * k, 0);
    const knee = new THREE.Group();
    knee.position.y = -0.44 * k;
    const shin = mesh(new THREE.CapsuleGeometry(0.058 * k, 0.34 * k, 6, 12), bottomMat, 0, -0.2 * k, 0);
    const shoe = mesh(new THREE.BoxGeometry(0.1 * k, 0.07 * k, 0.26 * k), shoeMat, 0, -0.42 * k, -0.05 * k);
    knee.add(shin, shoe);
    hip.add(thigh, knee);
    body.add(hip);
    legs.push({ hip, knee });
  }
  const pelvis = mesh(new THREE.SphereGeometry(0.16 * k, 20, 12), bottomMat, 0, hipY + 0.02 * k, 0);
  pelvis.scale.set(1.05, 0.6, 0.7);
  body.add(pelvis);

  // ---- 胴体（シャツ＋ジャケット） ----
  const torsoY = hipY - 0.02 * k;
  const torso = mesh(torsoGeometry(k), topMat, 0, torsoY, 0);
  torso.scale.y = k;
  body.add(torso);
  if (jacketMat) {
    // 前が開いたジャケット：左右の身ごろ
    for (const s of [-1, 1]) {
      const panel = mesh(torsoGeometry(k * 1.06), jacketMat, 0, torsoY - 0.02 * k, 0);
      panel.scale.y = k * 1.04;
      // 片側だけ残すため、前中央をすこし開ける（回転させて重ねる）
      panel.rotation.y = s * 0.18;
      panel.scale.x = 0.98;
      body.add(panel);
    }
    // 開いた前からのぞくシャツ
    const shirt = mesh(new THREE.BoxGeometry(0.075 * k, 0.24 * k, 0.012), topMat, 0, torsoY + 0.39 * k, -0.128 * k);
    shirt.rotation.x = 0.12;
    body.add(shirt);
    const collar = mesh(new THREE.TorusGeometry(0.075 * k, 0.022 * k, 8, 20, Math.PI * 1.3), jacketMat, 0, torsoY + 0.545 * k, 0.005);
    collar.rotation.x = Math.PI / 2;
    collar.rotation.z = Math.PI * 0.85;
    body.add(collar);
  }

  // ---- 腕（肩・ひじを支点に） ----
  const shoulderY = torsoY + 0.48 * k;
  const arms = [];
  const sleeve = jacketMat || topMat;
  for (const s of [-1, 1]) {
    const shoulder = new THREE.Group();
    shoulder.position.set(s * 0.215 * k, shoulderY, 0);
    shoulder.rotation.z = s * 0.08;
    const upper = mesh(new THREE.CapsuleGeometry(0.052 * k, 0.24 * k, 6, 12), sleeve, 0, -0.15 * k, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3 * k;
    const fore = mesh(new THREE.CapsuleGeometry(0.044 * k, 0.22 * k, 6, 12), sleeve, 0, -0.14 * k, 0);
    const hand = mesh(new THREE.SphereGeometry(0.048 * k, 12, 10), skin, 0, -0.3 * k, 0);
    hand.scale.set(0.8, 1.15, 0.55);
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    body.add(shoulder);
    arms.push({ shoulder, elbow });
  }

  // ---- 首と頭 ----
  const neck = mesh(new THREE.CylinderGeometry(0.045 * k, 0.05 * k, 0.1 * k, 14), skin, 0, shoulderY + 0.08 * k, 0);
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = shoulderY + 0.2 * k;
  body.add(head);
  const skull = mesh(new THREE.SphereGeometry(0.105 * k, 28, 20), skin);
  skull.scale.set(0.88, 1.12, 1.0);
  head.add(skull);
  const jaw = mesh(new THREE.SphereGeometry(0.08 * k, 20, 14), skin, 0, -0.06 * k, -0.02 * k);
  jaw.scale.set(0.95, 0.8, 1.0);
  head.add(jaw);
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.024 * k, 10, 8), skin, s * 0.092 * k, 0, 0.005);
    ear.scale.set(0.45, 1, 0.7);
    head.add(ear);
  }
  const nose = mesh(new THREE.ConeGeometry(0.016 * k, 0.04 * k, 10), skin, 0, -0.012 * k, -0.105 * k);
  nose.rotation.x = -Math.PI / 2 - 0.25;
  head.add(nose);
  // 目（白目＋黒目）とまぶた・眉
  const eyes = [];
  const white = std('#f4f1ea', 0.3);
  const iris = std('#2a2018', 0.2);
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.036 * k, 0.018 * k, -0.088 * k);
    const ball = mesh(new THREE.SphereGeometry(0.014 * k, 12, 10), white);
    ball.scale.set(1, 0.75, 0.6);
    const pupil = mesh(new THREE.SphereGeometry(0.0075 * k, 10, 8), iris, 0, 0, -0.008 * k);
    eye.add(ball, pupil);
    head.add(eye);
    eyes.push(eye);
    const brow = mesh(new THREE.BoxGeometry(0.034 * k, 0.006 * k, 0.008 * k), hairMat, s * 0.037 * k, 0.045 * k, -0.096 * k);
    brow.rotation.z = s * -0.12;
    head.add(brow);
  }
  const mouth = mesh(new THREE.BoxGeometry(0.036 * k, 0.006 * k, 0.006 * k), std('#8a4a42', 0.6), 0, -0.06 * k, -0.092 * k);
  head.add(mouth);

  // ---- 髪型 ----
  const cap = (r, thetaLen) => new THREE.SphereGeometry(r, 28, 16, 0, Math.PI * 2, 0, thetaLen);
  const style = look.hairStyle || 'short';
  if (style === 'balding') {
    const ring = mesh(new THREE.TorusGeometry(0.085 * k, 0.03 * k, 10, 28, Math.PI * 1.3), hairMat, 0, 0.0, 0.02 * k);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = -Math.PI * 0.15 + Math.PI;
    head.add(ring);
  } else {
    const top = mesh(cap(0.112 * k, Math.PI * 0.5), hairMat, 0, 0.012 * k, 0.006 * k);
    top.scale.set(0.92, 1.12, 1.05);
    top.rotation.x = -0.32; // 前髪が額にかかるよう少し前へ
    head.add(top);
    const back = mesh(cap(0.11 * k, Math.PI * 0.62), hairMat, 0, 0.0, 0.012 * k);
    back.scale.set(0.93, 1.1, 1.02);
    back.rotation.x = 0.55;
    head.add(back);
    if (style === 'bob' || style === 'long') {
      const sides = mesh(new THREE.CylinderGeometry(0.106 * k, 0.112 * k, (style === 'long' ? 0.3 : 0.13) * k, 24, 1, true, Math.PI * 0.62, Math.PI * 1.76), hairMat, 0, (style === 'long' ? -0.12 : -0.05) * k, 0.01 * k);
      sides.material = hairMat.clone();
      sides.material.side = THREE.DoubleSide;
      sides.scale.set(0.95, 1, 1.0);
      head.add(sides);
    }
  }
  if (look.glasses) {
    const frame = std('#202020', 0.3, { metalness: 0.5 });
    for (const s of [-1, 1]) {
      const rim = mesh(new THREE.TorusGeometry(0.019 * k, 0.003 * k, 8, 20), frame, s * 0.037 * k, 0.016 * k, -0.103 * k);
      head.add(rim);
      const temple = mesh(new THREE.BoxGeometry(0.003 * k, 0.003 * k, 0.1 * k), frame, s * 0.06 * k, 0.018 * k, -0.055 * k);
      head.add(temple);
    }
    head.add(mesh(new THREE.BoxGeometry(0.02 * k, 0.003 * k, 0.003 * k), frame, 0, 0.02 * k, -0.105 * k));
  }

  // ---- 動き ----
  let t = Math.random() * 10, walkPhase = 0, blinkT = 2 + Math.random() * 3, talkT = 0;
  const lookTarget = new THREE.Vector3();
  /**
   * @param {number} dt
   * @param {{ walking?: boolean, talking?: boolean, lookAt?: THREE.Vector3 }} st
   */
  function update(dt, st = {}) {
    t += dt;
    // 歩く
    if (st.walking) walkPhase += dt * 7.5;
    else walkPhase *= 0.85;
    const sw = Math.sin(walkPhase) * (st.walking ? 0.5 : 0);
    legs[0].hip.rotation.x = sw;
    legs[1].hip.rotation.x = -sw;
    legs[0].knee.rotation.x = Math.max(0, -Math.sin(walkPhase - 0.6)) * (st.walking ? 0.7 : 0);
    legs[1].knee.rotation.x = Math.max(0, Math.sin(walkPhase - 0.6)) * (st.walking ? 0.7 : 0);
    arms[0].shoulder.rotation.x = -sw * 0.6;
    arms[1].shoulder.rotation.x = sw * 0.6;
    body.position.y = st.walking ? Math.abs(Math.sin(walkPhase)) * 0.02 : Math.sin(t * 1.6) * 0.004;
    // 話すときの身ぶり（右手を少し上げる・うなずく・口を動かす）
    if (st.talking) talkT += dt;
    const talking = st.talking ? 1 : 0;
    arms[1].elbow.rotation.x = -(0.25 + talking * (0.6 + Math.sin(talkT * 3) * 0.2));
    arms[0].elbow.rotation.x = -0.18;
    mouth.scale.y = 1 + talking * Math.abs(Math.sin(talkT * 14)) * 2.5;
    // こちらを見る（首の回転は控えめに）
    if (st.lookAt) {
      const headWorld = new THREE.Vector3();
      head.getWorldPosition(headWorld);
      lookTarget.copy(st.lookAt).sub(headWorld);
      const inv = new THREE.Quaternion();
      root.getWorldQuaternion(inv).invert();
      lookTarget.applyQuaternion(inv);
      const yaw = Math.atan2(-lookTarget.x, -lookTarget.z);
      const pitch = Math.atan2(lookTarget.y, Math.hypot(lookTarget.x, lookTarget.z));
      head.rotation.y += (Math.max(-0.9, Math.min(0.9, yaw)) - head.rotation.y) * Math.min(1, dt * 4);
      head.rotation.x += (Math.max(-0.4, Math.min(0.4, pitch)) + talking * Math.sin(talkT * 4) * 0.05 - head.rotation.x) * Math.min(1, dt * 4);
    }
    // まばたき
    blinkT -= dt;
    const blink = blinkT < 0 && blinkT > -0.12;
    for (const e of eyes) e.scale.y = blink ? 0.1 : 1;
    if (blinkT < -0.12) blinkT = 2 + Math.random() * 4;
  }

  return { root, update };
}
