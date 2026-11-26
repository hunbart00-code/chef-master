// 친구 가게 방문(스냅샷) · 칭찬 스티커 방명록 · 홍보 버프 · 3종 랭킹
// - 학급 서버(Firebase) 연결 전: 같은 기기에 있는 같은 반 계정 + 체험용 가상 친구 5명
// - 3차에서 Firebase를 연결하면 이 파일의 저장소 부분만 Firestore(shops / guestbooks)로 바뀜
import { isFirebaseEnabled } from './firebase-config.js';
import { loadShopOf } from './shop-engine.js';
import { classmatesOnDevice } from './account.js';
import { ITEMS, FRIDGE_LEVELS } from './data-interior.js';
import { staffTier } from './data-staff.js';

const KEY = 'chefmaster_social_v1';
export const CHEERS_PER_DAY = 3;
export const PROMO_PER_CHEER = 0.1;
export const PROMO_MAX = 0.3;

// 자유 입력 금지: 프리셋 칭찬 스티커 6종
export const STICKERS = [
  { id: 'best', icon: '👍', text: '최고예요!' },
  { id: 'yum', icon: '😋', text: '맛있어요!' },
  { id: 'clean', icon: '✨', text: '깔끔해요!' },
  { id: 'cheer', icon: '💪', text: '힘내요!' },
  { id: 'rich', icon: '🎉', text: '대박나세요!' },
  { id: 'again', icon: '❤️', text: '또 올게요!' },
];
export const stickerById = (id) => STICKERS.find((s) => s.id === id) || STICKERS[0];
export const isDemo = () => !isFirebaseEnabled();

const today = () => new Date().toISOString().slice(0, 10); // 응원 횟수는 실제 날짜 기준

// ---------- 체험용 가상 친구 (학급 서버 연결 전에도 기능을 체험) ----------
const DEMO_FRIENDS = [
  { id: 'demo_1', name: '하늘', chefLook: 'chef_f', day: 12, rating: 4.1, perfect: 64, money: 412000, fridge: 3,
    layout: [['table_long', 0, 0], ['table_wood', 2, 0], ['table_long', 4, 0], ['table_wood', 1, 1], ['plant_pot', 3, 1], ['trophy', 4, 1]],
    staff: [['cleaner', 2], ['server', 1]] },
  { id: 'demo_2', name: '도윤', chefLook: 'chef_m', day: 7, rating: 3.6, perfect: 28, money: 158000, fridge: 1,
    layout: [['table_wood', 0, 0], ['table_wood', 2, 0], ['table_wood', 4, 0], ['aboard', 0, 1], ['table_wood', 3, 1]],
    staff: [['guard', 1]] },
  { id: 'demo_3', name: '서아', chefLook: 'chef_f', day: 18, rating: 4.5, perfect: 131, money: 890000, fridge: 5,
    layout: [['table_long', 0, 0], ['table_long', 2, 0], ['table_long', 4, 0], ['table_long', 1, 1], ['table_long', 3, 1], ['trophy', 0, 1], ['plant_pot', 4, 1]],
    staff: [['cleaner', 3], ['server', 2], ['guard', 2]] },
  { id: 'demo_4', name: '지후', chefLook: 'chef_m', day: 4, rating: 3.2, perfect: 9, money: 41000, fridge: 0,
    layout: [['table_wood', 1, 0], ['table_wood', 3, 1], ['plant_pot', 4, 0]],
    staff: [] },
  { id: 'demo_5', name: '유나', chefLook: 'chef_f', day: 10, rating: 3.9, perfect: 47, money: 276000, fridge: 2,
    layout: [['table_wood', 0, 0], ['table_long', 2, 0], ['table_wood', 4, 0], ['plant_pot', 0, 1], ['aboard', 2, 1], ['table_wood', 4, 1]],
    staff: [['server', 1], ['cleaner', 1]] },
];

function demoShop(f) {
  return {
    id: f.id, demo: true, name: f.name, chefLook: f.chefLook, day: f.day, branch: 1, rating: f.rating,
    perfectCookCount: f.perfect, money: f.money,
    layout: f.layout.map(([type, x, y]) => ({ type, x, y })),
    staff: f.staff.map(([role, tier]) => ({ role, tier })),
    forecast: { id: 'sunny', day: f.day },
    fridge: { level: f.fridge, capacity: FRIDGE_LEVELS[f.fridge].capacity, items: {} },
    inventory: {}, recipes: {}, today: { expense: 0 },
  };
}

// ---------- 저장소 (로컬) ----------
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.guestbooks) {
      if (!d.sent || d.sent.date !== undefined) d.sent = {}; // 예전 형식(계정 구분 없음) 정리
      d.npcDay = d.npcDay || {};
      return d;
    }
  } catch (e) { /* ignore */ }
  return { guestbooks: {}, sent: {}, npcDay: {} };
}
function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }

/** 같은 반 친구 가게 목록 (나 제외) */
export function listClassmates(me) {
  const real = classmatesOnDevice(me.ban, me.accountId).map((a) => {
    const s = loadShopOf(a.id);
    return s ? { ...s, id: a.id, name: a.name } : null;
  }).filter(Boolean);
  return [...real, ...DEMO_FRIENDS.map(demoShop)];
}

function sentToday(d, myId) {
  const s = d.sent[myId];
  return s && s.date === today() ? s : { date: today(), to: [] };
}

export function cheersLeftToday(me) {
  return Math.max(0, CHEERS_PER_DAY - sentToday(load(), me.accountId).to.length);
}
export function cheeredToday(me, friendId) {
  return sentToday(load(), me.accountId).to.includes(friendId);
}

/** 시식 & 응원 스티커 → 친구 가게 방명록에 남고, 친구는 다음 영업 매출 +10% */
export function sendCheer(me, friend, stickerId) {
  const d = load();
  const s = sentToday(d, me.accountId);
  if (s.to.length >= CHEERS_PER_DAY) return { ok: false, reason: `오늘 응원은 ${CHEERS_PER_DAY}번까지예요. 내일 또 와요!` };
  if (s.to.includes(friend.id)) return { ok: false, reason: '이 가게는 오늘 이미 응원했어요.' };
  s.to.push(friend.id);
  d.sent[me.accountId] = s;
  const gb = d.guestbooks[friend.id] || (d.guestbooks[friend.id] = []);
  gb.unshift({ from: me.name, sticker: stickerId, at: Date.now() });
  d.guestbooks[friend.id] = gb.slice(0, 10);
  save(d);
  return { ok: true };
}

/** 방명록 (최신 10건) */
export function guestbookOf(id) { return (load().guestbooks[id] || []).slice(0, 10); }

/**
 * 내 가게에 새로 온 응원 받기 → state.promo (+10%씩, 최대 +30%)
 * 체험 모드에서는 영업일마다 가상 친구 0~2명이 응원을 보내 줌
 */
export function pullIncomingCheers(state) {
  const d = load();
  const myId = state.accountId;
  if (!myId) return [];
  if (state.day > 1 && d.npcDay[myId] !== state.day) {
    d.npcDay[myId] = state.day;
    const n = Math.random() < 0.35 ? 0 : Math.random() < 0.7 ? 1 : 2;
    const gb = d.guestbooks[myId] || (d.guestbooks[myId] = []);
    for (const f of DEMO_FRIENDS.slice().sort(() => Math.random() - 0.5).slice(0, n)) {
      gb.unshift({ from: f.name, sticker: STICKERS[Math.floor(Math.random() * STICKERS.length)].id, at: Date.now() });
    }
    d.guestbooks[myId] = gb.slice(0, 10);
    save(d);
  }
  const seen = state.cheerSeenAt || 0;
  const fresh = (d.guestbooks[myId] || []).filter((e) => e.at > seen);
  if (fresh.length) {
    state.cheerSeenAt = Math.max(...fresh.map((e) => e.at));
    state.promo = Math.min(PROMO_MAX, (state.promo || 0) + PROMO_PER_CHEER * fresh.length);
  }
  return fresh;
}

// ---------- 랭킹 ----------
/** 총 자산 = 현금 + 가구·인테리어 + 냉장고 업그레이드 + 직원 계약금 */
export function totalAssets(s) {
  const furniture = [...(s.layout || []).map((l) => l.type), ...Object.entries(s.inventory || {}).flatMap(([t, n]) => Array(n).fill(t))]
    .reduce((t, type) => t + (ITEMS[type]?.price || 0), 0);
  const fridge = FRIDGE_LEVELS.slice(1, (s.fridge?.level || 0) + 1).reduce((t, l) => t + l.price, 0);
  const staff = (s.staff || []).reduce((t, x) => t + (staffTier(x.role, x.tier)?.hire || 0), 0);
  return Math.round((s.money || 0) + furniture + fridge + staff);
}

export const RANKINGS = {
  rich: { name: '부자왕', icon: '💰', desc: '총 자산 (현금 + 가구·주방·직원 가치)', value: (s) => totalAssets(s), fmt: (v) => `${v.toLocaleString('ko-KR')}원` },
  michelin: { name: '미슐랭왕', icon: '⭐', desc: '가게 별점 (같으면 완벽 요리 수)', value: (s) => Math.round((s.rating || 0) * 100) * 100000 + (s.perfectCookCount || 0), fmt: (v, s) => `★ ${(s.rating || 0).toFixed(2)}` },
  cook: { name: '요리왕', icon: '🍳', desc: '누적 완벽 요리(★3) 횟수', value: (s) => s.perfectCookCount || 0, fmt: (v) => `${v}회` },
};

/** 같은 반(나 포함) 순위 */
export function ranking(me, kind) {
  const R = RANKINGS[kind];
  const rows = [{ ...me, id: me.accountId, isMe: true }, ...listClassmates(me)]
    .map((s) => ({ id: s.id, name: s.name, isMe: !!s.isMe, demo: !!s.demo, chefLook: s.chefLook, v: R.value(s), label: R.fmt(R.value(s), s), day: s.day }))
    .sort((a, b) => b.v - a.v);
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].v === r.v ? rows[i - 1].rank : i + 1; });
  return rows;
}
