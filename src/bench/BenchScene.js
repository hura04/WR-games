// =============================================================
// 作業台の手元（単位 mm）。マット・時計を置く台・部品トレイ・照明
// =============================================================
import * as THREE from 'three';
import { roundedBoxGeometry, ringGeometry, discGeometry } from '../watch/geometry.js';
import { woodTexture, matTexture } from '../watch/textures.js';

/** 外した部品を置く場所 */
export const SLOTS = {
  // 大きな部品用の丸い皿（裏蓋・文字盤・回転錘など）
  big: [new THREE.Vector3(44, 1, -36), new THREE.Vector3(80, 1, -36), new THREE.Vector3(116, 1, -36), new THREE.Vector3(152, 1, -36), new THREE.Vector3(152, 1, 2)],
  // 仕切りのある部品トレイ（5列×4行）
  small: [],
  new_part: new THREE.Vector3(150, 1, 36),
  case_rest: new THREE.Vector3(2, 6, 62),
  strap_rest: new THREE.Vector3(80, 2, 80), // 横向きに置く
  basket: new THREE.Vector3(80, 1, 22),
};
// 仕切りトレイのマス（5列×4行、1マス17mm）
for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) SLOTS.small.push(new THREE.Vector3(46 + c * 17, 1, -3 + r * 17));

export function buildBenchScene(environment) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15110e');
  scene.environment = environment;
  scene.environmentIntensity = 0.55;

  const tableTex = woodTexture('#7b5132', 4);
  const table = new THREE.Mesh(new THREE.BoxGeometry(1000, 20, 700), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.55 }));
  table.position.y = -12;
  table.receiveShadow = true;
  scene.add(table);

  const mat = new THREE.Mesh(roundedBoxGeometry(330, 2, 220, 12), new THREE.MeshStandardMaterial({ map: matTexture(), roughness: 0.95 }));
  mat.position.set(40, -2, 10);
  mat.userData.partId = 'mat';
  mat.receiveShadow = true;
  scene.add(mat);

  // 時計を置くクッション（ムーブメント台の代わり）
  const cushion = new THREE.Mesh(new THREE.TorusGeometry(15, 4.5, 20, 64), new THREE.MeshStandardMaterial({ color: '#25407a', roughness: 0.95 }));
  cushion.rotation.x = Math.PI / 2;
  cushion.position.y = 2.5;
  cushion.receiveShadow = true;
  scene.add(cushion);

  // 部品トレイ：白い樹脂の仕切りトレイ
  const trayMat = new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.45 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#dcd8cf', roughness: 0.5 });
  const trayGroup = new THREE.Group();
  const base = new THREE.Mesh(roundedBoxGeometry(89, 1.2, 72, 4), trayMat);
  base.position.set(80, -0.2, 22.5);
  trayGroup.add(base);
  for (let c = 0; c <= 5; c++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(1, 3.5, 70), wallMat);
    w.position.set(37.5 + c * 17, 1.75, 22.5);
    trayGroup.add(w);
  }
  for (let r = 0; r <= 4; r++) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(87, 3.5, 1), wallMat);
    w.position.set(80, 1.75, -11.5 + r * 17);
    trayGroup.add(w);
  }
  trayGroup.traverse((o) => {
    if (o.isMesh) { o.userData.partId = 'tray'; o.receiveShadow = true; o.castShadow = true; }
  });
  scene.add(trayGroup);
  // 大きな部品の皿（ふた付きの金属皿）と、新しい部品の皿
  const dishMat = new THREE.MeshStandardMaterial({ color: '#d9dde2', roughness: 0.25, metalness: 0.8 });
  const dish = (p, r) => {
    const rim = new THREE.Mesh(ringGeometry(r, r - 1.2, 3.5, 0), dishMat);
    rim.position.set(p.x, 0, p.z);
    const floor = new THREE.Mesh(discGeometry(r - 1, 0.6), new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.7 }));
    floor.position.set(p.x, 0, p.z);
    for (const m of [rim, floor]) { m.userData.partId = 'tray'; m.receiveShadow = true; scene.add(m); }
  };
  SLOTS.big.forEach((p) => dish(p, 17.5));
  dish(SLOTS.new_part, 10);

  // 洗浄かご（部品を入れたときだけ見える）
  const basket = new THREE.Group();
  const meshMat = new THREE.MeshStandardMaterial({ color: '#b8bec4', metalness: 0.8, roughness: 0.4, wireframe: true });
  const bBody = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 26, 32, 6, true), meshMat);
  bBody.position.y = 13;
  const bBottom = new THREE.Mesh(new THREE.CircleGeometry(34, 32), meshMat);
  bBottom.rotation.x = -Math.PI / 2;
  const bRim = new THREE.Mesh(new THREE.TorusGeometry(34, 1, 8, 48), new THREE.MeshStandardMaterial({ color: '#c9ced3', metalness: 0.9, roughness: 0.25 }));
  bRim.rotation.x = Math.PI / 2;
  bRim.position.y = 26;
  basket.add(bBody, bBottom, bRim);
  basket.position.copy(SLOTS.basket);
  basket.visible = false;
  basket.traverse((o) => (o.userData.partId = 'tray'));
  scene.add(basket);

  // 照明（作業ランプ＝影を落とす、環境光、補助光）
  scene.add(new THREE.HemisphereLight('#fff6e8', '#2a2018', 0.55));
  const lamp = new THREE.DirectionalLight('#fff1d6', 2.6);
  lamp.position.set(-90, 320, 140);
  lamp.target.position.set(40, 0, 10);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  Object.assign(lamp.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 50, far: 700 });
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.3;
  scene.add(lamp, lamp.target);
  const fill = new THREE.DirectionalLight('#cfe0ff', 0.5);
  fill.position.set(200, 120, -100);
  scene.add(fill);

  // 時計を回転させるための台座（この下に時計を入れる）
  const watchPivot = new THREE.Group();
  watchPivot.position.set(0, 9, 0);
  watchPivot.rotation.order = 'XYZ';
  scene.add(watchPivot);

  return { scene, watchPivot, basket };
}
