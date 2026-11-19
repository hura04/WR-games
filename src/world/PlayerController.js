// =============================================================
// 一人称視点の移動
//   マウス操作 : WASD で移動、マウスで見回す（Pointer Lock）
//   タッチ操作 : 左下のスティックで移動、画面をドラッグして見回す
//   （タッチパッドはマウス操作として動きます）
// =============================================================
import * as THREE from 'three';
import { WALK } from './Workshop.js';

const EYE = 1.62; // 目の高さ（m）
const SPEED = 2.2; // 歩く速さ（m/秒）
const RADIUS = 0.3; // 体の半径（壁や家具とぶつかる距離）
const MOUSE_SENS = 0.0022;
const TOUCH_SENS = 0.005;

export class PlayerController {
  /**
   * @param {THREE.PerspectiveCamera} camera
   * @param {HTMLElement} dom 描画キャンバス
   * @param {Array} colliders
   */
  constructor(camera, dom, colliders) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.keys = new Set();
    this.enabled = true;
    this.mode = 'mouse'; // 'mouse' | 'touch'
    this.yaw = Math.PI; // 入口（+Z）の方を向く
    this.pitch = -0.12;
    this.stick = { x: 0, y: 0 };
    this.listeners = { lock: [], unlock: [] };
    camera.position.set(-0.75, EYE, 0.6);
    camera.rotation.order = 'YXZ';
    this.#apply();

    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => {
      this.#emit(document.pointerLockElement === this.dom ? 'lock' : 'unlock');
    });
    document.addEventListener('mousemove', (e) => {
      if (this.mode !== 'mouse' || !this.isLocked || !this.enabled) return;
      this.look(e.movementX * MOUSE_SENS, e.movementY * MOUSE_SENS);
    });
    this.#bindTouch();
  }

  on(type, fn) {
    this.listeners[type].push(fn);
  }

  #emit(type) {
    this.listeners[type].forEach((f) => f());
  }

  setMode(mode) {
    this.mode = mode;
    document.body.classList.toggle('touch-mode', mode === 'touch');
  }

  /** 操作を始める（マウスならポインタを固定する） */
  lock() {
    if (this.mode === 'touch') {
      this.touchActive = true;
      this.#emit('lock');
      return;
    }
    try {
      const r = this.dom.requestPointerLock();
      if (r && r.catch) r.catch(() => document.dispatchEvent(new Event('pointerlockerror')));
    } catch {
      document.dispatchEvent(new Event('pointerlockerror'));
    }
  }

  unlock() {
    if (this.mode === 'touch') {
      this.touchActive = false;
      this.#emit('unlock');
      return;
    }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** 操作中か（マウスはポインタ固定中、タッチは一時停止していない） */
  get isLocked() {
    return this.mode === 'touch' ? !!this.touchActive : document.pointerLockElement === this.dom;
  }

  look(dx, dy) {
    this.yaw -= dx;
    this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - dy));
    this.#apply();
  }

  #apply() {
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  // ---- タッチ：スティック＋ドラッグで見回す ----
  #bindTouch() {
    const base = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    let stickId = null, lookId = null, lastX = 0, lastY = 0;
    const center = () => {
      const r = base.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 };
    };
    base?.addEventListener('pointerdown', (e) => {
      stickId = e.pointerId;
      base.setPointerCapture(e.pointerId);
      move(e);
    });
    const move = (e) => {
      if (e.pointerId !== stickId) return;
      const c = center();
      let dx = (e.clientX - c.x) / c.R, dy = (e.clientY - c.y) / c.R;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      this.stick = { x: dx, y: dy };
      knob.style.transform = `translate(${dx * c.R * 0.6}px, ${dy * c.R * 0.6}px)`;
    };
    base?.addEventListener('pointermove', move);
    const end = (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      this.stick = { x: 0, y: 0 };
      knob.style.transform = '';
    };
    base?.addEventListener('pointerup', end);
    base?.addEventListener('pointercancel', end);

    this.dom.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'touch') return;
      lookId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
    });
    this.dom.addEventListener('pointermove', (e) => {
      if (this.mode !== 'touch' || e.pointerId !== lookId || !this.enabled) return;
      this.look((e.clientX - lastX) * TOUCH_SENS, (e.clientY - lastY) * TOUCH_SENS);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const lookEnd = (e) => { if (e.pointerId === lookId) lookId = null; };
    this.dom.addEventListener('pointerup', lookEnd);
    this.dom.addEventListener('pointercancel', lookEnd);
  }

  update(dt) {
    if (!this.enabled || !this.isLocked) return;
    const k = this.keys;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let r = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (this.mode === 'touch') {
      f -= this.stick.y;
      r += this.stick.x;
    }
    if (Math.abs(f) < 0.05 && Math.abs(r) < 0.05) return;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = forward.multiplyScalar(f).add(right.multiplyScalar(r));
    if (move.length() > 1) move.normalize();
    move.multiplyScalar(SPEED * dt);
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
