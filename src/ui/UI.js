// =============================================================
// 画面表示の共通部品（お知らせ・HUD・モーダル画面）
// =============================================================
const $ = (id) => document.getElementById(id);

export class UI {
  toast(text, kind = '', ms = 3800) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('hide'), ms);
    setTimeout(() => el.remove(), ms + 500);
  }

  updateHud(state, job) {
    $('hud-money').textContent = `所持金 ${state.money.toLocaleString()}円`;
    $('hud-day').textContent = `${state.day}日目`;
    $('hud-rep').textContent = `評判 ${state.reputation}`;
    let jobText = '依頼：なし';
    if (job) {
      if (job.phase === 'waiting') jobText = `受付で${job.customer.name}が待っています`;
      else if (job.phase === 'accepted' && !job.workDone) jobText = `作業中：${job.customer.name}の時計（期限 ${job.deadlineDay}日目）`;
      else if (job.workDone) jobText = `完了：受付で${job.customer.name}に返却しましょう`;
    }
    $('hud-job').textContent = jobText;
  }

  setPrompt(text) {
    const el = $('prompt');
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
  }

  /**
   * モーダル画面を開く
   * @param {string} html 中身
   * @returns {HTMLElement} 中身の要素
   */
  openModal(html, cls = '') {
    const m = $('modal');
    // 会話・見積もり・評価の画面が開いたら、上に重なる古いお知らせは消す
    $('toasts').innerHTML = '';
    m.className = `show ${cls}`;
    m.innerHTML = `<div class="modal-box">${html}</div>`;
    return m.querySelector('.modal-box');
  }

  closeModal() {
    const m = $('modal');
    m.className = '';
    m.innerHTML = '';
  }

  get modalOpen() {
    return $('modal').classList.contains('show');
  }
}
