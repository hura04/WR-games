// =============================================================
// 受付カウンター：お客さんの話を聞く → 診断 → 見積もり → 引き受け
//                 作業後の返却と評価
// =============================================================
import { COUNTER_CHECKS } from '../data/diagnosis.js';
import { SERVICES } from '../data/services.js';
import { qualityToStars, computeReward } from '../procedure/scoring.js';
import { FAILURES } from '../data/failures.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** 会話のセリフを1つずつ表示 */
function talk(ui, speaker, lines) {
  return new Promise((resolve) => {
    let i = 0;
    const show = () => {
      const box = ui.openModal(
        `<div class="speaker">${esc(speaker)}</div>
         <p class="line">「${esc(lines[i])}」</p>
         <div class="modal-actions"><button class="primary">次へ ▶</button></div>`,
        'talk',
      );
      box.querySelector('button').onclick = () => {
        i++;
        if (i < lines.length) show();
        else resolve();
      };
    };
    show();
  });
}

// ------------------------------------------------------------
// 受付（依頼を引き受けるまで）
// ------------------------------------------------------------
export async function runIntake(ui, job, state) {
  await talk(ui, job.customer.name, job.customer.lines);
  await diagnose(ui, job);
  return estimate(ui, job, state);
}

function diagnose(ui, job) {
  return new Promise((resolve) => {
    const checks = COUNTER_CHECKS[job.watch.movement] || [];
    const box = ui.openModal(
      `<h2>受付での診断</h2>
       <p class="sub">お客さんの前で時計を確かめます。<b>${esc(job.watch.name)}</b></p>
       <div class="checks">${checks
         .map(
           (c) => `<div class="check" data-id="${c.id}">
             <button class="check-btn">${esc(c.name)}</button>
             <button class="mini why">なぜ？</button>
             <div class="why-text">${esc(c.explain)}</div>
           </div>`,
         )
         .join('')}</div>
       <h3>受付票</h3>
       <ul class="log"><li class="muted">（まだ何も確認していません）</li></ul>
       <div class="modal-actions"><button class="primary next">見積もりを作る ▶</button></div>`,
      'wide',
    );
    const log = box.querySelector('.log');
    box.querySelectorAll('.check').forEach((row) => {
      const c = checks.find((x) => x.id === row.dataset.id);
      row.querySelector('.check-btn').onclick = (e) => {
        if (job.checks.has(c.id)) return;
        job.checks.add(c.id);
        e.target.disabled = true;
        log.querySelector('.muted')?.remove();
        const li = document.createElement('li');
        li.innerHTML = `<b>${esc(c.name)}</b>：${esc(c.result(job))}`;
        log.appendChild(li);
      };
      row.querySelector('.why').onclick = () => row.classList.toggle('open');
    });
    box.querySelector('.next').onclick = resolve;
  });
}

function estimate(ui, job, state) {
  return new Promise((resolve) => {
    const deadlineDay = state.day + job.customer.deadlineDays;
    const box = ui.openModal(
      `<h2>見積もり</h2>
       <p class="sub">必要な作業を選んでください。期限：<b>${deadlineDay}日目</b>（${job.customer.deadlineDays}日後）</p>
       <div class="services">${SERVICES.map(
         (s) => `<label class="service ${s.available ? '' : 'disabled'}">
             <input type="checkbox" value="${s.id}" ${s.available ? '' : 'disabled'}>
             <span class="sname">${esc(s.name)}</span>
             <span class="price">${s.price.toLocaleString()}円</span>
             ${s.available ? '' : `<span class="reason">${esc(s.unavailableReason)}</span>`}
           </label>`,
       ).join('')}</div>
       <div class="total">合計 <b>0</b>円</div>
       <p class="warn"></p>
       <div class="modal-actions">
         <button class="decline">お断りする</button>
         <button class="primary accept" disabled>この内容で引き受ける</button>
       </div>`,
      'wide',
    );
    const inputs = [...box.querySelectorAll('input')];
    const acceptBtn = box.querySelector('.accept');
    const warn = box.querySelector('.warn');
    const refresh = () => {
      const chosen = new Set(inputs.filter((i) => i.checked).map((i) => i.value));
      // ほかの作業とセットでしか成立しないメニュー
      for (const s of SERVICES) if (s.requires && chosen.has(s.id) && !chosen.has(s.requires)) chosen.delete(s.id);
      inputs.forEach((i) => (i.checked = chosen.has(i.value)));
      const total = SERVICES.filter((s) => chosen.has(s.id)).reduce((a, s) => a + s.price, 0);
      box.querySelector('.total b').textContent = total.toLocaleString();
      const hasProcedure = SERVICES.some((s) => chosen.has(s.id) && s.procedure);
      acceptBtn.disabled = !hasProcedure;
      warn.textContent = hasProcedure ? '' : '作業の中心になるメニュー（電池交換など）を選んでください。';
      return { chosen, total };
    };
    inputs.forEach((i) => (i.onchange = refresh));
    refresh();
    box.querySelector('.decline').onclick = () => resolve(null);
    acceptBtn.onclick = async () => {
      const { chosen, total } = refresh();
      job.services = chosen;
      job.quoted = total;
      job.deadlineDay = deadlineDay;
      job.procedureId = SERVICES.find((s) => chosen.has(s.id) && s.procedure).procedure;
      await talk(ui, job.customer.name, [`${total.toLocaleString()}円ですね。よろしくお願いします。`]);
      ui.closeModal();
      resolve(job);
    };
  });
}

// ------------------------------------------------------------
// 返却と評価
// ------------------------------------------------------------
/** 受付での診断と作業結果から、最終的な評価を計算（画面とは独立） */
export function evaluateJob(job, state) {
  const r = job.runner;
  const extras = [];
  if (job.condition.preDamage && !job.checks.has('exterior'))
    extras.push({ label: '受付で傷を記録していなかった（お客さんに不信感）', loss: 10 });
  if (!job.checks.has('second_hand') && !job.checks.has('crown'))
    extras.push({ label: '受付での診断不足', loss: 3 });
  if (job.sim.weakNewBattery) extras.push({ label: '弱った電池を入れてしまった', loss: 15 });
  const extraLoss = extras.reduce((a, e) => a + e.loss, 0);
  const quality = r.quality(extraLoss);
  const stars = qualityToStars(quality);
  const lateDays = Math.max(0, state.day - job.deadlineDay);
  const reward = computeReward({ quoted: job.quoted, stars, extraCost: r.extraCost(), lateDays });
  return { quality, stars, reward, extras, lateDays };
}

export async function runHandover(ui, job, state) {
  const res = evaluateJob(job, state);
  const r = job.runner;
  const lines = [];
  if (job.condition.preDamage && !job.checks.has('exterior'))
    lines.push(`あら…この傷（${job.condition.preDamage.replace(/がある|が多い/, '')}）、前からあったかしら…？`);
  lines.push(res.stars >= 4 ? job.customer.thanks : res.stars >= 3 ? 'ありがとうございます。動くようになりました。' : '…動いてはいるけど、ちょっと仕上がりが気になりますね。');
  await talk(ui, job.customer.name, ['受け取りに来ました。', ...lines]);

  const failCounts = {};
  r.failures.forEach((f) => (failCounts[f.type] = (failCounts[f.type] || 0) + 1));
  const rows = [
    ...Object.entries(failCounts).map(([t, n]) => `<li>${FAILURES[t].label} ×${n}<span>−${FAILURES[t].quality * n}点</span></li>`),
    ...(r.skillLoss > 0.5 ? [`<li>操作の精度<span>−${Math.round(r.skillLoss)}点</span></li>`] : []),
    ...res.extras.map((e) => `<li>${e.label}<span>−${e.loss}点</span></li>`),
  ];
  const stars = '★'.repeat(res.stars) + '☆'.repeat(5 - res.stars);
  return new Promise((resolve) => {
    const box = ui.openModal(
      `<h2>仕上がり評価</h2>
       <div class="stars">${stars}</div>
       <div class="quality">仕上がり ${res.quality}点</div>
       <h3>減点の内訳</h3>
       <ul class="breakdown">${rows.length ? rows.join('') : '<li>減点なし。完璧な仕事です！</li>'}</ul>
       <h3>報酬</h3>
       <ul class="breakdown">
         <li>見積もり金額<span>${job.quoted.toLocaleString()}円</span></li>
         <li>評価による支払い（★${res.stars}）<span>${res.reward.gross.toLocaleString()}円</span></li>
         ${res.reward.extraCost ? `<li>失敗による追加費用<span>−${res.reward.extraCost.toLocaleString()}円</span></li>` : ''}
         <li class="total-row">受け取り<span>${res.reward.net.toLocaleString()}円</span></li>
       </ul>
       <div class="modal-actions"><button class="primary">工房に戻る</button></div>`,
      'wide result',
    );
    box.querySelector('button').onclick = () => {
      ui.closeModal();
      resolve(res);
    };
  });
}
