// =============================================================
// 工房（歩き回る部屋）の3Dモデル。単位はメートル。
// 家具の位置は LAYOUT にまとめてあります。
// =============================================================
import * as THREE from 'three';
import { woodTexture, plankTexture, plasterTexture, signTexture, clockFaceTexture, canvasTexture } from '../watch/textures.js';
import { buildDisplayWatch } from '../watch/index.js';
import { getWatch } from '../data/watches.js';
import { createPerson } from './Person.js';

// 部屋の大きさと家具の配置（x: 左右, z: 前後。+z が入口側）
export const ROOM = { minX: -4, maxX: 4, minZ: -3, maxZ: 3, height: 3 };
export const LAYOUT = {
  counter: { x: -0.75, z: 1.85, w: 3.5, d: 0.55, h: 1.0 },
  bench: { x: -2.2, z: -2.6, w: 2.0, d: 0.75, h: 0.95 },
  cleaner: { x: 3.3, z: -2.2, w: 1.3, d: 1.0, h: 0.9 },
  shelf: { x: -3.75, z: -0.5, w: 0.45, d: 2.0, h: 2.0 },
  terminal: { x: 3.4, z: 0.6, w: 1.1, d: 1.0, h: 0.75 },
};
/** プレイヤーが入れる範囲（カウンターより奥が工房側） */
export const WALK = { minX: -3.7, maxX: 3.7, minZ: -2.7, maxZ: 1.5 };
const DOOR = new THREE.Vector3(1.9, 0, 2.55);

const mat = (color, rough = 0.8, metal = 0, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, material, x, y, z, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** 壁かけ時計：丸い文字盤と3本の針（z+ を向く）。update で針を動かす */
function wallClock(radius, faceColor, rimColor) {
  const g = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshStandardMaterial({ map: clockFaceTexture(faceColor), roughness: 0.7 }));
  face.position.z = 0.02;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.08, 10, 48), mat(rimColor, 0.4, 0.3));
  rim.position.z = 0.02;
  const back = cyl(radius, radius, 0.04, mat(rimColor, 0.6), 0, 0, 0);
  back.rotation.x = Math.PI / 2;
  g.add(back, face, rim);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.98, 48), new THREE.MeshPhysicalMaterial({ color: '#fff', transparent: true, opacity: 0.12, roughness: 0.02 }));
  glass.position.z = 0.05;
  g.add(glass);
  const hand = (len, w, color, z) => {
    const p = new THREE.Group();
    const m = box(w, len, 0.004, mat(color, 0.4, 0.4), 0, len / 2 - len * 0.12, 0);
    p.add(m);
    p.position.z = z;
    g.add(p);
    return p;
  };
  const hH = hand(radius * 0.5, radius * 0.07, '#1a1a1a', 0.026);
  const mH = hand(radius * 0.75, radius * 0.045, '#1a1a1a', 0.03);
  const sH = hand(radius * 0.82, radius * 0.015, '#9a2a1e', 0.034);
  g.userData.update = (date) => {
    const s = date.getSeconds() + date.getMilliseconds() / 1000;
    const m = date.getMinutes() + s / 60;
    const h = (date.getHours() % 12) + m / 60;
    sH.rotation.z = -(Math.floor(s) / 60) * Math.PI * 2;
    mH.rotation.z = -(m / 60) * Math.PI * 2;
    hH.rotation.z = -(h / 12) * Math.PI * 2;
  };
  return g;
}

export function buildWorkshop() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1612');
  scene.fog = new THREE.Fog('#1b1612', 10, 20);
  const interactables = [];
  const colliders = []; // {minX,maxX,minZ,maxZ}
  const animated = []; // 毎フレーム動かすもの

  // ---------------- 床・壁・天井 ----------------
  const floorTex = plankTexture('#6b4630');
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.62 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // じゅうたん（受付の前）
  const rugTex = canvasTexture(512, (g, s) => {
    g.fillStyle = '#6a2422'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#c9a25a'; g.lineWidth = 10; g.strokeRect(24, 24, s - 48, s - 48);
    g.strokeStyle = '#2c3a4a'; g.lineWidth = 6; g.strokeRect(50, 50, s - 100, s - 100);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#c9a25a'; g.beginPath(); g.arc(s / 2, s / 2, 20 + i * 30, 0, Math.PI * 2); g.globalAlpha = 0.15; g.fill(); g.globalAlpha = 1; }
  }, { key: 'rug' });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.4), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.8, 0.003, 0.6);
  rug.receiveShadow = true;
  scene.add(rug);

  const wallMat = new THREE.MeshStandardMaterial({ map: plasterTexture('#ddd2bd'), roughness: 0.95 });
  const panelMat = new THREE.MeshStandardMaterial({ map: woodTexture('#5a3a26', 3), roughness: 0.6 });
  const trimMat = mat('#3e2819', 0.5);
  const walls = [
    { w: 8, x: 0, z: ROOM.minZ, ry: 0 },
    { w: 8, x: 0, z: ROOM.maxZ, ry: Math.PI },
    { w: 6, x: ROOM.minX, z: 0, ry: Math.PI / 2 },
    { w: 6, x: ROOM.maxX, z: 0, ry: -Math.PI / 2 },
  ];
  for (const wl of walls) {
    const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), wl.ry);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, ROOM.height), wallMat);
    m.position.set(wl.x, ROOM.height / 2, wl.z);
    m.rotation.y = wl.ry;
    m.receiveShadow = true;
    scene.add(m);
    // 腰板・幅木・回り縁
    const low = new THREE.Mesh(new THREE.BoxGeometry(wl.w, 0.95, 0.03), panelMat);
    low.position.set(wl.x, 0.475, wl.z).addScaledVector(normal, 0.015);
    low.rotation.y = wl.ry;
    low.receiveShadow = true;
    scene.add(low);
    for (const [y, h, d] of [[0.06, 0.12, 0.05], [0.97, 0.04, 0.05], [ROOM.height - 0.05, 0.1, 0.06]]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(wl.w, h, d), trimMat);
      t.position.set(wl.x, y, wl.z).addScaledVector(normal, d / 2);
      t.rotation.y = wl.ry;
      scene.add(t);
    }
    // 腰板の縦の継ぎ目
    for (let i = -wl.w / 2 + 0.6; i < wl.w / 2; i += 0.6) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.85, 0.04), trimMat);
      const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), wl.ry);
      strip.position.set(wl.x, 0.5, wl.z).addScaledVector(along, i).addScaledVector(normal, 0.02);
      strip.rotation.y = wl.ry;
      scene.add(strip);
    }
  }
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), mat('#efe6d6', 1));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);
  const beamMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a3020', 7), roughness: 0.7 });
  for (const x of [-2.6, 0, 2.6]) scene.add(box(0.18, 0.2, 6, beamMat, x, ROOM.height - 0.1, 0));

  // ---------------- 窓（奥の壁）と日差し ----------------
  const skyTex = canvasTexture(256, (g, s) => {
    const grd = g.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, '#9cc4e4'); grd.addColorStop(0.7, '#e8eef2'); grd.addColorStop(1, '#b8c8a0');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
  }, { key: 'sky' });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), new THREE.MeshBasicMaterial({ map: skyTex }));
  win.position.set(1.2, 1.75, ROOM.minZ + 0.01);
  scene.add(win);
  const frameMat = mat('#f2ece0', 0.5);
  for (const [w, h, x, y] of [[1.9, 0.06, 1.2, 2.33], [1.9, 0.06, 1.2, 1.17], [0.06, 1.2, 0.27, 1.75], [0.06, 1.2, 2.13, 1.75], [0.04, 1.1, 1.2, 1.75], [1.8, 0.04, 1.2, 1.75]])
    scene.add(box(w, h, 0.05, frameMat, x, y, ROOM.minZ + 0.03));
  scene.add(box(2.0, 0.04, 0.18, frameMat, 1.2, 1.15, ROOM.minZ + 0.09)); // 窓台
  // カーテン（ひだ）
  for (const sx of [-1, 1]) {
    const cg = new THREE.PlaneGeometry(0.45, 1.5, 24, 1);
    const pos = cg.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 40) * 0.03);
    cg.computeVertexNormals();
    const curtain = new THREE.Mesh(cg, mat('#8a6a4a', 0.95, 0, { side: THREE.DoubleSide }));
    curtain.position.set(1.2 + sx * 1.1, 1.7, ROOM.minZ + 0.12);
    scene.add(curtain);
  }
  // 窓辺の植物
  scene.add(cyl(0.08, 0.06, 0.14, mat('#a0522d', 0.7), 0.6, 1.24, ROOM.minZ + 0.1));
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#3f7a3a', 0.8));
    leaf.scale.set(0.6, 1.4, 0.3);
    leaf.position.set(0.6 + Math.cos(i) * 0.06, 1.38 + (i % 3) * 0.04, ROOM.minZ + 0.1 + Math.sin(i) * 0.05);
    leaf.rotation.z = Math.cos(i * 2) * 0.6;
    scene.add(leaf);
  }

  // ---------------- 入口のドアと看板 ----------------
  const doorMat = new THREE.MeshStandardMaterial({ map: woodTexture('#4a3020', 11), roughness: 0.55 });
  scene.add(box(1.0, 2.1, 0.06, doorMat, DOOR.x, 1.05, ROOM.maxZ - 0.03));
  for (const [w, h, x, y] of [[1.16, 0.08, DOOR.x, 2.14], [0.08, 2.14, DOOR.x - 0.54, 1.07], [0.08, 2.14, DOOR.x + 0.54, 1.07]])
    scene.add(box(w, h, 0.1, trimMat, x, y, ROOM.maxZ - 0.05));
  const doorGlass = box(0.62, 1.0, 0.02, new THREE.MeshStandardMaterial({ color: '#b8d4e4', emissive: '#4a6a7a', emissiveIntensity: 0.5, roughness: 0.1 }), DOOR.x, 1.4, ROOM.maxZ - 0.07);
  scene.add(doorGlass);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), mat('#c9a24a', 0.25, 1));
  knob.position.set(DOOR.x - 0.38, 1.0, ROOM.maxZ - 0.09);
  scene.add(knob);
  const openSign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.12), new THREE.MeshStandardMaterial({ map: signTexture('営業中', { bg: '#f1e6cc', fg: '#7a2a1a' }), roughness: 0.6 }));
  openSign.position.set(DOOR.x, 1.95, ROOM.maxZ - 0.09);
  openSign.rotation.y = Math.PI;
  scene.add(openSign);

  // ---------------- 受付カウンター（ショーケース付き） ----------------
  const L = LAYOUT;
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture('#8a5a38', 2), roughness: 0.55 });
  const c = L.counter;
  scene.add(box(c.w, c.h - 0.05, c.d, woodMat, c.x, (c.h - 0.05) / 2, c.z));
  for (let i = 0; i < 5; i++) scene.add(box(0.6, 0.6, 0.02, panelMat, c.x - c.w / 2 + 0.38 + i * 0.69, 0.48, c.z + c.d / 2 + 0.01)); // 前板の飾り
  scene.add(box(c.w + 0.08, 0.05, c.d + 0.1, mat('#3b2a1e', 0.35), c.x, c.h - 0.025, c.z));
  // ショーケース（ガラスの箱の中に時計を並べる）
  const caseX = c.x - 0.7;
  const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.18, roughness: 0.02, metalness: 0 });
  scene.add(box(1.4, 0.02, 0.42, mat('#2a1d14', 0.5), caseX, c.h + 0.01, c.z));
  const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.42), glassMat);
  caseGlass.position.set(caseX, c.h + 0.13, c.z);
  scene.add(caseGlass);
  const velvet = box(1.36, 0.02, 0.38, mat('#3a1e22', 0.95), caseX, c.h + 0.03, c.z);
  scene.add(velvet);
  ['auto_40_blue', 'quartz_3hand_36_black', 'auto_38_silver'].forEach((id, i) => {
    const w = buildDisplayWatch(getWatch(id));
    w.scale.setScalar(0.001);
    w.position.set(caseX - 0.45 + i * 0.45, c.h + 0.055, c.z + 0.02);
    w.rotation.x = -0.35;
    scene.add(w);
  });
  // ベル・受付トレイ・名刺立て・看板
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d7b46a', 0.2, 1));
  bell.position.set(c.x + 1.25, c.h, c.z + 0.05);
  scene.add(bell, cyl(0.055, 0.055, 0.01, mat('#2a2a2a', 0.4), c.x + 1.25, c.h + 0.005, c.z + 0.05));
  scene.add(box(0.32, 0.015, 0.22, mat('#1e3a2f', 0.9), c.x + 0.55, c.h + 0.008, c.z));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshStandardMaterial({ map: signTexture('時計修理工房', { bg: '#2a1d12', fg: '#e7c477' }), roughness: 0.5, metalness: 0.2 }));
  plaque.position.set(-0.75, 2.45, ROOM.minZ + 0.02);
  scene.add(plaque);
  colliders.push({ minX: c.x - c.w / 2, maxX: c.x + c.w / 2, minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2 });
  interactables.push(hitBox(scene, 'counter', '受付カウンター', c.x, c.h, c.z, c.w, 0.7, c.d + 0.4));

  // ---------------- 作業台（時計職人の台は高め） ----------------
  const b = L.bench;
  scene.add(box(b.w, 0.05, b.d, woodMat, b.x, b.h, b.z));
  scene.add(box(b.w, 0.12, 0.04, woodMat, b.x, b.h + 0.06, b.z - b.d / 2 + 0.02)); // 奥の立ち上がり
  for (const sx of [-1, 1]) {
    scene.add(box(0.5, b.h, b.d - 0.05, woodMat, b.x + sx * (b.w / 2 - 0.25), b.h / 2, b.z));
    // ひじ当て
    scene.add(box(0.12, 0.035, 0.3, mat('#2b2420', 0.9), b.x + sx * 0.42, b.h + 0.04, b.z + 0.22));
  }
  for (const sx of [-1, 1])
    for (let i = 0; i < 4; i++) {
      scene.add(box(0.44, 0.17, 0.02, mat('#6e4529', 0.55), b.x + sx * (b.w / 2 - 0.25), 0.13 + i * 0.2, b.z + b.d / 2 + 0.01));
      scene.add(box(0.08, 0.015, 0.02, mat('#c9a24a', 0.3, 1), b.x + sx * (b.w / 2 - 0.25), 0.13 + i * 0.2, b.z + b.d / 2 + 0.03));
    }
  scene.add(box(0.7, 0.008, 0.42, mat('#2f6b57', 0.95), b.x, b.h + 0.03, b.z + 0.05)); // マット
  // ランプ（関節つき）
  const lampMat = mat('#2c2c2c', 0.35, 0.8);
  scene.add(cyl(0.07, 0.08, 0.03, lampMat, b.x - 0.7, b.h + 0.04, b.z - 0.22));
  const arm1 = box(0.025, 0.45, 0.025, lampMat, b.x - 0.68, b.h + 0.26, b.z - 0.18);
  arm1.rotation.x = 0.35;
  const arm2 = box(0.025, 0.4, 0.025, lampMat, b.x - 0.6, b.h + 0.55, b.z - 0.02);
  arm2.rotation.z = -1.0;
  scene.add(arm1, arm2);
  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.13, 24, 1, true), mat('#2f4a3a', 0.4, 0.5, { side: THREE.DoubleSide }));
  lampHead.position.set(b.x - 0.42, b.h + 0.58, b.z + 0.02);
  lampHead.rotation.z = -0.5;
  scene.add(lampHead);
  const lamp = new THREE.SpotLight('#fff1d6', 8, 2.5, 0.75, 0.5);
  lamp.position.copy(lampHead.position);
  lamp.target.position.set(b.x, b.h, b.z + 0.05);
  scene.add(lamp, lamp.target);
  // ドライバースタンド（回転式）
  scene.add(cyl(0.07, 0.08, 0.04, mat('#5a3a26', 0.5), b.x + 0.5, b.h + 0.045, b.z - 0.15));
  const handleColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#7f8c8d', '#16a085'];
  handleColors.forEach((col, i) => {
    const a = (i / handleColors.length) * Math.PI * 2;
    scene.add(cyl(0.008, 0.008, 0.12, mat(col, 0.4), b.x + 0.5 + Math.cos(a) * 0.05, b.h + 0.13, b.z - 0.15 + Math.sin(a) * 0.05, 8));
    scene.add(cyl(0.0015, 0.0015, 0.04, mat('#ddd', 0.2, 1), b.x + 0.5 + Math.cos(a) * 0.05, b.h + 0.21, b.z - 0.15 + Math.sin(a) * 0.05, 6));
  });
  // 部品棚（小さな引き出しがたくさん）
  const cab = new THREE.Group();
  cab.add(box(0.36, 0.3, 0.18, woodMat, 0, 0.15, 0));
  for (let r = 0; r < 4; r++)
    for (let q = 0; q < 4; q++) {
      cab.add(box(0.075, 0.06, 0.01, mat('#7a4e30', 0.55), -0.12 + q * 0.08, 0.04 + r * 0.07, 0.095));
      cab.add(box(0.015, 0.008, 0.01, mat('#c9a24a', 0.3, 1), -0.12 + q * 0.08, 0.04 + r * 0.07, 0.102));
    }
  cab.position.set(b.x - 0.25, b.h + 0.025, b.z - 0.22);
  scene.add(cab);
  // タイムグラファー（緑の画面）とルーペ、ほこりよけのガラスドーム
  const tgScreen = canvasTexture(256, (g, s) => {
    g.fillStyle = '#0e1612'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#7ef0a4'; g.font = 'bold 30px monospace'; g.fillText('+3 s/d', 20, 50); g.fillText('287°', 20, 90);
    for (let x = 0; x < s; x += 4) { g.fillRect(x, 160 - x * 0.05, 2, 2); g.fillRect(x, 170 - x * 0.05, 2, 2); }
  }, { key: 'tg-screen' });
  scene.add(box(0.24, 0.12, 0.18, mat('#d9d9d4', 0.5), b.x + 0.75, b.h + 0.085, b.z - 0.12));
  const tgS = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: tgScreen }));
  tgS.position.set(b.x + 0.75, b.h + 0.095, b.z - 0.029);
  scene.add(tgS);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat);
  dome.position.set(b.x + 0.2, b.h + 0.03, b.z + 0.12);
  scene.add(dome);
  const loupe = cyl(0.02, 0.025, 0.035, mat('#111', 0.4), b.x - 0.15, b.h + 0.045, b.z + 0.2, 16);
  scene.add(loupe);
  // 背もたれ付きのスツール
  scene.add(cyl(0.2, 0.2, 0.05, mat('#3b2a1e', 0.6), b.x, 0.66, b.z + 0.85));
  scene.add(cyl(0.025, 0.025, 0.64, mat('#222', 0.4, 0.7), b.x, 0.33, b.z + 0.85, 10));
  scene.add(cyl(0.22, 0.22, 0.02, mat('#222', 0.4, 0.7), b.x, 0.02, b.z + 0.85));
  scene.add(box(0.36, 0.2, 0.04, mat('#3b2a1e', 0.6), b.x, 0.88, b.z + 1.05));
  colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
  interactables.push(hitBox(scene, 'bench', '作業台', b.x, b.h, b.z, b.w, 0.8, b.d));

  // ---------------- 洗浄機 ----------------
  const cl = L.cleaner;
  scene.add(box(cl.w, cl.h, cl.d, mat('#55606a', 0.5, 0.3), cl.x, cl.h / 2, cl.z));
  scene.add(box(0.9, 0.12, 0.6, mat('#d8dde2', 0.3, 0.4), cl.x, cl.h + 0.06, cl.z));
  const jarMat = new THREE.MeshPhysicalMaterial({ color: '#cfe6f0', transparent: true, opacity: 0.45, roughness: 0.05 });
  const liquid = [mat('#7aa8c8', 0.2, 0, { transparent: true, opacity: 0.6 }), mat('#a8d0e0', 0.2, 0, { transparent: true, opacity: 0.5 }), mat('#a8d0e0', 0.2, 0, { transparent: true, opacity: 0.5 })];
  for (let i = 0; i < 4; i++) {
    const x = cl.x - 0.33 + i * 0.22;
    scene.add(cyl(0.075, 0.075, 0.16, jarMat, x, cl.h + 0.2, cl.z));
    if (i < 3) scene.add(cyl(0.07, 0.07, 0.1, liquid[i], x, cl.h + 0.17, cl.z));
    else scene.add(cyl(0.07, 0.07, 0.03, mat('#b04020', 0.5, 0, { emissive: '#601808', emissiveIntensity: 0.6 }), x, cl.h + 0.14, cl.z)); // 乾燥のヒーター
  }
  // 洗浄かごを吊るすアーム
  scene.add(cyl(0.02, 0.02, 0.5, mat('#bfc4c9', 0.3, 0.8), cl.x - 0.5, cl.h + 0.37, cl.z, 10));
  const armTop = box(0.6, 0.03, 0.03, mat('#bfc4c9', 0.3, 0.8), cl.x - 0.22, cl.h + 0.6, cl.z);
  scene.add(armTop);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshStandardMaterial({ map: signTexture('超音波洗浄機', { bg: '#d8dde2', fg: '#2a3a4a', font: 'sans-serif' }) }));
  label.position.set(cl.x, cl.h * 0.6, cl.z + cl.d / 2 + 0.005);
  scene.add(label);
  colliders.push({ minX: cl.x - cl.w / 2, maxX: cl.x + cl.w / 2, minZ: cl.z - cl.d / 2, maxZ: cl.z + cl.d / 2 });
  interactables.push(hitBox(scene, 'cleaner', '洗浄機', cl.x, cl.h, cl.z, cl.w, 0.8, cl.d));

  // ---------------- 道具棚 ----------------
  const sh = L.shelf;
  for (let i = 0; i < 5; i++) scene.add(box(sh.w, 0.03, sh.d, woodMat, sh.x, 0.05 + i * 0.48, sh.z));
  scene.add(box(0.03, sh.h, sh.d, woodMat, sh.x - sh.w / 2, sh.h / 2, sh.z));
  for (const z of [sh.z - sh.d / 2, sh.z + sh.d / 2]) scene.add(box(sh.w, sh.h, 0.03, woodMat, sh.x, sh.h / 2, z));
  const boxColors = ['#7d3b2c', '#2d4f6c', '#c9a24a', '#4f6b3a', '#5b4a72'];
  const labels = ['ネジ', 'パッキン', '電池', '風防', 'リューズ', '巻真', '針', 'ベルト'];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 4; j++) {
      const bx = box(0.25, 0.14, 0.3, mat(boxColors[(i + j) % 5], 0.7), sh.x + 0.05, 0.14 + i * 0.48, sh.z - 0.7 + j * 0.47);
      scene.add(bx);
      const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshStandardMaterial({ map: signTexture(labels[(i * 4 + j) % labels.length], { bg: '#f4ecd8', fg: '#222', font: 'sans-serif' }) }));
      lb.position.set(sh.x + 0.18, 0.14 + i * 0.48, sh.z - 0.7 + j * 0.47);
      lb.rotation.y = Math.PI / 2;
      scene.add(lb);
    }
  // 油のビン（色付きのふた）
  ['#e8d9a0', '#d9b45a', '#c98a5a', '#e6e6e0', '#bfc6cc'].forEach((col, i) => {
    scene.add(cyl(0.025, 0.025, 0.08, mat('#3a2a1a', 0.2, 0, { transparent: true, opacity: 0.8 }), sh.x + 0.08, 1.62, sh.z - 0.6 + i * 0.12, 12));
    scene.add(cyl(0.02, 0.02, 0.025, mat(col, 0.4), sh.x + 0.08, 1.675, sh.z - 0.6 + i * 0.12, 12));
  });
  // 工具ケース
  scene.add(box(0.3, 0.1, 0.45, mat('#1f2a36', 0.5, 0.3), sh.x + 0.05, 1.98, sh.z + 0.3));
  colliders.push({ minX: sh.x - sh.w / 2, maxX: sh.x + sh.w / 2, minZ: sh.z - sh.d / 2, maxZ: sh.z + sh.d / 2 });
  interactables.push(hitBox(scene, 'shelf', '道具棚', sh.x, 1.0, sh.z, sh.w + 0.2, 2.0, sh.d));

  // ---------------- ショップ端末（パソコン） ----------------
  const t = L.terminal;
  scene.add(box(t.w, 0.04, t.d, woodMat, t.x, t.h, t.z));
  for (const [dx, dz] of [[-0.48, -0.42], [0.48, 0.42], [-0.48, 0.42], [0.48, -0.42]]) scene.add(box(0.05, t.h, 0.05, mat('#2a1d14'), t.x + dx, t.h / 2, t.z + dz));
  const scr = canvasTexture(256, (g, s) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#2a3a52'; g.fillRect(0, 0, s, 34);
    g.fillStyle = '#fff'; g.font = 'bold 18px sans-serif'; g.fillText('部品・工具の注文', 10, 24);
    g.fillStyle = '#444'; g.font = '14px sans-serif';
    ['精密ドライバーセット', 'タイムグラファー', '超音波洗浄機', 'パッキン各種', 'ゼンマイ'].forEach((tx, i) => g.fillText('・' + tx, 14, 64 + i * 26));
  }, { key: 'shop-screen' });
  scene.add(box(0.04, 0.34, 0.52, mat('#151515', 0.4), t.x + 0.28, t.h + 0.3, t.z));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.29), new THREE.MeshBasicMaterial({ map: scr }));
  screen.position.set(t.x + 0.257, t.h + 0.3, t.z);
  screen.rotation.y = -Math.PI / 2;
  scene.add(screen);
  scene.add(box(0.06, 0.1, 0.06, mat('#151515'), t.x + 0.3, t.h + 0.07, t.z));
  scene.add(box(0.16, 0.015, 0.42, mat('#2a2a2a', 0.6), t.x - 0.05, t.h + 0.03, t.z));
  scene.add(box(0.1, 0.02, 0.06, mat('#2a2a2a', 0.6), t.x - 0.05, t.h + 0.03, t.z - 0.32));
  colliders.push({ minX: t.x - t.w / 2, maxX: t.x + t.w / 2, minZ: t.z - t.d / 2, maxZ: t.z + t.d / 2 });
  interactables.push(hitBox(scene, 'terminal', 'ショップ端末', t.x, t.h, t.z, t.w, 0.7, t.d));

  // ---------------- 壁の時計たち ----------------
  const clockA = wallClock(0.22, '#f4ecd8', '#5a3d2a');
  clockA.position.set(-0.2, 2.15, ROOM.minZ + 0.03);
  scene.add(clockA);
  animated.push((d) => clockA.userData.update(d));
  const clockB = wallClock(0.16, '#ffffff', '#1d1d1d');
  clockB.position.set(ROOM.maxX - 0.03, 2.1, -1.0);
  clockB.rotation.y = -Math.PI / 2;
  scene.add(clockB);
  animated.push((d) => clockB.userData.update(d));
  // 振り子時計（ウィーン式レギュレーター）。振り子の長さ約25cm → 周期約1秒
  const reg = new THREE.Group();
  const regWood = new THREE.MeshStandardMaterial({ map: woodTexture('#5a2e1a', 13), roughness: 0.45 });
  reg.add(box(0.36, 1.05, 0.14, regWood, 0, 0, 0));
  reg.add(box(0.42, 0.08, 0.17, regWood, 0, 0.56, 0));
  reg.add(box(0.4, 0.06, 0.16, regWood, 0, -0.55, 0));
  const regGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.9), glassMat);
  regGlass.position.z = 0.072;
  reg.add(regGlass);
  const regFace = wallClock(0.11, '#f8f2e2', '#c9a24a');
  regFace.position.set(0, 0.3, 0.05);
  reg.add(regFace);
  const pendulum = new THREE.Group();
  pendulum.position.set(0, 0.15, 0.05);
  pendulum.add(box(0.008, 0.55, 0.004, mat('#c9a24a', 0.3, 1), 0, -0.27, 0));
  const bob = cyl(0.055, 0.055, 0.012, mat('#d9b45a', 0.15, 1), 0, -0.56, 0);
  bob.rotation.x = Math.PI / 2;
  pendulum.add(bob);
  reg.add(pendulum);
  reg.position.set(ROOM.minX + 0.08, 1.75, 1.0);
  reg.rotation.y = Math.PI / 2;
  scene.add(reg);
  animated.push((d) => {
    regFace.userData.update(d);
    const s = d.getTime() / 1000;
    pendulum.rotation.z = Math.sin(s * Math.PI) * 0.07; // 1秒で片道（チク・タク）
  });

  // 額（修了証）と、ムーブメントの図解ポスター
  const cert = canvasTexture(256, (g, s) => {
    g.fillStyle = '#f6f0e0'; g.fillRect(0, 0, s, s);
    g.strokeStyle = '#b08a3a'; g.lineWidth = 8; g.strokeRect(10, 10, s - 20, s - 20);
    g.fillStyle = '#3a2a1a'; g.textAlign = 'center'; g.font = 'bold 26px serif'; g.fillText('修了証', s / 2, 70);
    g.font = '15px serif'; g.fillText('時計修理技術講座', s / 2, 110); g.fillText('全課程を修了したことを', s / 2, 140); g.fillText('ここに証します', s / 2, 165);
    g.fillStyle = '#b02a1a'; g.beginPath(); g.arc(s * 0.75, 210, 18, 0, Math.PI * 2); g.fill();
  }, { key: 'cert' });
  const certFrame = box(0.42, 0.42, 0.03, mat('#2a1d14', 0.4), -3.0, 1.75, ROOM.minZ + 0.02);
  scene.add(certFrame);
  const certFace = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshStandardMaterial({ map: cert, roughness: 0.8 }));
  certFace.position.set(-3.0, 1.75, ROOM.minZ + 0.04);
  scene.add(certFace);
  const poster = canvasTexture(512, (g, s) => {
    g.fillStyle = '#efe6d2'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#3a2a1a'; g.font = 'bold 28px serif'; g.textAlign = 'center'; g.fillText('機械式時計のしくみ', s / 2, 44);
    const items = [['香箱', 90, 160, 60], ['2番車', 220, 200, 44], ['3番車', 300, 140, 34], ['4番車', 330, 240, 32], ['ガンギ車', 390, 320, 24], ['テンプ', 300, 400, 54]];
    g.textAlign = 'left';
    for (const [n, x, y, r] of items) {
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#3a2a1a'; g.font = '18px sans-serif'; g.fillText(n, x + r + 6, y + 6);
    }
  }, { key: 'poster' });
  const posterMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: poster, roughness: 0.9 }));
  posterMesh.position.set(ROOM.maxX - 0.02, 1.7, 0.8);
  posterMesh.rotation.y = -Math.PI / 2;
  scene.add(posterMesh);

  // ---------------- 照明 ----------------
  scene.add(new THREE.HemisphereLight('#fff3e0', '#3a2a1e', 0.55));
  for (const [x, z] of [[-2, -1.2], [1.5, -1.2], [-0.7, 1.0]]) {
    scene.add(cyl(0.004, 0.004, 0.6, mat('#111'), x, ROOM.height - 0.3, z, 6));
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 28, 1, true), mat('#2f4a3a', 0.4, 0.4, { side: THREE.DoubleSide }));
    shade.position.set(x, ROOM.height - 0.65, z);
    scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4dd' }));
    bulb.position.set(x, ROOM.height - 0.72, z);
    scene.add(bulb);
    const pl = new THREE.PointLight('#ffe2b8', 6, 7, 1.6);
    pl.position.set(x, ROOM.height - 0.8, z);
    scene.add(pl);
  }
  // 窓からの日差し（影を落とす）
  const sun = new THREE.DirectionalLight('#fff0d8', 1.4);
  sun.position.set(2.2, 4.5, -6);
  sun.target.position.set(0, 0, 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 15 });
  sun.shadow.bias = -0.0006;
  scene.add(sun, sun.target);

  // ---------------- お客さん ----------------
  const counterSpot = new THREE.Vector3(c.x, 0, c.z + 0.72);
  const customer = { person: null, state: 'away', pos: DOOR.clone(), talking: false, visible: false };
  function customerArrive(look) {
    if (customer.person) scene.remove(customer.person.root);
    customer.person = createPerson(look);
    scene.add(customer.person.root);
    customer.pos.copy(DOOR);
    customer.state = 'arriving';
  }
  function customerLeave() {
    if (customer.person) customer.state = 'leaving';
  }
  function customerAtCounter() {
    return customer.state === 'waiting';
  }

  function update(date, dt, viewer) {
    for (const f of animated) f(date);
    const p = customer.person;
    if (!p) return;
    let walking = false;
    const goal = customer.state === 'arriving' ? counterSpot : customer.state === 'leaving' ? DOOR : null;
    if (goal) {
      const d = goal.clone().sub(customer.pos);
      d.y = 0;
      const dist = d.length();
      if (dist < 0.03) {
        if (customer.state === 'arriving') customer.state = 'waiting';
        else { scene.remove(p.root); customer.person = null; customer.state = 'away'; return; }
      } else {
        walking = true;
        customer.pos.addScaledVector(d.normalize(), Math.min(dist, dt * 1.0));
        const yaw = Math.atan2(-d.x, -d.z);
        p.root.rotation.y += (yaw - p.root.rotation.y) * Math.min(1, dt * 6);
      }
    } else if (customer.state === 'waiting') {
      p.root.rotation.y += (0 - p.root.rotation.y) * Math.min(1, dt * 4); // カウンターの方を向く
    }
    p.root.position.copy(customer.pos);
    p.update(dt, { walking, talking: customer.talking, lookAt: viewer });
  }

  return { scene, interactables, colliders, customer, customerArrive, customerLeave, customerAtCounter, update };
}

/** 調べられる場所の当たり判定（見えない箱） */
function hitBox(scene, id, label, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set(x, y, z);
  m.userData.interact = { id, label };
  scene.add(m);
  return m;
}
