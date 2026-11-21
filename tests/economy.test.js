// お金のルール（第3段階）の自動テスト
import { describe, it, expect } from 'vitest';
import { createNewState } from '../src/core/state.js';
import { buyConsumable, buyUpgrade, canUpgrade, toolStats, closeDay, daySummary, addLedger, DAILY_COST } from '../src/core/economy.js';
import { UPGRADES } from '../src/data/upgrades.js';
import { getTool } from '../src/data/tools.js';
import { CONSUMABLES } from '../src/data/consumables.js';
import { toolIconSvg, ICON_NAMES } from '../src/ui/toolIcons.js';

describe('道具のグレードのデータ', () => {
  it('一式に入っている道具はすべて存在し、2つの一式に重複しない', () => {
    const seen = new Set();
    for (const u of UPGRADES) {
      for (const id of u.tools) {
        expect(getTool(id), `${u.id}: ${id}`).toBeTruthy();
        expect(seen.has(id), `${id} が2つの一式に入っている`).toBe(false);
        seen.add(id);
      }
      expect(ICON_NAMES).toContain(u.icon);
      expect(toolIconSvg({ icon: u.icon })).toContain('<svg');
    }
  });
  it('グレードが上がるほど高く、性能も良くなる', () => {
    for (const u of UPGRADES) {
      const g2 = u.grades[2], g3 = u.grades[3];
      expect(g3.price).toBeGreaterThan(g2.price);
      if (g2.tremor) expect(g3.tremor).toBeLessThan(g2.tremor);
      if (g2.loupeMag) expect(g3.loupeMag).toBeGreaterThan(g2.loupeMag);
      if (g2.oilRate) expect(g3.oilRate).toBeLessThan(g2.oilRate);
    }
  });
  it('消耗品にはすべて値段がある', () => {
    for (const c of CONSUMABLES) expect(c.price, c.id).toBeGreaterThan(0);
  });
});

describe('買い物', () => {
  it('電池を買うと、お金が減って在庫が増え、帳簿に残る', () => {
    const s = createNewState();
    const before = s.stock.battery_sr626sw;
    const r = buyConsumable(s, 'battery_sr626sw', 2);
    expect(r.ok).toBe(true);
    expect(s.money).toBe(3000 - 400);
    expect(s.stock.battery_sr626sw).toBe(before + 2);
    expect(s.ledger.at(-1)).toMatchObject({ day: 1, amount: -400 });
  });
  it('油は1本で60回分増える', () => {
    const s = createNewState();
    s.money = 10000;
    buyConsumable(s, 'oil_fine', 1);
    expect(s.stock.oil_fine).toBe(120);
  });
  it('お金が足りないと買えず、何も変わらない', () => {
    const s = createNewState();
    s.money = 100;
    const r = buyConsumable(s, 'mainspring_tk28a', 1);
    expect(r.ok).toBe(false);
    expect(s.money).toBe(100);
    expect(s.stock.mainspring_tk28a).toBe(2);
    expect(s.ledger).toEqual([]);
  });
});

describe('道具のグレードアップ', () => {
  it('最初はすべて入門用で、手ブレ1・ルーペ4倍', () => {
    const s = createNewState();
    expect(toolStats(s, 'screwdriver_10')).toMatchObject({ grade: 1, tremor: 1 });
    expect(toolStats(s, 'loupe').loupeMag).toBe(4);
    expect(toolStats(s, 'hand').tremor).toBe(1); // 一式に入らない道具
  });
  it('ドライバー一式を中級にすると、4本とも手ブレが減る', () => {
    const s = createNewState();
    s.money = 10000;
    expect(buyUpgrade(s, 'screwdrivers').ok).toBe(true);
    expect(s.money).toBe(2000);
    for (const id of ['screwdriver_08', 'screwdriver_10', 'screwdriver_12', 'screwdriver_14']) expect(toolStats(s, id)).toMatchObject({ grade: 2, tremor: 0.75 });
    expect(toolStats(s, 'metal_tweezers').grade).toBe(1);
  });
  it('プロ用は評判が足りないと買えない', () => {
    const s = createNewState();
    s.money = 100000;
    buyUpgrade(s, 'screwdrivers');
    const chk = canUpgrade(s, 'screwdrivers');
    expect(chk.ok).toBe(false);
    expect(chk.message).toContain('評判');
    s.reputation = 8;
    expect(buyUpgrade(s, 'screwdrivers').ok).toBe(true);
    expect(toolStats(s, 'screwdriver_14').tremor).toBe(0.5);
    expect(canUpgrade(s, 'screwdrivers').max).toBe(true);
  });
});

describe('1日の締め', () => {
  it('家賃を払って次の日へ。収支はその日の帳簿から', () => {
    const s = createNewState();
    addLedger(s, '佐藤さん 電池交換', 1500);
    s.money += 1500;
    buyConsumable(s, 'battery_sr626sw', 1);
    const sum = closeDay(s);
    expect(s.day).toBe(2);
    expect(s.money).toBe(3000 + 1500 - 200 - DAILY_COST);
    expect(sum).toMatchObject({ income: 1500, expense: 200 + DAILY_COST, net: 1500 - 200 - DAILY_COST });
    expect(daySummary(s).rows).toEqual([]); // 2日目はまだ何もない
  });
});
