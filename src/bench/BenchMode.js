// =============================================================
// 作業モード：作業台に座って手元を見下ろす
// -------------------------------------------------------------
// 操作（マウス・タッチパッド）
//   左クリック : 持っている道具で部品を使う
//   右ドラッグ / 何もない所を左ドラッグ : 時計を回す
//   ホイール・ピンチ : ズーム    F : 表裏を返す    L : ルーペ
//   1〜0 : 道具の持ち替え   H : 解説   G : ガイド   X : 席を立つ
// 操作（タッチ）
//   部品をタップ → もう一度タップで道具を使う
//   1本指で何もない所をドラッグ / 2本指ドラッグ : 回す   ピンチ : ズーム
//   画面のボタンで 表裏・ズーム・ルーペ・解説 など
// =============================================================
import * as THREE from 'three';
import { buildBenchScene, SLOTS } from './BenchScene.js';
import { buildWatchModel } from '../watch/index.js';
import { ProcedureRunner } from '../procedure/ProcedureRunner.js';
import { MINIGAMES } from '../procedure/minigames/index.js';
import { FAILURES } from '../data/failures.js';
import { getProcedure } from '../data/procedures/index.js';
import { getTool, TOOL_GROUPS } from '../data/tools.js';
import { getConsumable } from '../data/consumables.js';
import { getOil } from '../data/oils.js';
import { partName, PARTS } from '../data/parts.js';
import { getService } from '../data/services.js';
import { readVoltage, judgeVoltage } from '../sim/quartzSim.js';
import { measure, amplitudeOf, applyOiling, finalScore, rateOf, beatErrorOf } from '../sim/mechanicalSim.js';
import { tween, updateTweens } from '../core/tween.js';
import { guideEnabled } from '../core/state.js';
import { getEnvironment } from '../core/render.js';
import { batteryTexture } from '../watch/textures.js';

const $ = (id) => document.getElementById(id);
const LOUPE_MAG = 4; // ルーペの倍率（第3段階で道具のグレードに連動させる）
const LOUPE_R = 120; // ルーペの半径（画面のピクセル）
const DEFAULT_DIST = 290;

export class BenchMode {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    const { scene, watchPivot, basket } = buildBenchScene(getEnvironment(renderer));
    this.scene = scene;
    this.pivot = watchPivot;
    this.basket = basket;
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
    this.target = new THREE.Vector3(48, 4, 12);
    this.distance = DEFAULT_DIST;
    this.camDir = new THREE.Vector3(0, 1, 0.55).normalize();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.pointerPx = { x: innerWidth / 2, y: innerHeight / 2 };
    this.active = false;
    this.busy = false;
    this.toolId = 'hand';
    this.flip = 0; // 0=表, π=裏
    this.flipTarget = 0;
    this.spin = 0;
    this.tilt = 0;
    this.hoverPart = null;
    this.selectedPart = null; // タッチ：1回目のタップで選んだ部品
    this.loupeOn = false;
    this.job = null;
    this.watch = null;
    this.runner = null;
    this.time = 0;
    this.#setupLoupe();
    this.#bindInput();
    this.#bindButtons();
  }

  get touchMode() {
    return this.game.controlMode === 'touch';
  }

  // ------------------------------------------------------------
  // ルーペ：別のカメラで拡大して描き、丸い板に貼って重ねる
  // ------------------------------------------------------------
  #setupLoupe() {
    this.loupeRT = new THREE.WebGLRenderTarget(512, 512, { samples: 4, type: THREE.HalfFloatType });
    this.loupeCam = new THREE.PerspectiveCamera(35 / LOUPE_MAG, 1, 1, 4000);
    this.overlayScene = new THREE.Scene();
    this.overlayCam = new THREE.OrthographicCamera(0, innerWidth, innerHeight, 0, -10, 10);
    this.loupeLens = new THREE.Mesh(new THREE.CircleGeometry(LOUPE_R, 64), new THREE.MeshBasicMaterial({ map: this.loupeRT.texture }));
    this.loupeRim = new THREE.Mesh(new THREE.RingGeometry(LOUPE_R, LOUPE_R + 9, 64), new THREE.MeshBasicMaterial({ color: '#202020' }));
    this.loupeRim2 = new THREE.Mesh(new THREE.RingGeometry(LOUPE_R + 9, LOUPE_R + 11, 64), new THREE.MeshBasicMaterial({ color: '#8a8a8a' }));
    this.overlayScene.add(this.loupeLens, this.loupeRim, this.loupeRim2);
  }

  // ------------------------------------------------------------
  // 依頼の時計をセットする
  // ------------------------------------------------------------
  setJob(job) {
    if (this.watch) {
      this.pivot.remove(this.watch.root);
      for (const p of Object.values(this.watch.parts)) p.parent?.remove(p);
      this.newBattery?.parent?.remove(this.newBattery);
    }
    this.job = job;
    const procedure = getProcedure(job.procedureId);
    this.procedure = procedure;
    job.flags = job.flags || {};
    this.runner = new ProcedureRunner(procedure, { services: job.services, flags: job.flags });
    job.runner = this.runner;
    this.watch = buildWatchModel(job.watch);
    this.mech = job.watch.movement === 'mechanical';
    // 部品ごとにハイライトできるよう、材質を個別にする
    this.watch.root.traverse((o) => {
      if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
    });
    this.pivot.add(this.watch.root);
    this.flip = this.flipTarget = procedure.startSide === 'back' ? Math.PI : 0;
    this.spin = 0;
    this.tilt = 0;
    this.slotUsed = new Map(); // スロット → 部品
    this.basket.visible = false;
    this.clockOffset = 0;
    this.timeSet = false;
    if (this.mech) {
      this.#setDirty(true);
      job.sim.running = true;
    } else {
      this.watchMode = job.sim.running; // 'stopped' | 'eol' | 'running'
    }
    // クォーツ：在庫から出した新しい電池
    if (!this.mech) {
      this.newBattery = this.#makeLooseBattery();
      this.scene.add(this.newBattery);
      this.newBattery.position.copy(SLOTS.new_part);
    } else this.newBattery = null;
    this.guide = guideEnabled(this.game.state, procedure.id);
    this.#renderSteps();
    this.#renderTools();
    this.#showExplain(null);
  }

  /** 洗浄前の汚れ（古い油でくすんだ色）を付ける／落とす */
  #setDirty(dirty) {
    for (const id of this.watch.movementIds || []) {
      this.watch.parts[id]?.traverse((o) => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (!m.color) continue;
          if (!m.userData.clean) m.userData.clean = { color: m.color.clone(), roughness: m.roughness };
          const c = m.userData.clean;
          m.color.copy(c.color);
          m.roughness = c.roughness;
          if (dirty) {
            m.color.multiply(new THREE.Color('#9c8a6a'));
            m.roughness = Math.min(1, c.roughness + 0.35);
          }
        }
      });
    }
  }

  #makeLooseBattery() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2.6, 40), new THREE.MeshStandardMaterial({ color: '#c7cbd1', metalness: 0.9, roughness: 0.25 }));
    body.position.y = 1.3;
    const topGeo = new THREE.CircleGeometry(3.35, 40);
    topGeo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ map: batteryTexture(), metalness: 0.8, roughness: 0.3 }));
    top.position.y = 2.61;
    g.add(body, top);
    g.traverse((o) => { o.userData.partId = 'new_battery'; o.castShadow = true; });
    g.name = 'new_battery';
    return g;
  }

  enter() {
    this.active = true;
    $('bench-ui').classList.add('show');
    $('hud').classList.remove('show');
    if (this.touchMode && innerWidth < 1000) $('steps').classList.add('collapsed');
    this.#renderTools();
    this.#resize();
  }

  exit() {
    this.active = false;
    this.loupeOn = false;
    this.selectedPart = null;
    $('hud').classList.add('show');
    $('bench-ui').classList.remove('show');
    $('part-label').classList.remove('show');
  }

  // ------------------------------------------------------------
  // 入力（マウス・タッチパッド・タッチを Pointer Events でまとめて扱う）
  // ------------------------------------------------------------
  #bindInput() {
    const el = this.renderer.domElement;
    const pointers = new Map(); // pointerId → {x, y, startX, startY, button}
    let rotating = false, pinchDist = 0, moved = false;
    const setMouse = (x, y) => {
      this.pointerPx = { x, y };
      this.mouse.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
    };
    el.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      el.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, button: e.button, type: e.pointerType });
      setMouse(e.clientX, e.clientY);
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      // 右ボタン、または部品のない所を押したら回転
      const onPart = !!this.#pick();
      rotating = e.button === 2 || (!onPart && pointers.size === 1);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const p = pointers.get(e.pointerId);
      if (!p) {
        if (e.pointerType === 'mouse') { setMouse(e.clientX, e.clientY); this.#updateHover(); }
        return;
      }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) moved = true;
      if (pointers.size === 2) {
        // 2本指：ピンチでズーム、そろって動かすと回転
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) this.zoomBy(pinchDist / d);
        pinchDist = d;
        this.#rotateBy(dx * 0.5, dy * 0.5);
        return;
      }
      if (rotating) this.#rotateBy(dx, dy);
      else {
        setMouse(e.clientX, e.clientY);
        if (e.pointerType === 'mouse') this.#updateHover();
      }
    });
    const up = (e) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (!this.active || !p) return;
      if (pointers.size < 2) pinchDist = 0;
      const wasRotating = rotating;
      if (pointers.size === 0) rotating = false;
      if (moved || wasRotating || this.busy || p.button !== 0 || e.type === 'pointercancel') return;
      // タップ／クリック
      setMouse(e.clientX, e.clientY);
      const hit = this.#pick();
      if (!hit) { this.selectedPart = null; this.#updateHover(); return; }
      if (p.type === 'mouse' && !this.touchMode) {
        this.#useToolOn(hit.id);
      } else if (this.selectedPart === hit.id) {
        this.selectedPart = null;
        this.#useToolOn(hit.id);
      } else {
        this.selectedPart = hit.id;
        this.hoverPart = hit.id;
        this.#showLabel(hit.id, true);
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      if (!this.active) return;
      e.preventDefault(); // タッチパッドのピンチ（ctrl+ホイール）でページが拡大されないように
      const k = e.ctrlKey ? 0.01 : 0.0015;
      this.zoomBy(Math.exp(e.deltaY * k));
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.active || this.busy) return;
      if (/^Digit\d$/.test(e.code)) {
        const tools = this.#ownedTools();
        const n = Number(e.code.slice(5));
        const t = tools[n === 0 ? 9 : n - 1];
        if (t) this.selectTool(t.id);
      }
      if (e.code === 'KeyL') this.toggleLoupe();
      if (e.code === 'KeyF') this.flipWatch();
      if (e.code === 'KeyR') this.resetView();
      if (e.code === 'KeyH') this.#toggleExplainForNext();
      if (e.code === 'KeyG') this.toggleGuide();
      if (e.code === 'KeyX') this.game.leaveBench();
    });
    window.addEventListener('resize', () => this.#resize());
  }

  #bindButtons() {
    const on = (id, fn) => $(id)?.addEventListener('click', (e) => { e.preventDefault(); if (this.active && !this.busy) fn(); });
    on('bc-flip', () => this.flipWatch());
    on('bc-left', () => (this.spin -= Math.PI / 6));
    on('bc-right', () => (this.spin += Math.PI / 6));
    on('bc-zoomin', () => this.zoomBy(0.8));
    on('bc-zoomout', () => this.zoomBy(1.25));
    on('bc-loupe', () => this.toggleLoupe());
    on('bc-reset', () => this.resetView());
    on('bc-explain', () => this.#toggleExplainForNext());
    on('bc-guide', () => this.toggleGuide());
    on('bc-stand', () => this.game.leaveBench());
    on('steps-toggle', () => { $('steps').classList.toggle('collapsed'); this.#resize(); });
  }

  #rotateBy(dx, dy) {
    this.spin += dx * 0.01;
    this.tilt = Math.max(-0.7, Math.min(0.7, this.tilt + dy * 0.006));
  }

  zoomBy(f) {
    this.distance = Math.max(55, Math.min(380, this.distance * f));
  }

  toggleGuide() {
    this.guide = !this.guide;
    this.#renderSteps();
    this.game.ui.toast(this.guide ? 'ガイド表示：オン' : 'ガイド表示：オフ（上級モード）');
  }

  #ownedTools() {
    const owned = this.game.state.ownedTools.map(getTool).filter(Boolean);
    // 時計の種類で使わない道具はバーから外して見やすくする（全部は道具棚で確認できる）
    return owned;
  }

  selectTool(id) {
    this.toolId = id;
    this.#renderTools();
    if (this.selectedPart) this.#showLabel(this.selectedPart, true);
    else this.#updateHover();
  }

  toggleLoupe() {
    this.loupeOn = !this.loupeOn;
    $('bc-loupe')?.classList.toggle('on', this.loupeOn);
  }

  flipWatch() {
    this.flipTarget = this.flipTarget > 1 ? 0 : Math.PI;
  }

  resetView() {
    this.spin = 0;
    this.tilt = 0;
    this.distance = DEFAULT_DIST;
  }

  /** いま上を向いている面 */
  get sideUp() {
    return this.flipTarget > 1 ? 'back' : 'dial';
  }

  #resize() {
    const w = innerWidth, h = innerHeight;
    this.camera.aspect = w / h;
    // 左の手順パネル・右のボタン・下の道具バーに隠れないように、
    // 画面の「空いている部分」の真ん中に時計が来るよう、描く範囲をずらす
    const steps = $('steps'), ctrl = $('bench-controls'), tools = $('tool-area');
    const box = (el) => (el && el.offsetWidth ? el.getBoundingClientRect() : null);
    const sb = box(steps), cb = box(ctrl), tb = box(tools);
    // 画面の端から端まで覆うほど大きいパネルは考えに入れない（ずらしすぎ防止）
    const left = sb && sb.right < w * 0.45 ? sb.right : 0;
    const right = cb && cb.left > w * 0.55 ? w - cb.left : 0;
    const bottom = tb && tb.top > h * 0.5 ? h - tb.top : 0;
    const dx = (left - right) / 2, dy = -bottom / 2;
    if (dx || dy) this.camera.setViewOffset(w, h, -dx, -dy, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    Object.assign(this.overlayCam, { right: w, top: h });
    this.overlayCam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------
  // マウスを乗せた部品
  // ------------------------------------------------------------
  #pick() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const h of hits) {
      if (!isVisible(h.object)) continue;
      const id = h.object.userData.partId;
      if (!id) continue;
      if (id === 'crystal' || id === 'dial_protector_sheet') continue; // 透明な部品は奥を優先
      return { id, point: h.point };
    }
    return null;
  }

  #updateHover() {
    const hit = this.#pick();
    this.hoverPart = hit?.id || null;
    if (this.hoverPart && !this.busy && this.hoverPart !== 'mat') this.#showLabel(this.hoverPart, false);
    else $('part-label').classList.remove('show');
  }

  #showLabel(partId, tapHint) {
    const label = $('part-label');
    label.innerHTML = `<b>${partName(partId)}</b><span>${getTool(this.toolId)?.name ?? ''}${tapHint ? ' ／ もう一度タップで使う' : ''}</span>`;
    label.style.left = `${Math.min(innerWidth - 220, this.pointerPx.x + 18)}px`;
    label.style.top = `${Math.min(innerHeight - 60, this.pointerPx.y + 14)}px`;
    label.classList.add('show');
  }

  // ------------------------------------------------------------
  // 道具を部品に使う
  // ------------------------------------------------------------
  async #useToolOn(partId) {
    const ui = this.game.ui;
    $('part-label').classList.remove('show');
    const res = this.runner.evaluate(partId, this.toolId);
    switch (res.type) {
      case 'start':
        await this.#runStep(res.step);
        break;
      case 'hint':
        ui.toast(res.message);
        break;
      case 'notYet':
        ui.toast(`まだできません。先に「${res.missing.join('」「')}」が必要です。`);
        break;
      case 'wrongTool':
        if (res.failure) {
          const f = this.runner.recordFailure(res.step.id, res.failure);
          ui.toast(`${getTool(this.toolId).name}を使ったら… ${f.message}`, 'bad', 5500);
          this.#flash(partId);
          this.#renderSteps();
        } else ui.toast(res.message, '', 5000);
        break;
      default:
        if (this.toolId === 'loupe' && PARTS[partId]) ui.toast(`${PARTS[partId].name}：${PARTS[partId].desc}`, '', 5000);
        else if (partId === 'dial' || partId === 'hands') ui.toast('文字盤や針には、必要なとき以外は触れないのが原則です。');
        else ui.toast(`${partName(partId)}：今この道具でする作業はありません。`);
    }
  }

  async #runStep(step) {
    const ui = this.game.ui;
    const state = this.game.state;
    for (const [cid, n] of Object.entries(step.consumes || {})) {
      if ((state.stock[cid] || 0) < n) {
        ui.toast(`${getConsumable(cid).name} の在庫がありません。`, 'bad');
        return;
      }
    }
    this.busy = true;
    if (this.guide) this.#showExplain(step);
    const scores = [];
    const tremor = getTool(this.toolId)?.tremor ?? 1;
    try {
      for (const mg of step.minigames) {
        const data = this.#minigameData(step, mg);
        const r = await MINIGAMES[mg.type].run($('minigame'), mg, { tremor, data });
        if (r.cancelled) {
          ui.toast('作業を中断しました。');
          return;
        }
        scores.push(r.score);
        const outcome = this.#afterMinigame(step, mg, data, r);
        if (outcome === 'redo') return;
        const failures = [...(r.failures || []), ...(r.failure ? [r.failure] : [])];
        let retry = false;
        for (const fType of failures) {
          const f = this.runner.recordFailure(step.id, fType);
          ui.toast(f.message, 'bad', 5500);
          this.#flash(step.target);
          if (FAILURES[fType].retry) retry = true;
        }
        if (retry) { this.#renderSteps(); return; }
      }
      // 工程完了
      for (const [cid, n] of Object.entries(step.consumes || {})) state.stock[cid] -= n;
      const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
      const happened = this.runner.complete(step.id, score);
      for (const f of happened) { ui.toast(f.message, 'bad', 6500); this.#flash(step.target); }
      if (step.message) ui.toast(step.message, 'good', 5500);
      else ui.toast(`「${step.name}」完了 ${scoreWord(score)}`, score >= 0.8 ? 'good' : '');
      this.#applyDone(step);
      this.#afterStep(step);
      this.#renderSteps();
      if (this.runner.isFinished()) {
        this.job.workDone = true;
        ui.toast('すべての作業が終わりました！ 席を立ち（X）、受付でお客さんに返却しましょう。', 'good', 7000);
        this.#showExplain(null);
      }
    } finally {
      this.busy = false;
    }
  }

  /** ミニゲームに渡す測定値など */
  #minigameData(step, mg) {
    const sim = this.job.sim;
    if (mg.type === 'reading') {
      const v = readVoltage(mg.source === 'oldBattery' ? sim.oldVoltage : sim.newVoltage);
      return { value: v, unit: 'V', verdict: judgeVoltage(v), source: mg.source };
    }
    if (mg.type === 'inspect' && mg.source === 'mainspring') {
      const fatigued = this.job.condition.mainspring === 'fatigued';
      return {
        draw: fatigued ? 'mainspring_fatigued' : 'mainspring_ok',
        text: fatigued
          ? '香箱からゼンマイを出してみると、渦巻きのまま小さく縮こまっていて、ほとんど開かない。'
          : '香箱からゼンマイを出してみると、大きくS字を描いて開いた。表面にサビや折れぐせもない。',
        options: [
          { label: 'へたっている。交換する', correct: fatigued, value: true },
          { label: '健全。そのまま使う', correct: !fatigued, value: false },
        ],
      };
    }
    if (mg.type === 'regulate') {
      if (mg.mode === 'beat') {
        const base = sim.beatOffset;
        return { pos: 0, measureAt: (pos) => ({ ...this.#measureNow(), beatError: Math.round(Math.abs(base + pos * 3) * 10) / 10 }), base };
      }
      const base = sim.regulator;
      const pos0 = Math.max(-1, Math.min(1, base / 120));
      return { pos: pos0, measureAt: (pos) => { const st = { ...sim, regulator: pos * 120 }; return { ...this.#measureNow(), rate: Math.round(rateOf(st)) }; } };
    }
    if (mg.type === 'measure') {
      const m = this.#measureNow();
      const sc = finalScore(m);
      return { m, score: sc, comment: sc >= 0.95 ? '申し分ない数値。お客さんに自信を持って渡せる。' : sc >= 0.75 ? 'おおむね良好。' : '数値に不安が残る…' };
    }
    if (mg.type === 'water') {
      const r = this.runner;
      const newGasket = r.done.has('install_new_gasket');
      const closeScore = r.stepScores.close_caseback ?? 1;
      return { leak: !newGasket || closeScore < 0.5 };
    }
    return null;
  }

  #measureNow() {
    const s = this.job.sim;
    return { rate: Math.round(rateOf(s)), amplitude: Math.round(amplitudeOf(s)), beatError: Math.round(beatErrorOf(s) * 10) / 10 };
  }

  /** ミニゲームの結果を時計の状態に反映。'redo' を返すと工程はやり直し */
  #afterMinigame(step, mg, data, r) {
    const ui = this.game.ui;
    const sim = this.job.sim;
    if (mg.type === 'reading') {
      // 電池テスターの判断（判断ミスはここで記録し、r.failure は使わない）
      r.failure = null;
      if (data.source === 'oldBattery') {
        if (!r.correct) {
          this.runner.recordFailure(step.id, 'wrong_judgement');
          ui.toast(`判断ミス：${data.value.toFixed(2)}V は交換の目安 1.50V を下回っています。電池が原因です。`, 'bad', 6000);
        }
        return 'ok';
      }
      if (data.verdict === 'low') {
        if (r.correct) {
          this.#discardNewBattery();
          ui.toast(`よく気づきました。${data.value.toFixed(2)}V は弱っています。別の新しい電池を出しました。もう一度測りましょう。`, 'good', 6000);
          return 'redo';
        }
        this.runner.recordFailure(step.id, 'wrong_judgement');
        ui.toast(`判断ミス：${data.value.toFixed(2)}V の電池は弱っています。すぐにまた止まってしまうかもしれません。`, 'bad', 6000);
        sim.weakNewBattery = true;
        return 'ok';
      }
      if (!r.correct) {
        this.#discardNewBattery();
        ui.toast(`${data.value.toFixed(2)}V は新品として正常な電圧でした。良い電池を1個ムダにしてしまいました。`, 'bad', 6000);
        return 'redo';
      }
      return 'ok';
    }
    if (mg.type === 'inspect') {
      const replace = r.value;
      this.job.flags.replaceMainspring = replace;
      if (replace && !this.job.services.has('mainspring_change')) {
        const svc = getService('mainspring_change');
        this.job.services.add('mainspring_change');
        this.job.quoted += svc.price;
        ui.toast(`お客さんに電話で確認し、「${svc.name}」（${svc.price.toLocaleString()}円）を見積もりに追加しました。`, 'good', 6500);
      }
      if (!replace && this.job.condition.mainspring === 'fatigued') sim.springHealth = Math.min(sim.springHealth, 0.6);
      return 'ok';
    }
    if (mg.type === 'oil') {
      const oil = getOil(r.oilId);
      if (oil && this.game.state.stock[oil.consumable] > 0) this.game.state.stock[oil.consumable] -= 1;
      sim.oilScores = sim.oilScores || [];
      sim.oilScores.push(r.score);
      return 'ok';
    }
    if (mg.type === 'regulate') {
      if (mg.mode === 'beat') sim.beatOffset = data.base + r.pos * 3;
      else sim.regulator = r.pos * 120;
      return 'ok';
    }
    if (mg.type === 'measure') {
      this.job.finalMeasurement = r.measurement;
      return 'ok';
    }
    return 'ok';
  }

  /** 工程が終わったあとの、時計の状態の変化 */
  #afterStep(step) {
    const sim = this.job.sim;
    if (step.id === 'ac_reset') this.watchMode = 'running';
    if (step.id === 'set_time') this.timeSet = true;
    if (!this.mech) return;
    if (step.id === 'replace_mainspring') sim.springHealth = 1;
    if (this.runner.failures.some((f) => f.type === 'hairspring_bent')) sim.hairspringBent = true;
    if (step.id === 'install_balance') applyOiling(sim);
    if (step.id.startsWith('oil_')) applyOiling(sim);
  }

  /** 洗浄機などの作業台以外の工程が終わった（Game から呼ばれる） */
  completeStation(stepId, result) {
    const ui = this.game.ui;
    for (const fType of result.failures || []) {
      const f = this.runner.recordFailure(stepId, fType);
      ui.toast(f.message, 'bad', 6000);
    }
    this.runner.complete(stepId, result.score);
    if (this.mech) {
      this.job.sim.dirt = result.failures?.length ? 0.4 : Math.max(0, 0.15 * (1 - result.score));
      this.#setDirty(false);
      this.basket.visible = false;
      for (const id of this.watch.movementIds) if (this.watch.parts[id]) this.watch.parts[id].visible = true;
    }
    this.#renderSteps();
  }

  #discardNewBattery() {
    const st = this.game.state.stock;
    if (st.battery_sr626sw > 0) st.battery_sr626sw -= 1;
    this.job.sim.newVoltage = 1.565; // 次の電池は良品
  }

  // ------------------------------------------------------------
  // 工程が終わったときの見た目の変化
  // ------------------------------------------------------------
  #applyDone(step) {
    const d = step.onDone;
    if (!d) return;
    const parts = this.watch.parts;
    const get = (id) => (id === 'new_battery' ? this.newBattery : parts[id]);
    if (d.move) {
      const obj = get(d.move);
      if (d.to === 'home') this.#moveHome(obj);
      else if (d.to === 'tray') this.#moveTo(obj, this.#allocSlot(obj));
      else this.#moveTo(obj, SLOTS[d.to] || SLOTS.small[0], d.to === 'strap_rest' ? Math.PI / 2 : 0);
    }
    if (d.moveGroup) {
      const objs = d.moveGroup.map(get).filter(Boolean);
      if (d.to === 'home') objs.forEach((o) => this.#moveHome(o));
      else this.#moveGroupTo(objs.filter((o) => o.parent === o.userData.home?.parent), SLOTS[d.to]);
    }
    if (d.rotate) {
      const obj = get(d.rotate);
      const from = obj.rotation.y;
      tween({ duration: 0.5, onUpdate: (k) => (obj.rotation.y = from + (d.angle - from) * k) });
    }
    if (d.show) {
      get(d.show).visible = true;
      if (d.show === 'gasket_old_back') parts.gasket.visible = false;
    }
    if (d.hide) get(d.hide).visible = false;
    if (d.run !== undefined && this.mech) this.job.sim.running = d.run;
    if (d.basket === 'load') {
      // 部品をかごへ：トレイの部品と残りのムーブメントを隠す
      for (const id of this.watch.movementIds) if (parts[id]) parts[id].visible = false;
      for (const id of ['hands', 'dial']) if (parts[id] && parts[id].parent !== parts[id].userData.home.parent) parts[id].visible = true;
      this.basket.visible = true;
      this.game.ui.toast('部品を洗浄かごに入れました。席を立って（X）、洗浄機で洗浄しましょう。', 'good', 6000);
    }
  }

  /** 部品トレイの空いているスロットを選ぶ（大きい部品は丸い皿へ） */
  #allocSlot(obj) {
    const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
    const big = Math.max(size.x, size.z) > 15;
    const lists = big ? [SLOTS.big, SLOTS.small] : [SLOTS.small, SLOTS.big];
    for (const list of lists)
      for (const s of list)
        if (!this.slotUsed.has(s)) {
          this.slotUsed.set(s, obj);
          obj.userData.slot = s;
          return s;
        }
    return SLOTS.small[0];
  }

  #moveTo(obj, slot, turn = 0) {
    this.scene.attach(obj);
    if (turn) obj.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), turn); // 長い部品は横向きに置く
    const box = new THREE.Box3().setFromObject(obj);
    const center = box.getCenter(new THREE.Vector3());
    // 部品の中心がスロットの真上に、底がトレイに乗るように動かす
    const offset = new THREE.Vector3(slot.x - center.x, slot.y + 0.6 - box.min.y, slot.z - center.z);
    const from = obj.position.clone();
    const to = from.clone().add(offset);
    tween({
      duration: 0.8,
      onUpdate: (k) => {
        obj.position.lerpVectors(from, to, k);
        obj.position.y += Math.sin(k * Math.PI) * 25;
      },
    });
  }

  #moveGroupTo(objs, slot) {
    if (!objs.length) return;
    const box = new THREE.Box3();
    objs.forEach((o) => box.expandByObject(o));
    const center = box.getCenter(new THREE.Vector3());
    const offset = new THREE.Vector3(slot.x - center.x, slot.y - box.min.y, slot.z - center.z);
    for (const obj of objs) {
      this.scene.attach(obj);
      const from = obj.position.clone();
      const to = from.clone().add(offset);
      tween({ duration: 0.9, onUpdate: (k) => { obj.position.lerpVectors(from, to, k); obj.position.y += Math.sin(k * Math.PI) * 30; } });
    }
  }

  #moveHome(obj) {
    const home = obj.userData.home;
    if (obj.userData.slot) { this.slotUsed.delete(obj.userData.slot); obj.userData.slot = null; }
    if (obj.parent === home.parent) return;
    home.parent.attach(obj);
    const fromP = obj.position.clone();
    const fromQ = obj.quaternion.clone();
    tween({
      duration: 0.8,
      onUpdate: (k) => {
        obj.position.lerpVectors(fromP, home.position, k);
        obj.quaternion.slerpQuaternions(fromQ, home.quaternion, k);
      },
    });
  }

  #flash(partId) {
    this.flashPart = partId;
    this.flashTime = 0.6;
  }

  // ------------------------------------------------------------
  // 画面（工程リスト・道具・解説）
  // ------------------------------------------------------------
  #renderSteps() {
    const list = $('steps-list');
    const r = this.runner;
    $('steps-title').textContent = `${this.procedure.name}${this.guide ? '' : '（上級モード）'}`;
    const avail = new Set(r.availableSteps().map((s) => s.id));
    list.innerHTML = '';
    let n = 0;
    r.steps.forEach((s) => {
      n++;
      const li = document.createElement('li');
      const done = r.done.has(s.id);
      const skipped = r.skipped.has(s.id);
      const failed = r.failures.filter((f) => f.stepId === s.id).length;
      li.className = done ? 'done' : skipped ? 'skipped' : avail.has(s.id) ? 'next' : '';
      const tag = s.optional ? '<small class="opt">推奨</small>' : s.station ? '<small class="opt">洗浄機</small>' : '';
      if (!this.guide && !done) {
        li.innerHTML = `<span class="num">${n}</span><span class="name">？？？</span>`;
        if (avail.has(s.id)) li.className = '';
      } else {
        li.innerHTML = `<span class="num">${done ? '✓' : skipped ? '−' : n}</span><span class="name">${s.name}${tag}${failed ? ' <em>⚠</em>' : ''}</span>`;
        if (this.guide && avail.has(s.id) && s.hint) {
          const flipNote = s.side && s.side !== this.sideUp && !s.station ? `<b>（F で${s.side === 'back' ? '裏' : '表'}に返す）</b>` : '';
          li.innerHTML += `<div class="hint">${s.hint}${flipNote}</div>`;
        }
      }
      const btn = document.createElement('button');
      btn.className = 'explain-btn';
      btn.textContent = '解説';
      btn.onclick = () => this.#showExplain(s);
      if (this.guide || done) li.appendChild(btn);
      list.appendChild(li);
    });
    $('steps-progress').style.width = `${r.progress() * 100}%`;
    $('quality-now').textContent = `いまの仕上がり見込み：${r.quality()}点`;
    const nextLi = list.querySelector('li.next');
    if (nextLi && this.guide) nextLi.scrollIntoView({ block: 'nearest' });
  }

  #toggleExplainForNext() {
    const panel = $('explain');
    if (panel.classList.contains('show')) return this.#showExplain(null);
    const next = this.runner.availableSteps()[0];
    if (next && this.guide) this.#showExplain(next);
    else this.game.ui.toast('上級モードでは、次の工程は自分で考えましょう（G でガイド表示）。');
  }

  #showExplain(step) {
    const panel = $('explain');
    if (!step) {
      panel.classList.remove('show');
      return;
    }
    panel.innerHTML = `<div class="ex-title">なぜ「${step.name}」をするのか</div><p>${step.explain}</p><button>閉じる</button>`;
    panel.querySelector('button').onclick = () => panel.classList.remove('show');
    panel.classList.add('show');
  }

  #renderTools() {
    const bar = $('toolbar');
    bar.innerHTML = '';
    const tools = this.#ownedTools();
    let lastGroup = null;
    tools.forEach((t, i) => {
      if (t.group !== lastGroup) {
        lastGroup = t.group;
        const g = document.createElement('span');
        g.className = 'tool-group';
        g.textContent = t.group;
        bar.appendChild(g);
      }
      const b = document.createElement('button');
      b.className = 'tool' + (t.id === this.toolId ? ' selected' : '');
      b.innerHTML = `${i < 10 ? `<span class="key">${i === 9 ? 0 : i + 1}</span>` : ''}${t.name}`;
      b.title = t.desc;
      b.onclick = () => this.selectTool(t.id);
      bar.appendChild(b);
    });
    const t = getTool(this.toolId);
    $('tool-desc').textContent = t ? `${t.name}：${t.desc}` : '';
    void TOOL_GROUPS;
  }

  // ------------------------------------------------------------
  // 毎フレームの処理
  // ------------------------------------------------------------
  update(dt) {
    if (!this.watch) return;
    this.time += dt;
    updateTweens(dt);
    this.flip += (this.flipTarget - this.flip) * Math.min(1, dt * 8); // なめらかに裏返す
    this.pivot.rotation.set(this.flip + this.tilt, this.spin, 0);
    this.watch.droop?.(Math.cos(this.flip + this.tilt) >= 0 ? 1 : -1);
    this.camera.position.copy(this.target).addScaledVector(this.camDir, this.distance);
    this.camera.lookAt(this.target);

    // 針と機械の動き
    if (this.mech) {
      const sim = this.job.sim;
      const date = this.timeSet ? new Date() : new Date(this.watch.frozenTime.getTime() + this.time * 1000 * (1 + rateOf(sim) / 86400));
      this.watch.animate(date, dt, { running: sim.running, amplitude: amplitudeOf(sim), handsMode: sim.running ? 'sweep' : null });
    } else {
      if (this.watchMode === 'running') this.clockOffset += dt;
      const base = this.timeSet ? new Date() : new Date(this.watch.frozenTime.getTime() + this.clockOffset * 1000);
      this.watch.setTime(this.watchMode === 'eol' ? new Date(this.watch.frozenTime.getTime() + this.time * 1000) : base, this.watchMode);
    }

    // ハイライト：ガイドの対象（緑に点滅）、マウスを乗せた部品（暖色）、失敗（赤）
    const guideTargets = new Set();
    if (this.guide && !this.busy) for (const s of this.runner.availableSteps()) if (s.target) guideTargets.add(s.target);
    const pulse = 0.25 + 0.2 * Math.sin(this.time * 5);
    if (this.flashTime > 0) this.flashTime -= dt;
    const focus = this.selectedPart || this.hoverPart;
    const seen = new Set();
    const objs = [this.watch.root, ...Object.values(this.watch.parts)];
    if (this.newBattery) objs.push(this.newBattery);
    for (const obj of objs) {
      obj.traverse((o) => {
        if (!o.isMesh || seen.has(o)) return;
        seen.add(o);
        const id = o.userData.partId;
        let color = null, intensity = 0;
        if (this.flashTime > 0 && id === this.flashPart) { color = '#ff3020'; intensity = 0.8; }
        else if (id === focus && !this.busy) { color = '#ffb347'; intensity = 0.4; }
        else if (guideTargets.has(id)) { color = '#40ff90'; intensity = pulse; }
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m.emissive) continue;
          if (color) m.emissive.set(color);
          else m.emissive.setRGB(0, 0, 0);
          m.emissiveIntensity = intensity;
        }
      });
    }
  }

  render() {
    const r = this.renderer;
    r.render(this.scene, this.camera);
    if (!this.loupeOn) return;
    // マウス（指）の位置を中心に、倍率をかけたカメラで描く
    const dir = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
    this.loupeCam.position.copy(this.camera.position);
    this.loupeCam.up.copy(this.camera.up);
    this.loupeCam.lookAt(this.camera.position.clone().add(dir));
    this.loupeCam.fov = this.camera.fov / LOUPE_MAG;
    this.loupeCam.updateProjectionMatrix();
    r.setRenderTarget(this.loupeRT);
    r.render(this.scene, this.loupeCam);
    r.setRenderTarget(null);
    const x = this.pointerPx.x, y = innerHeight - this.pointerPx.y;
    for (const m of [this.loupeLens, this.loupeRim, this.loupeRim2]) m.position.set(x, y, 0);
    const auto = r.autoClear;
    r.autoClear = false;
    r.clearDepth();
    r.render(this.overlayScene, this.overlayCam);
    r.autoClear = auto;
  }
}

function isVisible(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function scoreWord(s) {
  if (s >= 0.95) return '（見事！）';
  if (s >= 0.8) return '（上手）';
  if (s >= 0.6) return '（まずまず）';
  return '（やや雑…）';
}
