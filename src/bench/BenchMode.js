// =============================================================
// 作業モード：作業台に座って手元を見下ろす
// -------------------------------------------------------------
// 操作
//   左クリック : 持っている道具で部品を使う
//   右ドラッグ : 時計を回す / F : 表裏を返す
//   ホイール   : ズーム / L : ルーペ / 1〜9 : 道具の持ち替え
//   H : 解説 / G : ガイド表示の切り替え / X : 席を立つ
// =============================================================
import * as THREE from 'three';
import { buildBenchScene, TRAY_SLOTS } from './BenchScene.js';
import { buildQuartzWatch } from '../watch/QuartzWatch.js';
import { ProcedureRunner } from '../procedure/ProcedureRunner.js';
import { MINIGAMES } from '../procedure/minigames/index.js';
import { FAILURES } from '../data/failures.js';
import { getProcedure } from '../data/procedures/index.js';
import { getTool } from '../data/tools.js';
import { getConsumable } from '../data/consumables.js';
import { partName, PARTS } from '../data/parts.js';
import { readVoltage, judgeVoltage } from '../sim/quartzSim.js';
import { tween, updateTweens } from '../core/tween.js';
import { guideEnabled } from '../core/state.js';
import { batteryTexture } from '../watch/textures.js';

const $ = (id) => document.getElementById(id);
const LOUPE_MAG = 4; // ルーペの倍率（第3段階で道具のグレードに連動させる）

export class BenchMode {
  constructor(renderer, game) {
    this.renderer = renderer;
    this.game = game;
    const { scene, watchPivot } = buildBenchScene();
    this.scene = scene;
    this.pivot = watchPivot;
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
    this.target = new THREE.Vector3(18, 4, 6);
    this.distance = 170;
    this.camDir = new THREE.Vector3(0, 1, 0.55).normalize();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.mousePx = { x: 0, y: 0 };
    this.active = false;
    this.busy = false;
    this.toolId = 'hand';
    this.flip = 0; // 0=表, π=裏
    this.spin = 0;
    this.tilt = 0;
    this.hoverPart = null;
    this.loupeOn = false;
    this.job = null;
    this.watch = null;
    this.runner = null;
    this.time = 0;

    // ルーペは小さな丸いキャンバスに別のカメラで描く
    this.loupeCanvas = $('loupe');
    this.loupeRenderer = new THREE.WebGLRenderer({ canvas: this.loupeCanvas, antialias: true });
    this.loupeRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.loupeRenderer.setSize(240, 240, false);
    this.loupeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.loupeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.loupeCam = new THREE.PerspectiveCamera(35 / LOUPE_MAG, 1, 1, 4000);

    this.#bindInput();
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
    this.runner = new ProcedureRunner(procedure, { services: job.services });
    job.runner = this.runner;
    this.watch = buildQuartzWatch(job.watch);
    // 部品ごとにハイライトできるよう、材質を個別にする
    this.watch.root.traverse((o) => {
      if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
    });
    this.pivot.add(this.watch.root);
    this.flip = procedure.startSide === 'back' ? Math.PI : 0;
    this.flipTarget = this.flip;
    this.spin = 0;
    this.tilt = 0;
    this.watchMode = job.sim.running; // 'stopped' | 'eol' | 'running'
    this.clockOffset = 0;
    this.timeSet = false;

    // 在庫から出した新しい電池（マットの上のトレイ）
    this.newBattery = this.#makeLooseBattery();
    this.scene.add(this.newBattery);
    this.newBattery.position.copy(TRAY_SLOTS.new_part);
    this.guide = guideEnabled(this.game.state, procedure.id);
    this.#renderSteps();
    this.#renderTools();
    this.#showExplain(null);
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
    g.traverse((o) => (o.userData.partId = 'new_battery'));
    g.name = 'new_battery';
    return g;
  }

  enter() {
    this.active = true;
    $('bench-ui').classList.add('show');
    $('hud').classList.remove('show');
    this.#resize();
  }

  exit() {
    this.active = false;
    this.loupeOn = false;
    $('hud').classList.add('show');
    this.loupeCanvas.classList.remove('show');
    $('bench-ui').classList.remove('show');
    $('part-label').classList.remove('show');
  }

  // ------------------------------------------------------------
  // 入力
  // ------------------------------------------------------------
  #bindInput() {
    const el = this.renderer.domElement;
    let dragging = false, lastX = 0, lastY = 0;
    el.addEventListener('mousemove', (e) => {
      if (!this.active) return;
      this.mousePx = { x: e.clientX, y: e.clientY };
      this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      if (dragging) {
        this.spin += (e.clientX - lastX) * 0.01;
        this.tilt = Math.max(-0.7, Math.min(0.7, this.tilt + (e.clientY - lastY) * 0.006));
        lastX = e.clientX;
        lastY = e.clientY;
      }
      this.#updateHover();
    });
    el.addEventListener('mousedown', (e) => {
      if (!this.active) return;
      if (e.button === 2) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) dragging = false;
    });
    el.addEventListener('click', (e) => {
      if (!this.active || this.busy || e.button !== 0) return;
      if (this.hoverPart) this.#useToolOn(this.hoverPart);
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => {
      if (!this.active) return;
      this.distance = Math.max(55, Math.min(320, this.distance * (1 + Math.sign(e.deltaY) * 0.1)));
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (!this.active || this.busy) return;
      if (e.code.startsWith('Digit')) {
        const tools = this.#ownedTools();
        const i = Number(e.code.slice(5)) - 1;
        if (tools[i]) this.selectTool(tools[i].id);
      }
      if (e.code === 'Digit0') {
        const tools = this.#ownedTools();
        if (tools[9]) this.selectTool(tools[9].id);
      }
      if (e.code === 'KeyL') this.toggleLoupe();
      if (e.code === 'KeyF') this.flipWatch();
      if (e.code === 'KeyR') this.resetView();
      if (e.code === 'KeyH') this.#toggleExplainForNext();
      if (e.code === 'KeyG') { this.guide = !this.guide; this.#renderSteps(); this.game.ui.toast(this.guide ? 'ガイド表示：オン' : 'ガイド表示：オフ（上級モード）'); }
      if (e.code === 'KeyX') this.game.leaveBench();
    });
    window.addEventListener('resize', () => this.#resize());
  }

  #ownedTools() {
    return this.game.state.ownedTools.map(getTool).filter(Boolean);
  }

  selectTool(id) {
    this.toolId = id;
    this.#renderTools();
    this.#updateHover();
  }

  toggleLoupe() {
    this.loupeOn = !this.loupeOn;
    this.loupeCanvas.classList.toggle('show', this.loupeOn);
  }

  flipWatch() {
    this.flipTarget = this.flipTarget > 1 ? 0 : Math.PI;
  }

  resetView() {
    this.spin = 0;
    this.tilt = 0;
    this.distance = 170;
  }

  #resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
      if (id === 'crystal') continue; // 風防は透明なので奥の部品を優先
      return { id, point: h.point };
    }
    return null;
  }

  #updateHover() {
    const hit = this.#pick();
    this.hoverPart = hit?.id || null;
    this.hoverPoint = hit?.point || null;
    const label = $('part-label');
    if (this.hoverPart && !this.busy) {
      label.innerHTML = `<b>${partName(this.hoverPart)}</b><span>${getTool(this.toolId)?.name ?? ''}</span>`;
      label.style.left = `${this.mousePx.x + 18}px`;
      label.style.top = `${this.mousePx.y + 14}px`;
      label.classList.add('show');
    } else label.classList.remove('show');
  }

  // ------------------------------------------------------------
  // 道具を部品に使う
  // ------------------------------------------------------------
  async #useToolOn(partId) {
    const ui = this.game.ui;
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
          ui.toast(`${getTool(this.toolId).name}を使ったら… ${f.message}`, 'bad');
          this.#flash(partId);
          this.#renderSteps();
        } else ui.toast(res.message);
        break;
      default:
        if (this.toolId === 'loupe' && PARTS[partId]) ui.toast(`${PARTS[partId].name}：${PARTS[partId].desc}`);
        else if (partId === 'dial' || partId === 'crystal') ui.toast('文字盤や針には、必要なとき以外は触れないのが原則です。');
        else ui.toast(`${partName(partId)}：今この道具でする作業はありません。`);
    }
  }

  async #runStep(step) {
    const ui = this.game.ui;
    const state = this.game.state;
    // 消耗品の在庫チェック
    for (const [cid, n] of Object.entries(step.consumes || {})) {
      if ((state.stock[cid] || 0) < n) {
        ui.toast(`${getConsumable(cid).name} の在庫がありません。`, 'bad');
        return;
      }
    }
    this.busy = true;
    $('part-label').classList.remove('show');
    if (this.guide) this.#showExplain(step);
    const scores = [];
    const tremor = getTool(this.toolId)?.tremor ?? 1;
    try {
      for (const mg of step.minigames) {
        const data = this.#minigameData(mg);
        const r = await MINIGAMES[mg.type].run($('minigame'), mg, { tremor, data });
        if (r.cancelled) {
          ui.toast('作業を中断しました。');
          return;
        }
        scores.push(r.score);
        // 測定結果の判断（電池テスター）
        if (mg.type === 'reading') {
          const handled = this.#afterReading(mg, data, r);
          if (handled === 'redo') return;
          continue;
        }
        if (r.failure) {
          const f = this.runner.recordFailure(step.id, r.failure);
          ui.toast(f.message, 'bad');
          this.#flash(step.target);
          if (FAILURES[r.failure].retry) {
            this.#renderSteps();
            return;
          }
        }
      }
      // 工程完了
      for (const [cid, n] of Object.entries(step.consumes || {})) state.stock[cid] -= n;
      const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
      this.runner.complete(step.id, score);
      if (step.autoFailure) ui.toast(FAILURES[step.autoFailure].message, 'bad');
      if (step.message) ui.toast(step.message, 'good');
      else ui.toast(`「${step.name}」完了 ${scoreWord(score)}`, score >= 0.8 ? 'good' : '');
      this.#applyDone(step);
      if (step.id === 'ac_reset') this.watchMode = 'running';
      if (step.id === 'set_time') this.timeSet = true;
      this.#renderSteps();
      if (this.runner.isFinished()) {
        this.job.workDone = true;
        ui.toast('すべての作業が終わりました！ X キーで席を立ち、受付でお客さんに返却しましょう。', 'good', 6000);
        this.#showExplain(null);
      }
    } finally {
      this.busy = false;
    }
  }

  #minigameData(mg) {
    if (mg.type !== 'reading') return null;
    const sim = this.job.sim;
    const v = readVoltage(mg.source === 'oldBattery' ? sim.oldVoltage : sim.newVoltage);
    return { value: v, unit: 'V', verdict: judgeVoltage(v), source: mg.source };
  }

  /** 電池テスターの判断のあと。'redo' を返すと工程はやり直し */
  #afterReading(mg, data, r) {
    const ui = this.game.ui;
    const sim = this.job.sim;
    if (data.source === 'oldBattery') {
      if (!r.correct) {
        this.runner.recordFailure('measure_old_battery', 'wrong_judgement');
        ui.toast(`判断ミス：${data.value.toFixed(2)}V は交換の目安 1.50V を下回っています。電池が原因です。`, 'bad', 6000);
      }
      return 'ok';
    }
    // 新しい電池
    if (data.verdict === 'low') {
      if (r.correct) {
        this.#discardNewBattery();
        ui.toast(`よく気づきました。${data.value.toFixed(2)}V は弱っています。別の新しい電池を出しました。もう一度測りましょう。`, 'good', 6000);
        return 'redo';
      }
      this.runner.recordFailure('measure_new_battery', 'wrong_judgement');
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

  #discardNewBattery() {
    const st = this.game.state.stock;
    if (st.battery_sr626sw > 0) st.battery_sr626sw -= 1;
    this.job.sim.newVoltage = 1.565; // 次の電池は良品
  }

  // 工程が終わったときの見た目の変化
  #applyDone(step) {
    const d = step.onDone;
    if (!d) return;
    const parts = this.watch.parts;
    const get = (id) => (id === 'new_battery' ? this.newBattery : parts[id]);
    if (d.move) {
      const obj = get(d.move);
      if (d.to === 'home') this.#moveHome(obj);
      else this.#moveTo(obj, TRAY_SLOTS[d.to]);
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
  }

  #moveTo(obj, slot) {
    this.scene.attach(obj);
    const from = obj.position.clone();
    const to = slot.clone().add(new THREE.Vector3(0, 2, 0));
    tween({
      duration: 0.8,
      onUpdate: (k) => {
        obj.position.lerpVectors(from, to, k);
        obj.position.y += Math.sin(k * Math.PI) * 25;
      },
    });
  }

  #moveHome(obj) {
    const home = obj.userData.home;
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
    r.steps.forEach((s, i) => {
      const li = document.createElement('li');
      const done = r.done.has(s.id);
      const failed = r.failures.filter((f) => f.stepId === s.id).length;
      li.className = done ? 'done' : avail.has(s.id) ? 'next' : '';
      if (!this.guide && !done) {
        li.innerHTML = `<span class="num">${i + 1}</span><span class="name">？？？</span>`;
        if (avail.has(s.id)) li.className = '';
      } else {
        li.innerHTML = `<span class="num">${done ? '✓' : i + 1}</span><span class="name">${s.name}${failed ? ' <em>⚠</em>' : ''}</span>`;
        if (this.guide && avail.has(s.id) && s.hint) li.innerHTML += `<div class="hint">${s.hint}</div>`;
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
    this.#ownedTools().forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'tool' + (t.id === this.toolId ? ' selected' : '');
      b.innerHTML = `<span class="key">${i === 9 ? 0 : i + 1}</span>${t.name}`;
      b.title = t.desc;
      b.onclick = () => this.selectTool(t.id);
      bar.appendChild(b);
    });
    const t = getTool(this.toolId);
    $('tool-desc').textContent = t ? `${t.name}：${t.desc}` : '';
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
    // カメラ
    this.camera.position.copy(this.target).addScaledVector(this.camDir, this.distance);
    this.camera.lookAt(this.target);

    // 針：止まっている時計は止まったまま、動き出したら時を刻む
    if (this.watchMode === 'running') this.clockOffset += dt;
    const base = this.timeSet ? new Date() : new Date(this.watch.frozenTime.getTime() + this.clockOffset * 1000);
    this.watch.setTime(this.watchMode === 'eol' ? new Date(this.watch.frozenTime.getTime() + this.time * 1000) : base, this.watchMode);

    // ハイライト：ガイドの対象（緑に点滅）、マウスを乗せた部品（暖色）、失敗（赤）
    const guideTargets = new Set();
    if (this.guide && !this.busy) for (const s of this.runner.availableSteps()) guideTargets.add(s.target);
    const pulse = 0.25 + 0.2 * Math.sin(this.time * 5);
    if (this.flashTime > 0) this.flashTime -= dt;
    const all = [this.watch.root, ...Object.values(this.watch.parts), this.newBattery];
    const seen = new Set();
    for (const obj of all) {
      obj.traverse((o) => {
        if (!o.isMesh || seen.has(o)) return;
        seen.add(o);
        const id = o.userData.partId;
        let color = null, intensity = 0;
        if (this.flashTime > 0 && id === this.flashPart) { color = '#ff3020'; intensity = 0.8; }
        else if (id === this.hoverPart && !this.busy) { color = '#ffb347'; intensity = 0.35; }
        else if (guideTargets.has(id)) { color = '#40ff90'; intensity = pulse; }
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m.emissive) continue;
          if (color) m.emissive.set(color);
          else m.emissive.set('#000000');
          m.emissiveIntensity = intensity;
        }
      });
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    if (this.loupeOn) {
      // マウスの位置を中心に、倍率をかけたカメラで描く
      const dir = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
      this.loupeCam.position.copy(this.camera.position);
      this.loupeCam.up.copy(this.camera.up);
      this.loupeCam.lookAt(this.camera.position.clone().add(dir));
      this.loupeCam.fov = this.camera.fov / LOUPE_MAG;
      this.loupeCam.updateProjectionMatrix();
      this.loupeRenderer.render(this.scene, this.loupeCam);
      this.loupeCanvas.style.left = `${this.mousePx.x - 120}px`;
      this.loupeCanvas.style.top = `${this.mousePx.y - 120}px`;
    }
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
