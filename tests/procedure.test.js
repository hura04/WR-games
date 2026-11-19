import { describe, it, expect } from 'vitest';
import { ProcedureRunner } from '../src/procedure/ProcedureRunner.js';
import { qualityToStars, computeReward } from '../src/procedure/scoring.js';
import { getProcedure, PROCEDURES } from '../src/data/procedures/index.js';
import { getTool } from '../src/data/tools.js';
import { FAILURES } from '../src/data/failures.js';
import { getConsumable } from '../src/data/consumables.js';
import { getOil } from '../src/data/oils.js';
import { PARTS } from '../src/data/parts.js';
const MINI_TYPES = { pressure: 1, angle: 1, steady: 1, hold: 1, reading: 1, choice: 1, oil: 1, regulate: 1, measure: 1, inspect: 1, water: 1 };

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
        for (const n of s.needs) for (const id of n.split('|')) expect(ids.has(id), `${s.id} needs ${id}`).toBe(true);
        for (const [tool, w] of Object.entries(s.wrongTools || {})) {
          expect(getTool(tool), `${s.id} wrongTools ${tool}`).not.toBeNull();
          if (typeof w === 'string') expect(FAILURES[w], `${s.id} failure ${w}`).toBeDefined();
        }
        if (!s.station) expect(getTool(s.tool), `${s.id} の道具 ${s.tool}`).not.toBeNull();
        expect(ids.size, '工程idの重複').toBe(p.steps.length);
        for (const r of s.risks || []) { expect(ids.has(r.unless)).toBe(true); expect(FAILURES[r.failure]).toBeDefined(); }
        if (s.before) expect(ids.has(s.before), `${s.id} before`).toBe(true);
        for (const m of s.minigames) {
          expect(Object.keys(MINI_TYPES)).toContain(m.type);
          if (m.type === 'oil') expect(getOil(m.oil), `${s.id} oil ${m.oil}`).not.toBeNull();
          if (m.failure) expect(FAILURES[m.failure], `${s.id} ${m.failure}`).toBeDefined();
          if (m.failureLow) expect(FAILURES[m.failureLow]).toBeDefined();
          for (const o of m.options || []) if (o.failure) expect(FAILURES[o.failure]).toBeDefined();
        }
        for (const c of Object.keys(s.consumes || {})) expect(getConsumable(c)).not.toBeNull();
        if (s.autoFailure) expect(FAILURES[s.autoFailure]).toBeDefined();
        expect(s.explain.length).toBeGreaterThan(10);
        for (const t of [s.target, ...(s.targetAlso || []), ...Object.keys(s.targetHint || {})].filter(Boolean)) expect(PARTS[t], `${s.id} の部品名 ${t}`).toBeDefined();
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

import { createMechanicalState, amplitudeOf, rateOf, measure, finalScore } from '../src/sim/mechanicalSim.js';

describe('機械式オーバーホールの工程ルール', () => {
  const mech = getProcedure('mechanical_overhaul');
  const make = (services = ['mech_overhaul', 'gasket_change'], flags = {}) => new ProcedureRunner(mech, { services: new Set(services), flags });
  const finish = (r, skip = []) => {
    let guard = 0;
    while (!r.isFinished() && guard++ < 300) {
      const next = r.availableSteps().find((s) => !skip.includes(s.id) && !s.station) || r.availableSteps().find((s) => s.station);
      r.complete(next.id, 1);
    }
    return r;
  };

  it('最初はベルトを外すところから', () => {
    expect(make().availableSteps().map((s) => s.id)).toEqual(['remove_strap']);
  });

  it('全工程を順番どおりに終えられる（ゼンマイ交換あり／なし）', () => {
    const a = finish(make([], {}));
    expect(a.isFinished()).toBe(true);
    const b = finish(make(['mech_overhaul', 'gasket_change'], { replaceMainspring: true }));
    expect(b.isFinished()).toBe(true);
    expect(b.done.has('replace_mainspring')).toBe(true);
    expect(b.done.has('service_barrel')).toBe(false);
  });

  it('保護シートなしで針を外すと文字盤に傷（optional と risks）', () => {
    const r = make();
    for (const id of ['remove_strap', 'open_caseback', 'remove_rotor', 'release_stem', 'remove_movement']) r.complete(id);
    expect(r.isAvailable('protect_dial')).toBe(true);
    const happened = r.complete('remove_hands');
    expect(happened.map((f) => f.label)).toContain('文字盤の傷');
    expect(r.skipped.has('protect_dial')).toBe(true);
    expect(r.isAvailable('protect_dial')).toBe(false);
  });

  it('保護シートを使えば傷はつかない', () => {
    const r = make();
    for (const id of ['remove_strap', 'open_caseback', 'remove_rotor', 'release_stem', 'remove_movement', 'protect_dial']) r.complete(id);
    expect(r.complete('remove_hands')).toEqual([]);
  });

  it('ゼンマイの力を抜かずにアンクルを外すと、ほぞ折れ', () => {
    const r = make();
    const order = ['remove_strap', 'open_caseback', 'remove_rotor', 'release_stem', 'remove_movement', 'unscrew_balance_cock', 'remove_balance', 'remove_pallet_bridge'];
    order.forEach((id) => r.complete(id));
    expect(r.complete('remove_pallet').map((f) => f.label)).toContain('ほぞ折れ');
    expect(r.extraCost()).toBeGreaterThan(0);
  });

  it('洗浄は作業台ではなく洗浄機の工程（部品クリックでは始まらない）', () => {
    const r = make();
    expect(r.getStep('clean_parts').station).toBe('cleaner');
    expect(r.evaluate('tray', 'cleaning_basket').step?.id).not.toBe('clean_parts');
  });

  it('ドライバーのサイズ違いは説明が出る／太すぎは傷', () => {
    const r = make();
    ['remove_strap', 'open_caseback'].forEach((id) => r.complete(id));
    expect(r.evaluate('rotor_screw', 'screwdriver_10')).toMatchObject({ type: 'wrongTool' });
    expect(r.evaluate('rotor_screw', 'screwdriver_14')).toMatchObject({ type: 'start' });
  });

  it('フラグで工程が切り替わる', () => {
    const r = make();
    expect(r.getStep('service_barrel')).not.toBeNull();
    r.flags.replaceMainspring = true;
    expect(r.getStep('service_barrel')).toBeNull();
    expect(r.getStep('replace_mainspring')).not.toBeNull();
  });
});

describe('機械式のシミュレーション（タイムグラファー）', () => {
  const st = createMechanicalState({ mainspring: 'ok', regulatorOffset: -87 }, () => 0.5);
  it('整備前は振り角が低く、1日に約2分遅れる', () => {
    expect(amplitudeOf(st)).toBeLessThan(200);
    expect(rateOf(st)).toBeLessThan(-100);
    expect(rateOf(st)).toBeGreaterThan(-140);
  });
  it('洗浄と注油で振り角が270°以上に回復する', () => {
    const after = { ...st, dirt: 0, oil: 0.95 };
    expect(amplitudeOf(after)).toBeGreaterThanOrEqual(270);
  });
  it('へたったゼンマイを交換しないと振り角が伸びない', () => {
    const weak = createMechanicalState({ mainspring: 'fatigued' }, () => 0.5);
    expect(amplitudeOf({ ...weak, dirt: 0, oil: 0.95 })).toBeLessThan(260);
  });
  it('最終評価：良い数値なら満点', () => {
    expect(finalScore({ rate: 3, amplitude: 290, beatError: 0.3 })).toBe(1);
    expect(finalScore({ rate: -60, amplitude: 180, beatError: 2.5 })).toBeLessThan(0.5);
  });
  it('測定値は整数（振り角・歩度）', () => {
    const m = measure(st, () => 0.5);
    expect(Number.isInteger(m.rate) && Number.isInteger(m.amplitude)).toBe(true);
  });
});
