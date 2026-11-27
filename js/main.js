// 셰프 마스터 메인 컨트롤러 — 한 화면(가게 씬) 위에서 모든 것을 처리
// 준비: 하단 바 [재료][고용][배치][주방][영업 시작] → 가벼운 팝업 패널 / 배치는 가게 바닥을 직접 눌러서
// 영업: 하단 바가 시간·매출 바로 바뀜 → 마감하면 정산 카드가 가게 위에 뜸
import {
  newShop, loadShop, saveShop, clearShop, loadSettings, saveSettings, ensureForecast, currentForecast,
  fridgeUsed, fridgeFree, buyIngredient, autoShop, upgradeFridge, buyItem, placeItem, pickupItem,
  branchMenus, cookableCount, anyCookable, menuPrice, isBankrupt, settleDay, decoBonus, tablesOf,
  INGREDIENTS, MENUS, ITEMS, FRIDGE_LEVELS, RESCUE_BASE, RESCUE_PER_CORRECT, won,
  hireStaff, fireStaff, staffOf, totalWages, sellIngredient, clearFridge, missingHint, setSaveScope,
  expandShop, nextShopLevel, buffSummary,
} from './shop-engine.js?v=20261127013038';
import { SHOP_LEVELS, gridOf } from './shop-levels.js?v=20261127013038';
import { tryLogin, createAccount, lastLogin, hash, accountId, rememberServerAccount } from './account.js?v=20261127013038';
import { liveKickGuest, liveClassControl, serverClosed, initLive, liveLogin, liveLogout, liveMode, liveSceneReady, liveVisitStart, liveVisitSticker, liveVisitEnd, isOnline, presenceOf } from './live.js?v=20261127013038';
import { ERAS, eraOf, eraById, dexListOf, dexReward, MODERN_NAMES } from './data-eras.js?v=20261127013038';
import { ensureEra, isUnlocked, eraReq, checkUnlocks, travel, dexProgress, claimDex } from './era-engine.js?v=20261127013038';
import { registerEraArt, ERA_PEOPLE } from './era-art.js?v=20261127013038';
import { initTitleBg, showTitleBg, dimTitleBg } from './title-bg.js?v=20261127013038';
import { initCloud, cloudOn, cloudGetShop, cloudSaveShop, cloudRefreshClass, cloudWatchClass } from './cloud.js?v=20261127013038';
import { syncGuestbook, STICKERS, stickerById, listClassmates, cheersLeftToday, cheeredToday, sendCheer, guestbookOf, pullIncomingCheers, ranking, RANKINGS, isDemo, CHEERS_PER_DAY } from './social-engine.js?v=20261127013038';
import { STAFF_ROLES, STAFF_ORDER, speedStars } from './data-staff.js?v=20261127013038';
import { QuizEngine } from './quiz-engine.js?v=20261127013038';
import { QuizUI } from './quiz-ui.js?v=20261127013038';
import { Business } from './business.js?v=20261127013038';
import { sfx } from './sfx.js?v=20261127013038';
import { loadSprites, spriteImg } from './sprites.js?v=20261127013038';
import { ING_SPRITE } from './sprite-atlas.js?v=20261127013038';
import { loadPx, pxImg, DISH_PX, ITEM_PX } from './px.js?v=20261127013038';
import { CHEF_PARTS, CHEF_PART_LABEL, defaultChefStyle, randomChefStyle, registerChef, chefSheetOf } from './chef-maker.js?v=20261127013038';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let state = null;
let scene = null;
let settings = loadSettings();
let panelKind = null;
let layoutSelected = null;
let chefLook = 'chef_m';
let chefStyle = defaultChefStyle();
let editStyle = null;
let pendingLogin = null;
let visiting = null;
let visitTasted = false;
let rankKind = 'rich';
const classControl = { isPaused: false, subjectRatio: null, mathTerm: null, maxBranchUnlocked: 4 };
const engine = new QuizEngine();
const quiz = new QuizUI($('#quizModal'), engine, () => ({
  branch: state?.branch || 1,
  day: state?.day || 1,
  term: classControl.mathTerm || settings.mathTerm || 'ALL',
  subjectRatio: classControl.subjectRatio || settings.subjectRatio,
}), sfx);
sfx.setEnabled(settings.sound);

// 교사 실시간 통제 (3·4차에서 Firestore 구독으로 갱신)
export function applyClassControl(ctrl) {
  Object.assign(classControl, ctrl);
  $('#lockOverlay').hidden = !classControl.isPaused;
  if (scene) scene.locked = classControl.isPaused;
  quiz.locked = classControl.isPaused;
  liveClassControl(classControl);
}

// 처음 화면 (그림 + 로고 + 게임 시작)
function showSplash() {
  $('#titleCard').hidden = true;
  $('#titleSplash').hidden = false;
  dimTitleBg(false);
  showTitleBg(true);
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
  const era = eraOf(state);
  $('#forecastChip').innerHTML = `<span class="fc-ico">${f.icon}</span><span><b>${era.id !== 'modern' ? `${era.icon} ${era.short} · ` : ''}${f.name}</b><small>${f.desc}</small>${promo}</span>`;
}

let myCodeHash = null;
let unwatchClass = () => {};
function persist(now = false) { try { state.quizStats = engine.summary(); } catch (e) { /* ignore */ } saveShop(state); cloudSaveShop(state, myCodeHash, now); }

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
      onGuestTap: (c) => kickFriend(c),
      onSelfKicked: () => afterKicked(),
      onTasted: () => { visitTasted = true; if (visiting) { renderVisitBar(); toast('시식 완료! 응원 스티커를 남겨요 💌'); } },
    },
  });
  scene.locked = classControl.isPaused;
  window.__chef.biz = scene;
  if (state) liveSceneReady();
}

// ---------- 타이틀 ----------
function initTitle() {
  $('#selRatio').value = settings.subjectRatio;
  $('#selBan').innerHTML = Array.from({ length: 4 }, (_, i) => `<option value="${i + 1}">${i + 1}반</option>`).join('');
  $('#selNo').innerHTML = Array.from({ length: 25 }, (_, i) => `<option value="${i + 1}">${i + 1}번</option>`).join('');
  const last = lastLogin();
  if (last) { $('#selBan').value = last.ban; $('#selNo').value = last.no; $('#inpName').value = last.name; }

  // 로그인 화면 뒤에도 가게가 보이도록 미리보기
  const preview = newShop('');
  ensureForecast(preview);
  makeScene(preview);

  chefStyle = randomChefStyle();
  bindCustomizer($('#chefCustomNew'), () => chefStyle, (s) => { chefStyle = s; });
  const form = () => ({ ban: $('#selBan').value, no: $('#selNo').value, name: $('#inpName').value.trim(), code: $('#inpCode').value.trim() });
  $('#btnLogin').onclick = async () => {
    const f = form();
    if (serverClosed()) { toast('지금은 선생님이 게임 문을 닫았어요. 🔒'); return; }
    // 서버 모드: 서버에 있는 가게로 확인 (다른 기기에서 만든 계정도 로그인)
    if (cloudOn() && f.name && /^\d{4}$/.test(f.code)) {
      try {
        const remote = await cloudGetShop(accountId(f.ban, f.no));
        if (remote) {
          if (remote.name !== f.name) { toast(`${f.ban}반 ${f.no}번은 다른 이름으로 등록돼 있어요.`); sfx.play('wrong'); return; }
          if (remote.codeHash && remote.codeHash !== hash(f.code)) { toast('코드가 달라요. 다시 입력해 주세요.'); sfx.play('wrong'); return; }
          rememberServerAccount({ ...f, codeHash: hash(f.code) });
          myCodeHash = hash(f.code);
          const id = accountId(f.ban, f.no);
          setSaveScope(id);
          delete remote.codeHash;
          saveShop({ ...remote, version: 1 });
          enterAccount(id, f);
          return;
        }
      } catch (e) { console.warn('[cloud] 로그인 확인 실패, 이 기기 기록으로 진행', e); }
    }
    const r = tryLogin(f);
    if (!r.ok) { toast(r.reason); sfx.play('wrong'); return; }
    if (r.isNew) {
      pendingLogin = { ...f, id: r.id };
      $('#newShopWho').textContent = `${f.ban}반 ${f.no}번 ${f.name},`;
      $('#loginForm').hidden = true;
      $('#newShopStep').hidden = false;
      $('#titleCard').classList.add('wide-custom');
      renderCustomizer($('#chefCustomNew'), chefStyle);
      return;
    }
    myCodeHash = hash(f.code);
    enterAccount(r.id, f);
  };
  $('#btnBack').onclick = () => { pendingLogin = null; $('#loginForm').hidden = false; $('#newShopStep').hidden = true; $('#titleCard').classList.remove('wide-custom'); };
  $('#btnNew').onclick = () => {
    if (!pendingLogin) return;
    const id = createAccount(pendingLogin);
    myCodeHash = hash(pendingLogin.code);
    enterAccount(id, pendingLogin, true);
    $('#helpModal').hidden = false;
  };
  for (const id of ['#inpName', '#inpCode']) $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btnLogin').click(); });
  $('#selRatio').onchange = (e) => { settings.subjectRatio = e.target.value; saveSettings(settings); };
  $('#selTerm').value = settings.mathTerm || 'ALL';
  $('#selTerm').onchange = (e) => { settings.mathTerm = e.target.value; saveSettings(settings); };
}

function enterAccount(id, f, isNew = false) {
  setSaveScope(id);
  engine.useScope(id);
  let s = loadShop();
  if (!s) { s = newShop(f.name); s.chefStyle = { ...chefStyle }; }
  Object.assign(s, { accountId: id, ban: Number(f.ban), no: Number(f.no), name: f.name });
  saveShop(s);
  cloudSaveShop(s, myCodeHash, true);
  unwatchClass();
  unwatchClass = cloudWatchClass(s.ban, applyClassControl);
  startGame(s);
  liveLogin(s);
  if (!isNew) toast(`${f.name} 사장님, 어서 오세요! 🍜`);
}

// 로그아웃: 새로고침 없이 로그인 화면으로 (claude.ai 페이지 안에서는 새로고침이 막힐 수 있음)
function logout() {
  if (state) persist(true);
  liveLogout();
  unwatchClass(); unwatchClass = () => {};
  myCodeHash = null;
  sfx.bgm(null);
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
  showSplash();
  setSaveScope('');
  engine.useScope('');
  const preview = newShop('');
  ensureForecast(preview);
  makeScene(preview);
  toast('로그아웃했어요. 가게는 저장돼 있어요! 👋');
  $('#inpCode').focus();
}

function startGame(s) {
  showTitleBg(false);
  $('#titleSplash').hidden = true;
  state = s;
  ensureEra(state);
  $('#titleCard').hidden = true;
  $('#hudTL').hidden = false;
  $('#hudTR').hidden = false;
  $('#bottomBar').hidden = false;
  enterPrep();
}

// ---------- 준비 ----------
function enterPrep() {
  if (visiting) liveVisitEnd();
  visiting = null;
  liveMode('prep');
  sfx.bgm('prep');
  ensureForecast(state);
  const me = state;
  const takeCheers = () => {
    if (state !== me) return;
    const fresh = pullIncomingCheers(state);
    for (const e of fresh) { const st = stickerById(e.sticker); feed(`💌 ${e.from}: ${st.icon} ${st.text}`); }
    if (fresh.length) { toast(`친구 응원 ${fresh.length}개 도착! 오늘 매출 +${Math.round(state.promo * 100)}% 📣`); updateHud(); persist(); }
  };
  if (cloudOn()) syncGuestbook(state.accountId).then(takeCheers).catch(() => {});
  else takeCheers();
  saveShop(state);
  $('#settleCard').hidden = true;
  makeScene(state);
  showBar('prep');
  updateHud('준비');
  refreshPrep();
  announceUnlocks();
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
const PANEL_TITLES = { chef: '🎨 셰프 꾸미기', ing: '🛒 식재료 구매', staff: '👥 종업원 고용', kitchen: '🧊 주방 설비', expand: '🏗️ 가게 확장', era: '🌏 시간여행', friends: '🏘️ 친구 가게', rank: '🏆 학급 랭킹' };

function openPanel(kind) {
  if (kind === 'layout') { closePanel(); startEdit(); return; }
  if (panelKind === kind) { closePanel(); return; }
  panelKind = kind;
  $$('#bbPrep [data-open]').forEach((b) => b.classList.toggle('active', b.dataset.open === kind));
  $('#panel').hidden = false;
  $('#panel').style.bottom = `${$('#bottomBar').offsetHeight + 14}px`;
  $('#panelTitle').textContent = PANEL_TITLES[kind];
  if (kind === 'era') document.querySelector('[data-open="era"]')?.classList.remove('new');
  renderPanel();
  // 서버 모드: 친구·랭킹은 열 때마다 반 목록을 새로 받아 다시 그림
  if (cloudOn() && (kind === 'friends' || kind === 'rank')) {
    cloudRefreshClass(state.ban).then(() => { if (panelKind === kind) renderPanel(); }).catch(() => toast('친구 목록을 못 불러왔어요. 인터넷을 확인해 주세요.'));
  }
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
  if (panelKind === 'expand') body.innerHTML = expandHtml();
  if (panelKind === 'era') body.innerHTML = eraHtml();
  if (panelKind === 'chef') {
    body.innerHTML = '<div class="chef-custom" id="chefCustomEdit"></div><div class="row-end"><button class="px-btn small" data-chef-cancel>취소</button><button class="px-btn small go" data-chef-save>저장하기</button></div>';
    renderCustomizer($('#chefCustomEdit'), editStyle);
  }
  if (panelKind === 'friends') body.innerHTML = friendsHtml();
  if (panelKind === 'rank') body.innerHTML = rankHtml();
}

// ---------- 셰프 꾸미기 ----------
function renderCustomizer(root, s) {
  const key = registerChef(s);
  const sw = (part, i, col) => `<button class="sw ${s[part] === i ? 'on' : ''}" data-part="${part}" data-v="${i}" style="background:${col}" title="${CHEF_PART_LABEL[part]}"></button>`;
  const step = (part) => `<div class="cc-row"><span class="cc-lb">${CHEF_PART_LABEL[part]}</span>
      <button class="px-btn tiny" data-part="${part}" data-d="-1">◀</button><b class="cc-val">${CHEF_PARTS[part][s[part]]}</b><button class="px-btn tiny" data-part="${part}" data-d="1">▶</button></div>`;
  const swRow = (part) => `<div class="cc-row"><span class="cc-lb">${CHEF_PART_LABEL[part]}</span><span class="sws">${CHEF_PARTS[part].map((c, i) => sw(part, i, c)).join('')}</span></div>`;
  root.innerHTML = `
    <div class="cc-preview">${['front', 'right', 'back'].map((d) => pxImg(`${key}_${d}`, 5)).join('')}</div>
    <div class="cc-opts">
      ${step('hair')}${swRow('hairColor')}${swRow('skin')}${step('eyes')}${step('mouth')}${step('glasses')}${step('blush')}${swRow('apron')}
      <button class="px-btn small" data-random>🎲 랜덤</button>
    </div>`;
}

function customizerClick(b, cur) {
  const s = { ...cur };
  if (b.dataset.random !== undefined) Object.assign(s, randomChefStyle());
  else {
    const part = b.dataset.part, n = CHEF_PARTS[part].length;
    if (b.dataset.v !== undefined) s[part] = Number(b.dataset.v);
    else s[part] = (s[part] + Number(b.dataset.d) + n) % n;
  }
  sfx.play('tap');
  return s;
}

function bindCustomizer(root, get, set) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-part],[data-random]');
    if (!b) return;
    const s = customizerClick(b, get());
    set(s);
    renderCustomizer(root, s);
  });
}

// ---------- 👟 친구 내쫓기 ----------
const KICK_SEC = 5;   // 쫓겨나면 이 시간 동안 그 가게에 못 감
const banKey = () => `chefmaster_kickban_v1:${state?.accountId || ''}`;
const loadBans = () => { try { return JSON.parse(localStorage.getItem(banKey())) || {}; } catch (e) { return {}; } };
const banLeft = (id) => Math.max(0, (loadBans()[id] || 0) - Date.now());
async function kickFriend(c) {
  if (!(await confirmBox(`<b>${c.visitorName}</b>을(를) 가게 밖으로 내쫓을까요? 👟<br><small>잡아서 문밖으로 뻥! ${KICK_SEC}초 동안 다시 못 와요.</small>`))) return;
  if (!scene?.kickGuest(c)) return;
  liveKickGuest(c.guestId);
  toast(`👟 ${c.visitorName} 내쫓는 중!`);
}
let kickedFrom = null;
function kickedByFriend() {
  if (!visiting || kickedFrom) return;
  kickedFrom = visiting;
  const v = scene?.visitor;
  toast(`😵 ${visiting.name} 사장님이 나를 내쫓으려 해요!`);
  if (!v || !scene.kickGuest(v)) afterKicked();
  setTimeout(() => { if (kickedFrom) afterKicked(); }, 9000);   // 혹시 애니메이션이 끝나지 않아도 집으로
}
function afterKicked() {
  const f = kickedFrom || visiting;
  kickedFrom = null;
  if (!f || !state) return;
  const bans = loadBans(); bans[f.id] = Date.now() + KICK_SEC * 1000;
  try { localStorage.setItem(banKey(), JSON.stringify(bans)); } catch (e) { /* ignore */ }
  enterPrep();
  toast(`😵 ${f.name}네 가게에서 쫓겨났어요! ${KICK_SEC}초 뒤에 다시 갈 수 있어요.`);
}

// ---------- 친구 가게 ----------
function friendsHtml() {
  const left = cheersLeftToday(state);
  const mine = guestbookOf(state.accountId);
  const book = mine.length ? mine.map((e) => { const st = stickerById(e.sticker); return `<span class="gb-chip">${st.icon} <b>${e.from}</b> ${st.text}</span>`; }).join('')
    : '<span class="muted small">아직 받은 응원이 없어요. 친구 가게에 먼저 놀러 가 봐요!</span>';
  const friends = listClassmates(state).map((f) => `
    <div class="friend-card">
      ${pxImg(`${chefSheetOf(f)}_front`, 2)}
      <div class="fr-info"><b>${isOnline(f.id) ? '<i class="online-dot"></i>' : ''}${f.name}</b>${f.demo ? ' <span class="tag">체험</span>' : ''}${isOnline(f.id) ? `<span class="f-status">${{ biz: '🔥 영업 중', prep: '🧺 준비 중', visit: '🚶 놀러 나감' }[presenceOf(f.id)?.mode] || '접속 중'}</span>` : ''}<small>DAY ${f.day} · ★ ${(f.rating || 0).toFixed(1)} · 완벽 ${f.perfectCookCount || 0}</small></div>
      ${cheeredToday(state, f.id) ? '<span class="done">💌 응원함</span>' : ''}
      ${banLeft(f.id) ? `<span class="muted small">🚫 ${Math.ceil(banLeft(f.id) / 1000)}초</span>` : `<button class="px-btn tiny go" data-visit="${f.id}">놀러가기</button>`}
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
      ${pxImg(`${chefSheetOf(r)}_front`, 1)}
      <span class="rn">${r.name}${r.isMe ? ' (나)' : ''}${r.demo ? ' <span class="tag">체험</span>' : ''}</span>
      <b class="rv">${r.label}</b>
    </div>`).join('');
  return `<div class="rank-tabs">${tabs}</div><p class="small muted">${RANKINGS[rankKind].desc}</p><div class="rank-list">${rows}</div>`;
}

function visitFriend(id) {
  const f = listClassmates(state).find((x) => x.id === id);
  if (!f) return;
  const left = banLeft(f.id);
  if (left) { toast(`🚫 ${f.name}네 가게에서 쫓겨났어요. ${Math.ceil(left / 1000)}초 뒤에 갈 수 있어요.`); return; }
  closePanel();
  visiting = f;
  makeScene({ ...f, forecast: { id: 'sunny', day: f.day }, fridge: f.fridge || { level: 0, capacity: 20, items: {} }, inventory: f.inventory || {}, today: { expense: 0 } });
  visitTasted = false;
  if (cloudOn()) syncGuestbook(f.id).then(() => { if (visiting === f) renderVisitBar(); }).catch(() => {});
  liveVisitStart(f);
  scene.startVisit({ name: state.name, sheet: chefSheetOf(state) });
  liveSceneReady();
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
  const on = isOnline(f.id);
  $('#visitWho').innerHTML = `<span>🏠 <b>${f.name}</b>네 가게${on ? ' <i class="online-dot"></i><small class="f-status">사장님 접속 중</small>' : ''}</span><small>★ ${(f.rating || 0).toFixed(1)} · DAY ${f.day}${book ? ` · 방명록 ${book}` : ''}</small>`;
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
      ${pxImg(`ing_${id}`, 1)}
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
  let html = `<div class="staff-summary">${pxImg(`${chefSheetOf(state)}_front`, 2)}<button class="px-btn tiny go" data-open-chef>🎨 셰프 꾸미기</button>
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

function expandHtml() {
  const cur = SHOP_LEVELS[state.shopLevel ?? 0];
  const nx = nextShopLevel(state);
  const g = gridOf(state);
  const steps = SHOP_LEVELS.map((L, i) => {
    const now = i === (state.shopLevel ?? 0), done = i < (state.shopLevel ?? 0);
    return `<div class="exp-step ${now ? 'now' : done ? 'done' : ''}"><b>${now ? '📍 ' : done ? '✅ ' : ''}${L.name}</b><small>자리 ${L.cols * L.rows}칸${L.price ? ` · ${won(L.price)}` : ''}</small></div>`;
  }).join('<span class="exp-arrow">▶</span>');
  return `<div class="exp-steps">${steps}</div>
    <div class="upgrade-card expand">
      <span class="up-ico">🏗️</span>
      <div><b>${cur.name}</b> <span class="muted small">(가구 자리 ${g.cols * g.rows}칸)</span>
        <p>${nx ? `다음: <b>${nx.name}</b> — 가게가 넓어지고 자리가 ${nx.cols * nx.rows}칸으로 늘어나요.` : '가장 넓은 가게예요!'}</p></div>
      ${nx ? `<button class="px-btn ${state.money >= nx.price ? 'go' : 'off'}" data-expand>확장 ${won(nx.price)}</button>` : '<span class="muted">MAX</span>'}
    </div>
    <p class="small muted">💡 자리에는 테이블도, 💎 사치품도 놓을 수 있어요. 자리가 많을수록 손님도 버프도 늘어나요! (🪑 배치에서 놓기)</p>`;
}

function kitchenHtml() {
  const lv = state.fridge.level;
  const next = FRIDGE_LEVELS[lv + 1];
  return `<div class="upgrade-card">${pxImg('fridge', 2)}
      <div><b>냉장고 Lv.${lv + 1}</b><p>보관 ${state.fridge.capacity}칸${next ? ` → 다음 ${next.capacity}칸` : ' (최대)'}</p></div>
      ${next ? `<button class="px-btn go" data-fridge>업그레이드 ${won(next.price)}</button>` : '<span class="muted">MAX</span>'}
    </div>
    <p class="small muted">재료는 상하지 않아요. 냉장고가 클수록 하루에 더 많은 손님을 받을 수 있어요.</p>
    <div class="danger-zone"><span class="small muted">가게를 DAY 1부터 다시 시작하고 싶다면</span>
      <button class="px-btn tiny" data-reset>처음부터 다시</button></div>`;
}

// ---------- 시간여행 ----------
let eraTab = 'places';
const personName = (sheet) => (sheet.startsWith('era_') ? ERA_PEOPLE[sheet.slice(4)]?.name : MODERN_NAMES[sheet]) || '손님';
function eraHtml() {
  ensureEra(state);
  const tabs = `<div class="rank-tabs"><button class="px-btn small ${eraTab === 'places' ? 'active' : ''}" data-eratab="places">🗺️ 장소</button><button class="px-btn small ${eraTab === 'dex' ? 'active' : ''}" data-eratab="dex">📖 손님 도감</button></div>`;
  if (eraTab === 'dex') return tabs + dexHtml();
  const cards = ERAS.map((e, i) => {
    const open = isUnlocked(state, e.id), here = state.era === e.id;
    const prevOpen = i === 0 || isUnlocked(state, ERAS[i - 1].id);
    const faces = dexListOf(e).map((d) => `<span class="era-face ${d.kind} ${open ? '' : 'locked'}">${pxImg(d.sheet, 1)}</span>`).join('');
    let action;
    if (here) action = '<span class="era-here">📍 지금 여기</span>';
    else if (open) action = `<button class="px-btn small go" data-travel="${e.id}">이동하기</button>`;
    else if (!prevOpen) action = '<span class="muted small">🔒 앞 장소를 먼저 열어요</span>';
    else action = `<div class="era-req">${eraReq(state, e).map((r) => `<div class="req ${r.ok ? 'ok' : ''}"><span>${r.ok ? '✅' : '⬜'} ${r.label}</span><i class="req-bar"><b style="width:${Math.min(100, (r.cur / r.need) * 100)}%"></b></i><small>${r.fmt(r.cur)} / ${r.fmt(r.need)}</small></div>`).join('')}</div>`;
    return `<div class="era-card ${here ? 'here' : ''} ${open ? '' : 'locked'}">
      <div class="era-top"><span class="era-ico">${open || prevOpen ? e.icon : '❔'}</span>
        <div class="era-txt"><b>${open || prevOpen ? e.name : '??? 아직 모르는 곳'}</b><small>${open || prevOpen ? e.desc : ''}</small>
        <small class="era-mod">💰 손님 지갑 ×${e.priceMult} · ⏳ 인내심 ×${e.patience}${e.vip ? ' · 👑 VIP 손님' : ''}</small></div></div>
      <div class="era-faces">${faces}</div>
      <div class="era-act">${action}</div>
    </div>`;
  }).join('');
  return tabs + '<p class="small muted">조건을 채우면 새 장소가 열려요. 열린 장소는 영업 준비 때 언제든 오갈 수 있어요. 먼 장소일수록 손님이 돈을 많이 내요!</p>' + `<div class="era-list">${cards}</div>`;
}
function dexHtml() {
  const total = ERAS.reduce((t, e) => t + dexListOf(e).length, 0);
  const have = ERAS.reduce((t, e) => t + dexProgress(state, e).have, 0);
  const rows = ERAS.map((e) => {
    const p = dexProgress(state, e);
    const cells = dexListOf(e).map((d) => {
      const met = (state.dex || {})[d.sheet];
      return `<div class="dex-cell ${met ? 'met' : ''} ${d.kind}">${pxImg(d.sheet, 2, met ? '' : 'silhouette')}<small>${met ? personName(d.sheet) : '???'}</small>${d.kind === 'vip' ? '<i>👑</i>' : d.kind === 'rowdy' ? '<i>😡</i>' : ''}</div>`;
    }).join('');
    const reward = p.done && !p.claimed ? `<button class="px-btn tiny go" data-claimdex="${e.id}">🎁 완성 보상 ${won(dexReward(e))}</button>` : p.claimed ? '<span class="done">🎁 보상 받음</span>' : `<span class="muted small">모두 모으면 ${won(dexReward(e))}</span>`;
    return `<div class="dex-era"><div class="dex-head"><b>${e.icon} ${e.name}</b><span>${p.have}/${p.total}</span>${reward}</div><div class="dex-grid">${cells}</div></div>`;
  }).join('');
  return `<p class="small">지금까지 만난 손님 <b>${have}/${total}</b> · 손님이 자리에 앉으면 도감에 등록돼요.</p>${rows}`;
}
function announceUnlocks() {
  const fresh = checkUnlocks(state);
  for (const e of fresh) {
    feed(`🌏 새 장소가 열렸어요: <b>${e.icon} ${e.name}</b>!`);
    toast(`🌏 새 장소 열림! ${e.icon} ${e.name} — 🌏 시간여행에서 가 봐요!`);
    sfx.play('perfect');
  }
  document.querySelector('[data-open="era"]')?.classList.toggle('new', fresh.length > 0 || document.querySelector('[data-open="era"]')?.classList.contains('new'));
  if (fresh.length) persist();
  return fresh;
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
    if (e.target.closest('[data-open-chef]')) {
      editStyle = { ...(state.chefStyle || defaultChefStyle()) };
      openPanel('chef');
      return;
    }
    if (e.target.closest('[data-chef-save]')) {
      state.chefStyle = { ...editStyle };
      persist(); scene.chef = null; scene.rebuild(); closePanel();
      toast('새 셰프 모습으로 바꿨어요! 🎨');
      return;
    }
    if (e.target.closest('[data-chef-cancel]')) { openPanel('staff'); return; }
    if (panelKind === 'chef' && e.target.closest('[data-part],[data-random]')) {
      editStyle = customizerClick(e.target.closest('[data-part],[data-random]'), editStyle);
      renderCustomizer($('#chefCustomEdit'), editStyle);
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
    const tt = e.target.closest('[data-eratab]');
    if (tt) { eraTab = tt.dataset.eratab; renderPanel(); return; }
    const tv = e.target.closest('[data-travel]');
    if (tv) {
      const era = eraById(tv.dataset.travel);
      if (!(await confirmBox(`${era.icon} <b>${era.name}</b>(으)로 시간여행할까요?<br><small>가게와 재료·직원은 그대로 함께 가요.</small>`))) return;
      if (!travel(state, era.id)) return;
      sfx.play('perfect');
      toast(`🌀 ${era.icon} ${era.name}에 도착! 새로운 손님을 맞이해요.`);
      feed(`🌀 시간여행: <b>${era.name}</b> (손님 지갑 ×${era.priceMult})`);
      persist(); makeScene(state); updateHud('준비'); renderPanel();
      return;
    }
    const cd = e.target.closest('[data-claimdex]');
    if (cd) {
      const m = claimDex(state, cd.dataset.claimdex);
      if (m) { sfx.play('coin'); toast(`📖 도감 완성 보상 +${won(m)}! 🎁`); persist(); updateHud(); renderPanel(); }
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
      const keep = { accountId: state.accountId, ban: state.ban, no: state.no, name: state.name, chefLook: state.chefLook, chefStyle: state.chefStyle };
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
  scene.editPad = Math.ceil(($('#bottomBar').offsetHeight + 12) / scene.s) - 12;
  scene.resize();
}

function endEdit() {
  scene.edit = null;
  scene.hoverSlot = null;
  layoutSelected = null;
  showBar('prep');
  scene.resize();
  persist();
  refreshPrep();
}

function renderTray() {
  $('#tray').innerHTML = Object.entries(ITEMS).map(([type, it]) => {
    const inv = state.inventory[type] || 0;
    const locked = it.era && !isUnlocked(state, it.era);
    return `<span class="tray-item ${layoutSelected === type ? 'selected' : ''} ${inv ? '' : 'empty'} ${it.lux ? 'lux' : ''} ${locked ? 'locked' : ''}" data-select="${type}" title="${it.name}: ${it.desc}">
      ${it.lux ? '<i class="lux-tag">💎</i>' : ''}${pxImg(ITEM_PX[type], 1)}<b>${locked ? '🔒' : inv}</b><i class="buff">${locked ? `${eraById(it.era).icon} ${eraById(it.era).short} 가 보면 열려요` : it.buffText || ''}</i>
      ${locked ? '' : `<button class="px-btn tiny" data-buyitem="${type}">${won(it.price)}</button>`}
    </span>`;
  }).join('');
  $('#trayInfo').innerHTML = `칸 ${state.layout.length}/${gridOf(state).cols * gridOf(state).rows}<br><b>버프</b> ${buffSummary(state)}`;
}

function onSlot(gx, gy) {
  const occupied = state.layout.some((l) => l.x === gx && l.y === gy);
  if (occupied) {
    layoutSelected = pickupItem(state, gx, gy);
    sfx.play('tap');
  } else if (layoutSelected && state.inventory[layoutSelected]) {
    placeItem(state, layoutSelected, gx, gy);
    if (ITEMS[layoutSelected].buffText) toast(`${ITEMS[layoutSelected].name} 배치! ${ITEMS[layoutSelected].buffText}`);
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
  sfx.bgm('biz');
  scene.startDay();
  liveMode('biz');
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
  sfx.bgm('prep');
  toast('🔔 영업 종료!');
  setTimeout(() => showSettlement(stats), 900);
}

function showSettlement(stats) {
  const r = settleDay(state, stats);
  persist(true); // 마감 정산은 서버에 바로 저장
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
  initCloud().then((ok) => { if (ok) console.info('[ChefMaster] 학급 서버(Firebase) 연결됨'); });
  try { await Promise.all([loadSprites(), loadPx()]); } catch (e) { console.error('에셋 로드 실패', e); }
  try { registerEraArt(); } catch (e) { console.error('시대 도트 등록 실패', e); }
  initTitleBg();
  $('#btnStart').onclick = () => { $('#titleSplash').hidden = true; $('#titleCard').hidden = false; dimTitleBg(true); sfx.play('bell'); setTimeout(() => $('#inpName').focus(), 50); };
  if (!state) showSplash();
  try { await document.fonts.load('12px Galmuri11'); } catch (e) { /* 폰트 없이도 동작 */ }
  initTitle();
  initLive({ onKicked: () => kickedByFriend(), scene: () => scene, toast, persist: () => { if (state) persist(true); }, logout: () => { if (state) logout(); } });
  document.addEventListener('live:presence', () => { if (panelKind === 'friends') renderPanel(); if (visiting) renderVisitBar(); });
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
    liveVisitSticker(`${st.icon} ${st.text}`);
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
  // 휴대폰: 전체화면 + 가로 고정 시도, 세로 안내 닫기
  // 폰: 첫 터치(그리고 입장·영업 시작 버튼)에서 자동으로 전체화면 + 가로 고정 (브라우저는 터치 없이 전체화면을 허락하지 않음)
  const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isApp = matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches;
  const autoFull = () => {
    if (!isPhone || isApp || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      // 가로로 들고 있을 때만 가로 고정 (세로로 하는 친구는 세로 그대로)
      .then(() => { if (screen.orientation?.type?.startsWith('landscape')) screen.orientation.lock?.('landscape').catch(() => {}); })
      .catch(() => {});
  };
  document.addEventListener('pointerup', autoFull, { once: true });
  ['#btnLogin', '#btnNew', '#btnOpen'].forEach((s) => $(s).addEventListener('click', autoFull));
  $('#btnFull').onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else { await document.documentElement.requestFullscreen(); await screen.orientation?.lock?.('landscape').catch(() => {}); }
    } catch (e) { toast('이 기기에서는 전체화면을 쓸 수 없어요.'); }
  };
  window.addEventListener('orientationchange', () => setTimeout(() => scene?.resize(), 300));
  document.addEventListener('fullscreenchange', () => setTimeout(() => scene?.resize(), 200));
  const soundBtn = $('#btnSound');
  const syncSound = () => { soundBtn.textContent = settings.sound ? '🔊' : '🔇'; };
  syncSound();
  soundBtn.onclick = () => { settings.sound = !settings.sound; sfx.setEnabled(settings.sound); saveSettings(settings); syncSound(); };
  window.addEventListener('beforeunload', () => { if (state && scene?.mode !== 'business') saveShop(state); });
}

init();
