import { describe, it, expect } from 'vitest';
import { ProcedureRunner } from '../src/procedure/ProcedureRunner.js';
import { qualityToStars, computeReward } from '../src/procedure/scoring.js';
import { getProcedure, PROCEDURES } from '../src/data/procedures/index.js';
import { getTool } from '../src/data/tools.js';
import { FAILURES } from '../src/data/failures.js';
import { getConsumable } from '../src/data/consumables.js';

const proc = getProcedure('quartz_battery');
const withGasket = () => new ProcedureRunner(proc, { services: new Set(['battery_change', 'gasket_change']) });
const noGasket = () => new ProcedureRunner(proc, { services: new Set(['battery_change']) });

function finishAll(r) {
  let guard = 0;
  while (!r.isFinished() && guard++ < 100) r.complete(r.availableSteps()[0].id, 1);
  return r;
}

describe('工程データの整合性', () => {
  for (const p of Object.values(PROCEDURES)) {
    it(`${p.id}: 参照しているid がすべて存在する`, () => {
      const ids = new Set(p.steps.map((s) => s.id));
      for (const s of p.steps) {
        expect(getTool(s.tool), `${s.id} の道具 ${s.tool}`).not.toBeNull();
        for (const n of s.needs) for (const id of n.split('|')) expect(ids.has(id), `${s.id} needs ${id}`).toBe(true);
        for (const [tool, w] of Object.entries(s.wrongTools || {})) {
          expect(getTool(tool), `${s.id} wrongTools ${tool}`).not.toBeNull();
          if (typeof w === 'string') expect(FAILURES[w], `${s.id} failure ${w}`).toBeDefined();
        }
        for (const m of s.minigames) {
          if (m.failure) expect(FAILURES[m.failure], `${s.id} ${m.failure}`).toBeDefined();
          if (m.failureLow) expect(FAILURES[m.failureLow]).toBeDefined();
          for (const o of m.options || []) if (o.failure) expect(FAILURES[o.failure]).toBeDefined();
        }
        for (const c of Object.keys(s.consumes || {})) expect(getConsumable(c)).not.toBeNull();
        if (s.autoFailure) expect(FAILURES[s.autoFailure]).toBeDefined();
        expect(s.explain.length).toBeGreaterThan(10);
      }
    });
  }
});

describe('ProcedureRunner', () => {
  it('最初にできるのは裏蓋を開ける工程だけ', () => {
    const r = withGasket();
    expect(r.availableSteps().map((s) => s.id)).toEqual(['open_caseback']);
  });

  it('正しい道具と部品なら開始できる', () => {
    expect(withGasket().evaluate('caseback_notch', 'case_knife')).toMatchObject({ type: 'start' });
  });

  it('裏蓋本体をこじ開けでクリックすると、こじ口へのヒントが出る', () => {
    const res = withGasket().evaluate('caseback', 'case_knife');
    expect(res.type).toBe('hint');
    expect(res.message).toContain('こじ口');
  });

  it('間違った道具では失敗の種類が返る', () => {
    expect(withGasket().evaluate('caseback_notch', 'screwdriver_10')).toMatchObject({ type: 'wrongTool', failure: 'scratch' });
    expect(withGasket().evaluate('caseback_notch', 'screw_opener').message).toContain('こじ開け式');
  });

  it('順番が早すぎる工程は notYet で、足りない工程名を返す', () => {
    const res = withGasket().evaluate('battery', 'plastic_tweezers');
    expect(res.type).toBe('notYet');
    expect(res.missing.length).toBeGreaterThan(0);
  });

  it('電池を金属ピンセットで取るとショート', () => {
    const r = withGasket();
    ['open_caseback', 'measure_old_battery', 'loosen_clamp_screw'].forEach((id) => r.complete(id, 1));
    expect(r.evaluate('battery', 'metal_tweezers')).toMatchObject({ type: 'wrongTool', failure: 'short' });
    expect(r.evaluate('battery', 'plastic_tweezers')).toMatchObject({ type: 'start', step: { id: 'remove_battery' } });
  });

  it('パッキン交換ありなら新しいパッキン、なしなら古いパッキンを戻す工程になる', () => {
    expect(withGasket().getStep('install_new_gasket')).not.toBeNull();
    expect(withGasket().getStep('reinstall_old_gasket')).toBeNull();
    expect(noGasket().getStep('install_new_gasket')).toBeNull();
    expect(noGasket().getStep('reinstall_old_gasket')).not.toBeNull();
  });

  it('どちらのパッキン工程でも裏蓋を閉められる（needs の | ）', () => {
    expect(finishAll(withGasket()).isFinished()).toBe(true);
    expect(finishAll(noGasket()).isFinished()).toBe(true);
  });

  it('完璧な作業なら100点、古いパッキンの再使用は減点', () => {
    expect(finishAll(withGasket()).quality()).toBe(100);
    expect(finishAll(noGasket()).quality()).toBe(100 - FAILURES.old_gasket.quality);
  });

  it('操作の出来と失敗が仕上がり点に反映される', () => {
    const r = withGasket();
    r.complete('open_caseback', 0.5); // 重み10 → 5点減
    r.recordFailure('open_caseback', 'scratch'); // 15点減
    expect(r.quality()).toBe(80);
  });

  it('紛失や破損は追加費用になる', () => {
    const r = withGasket();
    r.recordFailure('x', 'lost');
    r.recordFailure('x', 'crack');
    expect(r.extraCost()).toBe(FAILURES.lost.cost + FAILURES.crack.cost);
  });

  it('できない工程を完了しようとするとエラー', () => {
    expect(() => withGasket().complete('remove_battery')).toThrow();
  });

  it('仕上がり点は0未満にならない', () => {
    const r = withGasket();
    for (let i = 0; i < 10; i++) r.recordFailure('x', 'crack');
    expect(r.quality()).toBe(0);
  });
});

describe('評価と報酬', () => {
  it('星の境界', () => {
    expect([100, 90, 89, 75, 74, 60, 59, 40, 39, 0].map(qualityToStars)).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1]);
  });
  it('報酬 = 見積もり × 星の割合 − 追加費用', () => {
    expect(computeReward({ quoted: 2000, stars: 4, extraCost: 300 })).toEqual({ gross: 1800, extraCost: 300, net: 1500 });
  });
  it('期限超過は1日20%減、最大50%減', () => {
    expect(computeReward({ quoted: 1000, stars: 5, lateDays: 1 }).gross).toBe(800);
    expect(computeReward({ quoted: 1000, stars: 5, lateDays: 5 }).gross).toBe(500);
  });
});

import { createQuartzState, judgeVoltage, readVoltage } from '../src/sim/quartzSim.js';
describe('クォーツの電池シミュレーション', () => {
  const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
  it('止まった時計の古い電池は交換判定になる', () => {
    for (const r of [0, 0.5, 0.999]) {
      const s = createQuartzState({ battery: 'dead' }, seq([r, 0.9, 0.5]));
      expect(judgeVoltage(readVoltage(s.oldVoltage, () => 1))).toBe('low');
    }
  });
  it('2秒運針の電池も交換判定（1.50V未満）', () => {
    const s = createQuartzState({ battery: 'eol' }, seq([0.999, 0.9, 0.999]));
    expect(judgeVoltage(readVoltage(s.oldVoltage, () => 1))).toBe('low');
  });
  it('良品の新しい電池は1.50V以上', () => {
    const s = createQuartzState({ battery: 'dead' }, seq([0.5, 0.9, 0]));
    expect(judgeVoltage(readVoltage(s.newVoltage, () => 0))).toBe('ok');
  });
  it('保管劣化の新しい電池は使えない判定', () => {
    const s = createQuartzState({ battery: 'dead' }, seq([0.5, 0.01, 0.999]));
    expect(judgeVoltage(readVoltage(s.newVoltage, () => 1))).toBe('low');
  });
});
