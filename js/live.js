// 실시간 기능: 접속 표시, 친구 가게 실시간 방문, 반 채팅, 교사 전체 공지(세계 확성기)
import {
  cloudOn, cloudPresence, cloudWatchPresence, cloudVisitStart, cloudVisitUpdate, cloudVisitEnd, cloudWatchVisits,
  cloudWatchChat, cloudSendChat, cloudWatchAnnounce, cloudAnnounce, cloudClassControl, cloudTeacherCheck, cloudTeacherSetup, ONLINE_MS,
} from './cloud.js';
import { registerChef, chefSheetOf } from './chef-maker.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const BAD = ['씨발', '시발', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅂㅅ', '븅신', '개새', '새끼', 'ㅅㄲ', '존나', 'ㅈㄴ', '좆', '꺼져', '닥쳐', '지랄', 'ㅈㄹ', '염병', '미친놈', '미친년', '애미', '느금', 'fuck', 'shit', 'bitch'];
const clean = (t) => BAD.reduce((s, w) => s.split(w).join('♡'.repeat(Math.min(3, w.length))), t);

let me = null;            // 내 가게 state
let teacher = null;       // { pw, ban }
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

export function initLive({ scene, toast }) {
  getScene = scene; toastFn = toast;
  bindChat();
  bindTeacher();
  // 교사 공지는 로그인 전에도 들음
  const startAnn = () => { unsub.announce(); unsub.announce = cloudWatchAnnounce(showAnnounce); };
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
  $('#chatTitle').textContent = teacher ? `💬 ${chatBan}반 채팅 (선생님)` : `💬 ${me?.ban || ''}반 채팅`;
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
    lastSend = Date.now();
    inp.value = '';
    try {
      if (teacher) await cloudSendChat(chatBan, { from: 'teacher', name: '선생님', text }, teacher.pw);
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
async function sha256(t) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bindTeacher() {
  $('#btnTeacher').onclick = () => { $('#teacherLogin').hidden = false; $('#titleCard').hidden = true; $('#tPw').focus(); };
  $('#tBack').onclick = () => { $('#teacherLogin').hidden = true; $('#titleCard').hidden = false; };
  $('#tLogin').onclick = async () => {
    const pw = $('#tPw').value.trim();
    if (pw.length < 4) { toastFn('비밀번호는 4글자 이상이에요.'); return; }
    if (!cloudOn()) { toastFn('학급 서버(Firebase)에 연결되지 않았어요.'); return; }
    try { await cloudTeacherCheck(pw); } catch (e) { toastFn('비밀번호가 맞지 않아요.'); return; }
    teacher = { pw };
    $('#teacherLogin').hidden = true;
    openTeacherDesk();
  };
  $('#tSetup').onclick = async () => {
    const pw = $('#tPw').value.trim();
    if (pw.length < 6) { toastFn('처음 만드는 비밀번호는 6글자 이상으로 해 주세요.'); return; }
    if (!cloudOn()) { toastFn('학급 서버(Firebase)에 연결되지 않았어요.'); return; }
    try { await cloudTeacherSetup(await sha256(pw)); toastFn('선생님 비밀번호를 만들었어요! 이제 입장하세요.'); }
    catch (e) { toastFn('이미 비밀번호가 있어요. 기존 비밀번호로 입장하세요.'); }
  };
  $('#tPw').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('#tLogin').click(); });
  $('#tAnnSend').onclick = async () => {
    const text = $('#tAnn').value.trim().slice(0, 100);
    if (!text) return;
    try { await cloudAnnounce(text, '선생님', teacher.pw); $('#tAnn').value = ''; toastFn('📢 모든 학생에게 공지를 보냈어요!'); }
    catch (e) { toastFn('공지를 못 보냈어요. 비밀번호나 인터넷을 확인해 주세요.'); }
  };
  $('#tAnn').addEventListener('keydown', (e) => e.stopPropagation());
  $('#tBan').onchange = (e) => { watchChat(Number(e.target.value)); renderClassRow(); };
  $('#tPause').onclick = async () => {
    const ban = Number($('#tBan').value), cur = classState[ban]?.isPaused;
    try { await cloudClassControl(ban, { isPaused: !cur }, teacher.pw); classState[ban] = { ...classState[ban], isPaused: !cur }; renderClassRow(); toastFn(!cur ? `✋ ${ban}반 화면을 멈췄어요.` : `▶ ${ban}반 화면을 다시 풀었어요.`); }
    catch (e) { toastFn('바꾸지 못했어요.'); }
  };
  $('#tTerm').onchange = async (e) => {
    const ban = Number($('#tBan').value);
    try { await cloudClassControl(ban, { mathTerm: e.target.value === 'ALL' ? null : e.target.value }, teacher.pw); toastFn(`${ban}반 수학 범위를 바꿨어요.`); }
    catch (err) { toastFn('바꾸지 못했어요.'); }
  };
  $('#tChat').onclick = () => { $('#chatBox').hidden = false; setBadge(0); renderChat(); };
  $('#tOut').onclick = () => { teacher = null; unsub.chat(); $('#teacherDesk').hidden = true; $('#chatBox').hidden = true; $('#titleCard').hidden = false; };
}

const classState = {};
function renderClassRow() {
  const ban = Number($('#tBan').value);
  $('#tPause').textContent = classState[ban]?.isPaused ? `▶ ${ban}반 화면 풀기` : `✋ ${ban}반 화면 멈추기`;
}

function openTeacherDesk() {
  $('#teacherDesk').hidden = false;
  watchChat(Number($('#tBan').value));
  renderClassRow();
}
