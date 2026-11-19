// =============================================================
// ゲーム全体のまとめ役
//   ・工房（歩く）と作業台（作業モード）の切り替え
//   ・依頼の流れ（受付 → 作業 → 返却）
//   ・毎フレームの更新と描画
// =============================================================
import * as THREE from 'three';
import { buildWorkshop } from '../world/Workshop.js';
import { PlayerController } from '../world/PlayerController.js';
import { BenchMode } from '../bench/BenchMode.js';
import { UI } from '../ui/UI.js';
import { runIntake, runHandover } from '../ui/Counter.js';
import { createNewState, loadState, saveState, clearSave } from './state.js';
import { CUSTOMERS } from '../data/customers.js';
import { getWatch } from '../data/watches.js';
import { getTool } from '../data/tools.js';
import { getConsumable } from '../data/consumables.js';
import { createQuartzState } from '../sim/quartzSim.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.ui = new UI();
    this.state = createNewState();
    this.mode = 'title'; // 'title' | 'world' | 'bench'
    this.job = null;
    this.busy = false; // 会話中など

    this.world = buildWorkshop();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 50);
    this.player = new PlayerController(this.camera, document.body, this.world.colliders);
    this.bench = new BenchMode(this.renderer, this);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.4;
    this.focus = null;

    this.#bindEvents();
    this.#showTitle();
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.#frame());
  }

  // ------------------------------------------------------------
  // タイトル・一時停止
  // ------------------------------------------------------------
  #showTitle() {
    const saved = loadState();
    $('title').classList.add('show');
    $('btn-continue').style.display = saved ? '' : 'none';
    $('btn-new').onclick = () => {
      if (saved && !confirm('セーブデータを消して、はじめから遊びますか？')) return;
      clearSave();
      this.#start(createNewState());
    };
    $('btn-continue').onclick = () => this.#start(saved);
  }

  #start(state) {
    this.state = state;
    $('title').classList.remove('show');
    $('hud').classList.add('show');
    this.mode = 'world';
    this.#nextCustomer();
    this.player.lock();
    this.ui.toast('WASDで移動、マウスで見回し、Eで調べる。まずは受付カウンターへ。', '', 6000);
  }

  #bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
    this.player.controls.addEventListener('unlock', () => {
      if (this.mode === 'world' && !this.busy) this.#showPause();
    });
    this.player.controls.addEventListener('lock', () => $('pause').classList.remove('show'));
    // ブラウザがマウスの固定を拒否したとき（直後の再固定など）は、クリックで再開できるようにする
    document.addEventListener('pointerlockerror', () => {
      if (this.mode === 'world') this.#showPause();
    });
    $('pause').addEventListener('click', (e) => {
      if (e.target.closest('.pause-settings')) return;
      this.player.lock();
    });
    $('guide-select').addEventListener('change', (e) => {
      this.state.settings.guide = e.target.value;
      saveState(this.state);
    });
    $('btn-reset').addEventListener('click', () => {
      if (!confirm('セーブデータを消して最初からやり直しますか？')) return;
      clearSave();
      location.reload();
    });
    $('btn-stand').addEventListener('click', () => this.leaveBench());
    window.addEventListener('keydown', (e) => {
      if (this.mode === 'world' && e.code === 'KeyE' && this.player.isLocked && !this.busy) this.interact();
    });
  }

  #showPause() {
    $('guide-select').value = this.state.settings.guide;
    $('pause').classList.add('show');
  }

  // ------------------------------------------------------------
  // 依頼
  // ------------------------------------------------------------
  #nextCustomer() {
    const c = CUSTOMERS[this.state.customerIndex % CUSTOMERS.length];
    const watch = getWatch(c.watch);
    this.job = {
      customer: c,
      watch,
      condition: c.condition,
      sim: createQuartzState(c.condition),
      checks: new Set(),
      services: new Set(),
      phase: 'waiting',
      workDone: false,
    };
    this.world.setCustomerLook(c.look);
    this.world.customer.visible = true;
  }

  /** 調べる（E キー）。id を渡すとその場所を直接調べる */
  async interact(id = this.focus?.id) {
    if (!id) return;
    const job = this.job;
    if (id === 'counter') {
      if (!job) return this.ui.toast('今はお客さんがいません。');
      if (job.phase === 'waiting') return this.#withDialog(async () => {
        const accepted = await runIntake(this.ui, job, this.state);
        if (!accepted) {
          this.ui.closeModal();
          this.ui.toast(`${job.customer.name}の依頼を断りました。`);
          this.state.customerIndex++;
          this.world.customer.visible = false;
          setTimeout(() => this.#nextCustomer(), 2500);
          return;
        }
        job.phase = 'accepted';
        this.world.customer.visible = false;
        this.ui.toast('時計を預かりました。作業台（奥の机）で E を押して作業を始めましょう。', 'good', 6000);
        this.bench.setJob(job);
      });
      if (!job.workDone) return this.ui.toast('まだ作業が終わっていません。作業台で作業しましょう。');
      return this.#withDialog(async () => {
        this.world.customer.visible = true;
        const res = await runHandover(this.ui, job, this.state);
        this.state.money += res.reward.net;
        this.state.completed[job.procedureId] = (this.state.completed[job.procedureId] || 0) + 1;
        this.state.reputation += Math.max(0, res.stars - 2);
        this.state.history.push({ day: this.state.day, customer: job.customer.name, stars: res.stars, net: res.reward.net });
        this.state.customerIndex++;
        saveState(this.state);
        this.job = null;
        this.world.customer.visible = false;
        this.ui.toast(`${res.reward.net.toLocaleString()}円を受け取りました。セーブしました。`, 'good');
        setTimeout(() => {
          this.#nextCustomer();
          this.ui.toast('新しいお客さんが来ました。');
        }, 3000);
      });
    }
    if (id === 'bench') {
      if (!job || job.phase !== 'accepted') return this.ui.toast('作業する時計がありません。まず受付でお客さんの依頼を受けましょう。');
      return this.#enterBench();
    }
    if (id === 'cleaner') return this.ui.toast('超音波洗浄機。機械式のオーバーホール（第2段階）で使えるようになります。');
    if (id === 'shelf') return this.#withDialog(() => this.#showShelf());
    if (id === 'terminal') return this.ui.toast('ショップ端末。道具や消耗品の購入は第3段階で使えるようになります。');
  }

  /** 会話などの画面を開いている間は、移動と一時停止画面を止める */
  async #withDialog(fn) {
    this.busy = true;
    this.ui.setPrompt('');
    document.exitPointerLock();
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
         <ul class="breakdown">${tools.map((t) => `<li><b>${t.name}</b><br><small>${t.desc}</small></li>`).join('')}</ul>
         <h3>消耗品の在庫</h3>
         <ul class="breakdown">${stock.map(({ c, n }) => `<li>${c.name}<span>${n}個</span></li>`).join('')}</ul>
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
    this.mode = 'bench';
    this.busy = true; // ポインタロック解除で一時停止画面が出ないように
    document.exitPointerLock();
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
    if (this.job?.workDone) this.ui.toast('受付カウンターで E を押して、お客さんに時計を返しましょう。', 'good', 5000);
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
    this.world.update(new Date());
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
    const actions = {
      counter: () => {
        const j = this.job;
        if (!j) return '受付カウンター';
        if (j.phase === 'waiting') return `受付カウンター：${j.customer.name}の話を聞く`;
        if (j.workDone) return `受付カウンター：${j.customer.name}に時計を返す`;
        return '受付カウンター';
      },
      bench: () => '作業台：座って作業する',
      cleaner: () => '洗浄機',
      shelf: () => '道具棚：道具と在庫を見る',
      terminal: () => 'ショップ端末',
    };
    this.ui.setPrompt(this.focus ? `[E] ${actions[this.focus.id]()}` : '');
  }
}
