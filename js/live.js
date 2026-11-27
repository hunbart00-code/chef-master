// 실시간 기능: 접속 표시, 친구 가게 실시간 방문, 반 채팅, 교사 전체 공지(세계 확성기)
import {
  cloudOn, cloudPresence, cloudWatchPresence, cloudVisitStart, cloudVisitUpdate, cloudVisitEnd, cloudWatchVisits,
  cloudWatchChat, cloudSendChat, cloudWatchAnnounce, cloudAnnounce, cloudClassControl, cloudTeacherSignIn, cloudTeacherSignOut, ONLINE_MS,
  cloudWatchServer, cloudSetServer, cloudResetCode, cloudClassShops, cloudWatchClass,
} from './cloud.js?v=20261127001202';
import { registerChef, chefSheetOf } from './chef-maker.js?v=20261127001202';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BAD = ['씨발', '시발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '새끼', 'ㅅㄲ', '존나', 'ㅈㄴ', '좆', '꺼져', '닥쳐', '지랄', 'ㅈㄹ', '염병', '미친놈', '미친년', '애미', '느금', 'fuck', 'shit', 'bitch'];
const clean = (t) => BAD.reduce((s, w) => s.split(w).join('♡'.repeat(Math.min(3, w.length))), t);

let me = null;            // 내 가게 state
let teacher = null;       // { email, name }
let getScene = () => null;
let toastFn = () => {};
let heartbeat = null;
let presence = {};
let unsub = { presence: () => {}, myVisits: () => {}, friendVisits: () => {}, chat: () => {}, announce: () => {} };
let myGuests = [];        // 내 가게에 와 있는 친구들
let friendGuests = [];    // 내가 방문한 가게에 와 있는 다른 친구들
let visit = null;         // { id, to }
let mode = 'prep';
let chatBan = null;
let chatMsgs = [];
let lastSend = 0;
let unread = 0;
let lastAnnId = null;

let hooks = {};
let server = { open: true, msg: '' };
let chatOff = false;

export function initLive({ scene, toast, persist, logout }) {
  getScene = scene; toastFn = toast; hooks = { persist, logout };
  bindChat();
  // 교사 공지는 로그인 전에도 들음
  const startAnn = () => { unsub.announce(); unsub.announce = cloudWatchAnnounce(showAnnounce); cloudWatchServer(applyServer); };
  if (cloudOn()) startAnn(); else setTimeout(() => { if (cloudOn()) startAnn(); }, 2500);
}

const sheetOf = (style) => { try { return style ? registerChef(style) : 'cust_kid'; } catch (e) { return 'cust_kid'; } };
const guestView = (v) => ({ id: v.id, name: v.fromName, sheet: sheetOf(v.chef), sticker: v.sticker, stickerAt: v.stickerAt });

// ---------- 로그인 / 로그아웃 ----------
export function liveLogin(state) {
  liveLogout();
  me = state;
  if (!cloudOn()) { renderChat(); return; }
  const beat = () => cloudPresence(me.accountId, { name: me.name, ban: me.ban, no: me.no, mode, visiting: visit?.to || null });
  beat(); heartbeat = setInterval(beat, 30000);
  unsub.presence = cloudWatchPresence(me.ban, (m) => { presence = m; document.dispatchEvent(new Event('live:presence')); });
  unsub.myVisits = cloudWatchVisits(me.accountId, (list) => {
    const fresh = list.filter((v) => !myGuests.some((g) => g.id === v.id));
    for (const v of fresh) toastFn(`🚪 ${v.fromName}이(가) 우리 가게에 놀러 왔어요!`);
    myGuests = list;
    if (!visit) getScene()?.syncGuests(myGuests.map(guestView));
  });
  watchChat(me.ban);
}

export function liveLogout() {
  if (visit) liveVisitEnd();
  clearInterval(heartbeat); heartbeat = null;
  unsub.presence(); unsub.myVisits(); unsub.friendVisits(); unsub.chat();
  unsub.presence = unsub.myVisits = unsub.friendVisits = unsub.chat = () => {};
  myGuests = []; friendGuests = []; presence = {}; me = null; chatMsgs = []; chatBan = null;
  if (!teacher) $('#chatBox').hidden = true;
  setBadge(0);
}

export function liveMode(m) {
  mode = m;
  if (me && cloudOn()) cloudPresence(me.accountId, { name: me.name, ban: me.ban, no: me.no, mode, visiting: visit?.to || null });
}

/** 씬을 새로 만들 때마다 지금 와 있는 친구들을 다시 세움 */
export function liveSceneReady() {
  const sc = getScene(); if (!sc) return;
  sc.syncGuests((visit ? friendGuests : myGuests).map(guestView));
}

export const isOnline = (id) => { const p = presence[id]; return !!p && Date.now() - p.at < ONLINE_MS; };
export const presenceOf = (id) => presence[id] || null;

// ---------- 친구 가게 방문 ----------
export function liveVisitStart(friend) {
  if (!me || !cloudOn()) return;
  const id = cloudVisitStart({ from: me.accountId, fromName: me.name, to: friend.id, ban: me.ban, chef: me.chefStyle || null, stickerAt: 0 });
  visit = { id, to: friend.id };
  liveMode('visit');
  unsub.friendVisits();
  unsub.friendVisits = cloudWatchVisits(friend.id, (list) => {
    friendGuests = list.filter((v) => v.id !== id);
    getScene()?.syncGuests(friendGuests.map(guestView));
  });
  visit.beat = setInterval(() => cloudVisitUpdate(id, {}), 30000);
}
export function liveVisitSticker(text) { if (visit) cloudVisitUpdate(visit.id, { sticker: text, stickerAt: Date.now() }); }
export function liveVisitEnd() {
  if (!visit) return;
  clearInterval(visit.beat);
  cloudVisitEnd(visit.id);
  unsub.friendVisits(); unsub.friendVisits = () => {};
  friendGuests = [];
  visit = null;
}
window.addEventListener('pagehide', () => { if (visit) cloudVisitEnd(visit.id); });

// ---------- 반 채팅 ----------
function watchChat(ban) {
  unsub.chat();
  chatBan = Number(ban);
  chatMsgs = [];
  let first = true;
  unsub.chat = cloudWatchChat(chatBan, (msgs) => {
    const before = chatMsgs.length ? chatMsgs[chatMsgs.length - 1].id : null;
    const newOnes = first ? [] : msgs.filter((m) => !chatMsgs.some((o) => o.id === m.id));
    chatMsgs = msgs;
    first = false;
    if ($('#chatBox').hidden) setBadge(unread + newOnes.filter((m) => m.from !== (me?.accountId || 'teacher')).length);
    renderChat(before);
  });
  renderChat();
}

function setBadge(n) {
  unread = n;
  const b = $('#chatBadge');
  if (b) { b.textContent = n > 9 ? '9+' : n; b.hidden = !n; }
}

function renderChat() {
  const list = $('#chatList'); if (!list) return;
  $('#chatTitle').textContent = teacher ? `💬 ${chatBan}반 채팅 (선생님)` : `💬 ${me?.ban || ''}반 채팅${chatOff ? ' (꺼짐)' : ''}`;
  const off = chatOff && !teacher;
  $('#chatInput').disabled = off; $('#chatSend').disabled = off;
  $('#chatInput').placeholder = off ? '선생님이 채팅을 잠시 껐어요 🔇' : '친구에게 한마디 (60자)';
  if (!cloudOn()) { list.innerHTML = '<p class="chat-empty">학급 서버에 연결되어야 채팅할 수 있어요.</p>'; return; }
  const myId = teacher ? 'teacher' : me?.accountId;
  list.innerHTML = chatMsgs.length ? chatMsgs.map((m) => `<div class="chat-msg ${m.teacher ? 'teacher' : ''} ${m.from === myId ? 'mine' : ''}">
      <b>${m.teacher ? '👩‍🏫 선생님' : esc(m.name)}</b><span>${esc(m.text)}</span></div>`).join('')
    : '<p class="chat-empty">아직 대화가 없어요. 첫 인사를 남겨 보세요! 👋</p>';
  list.scrollTop = list.scrollHeight;
}

function bindChat() {
  $('#btnChat').onclick = () => {
    const box = $('#chatBox');
    box.hidden = !box.hidden;
    if (!box.hidden) { setBadge(0); renderChat(); setTimeout(() => $('#chatInput').focus(), 50); }
  };
  $('#chatClose').onclick = () => { $('#chatBox').hidden = true; };
  const send = async () => {
    const inp = $('#chatInput');
    const text = clean(inp.value.trim()).slice(0, 60);
    if (!text) return;
    if (!cloudOn()) { toastFn('학급 서버에 연결되어야 채팅할 수 있어요.'); return; }
    if (Date.now() - lastSend < 3000) { toastFn('조금만 천천히 보내요! (3초)'); return; }
    if (!teacher && !me) return;
    if (chatOff && !teacher) { toastFn('선생님이 채팅을 잠시 껐어요 🔇'); return; }
    lastSend = Date.now();
    inp.value = '';
    try {
      if (teacher) await cloudSendChat(chatBan, { from: 'teacher', name: '선생님', text }, true);
      else await cloudSendChat(me.ban, { from: me.accountId, name: `${me.no}번 ${me.name}`, text });
    } catch (e) { toastFn('메시지를 못 보냈어요. 인터넷을 확인해 주세요.'); }
  };
  $('#chatSend').onclick = send;
  $('#chatInput').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
}

// ---------- 교사 전체 공지 ----------
function showAnnounce(a) {
  if (!a || a.id === lastAnnId) return;
  const first = lastAnnId === null;
  lastAnnId = a.id;
  if (first && Date.now() - a.at > 10 * 60 * 1000) return;   // 10분 지난 공지는 다시 띄우지 않음
  let seen = null; try { seen = localStorage.getItem('chefmaster_ann_seen'); } catch (e) { /* ignore */ }
  if (first && seen === a.id) return;
  try { localStorage.setItem('chefmaster_ann_seen', a.id); } catch (e) { /* ignore */ }
  const el = $('#announce');
  el.innerHTML = `<div class="ann-head">📢 선생님 공지</div><div class="ann-text">${esc(a.text)}</div><button class="px-btn small" id="annClose">확인</button>`;
  el.hidden = false;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  $('#annClose').onclick = () => { el.hidden = true; };
  clearTimeout(showAnnounce.t);
  showAnnounce.t = setTimeout(() => { el.hidden = true; }, 15000);
}

// ---------- 교사 모드 ----------

function bindTeacher() {
  $('#btnTeacher').onclick = () => { $('#teacherLogin').hidden = false; $('#titleCard').hidden = true; };
  $('#tBack').onclick = () => { $('#teacherLogin').hidden = true; $('#titleCard').hidden = false; if (server.open === false) $('#closedOverlay').hidden = false; };
  $('#closedTeacher').onclick = () => { $('#closedOverlay').hidden = true; $('#btnTeacher').click(); };
  $('#tGoogle').onclick = async () => {
    if (!cloudOn()) { toastFn('학급 서버(Firebase)에 연결되지 않았어요.'); return; }
    $('#tGoogle').disabled = true;
    try {
      teacher = await cloudTeacherSignIn();
      $('#teacherLogin').hidden = true;
      openTeacherDesk();
      toastFn(`${teacher.name ? teacher.name + ' ' : ''}선생님, 어서 오세요! 👩‍🏫`);
    } catch (e) {
      if (e.message === 'not-teacher') toastFn(`${e.email} 계정은 선생님 명단에 없어요.`);
      else if (/popup-closed|cancelled-popup/.test(e.code || '')) toastFn('로그인 창이 닫혔어요.');
      else if (/unauthorized-domain/.test(e.code || '')) toastFn('Firebase 승인된 도메인에 이 주소를 추가해야 해요.');
      else if (/operation-not-allowed/.test(e.code || '')) toastFn('Firebase에서 Google 로그인을 켜 주세요.');
      else toastFn('구글 로그인에 실패했어요.');
      console.warn('[teacher]', e);
    } finally { $('#tGoogle').disabled = false; }
  };
  $('#tAnnSend').onclick = async () => {
    const text = $('#tAnn').value.trim().slice(0, 100);
    if (!text) return;
    try { await cloudAnnounce(text, teacher.name || '선생님'); $('#tAnn').value = ''; toastFn('📢 모든 학생에게 공지를 보냈어요!'); }
    catch (e) { toastFn('공지를 못 보냈어요. 비밀번호나 인터넷을 확인해 주세요.'); }
  };
  $('#tAnn').addEventListener('keydown', (e) => e.stopPropagation());
  $('#tBan').onchange = (e) => { watchChat(Number(e.target.value)); watchTeacherClass(); };
  $('#tPause').onclick = async () => {
    const ban = Number($('#tBan').value), cur = classState[ban]?.isPaused;
    try { await cloudClassControl(ban, { isPaused: !cur }); classState[ban] = { ...classState[ban], isPaused: !cur }; renderClassRow(); toastFn(!cur ? `✋ ${ban}반 화면을 멈췄어요.` : `▶ ${ban}반 화면을 다시 풀었어요.`); }
    catch (e) { toastFn('바꾸지 못했어요.'); }
  };
  $('#tTerm').onchange = async (e) => {
    const ban = Number($('#tBan').value);
    try { await cloudClassControl(ban, { mathTerm: e.target.value === 'ALL' ? null : e.target.value }); toastFn(`${ban}반 수학 범위를 바꿨어요.`); }
    catch (err) { toastFn('바꾸지 못했어요.'); }
  };
  $('#tChat').onclick = () => { $('#chatBox').hidden = false; setBadge(0); renderChat(); };
  bindTeacherAdmin();
  $('#tOut').onclick = () => { teacher = null; cloudTeacherSignOut().catch(() => {}); tUnsubPresence(); tUnsubClass(); if (server.open === false) $('#closedOverlay').hidden = false; unsub.chat(); $('#teacherDesk').hidden = true; $('#chatBox').hidden = true; $('#titleCard').hidden = false; };
}

const classState = {};
function renderClassRow() {
  const ban = Number($('#tBan').value);
  $('#tPause').textContent = classState[ban]?.isPaused ? `▶ ${ban}반 화면 풀기` : `✋ ${ban}반 화면 멈추기`;
  $('#tChatOff').textContent = classState[ban]?.chatOff ? `💬 ${ban}반 채팅 켜기` : `🔇 ${ban}반 채팅 끄기`;
}

let tUnsubClass = () => {};
function watchTeacherClass() {
  const ban = Number($('#tBan').value);
  tUnsubClass(); tUnsubClass = cloudWatchClass(ban, (d) => { classState[ban] = d; renderClassRow(); $('#tTerm').value = d.mathTerm || 'ALL'; });
  renderClassRow();
}

function openTeacherDesk() {
  $('#teacherDesk').hidden = false;
  $('#closedOverlay').hidden = true;
  renderServerRow();
  watchChat(Number($('#tBan').value));
  watchTeacherClass();
}

// ---------- 반 통제 (채팅 끄기) ----------
export function liveClassControl(ctrl) {
  const was = chatOff;
  chatOff = !!ctrl.chatOff;
  if (was !== chatOff && me) { toastFn(chatOff ? '🔇 선생님이 채팅을 껐어요.' : '💬 채팅이 다시 켜졌어요!'); renderChat(); }
}

// ---------- 서버 열기/닫기 ----------
export const serverClosed = () => !teacher && server.open === false;
function applyServer(sv) {
  const wasOpen = server.open !== false;
  server = { open: sv.open !== false, msg: sv.msg || '' };
  if (teacher) renderServerRow();
  const ov = $('#closedOverlay');
  if (!server.open && !teacher) {
    $('#closedMsg').textContent = server.msg || '오늘 영업은 여기까지! 가게는 모두 저장됐어요.';
    ov.hidden = false;
    if (wasOpen) { hooks.persist?.(); hooks.logout?.(); }
  } else {
    ov.hidden = true;
    if (!wasOpen && server.open && !teacher) toastFn('🔓 게임 문이 다시 열렸어요! 로그인하세요.');
  }
}
function renderServerRow() {
  const b = $('#tServer');
  b.textContent = server.open ? '🔒 서버 닫기 (모든 학생 게임 종료)' : '🔓 서버 열기';
  b.classList.toggle('warn', server.open); b.classList.toggle('go', !server.open);
  $('#tServerState').innerHTML = server.open ? '지금 <b class="ok">열림</b>' : `지금 <b class="no">닫힘</b>${server.msg ? ` · “${esc(server.msg)}”` : ''}`;
}

// ---------- 선생님: 학생 현황판 ----------
let tPresence = {};
let tUnsubPresence = () => {};
let tShops = [];
const pct = (c, n) => (n ? `${Math.round((c / n) * 100)}%` : '-');
const $$ = (s) => [...document.querySelectorAll(s)];

async function loadBoard() {
  const ban = Number($('#tBoardBan').value);
  tUnsubPresence(); tUnsubPresence = cloudWatchPresence(ban, (m) => { tPresence = m; renderBoard(); });
  $('#tBoard').innerHTML = '<p class="muted small">불러오는 중…</p>';
  try { tShops = (await cloudClassShops(ban)).sort((a, b) => a.no - b.no); } catch (e) { $('#tBoard').innerHTML = '<p class="small">학생 목록을 못 불러왔어요.</p>'; return; }
  renderBoard();
}

function renderBoard() {
  const MODE = { biz: '🔥영업', prep: '🧺준비', visit: '🚶방문' };
  if (!tShops.length) { $('#tBoard').innerHTML = '<p class="muted small">아직 이 반에 가게를 만든 학생이 없어요.</p>'; return; }
  const rows = tShops.map((s) => {
    const p = tPresence[s.id], on = p && Date.now() - p.at < ONLINE_MS, q = s.quizStats || {};
    return `<tr><td>${s.no}</td><td class="nm">${esc(s.name)}${s.codeReset ? ' <small class="no">코드 초기화됨</small>' : ''}</td>
      <td>${on ? `<i class="online-dot"></i>${MODE[p.mode] || '접속'}` : '<span class="muted">-</span>'}</td>
      <td>${s.day || 1}</td><td>${(s.money || 0).toLocaleString()}</td><td>★${(s.rating || 0).toFixed(1)}</td>
      <td>${pct(q.mathC, q.mathN)} <small class="muted">(${q.mathN || 0})</small></td><td>${pct(q.engC, q.engN)} <small class="muted">(${q.engN || 0})</small></td>
      <td class="weak">${(q.weak || []).map(esc).join(', ') || '-'}</td>
      <td><button class="px-btn tiny" data-reset="${s.id}" data-name="${esc(s.name)}">코드 초기화</button></td></tr>`;
  }).join('');
  $('#tBoard').innerHTML = `<table class="t-board"><thead><tr><th>번</th><th>이름</th><th>접속</th><th>DAY</th><th>돈</th><th>별점</th><th>수학</th><th>영어</th><th>약한 단원</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function downloadCsv() {
  const ban = $('#tBoardBan').value;
  const head = ['반', '번호', '이름', 'DAY', '돈', '별점', '수학 정답률', '수학 푼 문제', '영어 정답률', '영어 푼 문제', '약한 단원', '마지막 저장'];
  const lines = tShops.map((s) => {
    const q = s.quizStats || {};
    return [ban, s.no, s.name, s.day || 1, s.money || 0, (s.rating || 0).toFixed(1), pct(q.mathC, q.mathN), q.mathN || 0, pct(q.engC, q.engN), q.engN || 0,
      (q.weak || []).join(' / '), s.updatedAt ? new Date(s.updatedAt).toLocaleString('ko-KR') : ''];
  });
  const csv = '﻿' + [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `셰프마스터_${ban}반_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function bindTeacherAdmin() {
  $$('#teacherDesk [data-ttab]').forEach((b) => {
    b.onclick = () => {
      $$('#teacherDesk [data-ttab]').forEach((x) => x.classList.toggle('active', x === b));
      $$('#teacherDesk [data-tpane]').forEach((p) => { p.hidden = p.dataset.tpane !== b.dataset.ttab; });
      if (b.dataset.ttab === 'board') loadBoard();
    };
  });
  $('#tServer').onclick = async () => {
    const open = !server.open;
    if (!open && !window.confirm('서버를 닫으면 모든 반 학생의 게임이 저장된 뒤 종료돼요. 닫을까요?')) return;
    try {
      await cloudSetServer(open, $('#tServerMsg').value.trim().slice(0, 60));
      toastFn(open ? '🔓 서버를 열었어요.' : '🔒 서버를 닫았어요. 학생들 게임이 저장 후 종료돼요.');
    } catch (e) { toastFn('바꾸지 못했어요. 비밀번호나 인터넷을 확인해 주세요.'); }
  };
  $('#tServerMsg').addEventListener('keydown', (e) => e.stopPropagation());
  $('#tChatOff').onclick = async () => {
    const ban = Number($('#tBan').value), cur = !!classState[ban]?.chatOff;
    try {
      await cloudClassControl(ban, { chatOff: !cur });
      classState[ban] = { ...classState[ban], chatOff: !cur }; renderClassRow();
      toastFn(!cur ? `🔇 ${ban}반 채팅을 껐어요.` : `💬 ${ban}반 채팅을 켰어요.`);
    } catch (e) { toastFn('바꾸지 못했어요.'); }
  };
  $('#tBoardBan').onchange = loadBoard;
  $('#tRefresh').onclick = loadBoard;
  $('#tCsv').onclick = () => { if (!tShops.length) { toastFn('받을 학생 기록이 없어요.'); return; } downloadCsv(); };
  $('#tBoard').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-reset]'); if (!b) return;
    if (!window.confirm(`${b.dataset.name} 학생의 4자리 코드를 초기화할까요?\n학생이 다음에 입력하는 코드가 새 코드가 돼요.`)) return;
    try { await cloudResetCode(b.dataset.reset); toastFn(`${b.dataset.name} 학생 코드를 초기화했어요. 바로 새 코드로 로그인하게 해 주세요.`); loadBoard(); }
    catch (err) { toastFn('초기화하지 못했어요.'); }
  });
}
