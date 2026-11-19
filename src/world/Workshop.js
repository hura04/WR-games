// =============================================================
// 工房（歩き回る部屋）の3Dモデル。単位はメートル。
// 家具の位置は LAYOUT にまとめてあります。
// =============================================================
import * as THREE from 'three';
import { woodTexture } from '../watch/textures.js';

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

const mat = (color, rough = 0.8, metal = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildWorkshop() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1b1612');
  scene.fog = new THREE.Fog('#1b1612', 9, 18);
  const interactables = [];
  const colliders = []; // {minX,maxX,minZ,maxZ}

  // ---- 床・壁・天井 ----
  const floorTex = woodTexture('#6b4630');
  floorTex.repeat.set(4, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const wallMat = mat('#d9cdb6', 0.95);
  const wainscot = mat('#5a3d2a', 0.8);
  const walls = [
    { w: 8, x: 0, z: ROOM.minZ, ry: 0 },
    { w: 8, x: 0, z: ROOM.maxZ, ry: Math.PI },
    { w: 6, x: ROOM.minX, z: 0, ry: Math.PI / 2 },
    { w: 6, x: ROOM.maxX, z: 0, ry: -Math.PI / 2 },
  ];
  for (const wl of walls) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, ROOM.height), wallMat);
    m.position.set(wl.x, ROOM.height / 2, wl.z);
    m.rotation.y = wl.ry;
    m.receiveShadow = true;
    scene.add(m);
    const low = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, 0.9), wainscot);
    low.position.set(wl.x, 0.45, wl.z);
    low.rotation.y = wl.ry;
    low.position.add(new THREE.Vector3(0, 0, 0.005).applyAxisAngle(new THREE.Vector3(0, 1, 0), wl.ry));
    scene.add(low);
  }
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), mat('#efe6d6', 1));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);

  // 入口のドア（ガラス付き）と窓
  const door = box(1.0, 2.1, 0.06, mat('#4a3020', 0.6), 1.9, 1.05, ROOM.maxZ - 0.03);
  scene.add(door);
  const doorGlass = box(0.7, 1.1, 0.02, new THREE.MeshStandardMaterial({ color: '#9fc4d8', emissive: '#3a5566', roughness: 0.1 }), 1.9, 1.35, ROOM.maxZ - 0.07);
  scene.add(doorGlass);
  const win = box(1.8, 1.0, 0.02, new THREE.MeshStandardMaterial({ color: '#b5d3e6', emissive: '#6d8fa6', emissiveIntensity: 0.6 }), 1.2, 1.7, ROOM.minZ + 0.02);
  scene.add(win);

  // ---- 受付カウンター ----
  const L = LAYOUT;
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture('#8a5a38'), roughness: 0.6 });
  const c = L.counter;
  scene.add(box(c.w, c.h, c.d, woodMat, c.x, c.h / 2, c.z));
  scene.add(box(c.w + 0.1, 0.05, c.d + 0.12, mat('#3b2a1e', 0.4), c.x, c.h + 0.025, c.z));
  // 受付のベル・トレイ
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d7b46a', 0.25, 1));
  bell.position.set(c.x + 1.2, c.h + 0.05, c.z);
  scene.add(bell);
  const tray = box(0.3, 0.02, 0.2, mat('#1e3a2f', 0.9), c.x - 0.3, c.h + 0.06, c.z);
  scene.add(tray);
  colliders.push({ minX: c.x - c.w / 2, maxX: c.x + c.w / 2, minZ: c.z - c.d / 2, maxZ: c.z + c.d / 2 });
  interactables.push(hitBox(scene, 'counter', '受付カウンター', c.x, c.h, c.z, c.w, 0.6, c.d));

  // ---- 作業台（時計職人の台は高め） ----
  const b = L.bench;
  scene.add(box(b.w, 0.06, b.d, woodMat, b.x, b.h, b.z));
  for (const sx of [-1, 1]) scene.add(box(0.5, b.h, b.d - 0.05, woodMat, b.x + sx * (b.w / 2 - 0.25), b.h / 2, b.z));
  // 引き出し
  for (let i = 0; i < 4; i++) {
    const dr = box(0.46, 0.17, 0.02, mat('#6e4529', 0.6), b.x + (b.w / 2 - 0.25), 0.15 + i * 0.2, b.z + b.d / 2 + 0.01);
    scene.add(dr);
  }
  scene.add(box(0.7, 0.01, 0.45, mat('#2e5a4a', 0.95), b.x, b.h + 0.035, b.z + 0.05)); // マット
  // ランプ
  const lampArm = box(0.03, 0.6, 0.03, mat('#2c2c2c', 0.4, 0.8), b.x - 0.6, b.h + 0.33, b.z - 0.2);
  scene.add(lampArm);
  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.15, 20, 1, true), mat('#2c2c2c', 0.4, 0.8));
  lampHead.position.set(b.x - 0.45, b.h + 0.6, b.z - 0.05);
  lampHead.rotation.z = -0.6;
  scene.add(lampHead);
  const lamp = new THREE.SpotLight('#fff1d6', 6, 2.5, 0.8, 0.5);
  lamp.position.copy(lampHead.position);
  lamp.target.position.set(b.x, b.h, b.z + 0.05);
  scene.add(lamp, lamp.target);
  // 小さな時計（作業待ち）とスツール
  const miniWatch = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 24), mat('#c9ccd1', 0.3, 1));
  miniWatch.position.set(b.x, b.h + 0.045, b.z + 0.05);
  scene.add(miniWatch);
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 24), mat('#3b2a1e', 0.6));
  stool.position.set(b.x, 0.62, b.z + 0.85);
  scene.add(stool);
  scene.add(box(0.05, 0.6, 0.05, mat('#222', 0.5, 0.6), b.x, 0.3, b.z + 0.85));
  colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
  interactables.push(hitBox(scene, 'bench', '作業台', b.x, b.h, b.z, b.w, 0.8, b.d));

  // ---- 洗浄機（第2段階以降で使用） ----
  const cl = L.cleaner;
  scene.add(box(cl.w, cl.h, cl.d, mat('#55606a', 0.6), cl.x, cl.h / 2, cl.z));
  const machine = box(0.8, 0.35, 0.5, mat('#d8dde2', 0.35, 0.3), cl.x, cl.h + 0.175, cl.z);
  scene.add(machine);
  for (let i = 0; i < 3; i++) {
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 20), new THREE.MeshStandardMaterial({ color: '#cfe6f0', transparent: true, opacity: 0.6, roughness: 0.1 }));
    jar.position.set(cl.x - 0.25 + i * 0.25, cl.h + 0.42, cl.z);
    scene.add(jar);
  }
  colliders.push({ minX: cl.x - cl.w / 2, maxX: cl.x + cl.w / 2, minZ: cl.z - cl.d / 2, maxZ: cl.z + cl.d / 2 });
  interactables.push(hitBox(scene, 'cleaner', '洗浄機', cl.x, cl.h, cl.z, cl.w, 0.6, cl.d));

  // ---- 道具棚 ----
  const sh = L.shelf;
  for (let i = 0; i < 5; i++) scene.add(box(sh.w, 0.03, sh.d, woodMat, sh.x, 0.05 + i * 0.48, sh.z));
  scene.add(box(0.03, sh.h, sh.d, woodMat, sh.x - sh.w / 2, sh.h / 2, sh.z));
  const boxColors = ['#7d3b2c', '#2d4f6c', '#c9a24a', '#4f6b3a', '#5b4a72'];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      scene.add(box(0.25, 0.14, 0.3, mat(boxColors[(i + j) % 5], 0.7), sh.x + 0.05, 0.14 + i * 0.48, sh.z - 0.7 + j * 0.47));
  colliders.push({ minX: sh.x - sh.w / 2, maxX: sh.x + sh.w / 2, minZ: sh.z - sh.d / 2, maxZ: sh.z + sh.d / 2 });
  interactables.push(hitBox(scene, 'shelf', '道具棚', sh.x, 1.0, sh.z, sh.w + 0.2, 2.0, sh.d));

  // ---- ショップ端末 ----
  const t = L.terminal;
  scene.add(box(t.w, 0.04, t.d, woodMat, t.x, t.h, t.z));
  scene.add(box(0.05, t.h, 0.05, mat('#222'), t.x - 0.45, t.h / 2, t.z - 0.4));
  scene.add(box(0.05, t.h, 0.05, mat('#222'), t.x + 0.45, t.h / 2, t.z + 0.4));
  scene.add(box(0.05, t.h, 0.05, mat('#222'), t.x - 0.45, t.h / 2, t.z + 0.4));
  scene.add(box(0.05, t.h, 0.05, mat('#222'), t.x + 0.45, t.h / 2, t.z - 0.4));
  const monitor = box(0.04, 0.32, 0.5, mat('#111', 0.4), t.x + 0.25, t.h + 0.3, t.z);
  scene.add(monitor);
  const screen = box(0.005, 0.27, 0.44, new THREE.MeshStandardMaterial({ color: '#203040', emissive: '#3d7ea6', emissiveIntensity: 0.8 }), t.x + 0.225, t.h + 0.3, t.z);
  scene.add(screen);
  colliders.push({ minX: t.x - t.w / 2, maxX: t.x + t.w / 2, minZ: t.z - t.d / 2, maxZ: t.z + t.d / 2 });
  interactables.push(hitBox(scene, 'terminal', 'ショップ端末', t.x, t.h, t.z, t.w, 0.7, t.d));

  // ---- 壁掛け時計（飾り。秒針が動く） ----
  const wallClock = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 40), mat('#f4ecd8', 0.8));
  face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 8, 40), mat('#5a3d2a', 0.5));
  wallClock.add(face, rim);
  const hand = (len, w, color, z) => {
    const p = new THREE.Group();
    const m = box(w, len, 0.005, mat(color, 0.5), 0, len / 2 - 0.02, 0);
    p.add(m);
    p.position.z = z;
    wallClock.add(p);
    return p;
  };
  const hH = hand(0.11, 0.015, '#222', 0.03);
  const mH = hand(0.17, 0.01, '#222', 0.035);
  const sH = hand(0.18, 0.004, '#a33', 0.04);
  wallClock.position.set(-0.2, 2.2, ROOM.minZ + 0.03);
  scene.add(wallClock);

  // ---- 照明 ----
  scene.add(new THREE.HemisphereLight('#fff3e0', '#3a2a1e', 0.9));
  for (const [x, z] of [[-2, -1], [1.5, -1], [-0.7, 1.2]]) {
    const pl = new THREE.PointLight('#ffe2b8', 7, 7, 1.6);
    pl.position.set(x, 2.7, z);
    scene.add(pl);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff4dd' }));
    bulb.position.copy(pl.position);
    scene.add(bulb);
  }
  const sun = new THREE.DirectionalLight('#dceaff', 0.8);
  sun.position.set(1, 3, -6);
  scene.add(sun);

  // ---- お客さん（簡単な人形） ----
  const customer = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 6, 16), mat('#6a7f9a'));
  body.position.y = 0.95;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), mat('#e9c9a8'));
  head.position.y = 1.6;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#3a2b22'));
  hair.position.y = 1.62;
  hair.rotation.x = -0.25;
  const eyes = new THREE.Group();
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), mat('#1a1a1a'));
    e.position.set(sx * 0.05, 1.62, -0.135);
    eyes.add(e);
  }
  customer.add(body, head, hair, eyes);
  customer.position.set(c.x, 0, c.z + 0.75);
  customer.visible = false;
  scene.add(customer);

  function setCustomerLook(look) {
    body.material.color.set(look.body);
    head.material.color.set(look.head);
    hair.material.color.set(look.hair);
  }

  function update(date) {
    const s = date.getSeconds();
    const m = date.getMinutes() + s / 60;
    const h = (date.getHours() % 12) + m / 60;
    sH.rotation.z = -(s / 60) * Math.PI * 2;
    mH.rotation.z = -(m / 60) * Math.PI * 2;
    hH.rotation.z = -(h / 12) * Math.PI * 2;
    if (customer.visible) customer.position.y = Math.sin(date.getTime() / 600) * 0.005;
  }

  return { scene, interactables, colliders, customer, setCustomerLook, update };
}

/** 調べられる場所の当たり判定（見えない箱） */
function hitBox(scene, id, label, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set(x, y, z);
  m.userData.interact = { id, label };
  scene.add(m);
  return m;
}
