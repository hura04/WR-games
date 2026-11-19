// =============================================================
// 工程を進める仕組み（画面とは無関係の「ルール」だけを扱う）
// -------------------------------------------------------------
// ・どの工程が今できるか（needs が終わっているか）
// ・クリックされた部品と持っている道具から、何が起きるかを判定
// ・失敗や操作の出来を記録して、仕上がり点（0〜100）を計算
//
// 工程データで使える特別な項目
//   when     : { service, is } 見積もりの内容 / { flag, is } 点検結果などのフラグ で工程を切り替え
//   optional : true なら、やらなくても完了できる（例：文字盤保護シート）
//   before   : optional な工程が「この工程より前」でないと意味がないときの工程id
//   risks    : [{ unless, failure }] unless の工程をしていないと、完了時に失敗が起きる
//   station  : 'cleaner' など、作業台以外の場所で行う工程（部品のクリックでは始まらない）
// =============================================================
import { FAILURES } from '../data/failures.js';

/** 操作精度の減点の基準（電池交換1回分の工程の重み合計） */
const SKILL_REF_WEIGHT = 140;

export class ProcedureRunner {
  /**
   * @param {object} procedure 工程データ
   * @param {object} context   { services: Set<string>, flags: object } 見積もりで選んだ作業メニュー、点検結果など
   */
  constructor(procedure, context = {}) {
    this.procedure = procedure;
    this.services = context.services || new Set();
    this.flags = context.flags || {};
    this.done = new Set();
    this.skipped = new Set(); // やらずに過ぎた optional 工程
    this.failures = []; // { stepId, type }
    this.skillLoss = 0; // 操作の出来による減点の合計
    this.stepScores = {}; // stepId -> 0..1
  }

  /** 今の見積もり内容・フラグで有効な工程の一覧 */
  get steps() {
    return this.procedure.steps.filter((s) => this.#applies(s));
  }

  get requiredSteps() {
    return this.steps.filter((s) => !s.optional);
  }

  #applies(step) {
    const w = step.when;
    if (!w) return true;
    if (w.service) return this.services.has(w.service) === w.is;
    if (w.flag) return !!this.flags[w.flag] === w.is;
    return true;
  }

  #needSatisfied(need) {
    return need.split('|').some((id) => this.done.has(id));
  }

  isAvailable(stepId) {
    const step = this.getStep(stepId);
    if (!step || this.done.has(stepId) || this.skipped.has(stepId)) return false;
    if (step.before && this.done.has(step.before)) return false;
    return step.needs.every((n) => this.#needSatisfied(n));
  }

  getStep(stepId) {
    return this.steps.find((s) => s.id === stepId) || null;
  }

  availableSteps() {
    return this.steps.filter((s) => this.isAvailable(s.id));
  }

  /** その部品を対象にしている工程（targetAlso も含む） */
  #stepsForTarget(targetId) {
    return this.steps.filter(
      (s) => !s.station && (s.target === targetId || (s.targetAlso || []).includes(targetId)),
    );
  }

  /**
   * 部品をクリックしたときの判定
   * @returns {{type:'start'|'wrongTool'|'notYet'|'hint'|'nothing', step?, failure?, message?, missing?}}
   */
  evaluate(targetId, toolId) {
    const candidates = this.#stepsForTarget(targetId).filter((s) => !this.done.has(s.id) && !this.skipped.has(s.id));
    const available = candidates.filter((s) => this.isAvailable(s.id));

    const ready = available.find((s) => s.tool === toolId);
    if (ready) return { type: 'start', step: ready };

    if (available.length > 0) {
      const step = available.find((s) => s.wrongTools?.[toolId]) || available[0];
      const wrong = step.wrongTools?.[toolId];
      if (typeof wrong === 'string') return { type: 'wrongTool', step, failure: wrong };
      if (wrong && wrong.message) return { type: 'wrongTool', step, message: wrong.message };
      return { type: 'wrongTool', step, message: 'この道具ではこの作業はできません。' };
    }

    // 対象ではないが（今できる工程の）近くの部品へのヒントがある場合
    for (const s of this.availableSteps()) {
      if (s.targetHint && s.targetHint[targetId] && (s.tool === toolId || s.hintAnyTool)) {
        return { type: 'hint', step: s, message: s.targetHint[targetId] };
      }
    }

    const pending = candidates.filter((s) => !(s.before && this.done.has(s.before)));
    if (pending.length > 0) {
      const step = pending.find((s) => s.tool === toolId) || pending[0];
      const missing = step.needs
        .filter((n) => !this.#needSatisfied(n))
        .map((n) => n.split('|').map((id) => this.getStep(id)?.name).filter(Boolean).join(' / '));
      return { type: 'notYet', step, missing };
    }
    return { type: 'nothing' };
  }

  /** 失敗を記録（工程は終わらない） */
  recordFailure(stepId, type) {
    if (!FAILURES[type]) throw new Error(`未定義の失敗の種類: ${type}`);
    this.failures.push({ stepId, type });
    return FAILURES[type];
  }

  /**
   * 工程を完了する
   * @param {string} stepId
   * @param {number} score 操作の出来 0..1（ミニゲームがない工程は 1）
   * @returns {Array<object>} この完了で起きた失敗（risks / autoFailure）
   */
  complete(stepId, score = 1) {
    const step = this.getStep(stepId);
    if (!step) throw new Error(`工程がありません: ${stepId}`);
    if (!this.isAvailable(stepId)) throw new Error(`まだこの工程はできません: ${stepId}`);
    const s = Math.max(0, Math.min(1, score));
    this.stepScores[stepId] = s;
    const weight = step.weight ?? 10;
    this.skillLoss += (1 - s) * weight;
    this.done.add(stepId);
    const happened = [];
    for (const r of step.risks || []) {
      if (!this.done.has(r.unless)) happened.push(this.recordFailure(stepId, r.failure));
    }
    if (step.autoFailure) happened.push(this.recordFailure(stepId, step.autoFailure));
    // この工程より前にやるべきだった optional 工程は「やらずに過ぎた」
    for (const o of this.steps) if (o.optional && o.before === stepId && !this.done.has(o.id)) this.skipped.add(o.id);
    return happened;
  }

  isFinished() {
    return this.requiredSteps.every((s) => this.done.has(s.id));
  }

  /** 仕上がり点 0..100 */
  quality(extraLoss = 0) {
    const failLoss = this.failures.reduce((sum, f) => sum + FAILURES[f.type].quality, 0);
    const q = 100 - failLoss - this.skillLoss * this.#skillScale() - extraLoss;
    return Math.round(Math.max(0, Math.min(100, q)));
  }

  /**
   * 操作精度の減点の縮め具合。
   * 工程が多い作業ほど1工程あたりの減点を小さくして、
   * 作業全体での減点の大きさが、電池交換（重み合計140）と同じくらいになるようにする。
   */
  #skillScale() {
    const total = this.steps.filter((s) => !s.optional).reduce((sum, s) => sum + (s.weight ?? 10), 0);
    return total > SKILL_REF_WEIGHT ? SKILL_REF_WEIGHT / total : 1;
  }

  /** 失敗による追加費用の合計（円） */
  extraCost() {
    return this.failures.reduce((sum, f) => sum + FAILURES[f.type].cost, 0);
  }

  /** 進捗 0..1（必須の工程のうち終わった割合） */
  progress() {
    const req = this.requiredSteps;
    return req.filter((s) => this.done.has(s.id)).length / req.length;
  }
}
