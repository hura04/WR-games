// =============================================================
// 工程を進める仕組み（画面とは無関係の「ルール」だけを扱う）
// -------------------------------------------------------------
// ・どの工程が今できるか（needs が終わっているか）
// ・クリックされた部品と持っている道具から、何が起きるかを判定
// ・失敗や操作の出来を記録して、仕上がり点（0〜100）を計算
// =============================================================
import { FAILURES } from '../data/failures.js';

export class ProcedureRunner {
  /**
   * @param {object} procedure 工程データ
   * @param {object} context   { services: Set<string> } 見積もりで選んだ作業メニュー
   */
  constructor(procedure, context = {}) {
    this.procedure = procedure;
    this.services = context.services || new Set();
    this.steps = procedure.steps.filter((s) => this.#applies(s));
    this.done = new Set();
    this.failures = []; // { stepId, type }
    this.skillLoss = 0; // 操作の出来による減点の合計
    this.stepScores = {}; // stepId -> 0..1
  }

  #applies(step) {
    if (!step.when) return true;
    return this.services.has(step.when.service) === step.when.is;
  }

  #needSatisfied(need) {
    return need.split('|').some((id) => this.done.has(id));
  }

  isAvailable(stepId) {
    const step = this.getStep(stepId);
    if (!step || this.done.has(stepId)) return false;
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
      (s) => s.target === targetId || (s.targetAlso || []).includes(targetId),
    );
  }

  /**
   * 部品をクリックしたときの判定
   * @returns {{type:'start'|'wrongTool'|'notYet'|'hint'|'nothing', step?, failure?, message?, missing?}}
   */
  evaluate(targetId, toolId) {
    const candidates = this.#stepsForTarget(targetId).filter((s) => !this.done.has(s.id));
    const available = candidates.filter((s) => this.isAvailable(s.id));

    const ready = available.find((s) => s.tool === toolId);
    if (ready) return { type: 'start', step: ready };

    if (available.length > 0) {
      const step = available[0];
      const wrong = step.wrongTools?.[toolId];
      if (typeof wrong === 'string') return { type: 'wrongTool', step, failure: wrong };
      if (wrong && wrong.message) return { type: 'wrongTool', step, message: wrong.message };
      return { type: 'wrongTool', step, message: 'この道具ではこの作業はできません。' };
    }

    // 対象ではないが（今できる工程の）、近くの部品へのヒントがある場合
    for (const s of this.availableSteps()) {
      if (s.targetHint && s.targetHint[targetId] && s.tool === toolId) {
        return { type: 'hint', step: s, message: s.targetHint[targetId] };
      }
    }

    if (candidates.length > 0) {
      const step = candidates[0];
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
    if (step.autoFailure) this.recordFailure(stepId, step.autoFailure);
  }

  isFinished() {
    return this.steps.every((s) => this.done.has(s.id));
  }

  /** 仕上がり点 0..100 */
  quality(extraLoss = 0) {
    const failLoss = this.failures.reduce((sum, f) => sum + FAILURES[f.type].quality, 0);
    const q = 100 - failLoss - this.skillLoss - extraLoss;
    return Math.round(Math.max(0, Math.min(100, q)));
  }

  /** 失敗による追加費用の合計（円） */
  extraCost() {
    return this.failures.reduce((sum, f) => sum + FAILURES[f.type].cost, 0);
  }

  /** 進捗 0..1 */
  progress() {
    return this.done.size / this.steps.length;
  }
}
