// 셰프 마스터 메인 컨트롤러: 화면 전환·준비 단계 UI·정산·저장
import {
  newShop, loadShop, saveShop, clearShop, loadSettings, saveSettings, ensureForecast, currentForecast,
  fridgeUsed, fridgeFree, buyIngredient, autoShop, upgradeFridge, buyItem, placeItem, pickupItem,
  branchMenus, cookableCount, anyCookable, menuPrice, isBankrupt, settleDay, decoBonus, tablesOf,
  INGREDIENTS, MENUS, BRANCHES, ITEMS, FRIDGE_LEVELS, RESCUE_BASE, RESCUE_PER_CORRECT, won,
} from './shop-engine.js';
import { QuizEngine } from './quiz-engine.js';
import { QuizUI } from './quiz-ui.js';
import { Business } from './business.js';
import { sfx } from './sfx.js';
import { isFirebaseEnabled } from './firebase-config.js';
import { loadSprites, spriteImg } from './sprites.js';
import { DISH_SPRITE, ING_SPRITE, ITEM_SPRITE } from './sprite-atlas.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let state = null;
let settings = loadSettings();
let biz = null;
let layoutSelected = null;
const engine = new QuizEngine();
const quiz = new QuizUI($('#quizModal'), engine, () => ({
  branch: state?.branch || 1,
  subjectRatio: classControl.subjectRatio || settings.subjectRatio,
}), sfx);

// 교사 실시간 통제 (3·4차에서 Firestore classes/{classCode} 구독으로 갱신)
const classControl = { isPaused: false, subjectRatio: null, maxBranchUnlocked: 4 };
export function applyClassControl(ctrl) {
  Object.assign(classControl, ctrl);
  $('#lockOverlay').hidden = !classControl.isPaused;
  if (biz) biz.locked = classControl.isPaused;
  quiz.locked = classControl.isPaused;
}

sfx.setEnabled(settings.sound);

// ---------- 공통 UI ----------
function showScreen(name) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  $('#hud').hidden = name === 'title';
}

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

function updateHud() {
  if (!state) return;
  const b = BRANCHES[state.branch];
  $('#hudBranchIcon').textContent = b.icon;
  $('#hudBranch').textContent = `${state.branch}호점 ${b.name}`;
  $('#hudOwner').textContent = `· ${state.name} 사장님`;
  $('#hudDay').textContent = state.day;
  $('#hudMoney').textContent = won(state.money);
  $('#hudRating').textContent = state.rating.toFixed(1);
  $('#hudPerfect').textContent = state.perfectCookCount;
}

function persist(label = '저장됨') {
  const ok = saveShop(state);
  const el = $('#hudSaved');
  el.textContent = ok ? `💾 ${label}` : '⚠️ 저장 실패';
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1200);
}

// ---------- 타이틀 ----------
function initTitle() {
  const saved = loadShop();
  $('#selRatio').value = settings.subjectRatio;
  if (saved) {
    $('#titleContinue').hidden = false;
    $('#titleNew').hidden = true;
    $('#btnShowNew').hidden = false;
    $('#continueInfo').textContent = `${saved.name} 사장님 · ${saved.branch}호점 · DAY ${saved.day} · ${won(saved.money)}`;
  }
  $('#btnContinue').onclick = () => { state = loadShop(); enterPrep(); };
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
    state = newShop(name);
    persist('새 가게');
    enterPrep();
    $('#helpModal').hidden = false;
  };
  $('#inpName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnNew').click(); });
  $('#selRatio').onchange = (e) => { settings.subjectRatio = e.target.value; saveSettings(settings); };
}

// ---------- 영업 준비 ----------
function enterPrep() {
  ensureForecast(state);
  saveShop(state);
  showScreen('prep');
  renderPrep();
}

function renderPrep() {
  updateHud();
  const f = currentForecast(state);
  $('#forecastCard').innerHTML = `
    <div class="fc-label">DAY ${state.day} 오늘의 예보</div>
    <div class="fc-main"><span class="fc-icon">${f.icon}</span><div><b>${f.name}</b><p>${f.desc}</p></div></div>`;

  $('#prepMenu').innerHTML = branchMenus(state).map((id) => {
    const m = MENUS[id];
    const p = menuPrice(state, id);
    const n = cookableCount(state, id);
    const needs = Object.entries(m.needs).map(([ing, k]) => `${spriteImg(ING_SPRITE[ing], 16)}${k > 1 ? `×${k}` : ''}`).join(' ');
    return `<div class="menu-row ${p > m.price ? 'bonus' : ''}">
      <span class="mi">${spriteImg(DISH_SPRITE[id], 30)}</span><span class="mn">${m.name}<small>${needs}</small></span>
      <b>${won(p)}</b><span class="cnt ${n ? '' : 'zero'}">${n}인분</span></div>`;
  }).join('');

  const bankrupt = isBankrupt(state);
  $('#rescueBox').hidden = !bankrupt;

  renderIngredients();
  renderLayout();
  renderKitchen();
}

function renderIngredients() {
  const used = fridgeUsed(state), cap = state.fridge.capacity;
  $('#fridgeBar').style.width = `${(used / cap) * 100}%`;
  $('#fridgeBar').className = used >= cap ? 'full' : '';
  $('#fridgeText').textContent = `${used}/${cap}칸`;
  const needed = new Set(branchMenus(state).flatMap((m) => Object.keys(MENUS[m].needs)));
  $('#ingList').innerHTML = Object.entries(INGREDIENTS).filter(([id]) => needed.has(id)).map(([id, ing]) => {
    const usedBy = branchMenus(state).filter((m) => MENUS[m].needs[id]).map((m) => spriteImg(DISH_SPRITE[m], 16)).join('');
    return `<div class="ing-row">
      <span class="ing-icon">${spriteImg(ING_SPRITE[id], 40)}</span>
      <span class="ing-name">${ing.name}<small>${usedBy} 에 사용</small></span>
      <span class="ing-price">${won(ing.price)}</span>
      <span class="ing-have">보유 <b>${state.fridge.items[id] || 0}</b></span>
      <span class="ing-btns">
        <button class="btn small" data-buy="${id}" data-q="1">+1</button>
        <button class="btn small" data-buy="${id}" data-q="5">+5</button>
      </span></div>`;
  }).join('');
}

function renderLayout() {
  const G = BRANCHES[state.branch].grid;
  const grid = $('#layoutGrid');
  grid.style.setProperty('--g', G);
  let html = '';
  for (let y = 0; y < G; y++) {
    for (let x = 0; x < G; x++) {
      const it = state.layout.find((l) => l.x === x && l.y === y);
      html += `<button class="lcell ${it ? ITEMS[it.type].kind : 'empty'}${(x + y) % 2 ? ' alt' : ''}" data-x="${x}" data-y="${y}">${it ? spriteImg(ITEM_SPRITE[it.type], ITEMS[it.type].kind === 'table' ? 44 : 48) : ''}</button>`;
    }
  }
  grid.innerHTML = html;

  $('#itemShop').innerHTML = Object.entries(ITEMS).map(([type, it]) => {
    const inv = state.inventory[type] || 0;
    const placed = state.layout.filter((l) => l.type === type).length;
    return `<div class="item-row ${layoutSelected === type ? 'selected' : ''}">
      <span class="item-icon">${spriteImg(ITEM_SPRITE[type], 40)}</span>
      <span class="item-name">${it.name}<small>${it.desc} · 배치 ${placed}</small></span>
      <button class="btn small ${inv ? 'primary' : 'disabled'}" data-select="${type}" ${inv ? '' : 'disabled'}>배치 (${inv})</button>
      <button class="btn small" data-buyitem="${type}">구매 ${won(it.price)}</button>
    </div>`;
  }).join('') + `<p class="small muted">테이블 ${tablesOf(state).length}개 · 인테리어 별점 보너스 +${decoBonus(state).toFixed(2)}</p>`;
}

function renderKitchen() {
  const lv = state.fridge.level;
  const next = FRIDGE_LEVELS[lv + 1];
  $('#kitchenPanel').innerHTML = `
    <div class="upgrade-card">
      <span class="up-icon">${spriteImg('fridge', 56)}</span>
      <div class="up-info"><b>냉장고 Lv.${lv + 1}</b><p>보관 칸 ${state.fridge.capacity}칸${next ? ` → 다음 단계 ${next.capacity}칸` : ' (최대)'}</p></div>
      ${next ? `<button class="btn primary" id="btnFridgeUp">업그레이드 ${won(next.price)}</button>` : '<span class="muted">MAX</span>'}
    </div>
    <p class="small muted">재료는 상하지 않아요. 냉장고가 클수록 하루에 더 많은 손님을 받을 수 있어요!</p>`;
  const b = $('#btnFridgeUp');
  if (b) b.onclick = () => {
    if (!upgradeFridge(state)) { toast('돈이 부족해요!'); return; }
    sfx.play('bell');
    toast(`냉장고가 ${state.fridge.capacity}칸으로 커졌어요!`);
    persist();
    renderPrep();
  };
}

function bindPrep() {
  $$('.tab').forEach((t) => t.addEventListener('click', () => {
    $$('.tab').forEach((x) => x.classList.toggle('active', x === t));
    $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === t.dataset.tab));
  }));

  $('#ingList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy]');
    if (!b) return;
    const id = b.dataset.buy, q = Number(b.dataset.q);
    if (fridgeFree(state) <= 0) { toast('냉장고가 꽉 찼어요! 🧊'); return; }
    if (state.money < INGREDIENTS[id].price) { toast('돈이 부족해요! 💸'); return; }
    const got = buyIngredient(state, id, q);
    if (got < q) toast(`${got}개만 샀어요 (냉장고/자금 부족)`);
    sfx.play('tap');
    renderPrep();
  });

  $('#btnAutoShop').onclick = () => {
    const n = autoShop(state);
    toast(n ? `🧺 재료 ${n}개를 골고루 샀어요!` : '더 살 수 없어요 (냉장고/자금 부족)');
    if (n) sfx.play('coin');
    renderPrep();
  };

  $('#itemShop').addEventListener('click', (e) => {
    const s = e.target.closest('[data-select]');
    const bi = e.target.closest('[data-buyitem]');
    if (s) { layoutSelected = layoutSelected === s.dataset.select ? null : s.dataset.select; renderLayout(); }
    if (bi) {
      const type = bi.dataset.buyitem;
      if (!buyItem(state, type)) { toast('돈이 부족해요! 💸'); return; }
      layoutSelected = type;
      sfx.play('coin');
      toast(`${ITEMS[type].name} 구매! 빈 칸을 눌러 배치하세요.`);
      persist();
      renderPrep();
    }
  });

  $('#layoutGrid').addEventListener('click', (e) => {
    const c = e.target.closest('.lcell');
    if (!c) return;
    const x = Number(c.dataset.x), y = Number(c.dataset.y);
    if (!c.classList.contains('empty')) {
      const type = pickupItem(state, x, y);
      layoutSelected = type;
      sfx.play('tap');
    } else if (layoutSelected && state.inventory[layoutSelected]) {
      placeItem(state, layoutSelected, x, y);
      if (!state.inventory[layoutSelected]) layoutSelected = null;
      sfx.play('tap');
    } else {
      toast('오른쪽에서 배치할 가구를 먼저 골라요!');
      return;
    }
    saveShop(state);
    renderLayout();
  });

  $('#btnOpen').onclick = startBusiness;
  $('#btnRescue').onclick = doRescue;
}

// ---------- 파산 구제: 비상 설거지 알바 ----------
function doRescue() {
  quiz.open({
    title: '🧽 비상 설거지 알바',
    resultButton: '알바비 받기 💵',
    resultHtml: (c) => `<div class="grade"><div class="stars">🧽✨</div><div class="gname">설거지 완료!</div>
      <div class="gmsg">${c}/3 정답 · 알바비 <b>${won(RESCUE_BASE + c * RESCUE_PER_CORRECT)}</b></div></div>`,
    onDone: (c) => {
      const pay = RESCUE_BASE + c * RESCUE_PER_CORRECT;
      state.money += pay;
      sfx.play('coin');
      toast(`알바비 ${won(pay)}을 받았어요! 다시 힘내요 💪`);
      persist();
      renderPrep();
    },
  });
}

// ---------- 영업 ----------
async function startBusiness() {
  if (!tablesOf(state).length) { toast('테이블을 1개 이상 배치해야 영업할 수 있어요!'); return; }
  if (!anyCookable(state)) { toast('만들 수 있는 메뉴가 없어요! 식재료를 먼저 사요 🛒'); return; }
  const total = branchMenus(state).reduce((s, m) => s + cookableCount(state, m), 0);
  if (total < 4 && fridgeFree(state) > 2 && !(await confirmBox(`재료가 ${total}인분밖에 없어요.<br>그래도 영업을 시작할까요?`))) return;

  persist();
  showScreen('biz');
  $('#bizDayLabel').textContent = `DAY ${state.day} 영업 중 · ${BRANCHES[state.branch].name}`;
  $('#bizLog').innerHTML = '';
  $('#bizBanner').hidden = true;
  sfx.play('bell');
  biz = new Business({
    state,
    canvas: $('#hallCanvas'),
    side: {
      clock: $('#bizClock'), timeBar: $('#bizTimeBar'), revenue: $('#bizRevenue'), served: $('#bizServed'),
      perfect: $('#bizPerfect'), stock: $('#bizStock'), menu: $('#bizMenu'), log: $('#bizLog'), banner: $('#bizBanner'),
    },
    openQuiz: (o, cb) => quiz.open({ title: o.title, engBoost: o.engBoost, onDone: cb }),
    onEnd: endBusiness,
    onMoney: () => { $('#hudMoney').textContent = won(state.money); },
    toast,
    sfx,
  });
  biz.locked = classControl.isPaused;
}

async function closeEarly() {
  if (!biz || biz.paused) return;
  biz.paused = true;
  const ok = await confirmBox('오늘 영업을 지금 마감할까요?<br><small>대기 중인 손님은 돌아가요.</small>');
  biz.paused = false;
  biz.last = performance.now();
  if (ok) biz.closeEarly();
}

function endBusiness(stats) {
  sfx.play('bell');
  toast('🔔 영업 종료!');
  setTimeout(() => showSettlement(stats), 900);
}

// ---------- 정산 ----------
function showSettlement(stats) {
  biz = null;
  const r = settleDay(state, stats);
  persist('자동 저장 완료');
  updateHud();
  showScreen('settle');
  const acc = stats.quizTotal ? Math.round((stats.quizCorrect / stats.quizTotal) * 100) : 0;
  const diff = r.newRating - r.oldRating;
  $('#receipt').innerHTML = `
    <h2>🧾 DAY ${r.day} 일일 결산표</h2>
    <table class="ledger">
      <tr><td>총 매출</td><td class="plus">+${won(r.revenue)}</td></tr>
      <tr><td>팁 💝</td><td class="plus">+${won(r.tips)}</td></tr>
      <tr><td>재료비·구매비</td><td class="minus">−${won(r.expense)}</td></tr>
      <tr><td>종업원 일당</td><td class="minus">−${won(r.wages)}</td></tr>
      <tr class="total"><td>순수익</td><td class="${r.net >= 0 ? 'plus' : 'minus'}">${r.net >= 0 ? '+' : '−'}${won(Math.abs(r.net))}</td></tr>
    </table>
    <div class="settle-grid">
      <div><span>받은 손님</span><b>${stats.served}명</b></div>
      <div><span>★★★ 특상급</span><b class="g3">${stats.grades[3]}</b></div>
      <div><span>★★ 보통</span><b class="g2">${stats.grades[2]}</b></div>
      <div><span>★ 탄 요리</span><b class="g1">${stats.grades[1]}</b></div>
      <div><span>놓친 손님</span><b>${stats.lost}명</b></div>
      <div><span>진상 처리</span><b>${stats.rowdyHandled}/${stats.rowdyHandled + stats.rowdyIgnored}</b></div>
      <div><span>치운 테이블</span><b>${stats.trashCleaned}</b></div>
      <div><span>오늘 정답률</span><b>${acc}%</b></div>
    </div>
    <div class="rating-change">가게 별점 <b>${r.oldRating.toFixed(2)}</b> → <b class="${diff >= 0 ? 'up' : 'down'}">${r.newRating.toFixed(2)} ${diff >= 0 ? '▲' : '▼'}</b></div>
    <div class="money-now">현재 보유 자금 <b>${won(state.money)}</b></div>`;
  $('#reviewList').innerHTML = r.reviews.map((rv) => `
    <div class="review">
      <div class="rv-head"><b>${rv.who}</b><span class="rv-stars">${'★'.repeat(rv.stars)}${'☆'.repeat(5 - rv.stars)}</span></div>
      <p>${rv.text}</p>
    </div>`).join('');
}

// ---------- 초기화 ----------
async function init() {
  try { await loadSprites(); } catch (e) { console.error('스프라이트 로드 실패', e); }
  initTitle();
  bindPrep();
  $('#btnCloseEarly').onclick = closeEarly;
  $('#btnNextDay').onclick = enterPrep;
  $('#btnHelp').onclick = () => {
    if (biz && !quiz.isOpen) biz.paused = true;
    $('#helpModal').hidden = false;
  };
  $('#helpModal [data-close]').onclick = () => {
    $('#helpModal').hidden = true;
    if (biz && !quiz.isOpen) { biz.paused = false; biz.last = performance.now(); }
  };
  const soundBtn = $('#btnSound');
  const syncSound = () => { soundBtn.textContent = settings.sound ? '🔊' : '🔇'; };
  syncSound();
  soundBtn.onclick = () => { settings.sound = !settings.sound; sfx.setEnabled(settings.sound); saveSettings(settings); syncSound(); };
  window.addEventListener('beforeunload', () => { if (state && !biz) saveShop(state); });
  if (isFirebaseEnabled()) console.info('[ChefMaster] Firebase 설정 감지 — 3차 업데이트에서 연동됩니다.');

  // 개발·테스트용 핸들 (콘솔에서 확인)
  window.__chef = { get state() { return state; }, get biz() { return biz; }, engine, quiz, applyClassControl };
}

init();
