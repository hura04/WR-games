// =============================================================
// ゲーム全体の状態（お金・日付・在庫・実績など）とセーブ
// =============================================================
import { CONSUMABLES } from '../data/consumables.js';
import { TOOLS } from '../data/tools.js';

const SAVE_KEY = 'wr-games-save-v1';

export function createNewState() {
  return {
    version: 1,
    money: 3000,
    day: 1,
    reputation: 0,
    ownedTools: TOOLS.filter((t) => t.starter).map((t) => t.id),
    stock: Object.fromEntries(CONSUMABLES.map((c) => [c.id, c.stock])),
    completed: {}, // procedureId -> 回数
    customerIndex: 0,
    history: [], // { day, customer, stars, net }
    settings: { guide: 'auto' }, // 'auto'（3回まで）/'on'/'off'
  };
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 新しく追加された項目があっても壊れないよう、初期値と合成する
    const base = createNewState();
    return { ...base, ...data, stock: { ...base.stock, ...data.stock }, settings: { ...base.settings, ...data.settings } };
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* 何もしない */
  }
}

/** ガイドを表示するか（同じ工程を3回こなすまでは自動で表示） */
export function guideEnabled(state, procedureId) {
  if (state.settings.guide === 'on') return true;
  if (state.settings.guide === 'off') return false;
  return (state.completed[procedureId] || 0) < 3;
}
