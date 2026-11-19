// =============================================================
// 作業台の手元（単位 mm）。マット・時計を置く台・部品トレイ・照明
// =============================================================
import * as THREE from 'three';
import { roundedBoxGeometry, ringGeometry, discGeometry } from '../watch/geometry.js';
import { woodTexture } from '../watch/textures.js';

/** 外した部品を置く場所（マットの上の部品トレイ） */
export const TRAY_SLOTS = {
  tray_a: new THREE.Vector3(48, 1, -14),
  tray_b: new THREE.Vector3(48, 1, 14),
  tray_c: new THREE.Vector3(76, 1, 14),
  new_part: new THREE.Vector3(76, 1, -14),
};

export function buildBenchScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15110e');

  const tableTex = woodTexture('#7b5132');
  tableTex.repeat.set(2, 2);
  const table = new THREE.Mesh(new THREE.BoxGeometry(900, 20, 600), new THREE.MeshStandardMaterial({ map: tableTex, roughness: 0.6 }));
  table.position.y = -12;
  scene.add(table);

  const mat = new THREE.Mesh(roundedBoxGeometry(300, 2, 200, 12), new THREE.MeshStandardMaterial({ color: '#2f6b57', roughness: 0.95 }));
  mat.position.set(20, -2, 0);
  mat.userData.partId = 'mat';
  scene.add(mat);

  // 時計を置くクッション（ムーブメント台の代わり）
  const cushion = new THREE.Mesh(new THREE.TorusGeometry(14, 4, 16, 48), new THREE.MeshStandardMaterial({ color: '#2a4a8a', roughness: 0.9 }));
  cushion.rotation.x = Math.PI / 2;
  cushion.position.y = 2;
  scene.add(cushion);

  // 部品トレイ（ふた付きの丸い皿が4つ）
  const trayMat = new THREE.MeshStandardMaterial({ color: '#d9dde2', roughness: 0.3, metalness: 0.6 });
  for (const key of Object.keys(TRAY_SLOTS)) {
    const p = TRAY_SLOTS[key];
    const rim = new THREE.Mesh(ringGeometry(12.5, 11.5, 3, 0), trayMat);
    rim.position.set(p.x, 0, p.z);
    rim.userData.partId = 'tray';
    const floor = new THREE.Mesh(discGeometry(11.6, 0.6), new THREE.MeshStandardMaterial({ color: key === 'new_part' ? '#e8e0c8' : '#f1f1ee', roughness: 0.7 }));
    floor.position.set(p.x, 0, p.z);
    floor.userData.partId = 'tray';
    scene.add(rim, floor);
  }

  // 照明（作業ランプ＋環境光）
  scene.add(new THREE.HemisphereLight('#fff6e8', '#2a2018', 1.0));
  const lamp = new THREE.DirectionalLight('#fff1d6', 2.4);
  lamp.position.set(-120, 300, 120);
  scene.add(lamp);
  const fill = new THREE.DirectionalLight('#cfe0ff', 0.6);
  fill.position.set(200, 120, -100);
  scene.add(fill);
  const rimLight = new THREE.PointLight('#ffe7c4', 2, 400, 1.2);
  rimLight.position.set(0, 120, 0);
  scene.add(rimLight);

  // 時計を回転させるための台座（この下に時計を入れる）
  const watchPivot = new THREE.Group();
  watchPivot.position.set(0, 8, 0);
  watchPivot.rotation.order = 'XYZ';
  scene.add(watchPivot);

  return { scene, watchPivot };
}
