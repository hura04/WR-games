// =============================================================
// お金のルール（買い物・道具のグレード・1日の締め）
// -------------------------------------------------------------
// 画面とは無関係の「計算」だけをここに書く（自動テストで確かめられるように）。
// すべて state（state.js の形）を直接書き換え、結果を返す。
// =============================================================
import { getConsumable } from '../data/consumables.js';
import { getUpgrade, upgradeForTool, GRADE_NAMES } from '../data/upgrades.js';

/** 家賃・光熱費など、1日ごとにかかるお金（円） */
export const DAILY_COST = 1000;

/** 帳簿に1行書く（amount は入金がプラス、支払いがマイナス） */
export function addLedger(state, label, amount) {
  state.ledger.push({ day: state.day, label, amount });
  if (state.ledger.length > 300) state.ledger.splice(0, state.ledger.length - 300);
}

/** 消耗品を買う。count は「何箱（何本）」。油は1本で pack 回分 */
export function buyConsumable(state, id, count = 1) {
  const c = getConsumable(id);
  if (!c) return { ok: false, message: '商品が見つかりません。' };
  const cost = c.price * count;
  if (state.money < cost) return { ok: false, message: `お金が足りません（${cost.toLocaleString()}円 必要）。` };
  state.money -= cost;
  state.stock[id] = (state.stock[id] || 0) + (c.pack || 1) * count;
  addLedger(state, `仕入れ：${c.name} ×${count}`, -cost);
  return { ok: true, cost };
}

/** いまのグレード（1〜3） */
export function gradeOf(state, upgradeId) {
  return state.toolGrades?.[upgradeId] || 1;
}

/** 次のグレードを買えるか（理由つき） */
export function canUpgrade(state, upgradeId) {
  const u = getUpgrade(upgradeId);
  if (!u) return { ok: false, message: '商品が見つかりません。' };
  const next = gradeOf(state, upgradeId) + 1;
  const g = u.grades[next];
  if (!g) return { ok: false, message: 'これ以上のグレードはありません。', max: true };
  if (state.reputation < g.reputation) return { ok: false, message: `評判 ${g.reputation} 以上で買えます（いま ${state.reputation}）。`, next, g };
  if (state.money < g.price) return { ok: false, message: `お金が足りません（${g.price.toLocaleString()}円 必要）。`, next, g };
  return { ok: true, next, g };
}

/** 次のグレードを買う */
export function buyUpgrade(state, upgradeId) {
  const chk = canUpgrade(state, upgradeId);
  if (!chk.ok) return chk;
  const u = getUpgrade(upgradeId);
  state.money -= chk.g.price;
  state.toolGrades[upgradeId] = chk.next;
  addLedger(state, `道具：${u.name}（${GRADE_NAMES[chk.next]}）`, -chk.g.price);
  return { ok: true, grade: chk.next, cost: chk.g.price };
}

/**
 * 道具の性能（グレードで変わる値）
 * @returns {{ grade: number, gradeName: string, tremor: number, loupeMag: number, oilRate: number }}
 */
export function toolStats(state, toolId) {
  const u = upgradeForTool(toolId);
  const grade = u ? gradeOf(state, u.id) : 1;
  const g = (u && u.grades[grade]) || {};
  return {
    grade,
    gradeName: GRADE_NAMES[grade],
    tremor: g.tremor ?? 1,
    loupeMag: g.loupeMag ?? 4,
    oilRate: g.oilRate ?? 1,
  };
}

/** その日の収支（帳簿から） */
export function daySummary(state, day = state.day) {
  const rows = state.ledger.filter((r) => r.day === day);
  const income = rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.amount < 0).reduce((s, r) => s - r.amount, 0);
  return { rows, income, expense, net: income - expense };
}

/** 1日の営業を終えて次の日へ（家賃などを払う） */
export function closeDay(state) {
  addLedger(state, '家賃・光熱費', -DAILY_COST);
  state.money -= DAILY_COST;
  const summary = daySummary(state);
  state.day += 1;
  return summary;
}
