// =============================================================
// ゲーム全体のまとめ役
//   ・工房（歩く）と作業台（作業モード）の切り替え
//   ・依頼の流れ（お客さんが来る → 受付 → 作業 → 洗浄機 → 返却）
//   ・操作方法（マウス／タッチ）の切り替え
//   ・毎フレームの更新と描画
// =============================================================
import * as THREE from 'three';
import { buildWorkshop } from '../world/Workshop.js';
import { PlayerController } from '../world/PlayerController.js';
import { BenchMode } from '../bench/BenchMode.js';
import { UI } from '../ui/UI.js';
import { runIntake, runHandover } from '../ui/Counter.js';
import { createNewState, loadState, saveState, clearSave } from './state.js';
import { createRenderer, getEnvironment } from './render.js';
import { CUSTOMERS } from '../data/customers.js';
import { getWatch } from '../data/watches.js';
import { getTool } from '../data/tools.js';
import { getConsumable } from '../data/consumables.js';
import { createQuartzState } from '../sim/quartzSim.js';
import { createMechanicalState } from '../sim/mechanicalSim.js';
import { MINIGAMES } from '../procedure/minigames/index.js';

const $ = (id) => document.getElementById(id);

/** タッチ操作の端末か（タブレット・スマホ） */
export function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || false;
}

export class Game {
  constructor(container) {
    this.renderer = createRenderer();
    container.appendChild(this.renderer.domElement);

    this.ui = new UI();
    this.state = createNewState();
    this.mode = 'title'; // 'title' | 'world' | 'bench'
    this.job = null;
    this.busy = false; // 会話中など

    this.world = buildWorkshop();
    this.world.scene.environment = getEnvironment(this.renderer);
    this.world.scene.environmentIntensity = 0.35;
    this.camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 50);
    this.player = new PlayerController(this.camera, this.renderer.domElement, this.world.colliders);
    this.bench = new BenchMode(this.renderer, this);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.4;
    this.focus = null;
    this.applyControlMode();

    this.#bindEvents();
    this.#showTitle();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  /** 設定の「操作方法」から、マウス操作かタッチ操作かを決める */
  get controlMode() {
    const s = this.state.settings.control || 'auto';
    return s === 'auto' ? (isTouchDevice() ? 'touch' : 'mouse') : s;
  }

  applyControlMode() {
    this.player.setMode(this.controlMode);
    document.body.classList.toggle('touch-mode', this.controlMode === 'touch');
  }

  // ------------------------------------------------------------
  // タイトル・一時停止
  // ------------------------------------------------------------
  #showTitle() {
    const saved = loadState();
    $('title').classList.add('show');
    $('btn-continue').style.display = saved ? '' : 'none';
    $('title-control').value = (saved || this.state).settings.control || 'auto';
    $('btn-new').onclick = () => {
      if (saved && !confirm('セーブデータを消して、はじめから遊びますか？')) return;
      clearSave();
      this.#start(createNewState());
    };
    $('btn-continue').onclick = () => this.#start(saved);
  }

  #start(state) {
    this.state = state;
    this.state.settings.control = $('title-control').value;
    this.applyControlMode();
    $('title').classList.remove('show');
    $('hud').classList.add('show');
    this.mode = 'world';
    this.#nextCustomer();
    this.player.lock();
    const how = this.controlMode === 'touch' ? '左下のスティックで移動、画面をドラッグで見回し、「調べる」ボタンで話す・調べる。' : 'WASDで移動、マウスで見回し、Eで調べる。';
    this.ui.toast(`${how} まずは受付カウンターへ。お客さんが入ってきます。`, '', 7000);
  }

  #bindEvents() {
    addEventListener('resize', () => {
      this.renderer.setSize(innerWidth, innerHeight);
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
    });
    this.player.on('unlock', () => {
      if (this.mode === 'world' && !this.busy) this.#showPause();
    });
    this.player.on('lock', () => $('pause').classList.remove('show'));
    // ブラウザがマウスの固定を拒否したとき（直後の再固定など）は、クリックで再開できるようにする
    document.addEventListener('pointerlockerror', () => {
      if (this.mode === 'world' && !this.busy) this.#showPause();
    });
    $('pause').addEventListener('click', (e) => {
      if (e.target.closest('.pause-settings')) return;
      this.player.lock();
    });
    $('guide-select').addEventListener('change', (e) => {
      this.state.settings.guide = e.target.value;
      saveState(this.state);
    });
    $('control-select').addEventListener('change', (e) => {
      this.state.settings.control = e.target.value;
      this.applyControlMode();
      saveState(this.state);
    });
    $('btn-reset').addEventListener('click', () => {
      if (!confirm('セーブデータを消して最初からやり直しますか？')) return;
      clearSave();
      location.reload();
    });
    // タッチ用のボタン
    $('btn-interact').addEventListener('click', (e) => {
      e.preventDefault();
      if (this.mode === 'world' && !this.busy) this.interact();
    });
    $('btn-menu').addEventListener('click', (e) => {
      e.preventDefault();
      if (this.mode === 'world' && !this.busy) this.player.unlock();
    });
    addEventListener('keydown', (e) => {
      if (this.mode === 'world' && e.code === 'KeyE' && this.player.isLocked && !this.busy) this.interact();
    });
  }

  #showPause() {
    $('guide-select').value = this.state.settings.guide;
    $('control-select').value = this.state.settings.control || 'auto';
    $('pause-hint').textContent = this.controlMode === 'touch' ? '画面をタップすると再開します' : '画面をクリックすると再開します';
    $('pause').classList.add('show');
  }

  // ------------------------------------------------------------
  // 依頼
  // ------------------------------------------------------------
  #nextCustomer() {
    const c = CUSTOMERS[this.state.customerIndex % CUSTOMERS.length];
    const watch = getWatch(c.watch);
    const mech = watch.movement === 'mechanical';
    this.job = {
      customer: c,
      watch,
      condition: c.condition,
      sim: mech ? createMechanicalState(c.condition) : createQuartzState(c.condition),
      checks: new Set(),
      intakeLog: [],
      services: new Set(),
      flags: {},
      phase: 'waiting',
      workDone: false,
    };
    this.world.customerArrive(c.look);
  }

  #talking = (on) => {
    this.world.customer.talking = on;
  };

  /** 調べる（E キー／調べるボタン）。id を渡すとその場所を直接調べる */
  async interact(id = this.focus?.id) {
    if (!id) return;
    const job = this.job;
    if (id === 'counter') {
      if (!job) return this.ui.toast('今はお客さんがいません。');
      if (job.phase === 'waiting') {
        if (!this.world.customerAtCounter()) return this.ui.toast('お客さんがカウンターに来るのを待ちましょう。');
        return this.#withDialog(async () => {
          const accepted = await runIntake(this.ui, job, this.state, this.#talking);
          if (!accepted) {
            this.ui.closeModal();
            this.ui.toast(`${job.customer.name}の依頼を断りました。`);
            this.state.customerIndex++;
            this.world.customerLeave();
            setTimeout(() => this.#nextCustomer(), 6000);
            return;
          }
          job.phase = 'accepted';
          this.world.customerLeave();
          this.ui.toast('時計を預かりました。作業台（奥の机）で調べて、作業を始めましょう。', 'good', 6000);
          this.bench.setJob(job);
        });
      }
      if (!job.workDone) return this.ui.toast('まだ作業が終わっていません。作業台で作業しましょう。');
      if (!this.world.customerAtCounter()) {
        if (this.world.customer.state === 'away') this.world.customerArrive(job.customer.look);
        return this.ui.toast(`${job.customer.name}に連絡しました。受け取りに来るのを待ちましょう。`);
      }
      return this.#withDialog(async () => {
        const res = await runHandover(this.ui, job, this.state, this.#talking);
        this.state.money += res.reward.net;
        this.state.completed[job.procedureId] = (this.state.completed[job.procedureId] || 0) + 1;
        this.state.reputation += Math.max(0, res.stars - 2);
        this.state.history.push({ day: this.state.day, customer: job.customer.name, stars: res.stars, net: res.reward.net });
        this.state.customerIndex++;
        saveState(this.state);
        this.job = null;
        this.world.customerLeave();
        this.ui.toast(`${res.reward.net.toLocaleString()}円を受け取りました。セーブしました。`, 'good');
        setTimeout(() => {
          this.#nextCustomer();
          this.ui.toast('入口のドアが開きました。新しいお客さんです。');
        }, 7000);
      });
    }
    if (id === 'bench') {
      if (!job || job.phase !== 'accepted') return this.ui.toast('作業する時計がありません。まず受付でお客さんの依頼を受けましょう。');
      return this.#enterBench();
    }
    if (id === 'cleaner') return this.#useCleaner();
    if (id === 'shelf') return this.#withDialog(() => this.#showShelf());
    if (id === 'terminal') return this.ui.toast('ショップ端末。道具や消耗品の購入は第3段階で使えるようになります。');
  }

  /** 洗浄機：かごに入れた部品を洗う */
  #useCleaner() {
    const r = this.job?.runner;
    if (!r || !r.getStep('clean_parts')) return this.ui.toast('超音波洗浄機。分解した部品を洗浄液とすすぎ液で洗い、乾燥させます。');
    if (r.done.has('clean_parts')) return this.ui.toast('部品はもう洗浄済みです。作業台に戻りましょう。');
    if (!r.isAvailable('clean_parts')) return this.ui.toast('洗浄する部品がまだありません。作業台で分解して、洗浄かごに入れましょう。');
    return this.#withDialog(async () => {
      const res = await MINIGAMES.cleaner.run($('minigame'), { title: '超音波洗浄機', instruction: '洗浄かごを、どの槽に、どのくらいの時間入れるかを決めます。' }, {});
      if (res.cancelled) return this.ui.toast('洗浄を中断しました。');
      this.bench.completeStation('clean_parts', res);
      this.ui.toast(res.failures?.length ? '洗浄が終わった…が、汚れが残っているようだ。' : '古い油がすっかり落ちて、部品がピカピカになった！ 作業台に戻って点検しましょう。', res.failures?.length ? 'bad' : 'good', 6000);
    });
  }

  /** 会話などの画面を開いている間は、移動と一時停止画面を止める */
  async #withDialog(fn) {
    this.busy = true;
    this.ui.setPrompt('');
    this.player.unlock();
    try {
      await fn();
    } finally {
      this.busy = false;
      if (this.mode === 'world') this.player.lock();
    }
  }

  #showShelf() {
    return new Promise((resolve) => {
      const tools = this.state.ownedTools.map(getTool).filter(Boolean);
      const stock = Object.entries(this.state.stock).map(([id, n]) => ({ c: getConsumable(id), n })).filter((x) => x.c);
      const box = this.ui.openModal(
        `<h2>道具棚</h2>
         <h3>持っている道具</h3>
         <ul class="breakdown">${tools.map((t) => `<li><b>${t.name}</b><small>${t.desc}</small></li>`).join('')}</ul>
         <h3>消耗品の在庫</h3>
         <ul class="breakdown">${stock.map(({ c, n }) => `<li>${c.name}<span>${n}${c.unit || '個'}</span></li>`).join('')}</ul>
         <div class="modal-actions"><button class="primary">閉じる</button></div>`,
        'wide',
      );
      box.querySelector('button').onclick = () => {
        this.ui.closeModal();
        resolve();
      };
    });
  }

  // ------------------------------------------------------------
  // 作業台
  // ------------------------------------------------------------
  #enterBench() {
    this.busy = true; // ポインタ固定の解除で一時停止画面が出ないように
    this.mode = 'bench';
    this.player.unlock();
    this.ui.setPrompt('');
    $('crosshair').classList.remove('show');
    this.bench.enter();
    this.busy = false;
  }

  leaveBench() {
    if (this.mode !== 'bench' || this.bench.busy) return;
    this.bench.exit();
    this.mode = 'world';
    $('crosshair').classList.add('show');
    saveState(this.state);
    this.player.lock();
    const r = this.job?.runner;
    if (r && r.isAvailable('clean_parts')) this.ui.toast('洗浄機（右奥）で部品を洗浄しましょう。', 'good', 5000);
    else if (this.job?.workDone) this.ui.toast('受付カウンターで、お客さんに時計を返しましょう。', 'good', 5000);
  }

  // ------------------------------------------------------------
  // 毎フレーム
  // ------------------------------------------------------------
  #frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.ui.updateHud(this.state, this.job);
    if (this.mode === 'bench') {
      this.bench.update(dt);
      this.bench.render();
      return;
    }
    this.world.update(new Date(), dt, this.camera.position);
    if (this.mode === 'world') {
      this.player.update(dt);
      this.#updateFocus();
    }
    this.renderer.render(this.world.scene, this.camera);
  }

  #updateFocus() {
    if (!this.player.isLocked || this.busy) {
      this.focus = null;
      this.ui.setPrompt('');
      return;
    }
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hit = this.raycaster.intersectObjects(this.world.interactables, false)[0];
    this.focus = hit ? hit.object.userData.interact : null;
    const j = this.job;
    const actions = {
      counter: () => {
        if (!j) return '受付カウンター';
        if (j.phase === 'waiting') return this.world.customerAtCounter() ? `受付カウンター：${j.customer.name}の話を聞く` : '受付カウンター（お客さんが来るのを待つ）';
        if (j.workDone) return `受付カウンター：${j.customer.name}に時計を返す`;
        return '受付カウンター';
      },
      bench: () => '作業台：座って作業する',
      cleaner: () => (j?.runner?.isAvailable('clean_parts') ? '洗浄機：部品を洗浄する' : '洗浄機'),
      shelf: () => '道具棚：道具と在庫を見る',
      terminal: () => 'ショップ端末',
    };
    const key = this.controlMode === 'touch' ? '［調べる］' : '[E]';
    this.ui.setPrompt(this.focus ? `${key} ${actions[this.focus.id]()}` : '');
    $('btn-interact').classList.toggle('ready', !!this.focus);
  }
}
