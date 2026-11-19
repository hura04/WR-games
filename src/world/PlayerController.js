// =============================================================
// 一人称視点の移動（WASD＋マウス、Pointer Lock）
// =============================================================
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { WALK } from './Workshop.js';

const EYE = 1.62; // 目の高さ（m）
const SPEED = 2.2; // 歩く速さ（m/秒）
const RADIUS = 0.3; // 体の半径（壁や家具とぶつかる距離）

export class PlayerController {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.controls = new PointerLockControls(camera, domElement);
    this.keys = new Set();
    this.enabled = true;
    camera.position.set(-0.75, EYE, 0.6);
    camera.lookAt(-0.75, 1.3, 3);
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  lock() {
    this.controls.lock();
  }

  get isLocked() {
    return this.controls.isLocked;
  }

  update(dt) {
    if (!this.enabled || !this.controls.isLocked) return;
    const k = this.keys;
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (!f && !r) return;
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    const move = forward.multiplyScalar(f).add(right.multiplyScalar(r)).normalize().multiplyScalar(SPEED * dt);
    // X と Z を別々に動かして、壁に沿って滑れるようにする
    const p = this.camera.position;
    const nx = p.x + move.x;
    if (!this.#blocked(nx, p.z)) p.x = nx;
    const nz = p.z + move.z;
    if (!this.#blocked(p.x, nz)) p.z = nz;
  }

  #blocked(x, z) {
    if (x < WALK.minX || x > WALK.maxX || z < WALK.minZ || z > WALK.maxZ) return true;
    return this.colliders.some(
      (c) => x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS,
    );
  }
}
