// =============================================================
// 描画の共通設定：金属の映り込み（環境マップ）と影
// =============================================================
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let envTexture = null;

/** 部屋の照明を写し込む環境マップ。金属やガラスがリアルに見えるようになる */
export function getEnvironment(renderer) {
  if (!envTexture) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  return envTexture;
}

export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  // タブレットは画素が細かいので、描く解像度を少し抑えてなめらかに動かす
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(touch ? 1.5 : 2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}
