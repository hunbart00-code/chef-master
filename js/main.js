// 셰프 마스터 메인 컨트롤러 — 한 화면(가게 씬) 위에서 모든 것을 처리
// 준비: 하단 바 [재료][고용][배치][주방][영업 시작] → 가벼운 팝업 패널 / 배치는 가게 바닥을 직접 눌러서
// 영업: 하단 바가 시간·매출 바로 바뀜 → 마감하면 정산 카드가 가게 위에 뜸
import {
  newShop, loadShop, saveShop, clearShop, loadSettings, saveSettings, ensureForecast, currentForecast,
  fridgeUsed, fridgeFree, buyIngredient, autoShop, upgradeFridge, buyItem, placeItem, pickupItem,
  branchMenus, cookableCount, anyCookable, menuPrice, isBankrupt, settleDay, decoBonus, tablesOf,
  INGREDIENTS, MENUS, ITEMS, FRIDGE_LEVELS, RESCUE_BASE, RESCUE_PER_CORRECT, won,
  hireStaff, fireStaff, staffOf, totalWages, sellIngredient, clearFridge, missingHint, setSaveScope,
  expandShop, nextShopLevel,
} from './shop-engine.js';
import { SHOP_LEVELS, gridOf } from './shop-levels.js';
import { tryLogin, createAccount, lastLogin } from './account.js';
import { STICKERS, stickerById, listClassmates, cheersLeftToday, cheeredToday, sendCheer, guestbookOf, pullIncomingCheers, ranking, RANKINGS, isDemo, CHEERS_PER_DAY } from './social-engine.js';
import { STAFF_ROLES, STAFF_ORDER, speedStars } from './data-staff.js';
import { QuizEngine } from './quiz-engine.js';
import { QuizUI } from './quiz-ui.js';
import { Business } from './business.js';
import { sfx } from './sfx.js';
import { loadSprites, spriteImg } from './sprites.js';
import { ING_SPRITE } from './sprite-atlas.js';
import { loadPx, pxImg, DISH_PX, ITEM_PX } from './px.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let state = null;
let scene = null;
let settings = loadSettings();
let panelKind = null;
let layoutSelected = null;
let chefLook = 'chef_m';
let pendingLogin = null;
let visiting = null;
let visitTasted = false;
let rankKind = 'rich';
const classControl = { isPaused: false, subjectRatio: null, maxBranchUnlocked: 4 };
const engine = new QuizEngine();
const quiz = new QuizUI($('#quizModal'), engine, () => ({
  branch: state?.branch || 1,
  subjectRatio: classControl.subjectRatio || settings.subjectRatio,
}), sfx);
sfx.setEnabled(settings.sound);

// 교사 실시간 통제 (3·4차에서 Firestore 구독으로 갱신)
export function applyClassControl(ctrl) {
  Object.assign(classControl, ctrl);
  $('#lockOverlay').hidden = !classControl.isPaused;
  if (scene) scene.locked = classControl.isPaused;
  quiz.locked = classControl.isPaused;
}

// ---------- 공통 ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

function confirmBox(text) {
  return new Promise((resolve) => {
    $('#confirmText').innerHTML = text;
    const m = $('#confirmModal');
    m.hidden = false;
    const done = (v) => { m.hidden = true; $('#confirmYes').onclick = $('#confirmNo').onclick = null; resolve(v); };
    $('#confirmYes').onclick = () => done(true);
    $('#confirmNo').onclick = () => done(false);
  });
}

function feed(msg) {
  const ul = $('#feed');
  const li = document.createElement('li');
  li.innerHTML = msg;
  ul.prepend(li);
  while (ul.children.length > 4) ul.lastChild.remove();
  setTimeout(() => li.classList.add('fade'), 4500);
  setTimeout(() => li.remove(), 5200);
}

function updateHud(clock) {
  if (!state) return;
  $('#hudDay').textContent = `DAY ${state.day}`;
  if (clock !== undefined) $('#hudClock').textContent = clock;
  $('#hudMoney').textContent = won(state.money);
  $('#hudRating').textContent = state.rating.toFixed(1);
  $('#hudPerfect').textContent = state.perfectCookCount;
  const f = currentForecast(state);
  const promo = state.promo ? `<small class="promo">📣 친구 응원 홍보 효과 · 오늘 매출 +${Math.round(state.promo * 100)}%</small>` : '';
  $('#forecastChip').innerHTML = `<span class="fc-ico">${f.icon}</span><span><b>${f.name}</b><small>${f.desc}</small>${promo}</span>`;
}

function persist() { saveShop(state); }

// ---------- 씬 ----------
function makeScene(st) {
  scene?.destroy();
  scene = new Business({
    state: st,
    pxCanvas: $('#pxCanvas'),
    uiCanvas: $('#uiCanvas'),
    sfx,
    hooks: {
      log: feed,
      toast,
      hud: (h) => {
        $('#hudClock').textContent = h.clock;
        $('#timeFill').style.width = `${(1 - h.pct) * 100}%`;
        $('#bizRevenue').textContent = won(h.revenue);
        $('#bizServed').textContent = h.served;
        $('#bizPerfect').textContent = h.perfect;
      },
      stock: renderStock,
      onMoney: () => { $('#hudMoney').textContent = won(st.money); },
      openQuiz: (o, cb) => quiz.open({ title: o.title, engBoost: o.engBoost, onDone: cb }),
      onEnd: endBusiness,
      onSlot,
      onTasted: () => { visitTasted = true; if (visiting) { renderVisitBar(); toast('시식 완료! 응원 스티커를 남겨요 💌'); } },
    },
  });
  scene.locked = classControl.isPaused;
  window.__chef.biz = scene;
}

// ---------- 타이틀 ----------
function initTitle() {
  $('#selRatio').value = settings.subjectRatio;
  $('#selBan').innerHTML = Array.from({ length: 15 }, (_, i) => `<option value="${i + 1}">${i + 1}반</option>`).join('');
  $('#selNo').innerHTML = Array.from({ length: 35 }, (_, i) => `<option value="${i + 1}">${i + 1}번</option>`).join('');
  const last = lastLogin();
  if (last) { $('#selBan').value = last.ban; $('#selNo').value = last.no; $('#inpName').value = last.name; }

  // 로그인 화면 뒤에도 가게가 보이도록 미리보기
  const preview = newShop('');
  ensureForecast(preview);
  makeScene(preview);

  $$('.chef-opt').forEach((b) => {
    b.innerHTML = `${pxImg(`${b.dataset.look}_front`, 3)}<span>${b.dataset.look === 'chef_m' ? '남자 셰프' : '여자 셰프'}</span>`;
    b.onclick = () => { chefLook = b.dataset.look; $$('.chef-opt').forEach((x) => x.classList.toggle('selected', x === b)); };
  });
  const form = () => ({ ban: $('#selBan').value, no: $('#selNo').value, name: $('#inpName').value.trim(), code: $('#inpCode').value.trim() });
  $('#btnLogin').onclick = () => {
    const f = form();
    const r = tryLogin(f);
    if (!r.ok) { toast(r.reason); sfx.play('wrong'); return; }
    if (r.isNew) {
      pendingLogin = { ...f, id: r.id };
      $('#newShopWho').textContent = `${f.ban}반 ${f.no}번 ${f.name},`;
      $('#loginForm').hidden = true;
      $('#newShopStep').hidden = false;
      return;
    }
    enterAccount(r.id, f);
  };
  $('#btnBack').onclick = () => { pendingLogin = null; $('#loginForm').hidden = false; $('#newShopStep').hidden = true; };
  $('#btnNew').onclick = () => {
    if (!pendingLogin) return;
    const id = createAccount(pendingLogin);
    enterAccount(id, pendingLogin, true);
    $('#helpModal').hidden = false;
  };
  for (const id of ['#inpName', '#inpCode']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnLogin').click(); });
  $('#selRatio').onchange = (e) => { settings.subjectRatio = e.target.value; saveSettings(settings); };
}

function enterAccount(id, f, isNew = false) {
  setSaveScope(id);
  engine.useScope(id);
  let s = loadShop();
  if (!s) { s = newShop(f.name); s.chefLook = chefLook; }
  Object.assign(s, { accountId: id, ban: Number(f.ban), no: Number(f.no), name: f.name });
  saveShop(s);
  startGame(s);
  if (!isNew) toast(`${f.name} 사장님, 어서 오세요! 🍜`);
}

// 로그아웃: 새로고침 없이 로그인 화면으로 (claude.ai 페이지 안에서는 새로고침이 막힐 수 있음)
function logout() {
  if (state) saveShop(state);
  closePanel();
  if (scene) { scene.edit = null; scene.hoverSlot = null; }
  layoutSelected = null;
  visiting = null;
  state = null;
  quiz.root.hidden = true;
  $('#settleCard').hidden = true;
  $('#hudTL').hidden = true;
  $('#hudTR').hidden = true;
  $('#bottomBar').hidden = true;
  $('#feed').innerHTML = '';
  $('#inpCode').value = '';
  $('#loginForm').hidden = false;
  $('#newShopStep').hidden = true;
  pendingLogin = null;
  $('#titleCard').hidden = false;
  setSaveScope('');
  engine.useScope('');
  const preview = newShop('');
  ensureForecast(preview);
  makeScene(preview);
  toast('로그아웃했어요. 가게는 저장돼 있어요! 👋');
  $('#inpCode').focus();
}

function startGame(s) {
  state = s;
  $('#titleCard').hidden = true;
  $('#hudTL').hidden = false;
  $('#hudTR').hidden = false;
  $('#bottomBar').hidden = false;
  enterPrep();
}

// ---------- 준비 ----------
function enterPrep() {
  visiting = null;
  ensureForecast(state);
  const fresh = pullIncomingCheers(state);
  for (const e of fresh) { const st = stickerById(e.sticker); feed(`💌 ${e.from}: ${st.icon} ${st.text}`); }
  if (fresh.length) toast(`친구 응원 ${fresh.length}개 도착! 오늘 매출 +${Math.round(state.promo * 100)}% 📣`);
  saveShop(state);
  $('#settleCard').hidden = true;
  makeScene(state);
  showBar('prep');
  updateHud('준비');
  refreshPrep();
}

function showBar(which) {
  $('#bbPrep').hidden = which !== 'prep';
  $('#bbBiz').hidden = which !== 'biz';
  $('#bbEdit').hidden = which !== 'edit';
  $('#bbVisit').hidden = which !== 'visit';
}

function refreshPrep() {
  updateHud();
  $('#btnRescue').hidden = !isBankrupt(state);
  if (panelKind) renderPanel();
}

// ---------- 팝업 패널 ----------
const PANEL_TITLES = { ing: '🛒 식재료 구매', staff: '👥 종업원 고용', kitchen: '🏗️ 가게 확장 · 주방 설비', friends: '🏘️ 친구 가게', rank: '🏆 학급 랭킹' };

function openPanel(kind) {
  if (kind === 'layout') { closePanel(); startEdit(); return; }
  if (panelKind === kind) { closePanel(); return; }
  panelKind = kind;
  $$('#bbPrep [data-open]').forEach((b) => b.classList.toggle('active', b.dataset.open === kind));
  $('#panel').hidden = false;
  $('#panel').style.bottom = `${$('#bottomBar').offsetHeight + 14}px`;
  $('#panelTitle').textContent = PANEL_TITLES[kind];
  renderPanel();
  sfx.play('tap');
}

function closePanel() {
  panelKind = null;
  $('#panel').hidden = true;
  $$('#bbPrep [data-open]').forEach((b) => b.classList.remove('active'));
}

function renderPanel() {
  const body = $('#panelBody');
  if (panelKind === 'ing') body.innerHTML = ingredientsHtml();
  if (panelKind === 'staff') body.innerHTML = staffHtml();
  if (panelKind === 'kitchen') body.innerHTML = kitchenHtml();
  if (panelKind === 'friends') body.innerHTML = friendsHtml();
  if (panelKind === 'rank') body.innerHTML = rankHtml();
}

// ---------- 친구 가게 ----------
function friendsHtml() {
  const left = cheersLeftToday(state);
  const mine = guestbookOf(state.accountId);
  const book = mine.length ? mine.map((e) => { const st = stickerById(e.sticker); return `<span class="gb-chip">${st.icon} <b>${e.from}</b> ${st.text}</span>`; }).join('')
    : '<span class="muted small">아직 받은 응원이 없어요. 친구 가게에 먼저 놀러 가 봐요!</span>';
  const friends = listClassmates(state).map((f) => `
    <div class="friend-card">
      ${pxImg(`${f.chefLook || 'chef_m'}_front`, 2)}
      <div class="fr-info"><b>${f.name}</b>${f.demo ? ' <span class="tag">체험</span>' : ''}<small>DAY ${f.day} · ★ ${(f.rating || 0).toFixed(1)} · 완벽 ${f.perfectCookCount || 0}</small></div>
      ${cheeredToday(state, f.id) ? '<span class="done">💌 응원함</span>' : ''}
      <button class="px-btn tiny go" data-visit="${f.id}">놀러가기</button>
    </div>`).join('');
  return `
    <div class="social-head">
      <span>오늘 남은 응원 <b>${left}/${CHEERS_PER_DAY}</b></span>
      <span>내 홍보 효과 <b>${state.promo ? `+${Math.round(state.promo * 100)}%` : '없음'}</b> <small class="muted">(응원 1개당 다음 영업 매출 +10%, 최대 +30%)</small></span>
    </div>
    <h4>💌 내 방명록</h4><div class="guestbook">${book}</div>
    <h4>🏘️ ${state.ban}반 친구들</h4>
    ${isDemo() ? '<p class="small muted">학급 서버 연결 전이라 이 기기의 같은 반 계정 + 체험용 친구가 보여요.</p>' : ''}
    <div class="friend-list">${friends}</div>`;
}

function rankHtml() {
  const tabs = Object.entries(RANKINGS).map(([k, r]) => `<button class="px-btn small ${rankKind === k ? 'active go' : ''}" data-rank="${k}">${r.icon} ${r.name}</button>`).join('');
  const rows = ranking(state, rankKind).map((r) => `
    <div class="rank-row ${r.isMe ? 'me' : ''}">
      <span class="rk">${r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
      ${pxImg(`${r.chefLook || 'chef_m'}_front`, 1)}
      <span class="rn">${r.name}${r.isMe ? ' (나)' : ''}${r.demo ? ' <span class="tag">체험</span>' : ''}</span>
      <b class="rv">${r.label}</b>
    </div>`).join('');
  return `<div class="rank-tabs">${tabs}</div><p class="small muted">${RANKINGS[rankKind].desc}</p><div class="rank-list">${rows}</div>`;
}

function visitFriend(id) {
  const f = listClassmates(state).find((x) => x.id === id);
  if (!f) return;
  closePanel();
  visiting = f;
  makeScene({ ...f, forecast: { id: 'sunny', day: f.day }, fridge: f.fridge || { level: 0, capacity: 20, items: {} }, inventory: f.inventory || {}, today: { expense: 0 } });
  visitTasted = false;
  scene.startVisit({ name: state.name });
  showBar('visit');
  updateHud('방문');
  renderVisitBar();
  sfx.play('bell');
}

function renderVisitBar() {
  const f = visiting;
  const done = cheeredToday(state, f.id);
  const left = cheersLeftToday(state);
  const book = guestbookOf(f.id).slice(0, 3).map((e) => stickerById(e.sticker).icon).join(' ');
  $('#visitWho').innerHTML = `<span>🏠 <b>${f.name}</b>네 가게</span><small>★ ${(f.rating || 0).toFixed(1)} · DAY ${f.day}${book ? ` · 방명록 ${book}` : ''}</small>`;
  $('#stickerRow').innerHTML = !visitTasted
    ? '<span class="small muted">🍽️ 손님으로 들어가 시식하는 중…</span>'
    : done
    ? '<span class="done">💌 오늘 응원 완료!</span>'
    : left <= 0 ? '<span class="muted small">오늘 응원 3번을 다 썼어요</span>'
      : `<span class="small muted">시식 & 응원:</span>${STICKERS.map((st) => `<button class="px-btn tiny" data-sticker="${st.id}" title="${st.text}">${st.icon}</button>`).join('')}`;
}


function ingredientsHtml() {
  const used = fridgeUsed(state), cap = state.fridge.capacity;
  const menus = branchMenus(state).map((id) => {
    const m = MENUS[id];
    const p = menuPrice(state, id);
    const n = cookableCount(state, id);
    return `<div class="menu-chip ${n ? '' : 'zero'}">${pxImg(DISH_PX[id], 2)}<span>${m.name}<b class="${p > m.price ? 'bonus' : ''}">${won(p)}</b></span><i>${n}인분</i></div>`;
  }).join('');
  const needed = new Set(branchMenus(state).flatMap((m) => Object.keys(MENUS[m].needs)));
  const rows = Object.entries(INGREDIENTS).filter(([id]) => needed.has(id)).map(([id, ing]) => `
    <div class="ing-row">
      ${spriteImg(ING_SPRITE[id], 30)}
      <span class="ing-name">${ing.name}<small>${won(ing.price)}</small></span>
      <button class="px-btn tiny ${state.fridge.items[id] ? '' : 'off'}" data-sell="${id}" title="1개 되팔기">−1</button>
      <span class="ing-have">${state.fridge.items[id] || 0}</span>
      <button class="px-btn tiny" data-buy="${id}" data-q="1">+1</button>
      <button class="px-btn tiny" data-buy="${id}" data-q="5">+5</button>
    </div>`).join('');
  return `
    <div class="fridge-head">
      <span>🧊 냉장고</span>
      <div class="meter"><i style="width:${(used / cap) * 100}%" class="${used >= cap ? 'full' : ''}"></i></div>
      <b>${used}/${cap}</b>
      <button class="px-btn small" data-clear title="냉장고 재료를 전부 산 값에 되팔아요">🧹 초기화</button>
      <button class="px-btn small go" data-auto>🧺 자동 장보기</button>
    </div>
    ${anyCookable(state) ? '' : `<div class="warn-line">⚠️ 지금 재료로는 만들 수 있는 메뉴가 없어요. ${missingHint(state)}${fridgeFree(state) <= 0 ? ' · 냉장고가 꽉 찼으니 −1이나 🧹 초기화로 자리를 비워요!' : ''}</div>`}
    <div class="menu-chips">${menus}</div>
    <div class="ing-list">${rows}</div>`;
}

function staffHtml() {
  let html = `<div class="staff-summary">${pxImg(`${state.chefLook || 'chef_m'}_front`, 2)}
      <span>직원이 없는 일은 사장님이 직접 해요.</span>
      <span class="wage-total">매일 일급 <b>${won(totalWages(state))}</b></span></div>`;
  for (const role of STAFF_ORDER) {
    const R = STAFF_ROLES[role];
    const cur = staffOf(state, role);
    html += `<div class="staff-role"><h4>${R.icon} ${R.name} <small>${R.desc}</small></h4><div class="staff-cards">`;
    R.tiers.forEach((t, i) => {
      const tier = i + 1;
      const hired = cur && cur.tier === tier;
      const sp = speedStars(t.speed);
      const stats = [`이동 ${'★'.repeat(sp)}${'☆'.repeat(4 - sp)}`];
      if (role === 'cleaner') { stats.push(`청소 ${t.work}초`); if (t.trashMult < 1) stats.push(`쓰레기 −${Math.round((1 - t.trashMult) * 100)}%`); }
      if (role === 'server') { stats.push(`인내심 +${Math.round((1 / t.patienceMult - 1) * 100)}%`); if (t.tipBonus) stats.push(`팁 +${Math.round(t.tipBonus * 100)}%`); }
      if (role === 'guard') { stats.push(`퇴치 <b>${Math.round(t.success * 100)}%</b>`); if (t.rowdyMult < 1) stats.push(`진상 −${Math.round((1 - t.rowdyMult) * 100)}%`); }
      const portrait = role === 'server' ? `server${tier}_front` : t.id;
      const canPay = state.money >= t.hire;
      html += `<div class="staff-card ${hired ? 'hired' : ''}">
        <div class="sc-portrait">${pxImg(portrait, 2)}</div>
        <div class="sc-name">${t.name}</div>
        <div class="sc-stats">${stats.join(' · ')}</div>
        <div class="sc-price">계약 <b>${won(t.hire)}</b><br>일급 <b>${won(t.wage)}</b></div>
        ${hired ? `<button class="px-btn tiny" data-fire="${role}">근무 중 · 해고</button>`
          : `<button class="px-btn tiny ${canPay ? 'go' : 'off'}" data-hire="${role}" data-tier="${tier}" ${canPay ? '' : 'disabled'}>${cur ? '교체' : '고용'}</button>`}
      </div>`;
    });
    html += '</div></div>';
  }
  return html;
}

function kitchenHtml() {
  const lv = state.fridge.level;
  const next = FRIDGE_LEVELS[lv + 1];
  const cur = SHOP_LEVELS[state.shopLevel ?? 0];
  const nx = nextShopLevel(state);
  const g = gridOf(state);
  const expand = `<div class="upgrade-card expand">
      <span class="up-ico">🏗️</span>
      <div><b>${cur.name}</b> <span class="muted small">(테이블 자리 ${g.cols * g.rows}칸)</span>
        <p>${nx ? `다음: <b>${nx.name}</b> — 가게가 넓어지고 테이블 자리가 ${nx.cols * nx.rows}칸으로 늘어나요.` : '가장 넓은 가게예요! (2호점 확장은 다음 업데이트)'}</p></div>
      ${nx ? `<button class="px-btn ${state.money >= nx.price ? 'go' : 'off'}" data-expand>확장 ${won(nx.price)}</button>` : '<span class="muted">MAX</span>'}
    </div>`;
  return expand + `<div class="upgrade-card">${pxImg('fridge', 2)}
      <div><b>냉장고 Lv.${lv + 1}</b><p>보관 ${state.fridge.capacity}칸${next ? ` → 다음 ${next.capacity}칸` : ' (최대)'}</p></div>
      ${next ? `<button class="px-btn go" data-fridge>업그레이드 ${won(next.price)}</button>` : '<span class="muted">MAX</span>'}
    </div>
    <p class="small muted">재료는 상하지 않아요. 냉장고가 클수록 하루에 더 많은 손님을 받을 수 있어요.</p>
    <div class="danger-zone"><span class="small muted">가게를 DAY 1부터 다시 시작하고 싶다면</span>
      <button class="px-btn tiny" data-reset>처음부터 다시</button></div>`;
}

function bindPanel() {
  $('#panelClose').onclick = closePanel;
  $('#panelBody').addEventListener('click', async (e) => {
    const buy = e.target.closest('[data-buy]');
    if (buy) {
      const id = buy.dataset.buy, q = Number(buy.dataset.q);
      if (fridgeFree(state) <= 0) { toast('냉장고가 꽉 찼어요! 🧊'); return; }
      if (state.money < INGREDIENTS[id].price) { toast('돈이 부족해요! 💸'); return; }
      const got = buyIngredient(state, id, q);
      if (got < q) toast(`${got}개만 샀어요 (냉장고/자금 부족)`);
      sfx.play('tap');
      persist(); refreshPrep();
      return;
    }
    const v = e.target.closest('[data-visit]');
    if (v) { visitFriend(v.dataset.visit); return; }
    const rk = e.target.closest('[data-rank]');
    if (rk) { rankKind = rk.dataset.rank; renderPanel(); sfx.play('tap'); return; }
    const sell = e.target.closest('[data-sell]');
    if (sell) {
      if (!sellIngredient(state, sell.dataset.sell, 1)) return;
      sfx.play('tap');
      persist(); refreshPrep();
      return;
    }
    if (e.target.closest('[data-clear]')) {
      const used = fridgeUsed(state);
      if (!used) { toast('냉장고가 이미 비어 있어요.'); return; }
      if (!(await confirmBox(`냉장고 재료 ${used}개를 전부 되팔까요?<br><small>산 값 그대로 돌려받아요.</small>`))) return;
      const refund = clearFridge(state);
      sfx.play('coin');
      toast(`냉장고를 비웠어요! ${won(refund)} 환불`);
      persist(); refreshPrep();
      return;
    }
    if (e.target.closest('[data-auto]')) {
      const n = autoShop(state);
      toast(n ? `🧺 재료 ${n}개를 골고루 샀어요!` : '더 살 수 없어요 (냉장고/자금 부족)');
      if (n) sfx.play('coin');
      persist(); refreshPrep();
      return;
    }
    if (e.target.closest('[data-expand]')) {
      const nx = nextShopLevel(state);
      if (!nx) return;
      if (state.money < nx.price) { toast(`확장 비용 ${won(nx.price)}이 필요해요! 💸`); return; }
      if (!(await confirmBox(`<b>${nx.name}</b>(으)로 가게를 넓힐까요?<br>${won(nx.price)} · 테이블 자리 ${nx.cols * nx.rows}칸`))) return;
      expandShop(state);
      sfx.play('perfect');
      toast(`🏗️ ${nx.name}(으)로 확장 완료! 🪑 배치에서 테이블을 더 놓아요.`);
      persist(); scene.rebuild(); refreshPrep();
      return;
    }
    if (e.target.closest('[data-reset]')) {
      if (!(await confirmBox('정말 <b>DAY 1부터 다시</b> 시작할까요?<br><small>돈·가구·직원·기록이 모두 사라져요.</small>'))) return;
      if (!(await confirmBox('한 번 더 확인할게요. 되돌릴 수 없어요!'))) return;
      const keep = { accountId: state.accountId, ban: state.ban, no: state.no, name: state.name, chefLook: state.chefLook };
      clearShop(); engine.reset();
      state = Object.assign(newShop(keep.name), keep);
      saveShop(state);
      closePanel();
      enterPrep();
      toast('새 가게로 다시 시작해요! 🍜');
      return;
    }
    if (e.target.closest('[data-fridge]')) {
      if (!upgradeFridge(state)) { toast('돈이 부족해요!'); return; }
      sfx.play('bell');
      toast(`냉장고가 ${state.fridge.capacity}칸으로 커졌어요!`);
      persist(); refreshPrep();
      return;
    }
    const h = e.target.closest('[data-hire]');
    if (h) {
      const role = h.dataset.hire, tier = Number(h.dataset.tier);
      const t = STAFF_ROLES[role].tiers[tier - 1];
      const cur = staffOf(state, role);
      const msg = `<b>${t.name}</b>을(를) 고용할까요?<br>계약금 ${won(t.hire)} · 매일 일급 ${won(t.wage)}${cur ? `<br><small>지금 일하는 ${cur.name}은(는) 그만둬요.</small>` : ''}`;
      if (!(await confirmBox(msg))) return;
      if (!hireStaff(state, role, tier)) { toast('돈이 부족해요! 💸'); return; }
      sfx.play('bell');
      toast(`${t.name} 고용 완료! 가게에 출근했어요.`);
      persist(); scene.rebuild(); refreshPrep();
      return;
    }
    const f = e.target.closest('[data-fire]');
    if (f) {
      const cur = staffOf(state, f.dataset.fire);
      if (!(await confirmBox(`${cur.name}을(를) 해고할까요?<br><small>계약금은 돌려받지 못해요.</small>`))) return;
      fireStaff(state, f.dataset.fire);
      persist(); scene.rebuild(); refreshPrep();
    }
  });
}

// ---------- 배치: 가게 바닥을 직접 눌러서 ----------
function startEdit() {
  scene.edit = {};
  showBar('edit');
  renderTray();
}

function endEdit() {
  scene.edit = null;
  scene.hoverSlot = null;
  layoutSelected = null;
  showBar('prep');
  persist();
  refreshPrep();
}

function renderTray() {
  $('#tray').innerHTML = Object.entries(ITEMS).map(([type, it]) => {
    const inv = state.inventory[type] || 0;
    return `<span class="tray-item ${layoutSelected === type ? 'selected' : ''} ${inv ? '' : 'empty'}" data-select="${type}" title="${it.name}: ${it.desc}">
      ${pxImg(ITEM_PX[type], 1)}<b>${inv}</b>
      <button class="px-btn tiny" data-buyitem="${type}">${won(it.price)}</button>
    </span>`;
  }).join('') + `<span class="tray-info">테이블 ${tablesOf(state).length} · 자리 ${state.layout.length}/${gridOf(state).cols * gridOf(state).rows}<br>별점 +${decoBonus(state).toFixed(2)}</span>`;
}

function onSlot(gx, gy) {
  const occupied = state.layout.some((l) => l.x === gx && l.y === gy);
  if (occupied) {
    layoutSelected = pickupItem(state, gx, gy);
    sfx.play('tap');
  } else if (layoutSelected && state.inventory[layoutSelected]) {
    placeItem(state, layoutSelected, gx, gy);
    if (!state.inventory[layoutSelected]) layoutSelected = null;
    sfx.play('tap');
  } else {
    toast('아래에서 놓을 가구를 먼저 골라요! (없으면 가격 버튼으로 구매)');
    return;
  }
  saveShop(state);
  scene.rebuild();
  renderTray();
}

function bindEdit() {
  $('#tray').addEventListener('click', (e) => {
    const b = e.target.closest('[data-buyitem]');
    if (b) {
      e.stopPropagation();
      const type = b.dataset.buyitem;
      if (!buyItem(state, type)) { toast('돈이 부족해요! 💸'); return; }
      layoutSelected = type;
      sfx.play('coin');
      toast(`${ITEMS[type].name} 구매! 빈 칸을 눌러 놓아요.`);
      updateHud(); persist(); renderTray();
      return;
    }
    const s = e.target.closest('[data-select]');
    if (s) {
      const type = s.dataset.select;
      if (!state.inventory[type]) { toast('창고에 없어요. 가격 버튼을 눌러 사요!'); return; }
      layoutSelected = layoutSelected === type ? null : type;
      renderTray();
    }
  });
  $('#btnEditDone').onclick = endEdit;
}

// ---------- 파산 구제 ----------
function doRescue() {
  quiz.open({
    title: '🧽 비상 설거지 알바',
    resultButton: '알바비 받기 💵',
    resultHtml: (c) => `<div class="grade"><div class="stars">🧽✨</div><div class="gname">설거지 완료!</div>
      <div class="gmsg">${c}/3 정답 · 알바비 <b>${won(RESCUE_BASE + c * RESCUE_PER_CORRECT)}</b></div></div>`,
    onDone: (c) => {
      state.money += RESCUE_BASE + c * RESCUE_PER_CORRECT;
      sfx.play('coin');
      toast('알바비를 받았어요! 다시 힘내요 💪');
      persist(); refreshPrep();
    },
  });
}

// ---------- 영업 ----------
async function startBusiness() {
  if (!tablesOf(state).length) { toast('테이블을 1개 이상 놓아야 영업할 수 있어요! (🪑 배치)'); return; }
  if (!anyCookable(state)) { toast(`만들 수 있는 메뉴가 없어요! ${missingHint(state)}`); if (panelKind !== 'ing') openPanel('ing'); return; }
  const total = branchMenus(state).reduce((s, m) => s + cookableCount(state, m), 0);
  if (total < 4 && fridgeFree(state) > 2 && !(await confirmBox(`재료가 ${total}인분밖에 없어요.<br>그래도 영업을 시작할까요?`))) return;
  closePanel();
  persist();
  showBar('biz');
  $('#feed').innerHTML = '';
  sfx.play('bell');
  scene.startDay();
}

async function closeEarly() {
  if (!scene || scene.mode !== 'business' || scene.paused) return;
  scene.paused = true;
  const ok = await confirmBox('오늘 영업을 지금 마감할까요?<br><small>기다리던 손님은 돌아가요.</small>');
  scene.paused = false;
  scene.last = performance.now();
  if (ok) scene.closeEarly();
}

function renderStock() {
  $('#bizStock').innerHTML = branchMenus(state).map((id) => {
    const n = scene.cookable(id);
    return `<span class="stock-chip ${n ? '' : 'zero'}">${pxImg(DISH_PX[id], 2)}<b>${n}</b></span>`;
  }).join('');
}

function endBusiness(stats) {
  sfx.play('bell');
  toast('🔔 영업 종료!');
  setTimeout(() => showSettlement(stats), 900);
}

function showSettlement(stats) {
  const r = settleDay(state, stats);
  persist();
  updateHud('마감');
  const acc = stats.quizTotal ? Math.round((stats.quizCorrect / stats.quizTotal) * 100) : 0;
  const diff = r.newRating - r.oldRating;
  $('#receipt').innerHTML = `
    <h2>🧾 DAY ${r.day} 결산</h2>
    <table class="ledger">
      <tr><td>총 매출</td><td class="plus">+${won(r.revenue)}</td></tr>
      <tr><td>팁</td><td class="plus">+${won(r.tips)}</td></tr>
      ${r.bonus ? `<tr><td>🕵️ 미슐랭 보너스</td><td class="plus">+${won(r.bonus)}</td></tr>` : ''}
      <tr><td>재료·가구·계약금</td><td class="minus">−${won(r.expense)}</td></tr>
      <tr><td>종업원 일급</td><td class="minus">−${won(r.wages)}</td></tr>
      <tr class="total"><td>순수익</td><td class="${r.net >= 0 ? 'plus' : 'minus'}">${r.net >= 0 ? '+' : '−'}${won(Math.abs(r.net))}</td></tr>
    </table>
    <div class="settle-grid">
      <div><span>손님</span><b>${stats.served}</b></div>
      <div><span>★★★</span><b class="g3">${stats.grades[3]}</b></div>
      <div><span>★★</span><b class="g2">${stats.grades[2]}</b></div>
      <div><span>★ 탄 요리</span><b class="g1">${stats.grades[1]}</b></div>
      <div><span>놓친 손님</span><b>${stats.lost}</b></div>
      <div><span>진상 처리</span><b>${stats.rowdyHandled}/${stats.rowdyHandled + stats.rowdyIgnored}</b></div>
      <div><span>치운 자리</span><b>${stats.trashCleaned}</b></div>
      <div><span>정답률</span><b>${acc}%</b></div>
    </div>
    ${r.quit.length ? `<div class="quit-notice">💸 일급이 모자라서 <b>${r.quit.join(', ')}</b>이(가) 그만뒀어요.</div>` : ''}
    <div class="rating-change">별점 <b>${r.oldRating.toFixed(2)}</b> → <b class="${diff >= 0 ? 'up' : 'down'}">${r.newRating.toFixed(2)} ${diff >= 0 ? '▲' : '▼'}</b> · 보유 <b>${won(state.money)}</b></div>`;
  $('#reviewList').innerHTML = r.reviews.map((rv) => `
    <div class="review ${rv.michelin ? 'michelin' : ''}"><div class="rv-head"><b>${rv.who}</b><span class="rv-stars">${'★'.repeat(rv.stars)}${'☆'.repeat(5 - rv.stars)}</span></div><p>${rv.text}</p></div>`).join('');
  $('#settleCard').hidden = false;
  showBar('none');
}

// ---------- 초기화 ----------
async function init() {
  window.__chef = { get state() { return state; }, biz: null, engine, quiz, applyClassControl };
  try { await Promise.all([loadSprites(), loadPx()]); } catch (e) { console.error('에셋 로드 실패', e); }
  try { await document.fonts.load('12px Galmuri11'); } catch (e) { /* 폰트 없이도 동작 */ }
  initTitle();
  bindPanel();
  bindEdit();
  $$('#bbPrep [data-open]').forEach((b) => { b.onclick = () => openPanel(b.dataset.open); });
  $('#btnOpen').onclick = startBusiness;
  $('#btnRescue').onclick = doRescue;
  $('#btnCloseEarly').onclick = closeEarly;
  $('#btnNextDay').onclick = enterPrep;
  $('#btnHome').onclick = enterPrep;
  $('#stickerRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sticker]');
    if (!b || !visiting) return;
    const r = sendCheer(state, visiting, b.dataset.sticker);
    if (!r.ok) { toast(r.reason); return; }
    const st = stickerById(b.dataset.sticker);
    const me = scene.visitor || scene.chef;
    scene.float(me.x, me.y - 40, `${st.icon} ${st.text}`, '#ffd23f', null, true);
    scene.sparkle(me.x, me.y - 24, 8);
    setTimeout(() => scene?.visitorLeave(), 1200);
    sfx.play('perfect');
    toast(`${visiting.name}네 가게에 응원 스티커! 친구의 다음 영업 매출 +10% 📣`);
    renderVisitBar();
  });
  $('#btnLogout').onclick = async () => {
    if (scene?.mode === 'business') { toast('영업 중에는 나갈 수 없어요.'); return; }
    if (!(await confirmBox('로그아웃할까요?<br><small>가게는 자동 저장돼요.</small>'))) return;
    logout();
  };
  $('#btnHelp').onclick = () => { if (scene && !quiz.isOpen) scene.paused = true; $('#helpModal').hidden = false; };
  $('#helpModal [data-close]').onclick = () => {
    $('#helpModal').hidden = true;
    if (scene && !quiz.isOpen) { scene.paused = false; scene.last = performance.now(); }
  };
  const soundBtn = $('#btnSound');
  const syncSound = () => { soundBtn.textContent = settings.sound ? '🔊' : '🔇'; };
  syncSound();
  soundBtn.onclick = () => { settings.sound = !settings.sound; sfx.setEnabled(settings.sound); saveSettings(settings); syncSound(); };
  window.addEventListener('beforeunload', () => { if (state && scene?.mode !== 'business') saveShop(state); });
}

init();
