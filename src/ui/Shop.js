// =============================================================
// ショップ端末（パソコン）の画面
//   道具 : 道具一式のグレードアップ（手ブレが減る・ルーペの倍率が上がる など）
//   消耗品 : 電池・パッキン・ゼンマイ・油の仕入れ（すぐ届く）
//   帳簿 : 今日のお金の出入り
//   営業終了 : 家賃を払って次の日へ
// 計算は core/economy.js、ここは表示とボタンだけ。
// =============================================================
import { UPGRADES, GRADE_NAMES } from '../data/upgrades.js';
import { CONSUMABLES } from '../data/consumables.js';
import { getTool } from '../data/tools.js';
import { buyConsumable, buyUpgrade, canUpgrade, gradeOf, daySummary, DAILY_COST } from '../core/economy.js';
import { toolIconSvg } from './toolIcons.js';

const yen = (n) => `${n.toLocaleString()}円`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 性能の説明（グレードの値 → 文章） */
function statText(g) {
  const out = [];
  if (g.tremor) out.push(`手ブレ ${Math.round((1 - g.tremor) * 100)}%減`);
  if (g.loupeMag) out.push(`倍率 ${g.loupeMag}倍`);
  if (g.oilRate) out.push(`油が出る速さ ${Math.round(g.oilRate * 100)}%`);
  return out.join('・');
}

/**
 * ショップを開く。閉じたら resolve。
 * @param {object} ui UI
 * @param {object} state ゲームの状態
 * @param {{ onChange: Function, jobInProgress: boolean, needs: Set<string> }} opts
 * @returns {Promise<{ closeDay?: boolean }>} 営業終了が選ばれたら closeDay: true
 */
export function openShop(ui, state, opts) {
  return new Promise((resolve) => {
    let tab = opts.tab || 'consumables';
    const box = ui.openModal('<div class="shop"></div>', 'shop');
    const root = box.querySelector('.shop');

    const render = () => {
      const tabs = [
        ['consumables', '消耗品'],
        ['tools', '道具'],
        ['ledger', '帳簿'],
        ['close', '営業終了'],
      ];
      root.innerHTML = `
        <div class="shop-head">
          <h2>ショップ端末</h2>
          <div class="shop-money">所持金 <b>${yen(state.money)}</b>　評判 ${state.reputation}　${state.day}日目</div>
        </div>
        <div class="shop-tabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${tab === id ? 'on' : ''}">${label}</button>`).join('')}</div>
        <div class="shop-body">${body()}</div>
        <div class="modal-actions"><button class="primary" data-close>閉じる</button></div>`;
      root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; render(); }));
      root.querySelector('[data-close]').onclick = () => { ui.closeModal(); resolve({}); };
      root.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
        const r = buyConsumable(state, b.dataset.buy, Number(b.dataset.count));
        afterBuy(r, `${CONSUMABLES.find((c) => c.id === b.dataset.buy).name} を仕入れました。`);
      }));
      root.querySelectorAll('[data-upgrade]').forEach((b) => (b.onclick = () => {
        const id = b.dataset.upgrade;
        const r = buyUpgrade(state, id);
        afterBuy(r, r.ok ? `${UPGRADES.find((u) => u.id === id).name}を「${GRADE_NAMES[r.grade]}」にしました。` : '');
      }));
      root.querySelector('[data-closeday]')?.addEventListener('click', () => {
        ui.closeModal();
        resolve({ closeDay: true });
      });
    };

    const afterBuy = (r, message) => {
      if (r.ok) {
        ui.toast(message, 'good');
        opts.onChange();
      } else ui.toast(r.message, 'bad');
      render();
    };

    const body = () => {
      if (tab === 'consumables') return consumablesTab();
      if (tab === 'tools') return toolsTab();
      if (tab === 'ledger') return ledgerTab();
      return closeTab();
    };

    const consumablesTab = () => `
      <p class="sub">注文した品はすぐ届きます。作業中に在庫が切れたら、席を立ってここで仕入れましょう。<span class="need-mark">要</span>は、いま預かっている時計で使う品です。</p>
      <ul class="shop-list">${CONSUMABLES.map((c) => {
        const n = state.stock[c.id] || 0;
        const low = n < (c.pack ? 10 : 2);
        const unitLabel = c.pack ? `1本（${c.pack}${c.unit}）` : '1個';
        return `<li>
          <div class="shop-item-main">
            <b>${esc(c.name)}</b>${opts.needs?.has(c.id) ? '<span class="need-mark">要</span>' : ''}
            <small>${esc(c.desc)}</small>
          </div>
          <div class="shop-item-side">
            <span class="stock ${low ? 'low' : ''}">在庫 ${n}${c.unit || '個'}</span>
            <span class="price">${unitLabel} ${yen(c.price)}</span>
            <span class="buy-buttons">
              <button data-buy="${c.id}" data-count="1" ${state.money < c.price ? 'disabled' : ''}>1つ買う</button>
              ${c.pack ? '' : `<button data-buy="${c.id}" data-count="5" ${state.money < c.price * 5 ? 'disabled' : ''}>5つ</button>`}
            </span>
          </div>
        </li>`;
      }).join('')}</ul>`;

    const toolsTab = () => `
      <p class="sub">道具は「一式」でグレードが上がります。良い道具ほど手ブレが減り、細かい作業が楽になります。プロ用は評判の高い店にしか卸してもらえません。</p>
      <ul class="shop-list">${UPGRADES.map((u) => {
        const cur = gradeOf(state, u.id);
        const chk = canUpgrade(state, u.id);
        const next = u.grades[cur + 1];
        const curStat = cur > 1 ? statText(u.grades[cur]) : '基本の性能';
        const members = u.tools.map((id) => getTool(id)?.name).filter(Boolean).join('・');
        return `<li>
          <span class="shop-icon">${toolIconSvg({ icon: u.icon })}</span>
          <div class="shop-item-main">
            <b>${esc(u.name)}</b><span class="grade g${cur}">${GRADE_NAMES[cur]}</span>
            <small>${esc(members)}　いま：${curStat}</small>
            ${next ? `<small class="next">次は「${GRADE_NAMES[cur + 1]}」：${esc(next.desc)}（${statText(next)}）</small>` : '<small class="next">最高のグレードです。</small>'}
          </div>
          <div class="shop-item-side">
            ${next ? `<span class="price">${yen(next.price)}</span>` : ''}
            ${next && next.reputation > state.reputation ? `<span class="lock">評判 ${next.reputation} で解放</span>` : ''}
            ${next ? `<button data-upgrade="${u.id}" ${chk.ok ? '' : 'disabled'}>グレードアップ</button>` : ''}
          </div>
        </li>`;
      }).join('')}</ul>`;

    const ledgerTab = () => {
      const sum = daySummary(state);
      const recent = state.history.slice(-5).reverse();
      return `
        <h3>${state.day}日目の帳簿</h3>
        ${sum.rows.length ? `<ul class="breakdown">${sum.rows.map((r) => `<li>${esc(r.label)}<span class="${r.amount >= 0 ? 'plus' : 'minus'}">${r.amount >= 0 ? '+' : '−'}${yen(Math.abs(r.amount))}</span></li>`).join('')}</ul>` : '<p class="sub">今日はまだお金の出入りがありません。</p>'}
        <ul class="breakdown total"><li>入金<span class="plus">+${yen(sum.income)}</span></li><li>支払い<span class="minus">−${yen(sum.expense)}</span></li><li><b>差し引き</b><span><b>${sum.net >= 0 ? '+' : '−'}${yen(Math.abs(sum.net))}</b></span></li></ul>
        <h3>最近の仕事</h3>
        ${recent.length ? `<ul class="breakdown">${recent.map((h) => `<li>${h.day}日目　${esc(h.customer)}さん　${'★'.repeat(h.stars)}${'☆'.repeat(5 - h.stars)}<span>${yen(h.net)}</span></li>`).join('')}</ul>` : '<p class="sub">まだ仕事の記録がありません。</p>'}`;
    };

    const closeTab = () => {
      const sum = daySummary(state);
      return `
        <p>今日の営業を終えて、次の日（${state.day + 1}日目）に進みます。</p>
        <ul class="breakdown">
          <li>今日の入金<span class="plus">+${yen(sum.income)}</span></li>
          <li>今日の支払い<span class="minus">−${yen(sum.expense)}</span></li>
          <li>家賃・光熱費（閉店時に支払い）<span class="minus">−${yen(DAILY_COST)}</span></li>
        </ul>
        ${opts.jobInProgress ? '<p class="warn">預かっている時計があります。日付が進むと返却期限が近づきます（期限を過ぎると報酬が減ります）。</p>' : ''}
        ${state.money < DAILY_COST ? '<p class="warn">所持金が家賃より少ないので、赤字になります。</p>' : ''}
        <div class="modal-actions"><button data-closeday class="primary">営業を終えて次の日へ</button></div>`;
    };

    render();
  });
}
