// 셰프 마스터 메인 컨트롤러 — 한 화면(가게 씬) 위에서 모든 것을 처리
// 준비: 하단 바 [재료][고용][배치][주방][영업 시작] → 가벼운 팝업 패널 / 배치는 가게 바닥을 직접 눌러서
// 영업: 하단 바가 시간·매출 바로 바뀜 → 마감하면 정산 카드가 가게 위에 뜸
import {
  newShop, loadShop, saveShop, clearShop, loadSettings, saveSettings, ensureForecast, currentForecast,
  fridgeUsed, fridgeFree, buyIngredient, autoShop, upgradeFridge, buyItem, placeItem, pickupItem,
  branchMenus, cookableCount, anyCookable, menuPrice, isBankrupt, settleDay, decoBonus, tablesOf,
  INGREDIENTS, MENUS, ITEMS, FRIDGE_LEVELS, RESCUE_BASE, RESCUE_PER_CORRECT, won,
  hireStaff, fireStaff, staffOf, totalWages,
} from './shop-engine.js';
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
  $('#forecastChip').innerHTML = `<span class="fc-ico">${f.icon}</span><span><b>${f.name}</b><small>${f.desc}</small></span>`;
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
    },
  });
  scene.locked = classControl.isPaused;
  window.__chef.biz = scene;
}

// ---------- 타이틀 ----------
function initTitle() {
  const saved = loadShop();
  $('#selRatio').value = settings.subjectRatio;
  if (saved) {
    $('#titleContinue').hidden = false;
    $('#titleNew').hidden = true;
    $('#btnShowNew').hidden = false;
    $('#continueInfo').textContent = `${saved.name} 사장님 · DAY ${saved.day} · ${won(saved.money)}`;
  }
  // 타이틀 뒤에도 가게가 보이도록 미리보기
  const preview = saved || newShop('');
  ensureForecast(preview);
  makeScene(preview);

  $$('.chef-opt').forEach((b) => {
    b.innerHTML = `${pxImg(`${b.dataset.look}_front`, 3)}<span>${b.dataset.look === 'chef_m' ? '남자 셰프' : '여자 셰프'}</span>`;
    b.onclick = () => { chefLook = b.dataset.look; $$('.chef-opt').forEach((x) => x.classList.toggle('selected', x === b)); };
  });
  $('#btnContinue').onclick = () => startGame(loadShop());
  $('#btnShowNew').onclick = async () => {
    if (!(await confirmBox('지금까지의 가게 기록이 <b>모두 사라져요</b>.<br>정말 새로 시작할까요?'))) return;
    $('#titleContinue').hidden = true;
    $('#titleNew').hidden = false;
    $('#btnShowNew').hidden = true;
  };
  $('#btnNew').onclick = () => {
    const name = $('#inpName').value.trim();
    if (!name) { toast('사장님 이름을 입력해 주세요!'); $('#inpName').focus(); return; }
    clearShop();
    engine.reset();
    const s = newShop(name);
    s.chefLook = chefLook;
    saveShop(s);
    startGame(s);
    $('#helpModal').hidden = false;
  };
  $('#inpName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnNew').click(); });
  $('#selRatio').onchange = (e) => { settings.subjectRatio = e.target.value; saveSettings(settings); };
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
  ensureForecast(state);
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
}

function refreshPrep() {
  updateHud();
  $('#btnRescue').hidden = !isBankrupt(state);
  if (panelKind) renderPanel();
}

// ---------- 팝업 패널 ----------
const PANEL_TITLES = { ing: '🛒 식재료 구매', staff: '👥 종업원 고용', kitchen: '🧊 주방 설비' };

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
      <span class="ing-have">${state.fridge.items[id] || 0}</span>
      <button class="px-btn tiny" data-buy="${id}" data-q="1">+1</button>
      <button class="px-btn tiny" data-buy="${id}" data-q="5">+5</button>
    </div>`).join('');
  return `
    <div class="fridge-head">
      <span>🧊 냉장고</span>
      <div class="meter"><i style="width:${(used / cap) * 100}%" class="${used >= cap ? 'full' : ''}"></i></div>
      <b>${used}/${cap}</b>
      <button class="px-btn small go" data-auto>🧺 자동 장보기</button>
    </div>
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
  return `<div class="upgrade-card">${pxImg('fridge', 2)}
      <div><b>냉장고 Lv.${lv + 1}</b><p>보관 ${state.fridge.capacity}칸${next ? ` → 다음 ${next.capacity}칸` : ' (최대)'}</p></div>
      ${next ? `<button class="px-btn go" data-fridge>업그레이드 ${won(next.price)}</button>` : '<span class="muted">MAX</span>'}
    </div>
    <p class="small muted">재료는 상하지 않아요. 냉장고가 클수록 하루에 더 많은 손님을 받을 수 있어요.</p>`;
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
    if (e.target.closest('[data-auto]')) {
      const n = autoShop(state);
      toast(n ? `🧺 재료 ${n}개를 골고루 샀어요!` : '더 살 수 없어요 (냉장고/자금 부족)');
      if (n) sfx.play('coin');
      persist(); refreshPrep();
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
  }).join('') + `<span class="tray-info">테이블 ${tablesOf(state).length} · 별점 +${decoBonus(state).toFixed(2)}</span>`;
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
  if (!anyCookable(state)) { toast('만들 수 있는 메뉴가 없어요! 🛒 재료를 먼저 사요'); openPanel('ing'); return; }
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
    <div class="review"><div class="rv-head"><b>${rv.who}</b><span class="rv-stars">${'★'.repeat(rv.stars)}${'☆'.repeat(5 - rv.stars)}</span></div><p>${rv.text}</p></div>`).join('');
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
