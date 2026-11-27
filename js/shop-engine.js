// 가게 상태·경제·저장 엔진 (localStorage 단독 모드, 3차에서 Firestore 연동)
import { INGREDIENTS, MENUS, BRANCHES, FORECASTS, menuCost } from './data-menus.js?v=20261127020605';
import { ITEMS, FRIDGE_LEVELS, DECO_BONUS_CAP, BUFF_CAP } from './data-interior.js?v=20261127020605';
import { SHOP_LEVELS, gridOf } from './shop-levels.js?v=20261127020605';
import { staffTier } from './data-staff.js?v=20261127020605';

export const SAVE_KEY = 'chefmaster_shop_v1';
export const SETTINGS_KEY = 'chefmaster_settings_v1';
export const START_MONEY = 30000;
export const RESCUE_BASE = 10000;
export const RESCUE_PER_CORRECT = 4000;

export const GRADE = {
  3: { name: '특상급', mult: 1.5, score: 5.0 },
  2: { name: '보통',   mult: 1.0, score: 3.6 },
  1: { name: '탄 요리', mult: 0.5, score: 1.6 },
};
export const TIP_RATE = 0.2;

export function newShop(name = '') {
  return {
    version: 1,
    name: name || '사장님',
    studentNo: 0,
    day: 1,
    branch: 1,
    money: START_MONEY,
    rating: 3.0,
    perfectCookCount: 0,
    totalServed: 0,
    fridge: { level: 0, capacity: FRIDGE_LEVELS[0].capacity, items: { tteok: 3, fishcake: 4, rice: 2, seaweed: 2, veggie: 3, noodle: 2, egg: 2 } },
    shopLevel: 0,       // 가게 확장 단계 (0: 작은 분식집)
    era: 'modern',      // 시간여행: 지금 장사하는 곳
    erasUnlocked: ['modern'],
    dex: {},            // 손님 도감 { 시트: 만난 횟수 }
    dexClaimed: {},
    layout: [
      { type: 'table_wood', x: 1, y: 0 },   // 처음엔 테이블 하나
    ],
    inventory: {},
    staff: [],          // [{ role: 'cleaner'|'server'|'guard', tier: 1~4, day: 고용일 }]
    chefLook: 'chef_m',
    recipes: {},
    rareIngredients: [],
    isBuildingOwner: false,
    forecast: null,
    today: { expense: 0 },
    history: [],
    lastSavedAt: null,
  };
}

// 계정별 저장 칸 (반-번호). 로그인 전 기존 저장은 SAVE_KEY 그대로
let scope = '';
const keyOf = (id) => (id ? `${SAVE_KEY}:${id}` : SAVE_KEY);
export function setSaveScope(id) {
  scope = id || '';
}
/** 다른 계정(같은 기기 친구) 가게 읽기 */
export function loadShopOf(id) { return loadShop(id); }

export function loadShop(id = scope) {
  try {
    const s = JSON.parse(localStorage.getItem(keyOf(id)));
    if (s && s.version === 1) {
      // 구버전 가구 이름 이전 (lamp → trophy)
      for (const it of s.layout || []) if (it.type === 'lamp') it.type = 'trophy';
      if (s.inventory?.lamp) { s.inventory.trophy = (s.inventory.trophy || 0) + s.inventory.lamp; delete s.inventory.lamp; }
      s.layout = (s.layout || []).filter((it) => ITEMS[it.type]);
      if (s.shopLevel === undefined) s.shopLevel = SHOP_LEVELS.length - 1;
      fitLayout(s);
      s.staff = (s.staff || []).filter((x) => staffTier(x.role, x.tier));
      return { ...newShop(), ...s };
    }
  } catch (e) { /* ignore */ }
  return null;
}

export function saveShop(state) {
  state.lastSavedAt = new Date().toISOString();
  try { localStorage.setItem(keyOf(scope), JSON.stringify(state)); return true; } catch (e) { return false; }
}

export function clearShop() { localStorage.removeItem(keyOf(scope)); }

export function loadSettings() {
  try { return { subjectRatio: '50:50', sound: true, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; } catch (e) { return { subjectRatio: '50:50', sound: true }; }
}
export function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } }

// ---------- 예보 ----------
export function ensureForecast(state) {
  if (state.forecast && state.forecast.day === state.day) return FORECASTS[state.forecast.id];
  let id = 'sunny';
  if (state.day > 1) {
    const list = Object.entries(FORECASTS).filter(([, f]) => !f.minDay || state.day >= f.minDay);
    const total = list.reduce((s, [, f]) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const [k, f] of list) { if ((r -= f.weight) < 0) { id = k; break; } }
  }
  state.forecast = { id, day: state.day };
  return FORECASTS[id];
}
export const currentForecast = (state) => FORECASTS[state.forecast?.id || 'sunny'];

// ---------- 냉장고·재료 ----------
export const fridgeUsed = (state) => Object.values(state.fridge.items).reduce((s, n) => s + n, 0);
export const fridgeFree = (state) => state.fridge.capacity - fridgeUsed(state);

export function buyIngredient(state, id, qty = 1) {
  const ing = INGREDIENTS[id];
  qty = Math.min(qty, fridgeFree(state), Math.floor(state.money / ing.price));
  if (qty <= 0) return 0;
  state.money -= ing.price * qty;
  state.today.expense += ing.price * qty;
  state.fridge.items[id] = (state.fridge.items[id] || 0) + qty;
  return qty;
}

// 재료 되팔기 (산 값 그대로 환불 — 유통기한이 없으니 손해 없음)
export function sellIngredient(state, id, qty = 1) {
  const ing = INGREDIENTS[id];
  qty = Math.min(qty, state.fridge.items[id] || 0);
  if (qty <= 0) return 0;
  state.fridge.items[id] -= qty;
  state.money += ing.price * qty;
  state.today.expense = Math.max(0, state.today.expense - ing.price * qty);
  return qty;
}

// 냉장고 초기화: 전부 되팔기, 환불액 반환
export function clearFridge(state) {
  let refund = 0;
  for (const id of Object.keys(state.fridge.items)) {
    const n = state.fridge.items[id] || 0;
    if (!n) continue;
    refund += INGREDIENTS[id].price * n;
    sellIngredient(state, id, n);
  }
  return refund;
}

// 가장 적게 더 사면 만들 수 있는 메뉴 안내
export function missingHint(state) {
  let best = null;
  for (const m of branchMenus(state)) {
    const miss = Object.entries(MENUS[m].needs)
      .map(([ing, n]) => [ing, Math.max(0, n - (state.fridge.items[ing] || 0))])
      .filter(([, k]) => k > 0);
    const total = miss.reduce((t, [, k]) => t + k, 0);
    if (!best || total < best.total) best = { menu: m, miss, total };
  }
  if (!best) return '';
  return `${best.miss.map(([ing, k]) => `${INGREDIENTS[ing].name} ${k}개`).join(', ')} 더 사면 ${MENUS[best.menu].name} 가능`;
}

export const branchMenus = (state) => BRANCHES[state.branch].menus;

export function cookableCount(state, menuId) {
  const m = MENUS[menuId];
  return Math.min(...Object.entries(m.needs).map(([ing, n]) => Math.floor((state.fridge.items[ing] || 0) / n)));
}
export const canCook = (state, menuId) => cookableCount(state, menuId) > 0;
export const anyCookable = (state) => branchMenus(state).some((m) => canCook(state, m));

export function consume(state, menuId, sign = -1) {
  for (const [ing, n] of Object.entries(MENUS[menuId].needs)) {
    state.fridge.items[ing] = (state.fridge.items[ing] || 0) + sign * n;
  }
}

// 자동 장보기: 메뉴가 고르게 나오도록 남은 칸·자금 안에서 구매
export function autoShop(state) {
  const menus = branchMenus(state);
  let bought = 0, guard = 0;
  while (guard++ < 400) {
    const sorted = menus.slice().sort((a, b) => cookableCount(state, a) - cookableCount(state, b));
    let progressed = false;
    for (const m of sorted) {
      const needs = Object.entries(MENUS[m].needs);
      const missing = needs.map(([ing, n]) => [ing, Math.max(0, n - ((state.fridge.items[ing] || 0) - cookableCount(state, m) * n))]);
      const units = missing.reduce((s, [, k]) => s + k, 0);
      const cost = missing.reduce((s, [ing, k]) => s + INGREDIENTS[ing].price * k, 0);
      if (units === 0 || units > fridgeFree(state) || cost > state.money) continue;
      for (const [ing, k] of missing) if (k) bought += buyIngredient(state, ing, k);
      progressed = true;
      break;
    }
    if (!progressed) break;
  }
  return bought;
}

// 가게 확장: 방이 넓어지고 테이블 자리가 늘어남
export function nextShopLevel(state) { return SHOP_LEVELS[(state.shopLevel ?? 0) + 1] || null; }
export function expandShop(state) {
  const next = nextShopLevel(state);
  if (!next || state.money < next.price) return false;
  state.money -= next.price;
  state.today.expense += next.price;
  state.shopLevel = (state.shopLevel ?? 0) + 1;
  fitLayout(state);
  return true;
}

export function upgradeFridge(state) {
  const next = FRIDGE_LEVELS[state.fridge.level + 1];
  if (!next || state.money < next.price) return false;
  state.money -= next.price;
  state.today.expense += next.price;
  state.fridge.level++;
  state.fridge.capacity = next.capacity;
  return true;
}

// ---------- 가구 배치 ----------
// 칸 밖에 있거나 겹친 가구는 빈 칸으로 옮기고, 자리가 없으면 창고로
export function fitLayout(s) {
  const { cols, rows } = gridOf(s);
  const used = new Set();
  const keep = [];
  const move = [];
  for (const it of s.layout) {
    const k = `${it.x},${it.y}`;
    if (it.x < cols && it.y < rows && !used.has(k)) { used.add(k); keep.push(it); } else move.push(it);
  }
  s.inventory = s.inventory || {};
  for (const it of move) {
    let placed = false;
    for (let y = 0; y < rows && !placed; y++) for (let x = 0; x < cols && !placed; x++) {
      if (!used.has(`${x},${y}`)) { used.add(`${x},${y}`); keep.push({ ...it, x, y }); placed = true; }
    }
    if (!placed) s.inventory[it.type] = (s.inventory[it.type] || 0) + 1;
  }
  s.layout = keep;
}

export const tablesOf = (state) => state.layout.filter((it) => ITEMS[it.type]?.kind === 'table');

export function buyItem(state, type) {
  const it = ITEMS[type];
  if (!it || state.money < it.price) return false;
  if (it.era && !(state.erasUnlocked || []).includes(it.era)) return false;   // 그 시대에 가 봐야 살 수 있음
  state.money -= it.price;
  state.today.expense += it.price;
  state.inventory[type] = (state.inventory[type] || 0) + 1;
  return true;
}

export function placeItem(state, type, x, y) {
  if (!state.inventory[type]) return false;
  if (state.layout.some((it) => it.x === x && it.y === y)) return false;
  state.inventory[type]--;
  state.layout.push({ type, x, y });
  return true;
}

export function pickupItem(state, x, y) {
  const i = state.layout.findIndex((it) => it.x === x && it.y === y);
  if (i < 0) return null;
  const [it] = state.layout.splice(i, 1);
  state.inventory[it.type] = (state.inventory[it.type] || 0) + 1;
  return it.type;
}

// 놓인 가구마다 버프가 쌓임 (종류별 최대치 있음)
export function furnitureBuffs(state) {
  const b = { patience: 0, tip: 0, visit: 0, sales: 0, seats: 0 };
  for (const it of state.layout || []) {
    const def = ITEMS[it.type];
    if (!def) continue;
    if (def.kind === 'table') b.seats += def.seats || 1;
    for (const [k, v] of Object.entries(def.buff || {})) b[k] += v;
  }
  for (const k of Object.keys(BUFF_CAP)) b[k] = Math.min(BUFF_CAP[k], b[k]);
  return b;
}

export function buffSummary(state) {
  const b = furnitureBuffs(state);
  const out = [`자리 ${b.seats}`];
  if (b.patience) out.push(`인내심 +${Math.round(b.patience * 100)}%`);
  if (b.tip) out.push(`팁 +${Math.round(b.tip * 100)}%`);
  if (b.visit) out.push(`방문 +${Math.round(b.visit * 100)}%`);
  if (b.sales) out.push(`매출 +${Math.round(b.sales * 100)}%`);
  out.push(`별점 +${decoBonus(state).toFixed(2)}`);
  return out.join(' · ');
}

export function decoBonus(state) {
  const b = state.layout.reduce((s, it) => s + (ITEMS[it.type]?.ratingBonus || 0), 0);
  return Math.min(DECO_BONUS_CAP, b);
}

// ---------- 가격 ----------
export function recipeMult(state, menuId) {
  const lv = state.recipes[menuId] || 1;
  return 1 + 0.1 * (lv - 1);
}

export function menuPrice(state, menuId) {
  const f = currentForecast(state);
  const m = MENUS[menuId];
  let p = m.price * recipeMult(state, menuId);
  if (m.soup && f.soupMult) p *= f.soupMult;
  return Math.round(p / 10) * 10;
}

export function gradeFromCorrect(correct) {
  return correct >= 3 ? 3 : correct === 2 ? 2 : 1;
}

// ---------- 파산 구제 ----------
export function cheapestMenuCost(state) {
  return Math.min(...branchMenus(state).map(menuCost));
}
export function isBankrupt(state) {
  return !anyCookable(state) && state.money < cheapestMenuCost(state);
}

// ---------- 종업원 ----------
export function staffOf(state, role) {
  const st = state.staff.find((x) => x.role === role);
  return st ? { ...staffTier(role, st.tier), tier: st.tier, role } : null;
}

export function totalWages(state) {
  return state.staff.reduce((s, x) => s + (staffTier(x.role, x.tier)?.wage || 0), 0);
}

/** 고용(같은 역할 직원이 있으면 교체). 성공 시 true */
export function hireStaff(state, role, tier) {
  const t = staffTier(role, tier);
  if (!t || state.money < t.hire) return false;
  state.money -= t.hire;
  state.today.expense += t.hire;
  state.staff = state.staff.filter((x) => x.role !== role);
  state.staff.push({ role, tier, day: state.day });
  return true;
}

export function fireStaff(state, role) {
  state.staff = state.staff.filter((x) => x.role !== role);
}

// ---------- 일일 정산 ----------
export function newDayStats() {
  return {
    revenue: 0, tips: 0, served: 0, grades: { 1: 0, 2: 0, 3: 0 }, lost: 0, noStock: 0,
    rowdyHandled: 0, rowdyIgnored: 0, trashSeconds: 0, trashCleaned: 0, quizCorrect: 0, quizTotal: 0,
    bonus: 0, michelin: null, michelinRating: 0, // 미슐랭 심사위원 결과: 'pass' | 'ok' | 'fail' | 'lost'
  };
}

export function settleDay(state, stats) {
  // 종업원 일급 지급 — 돈이 모자라면 일급이 비싼 직원부터 그만둠
  const quit = [];
  let wages = totalWages(state);
  while (wages > state.money && state.staff.length) {
    const worst = state.staff.slice().sort((a, b) => staffTier(b.role, b.tier).wage - staffTier(a.role, a.tier).wage)[0];
    state.staff = state.staff.filter((x) => x !== worst);
    quit.push(staffTier(worst.role, worst.tier).name);
    wages = totalWages(state);
  }
  state.money -= wages;
  const expense = state.today.expense;
  const net = stats.revenue + stats.tips + (stats.bonus || 0) - expense - wages;

  // 별점 계산
  const events = [];
  for (const g of [1, 2, 3]) for (let i = 0; i < stats.grades[g]; i++) events.push(GRADE[g].score);
  for (let i = 0; i < stats.lost; i++) events.push(1.5);
  for (let i = 0; i < stats.rowdyIgnored; i++) events.push(1.0);
  for (let i = 0; i < stats.rowdyHandled; i++) events.push(4.2);
  const oldRating = state.rating;
  let dayScore = events.length ? events.reduce((s, v) => s + v, 0) / events.length : oldRating;
  dayScore -= Math.min(1.2, stats.trashSeconds / 100);
  dayScore += decoBonus(state);
  dayScore = Math.max(1, Math.min(5, dayScore));
  state.rating = Math.round((oldRating + (dayScore - oldRating) * 0.3) * 100) / 100;
  // 미슐랭 심사위원 평가는 하루 평균과 별도로 바로 반영
  if (stats.michelinRating) state.rating = Math.round(Math.max(1, Math.min(5, state.rating + stats.michelinRating)) * 100) / 100;

  state.perfectCookCount += stats.grades[3];
  state.totalServed += stats.served;

  const result = {
    day: state.day, revenue: stats.revenue, tips: stats.tips, bonus: stats.bonus || 0, michelin: stats.michelin, expense, wages, net,
    oldRating, newRating: state.rating, dayScore, reviews: makeReviews(state, stats), quit,
  };
  state.history.push({ day: state.day, net, rating: state.rating, served: stats.served, perfect: stats.grades[3] });
  if (state.history.length > 60) state.history.shift();
  state.day++;
  state.today = { expense: 0 };
  state.promo = 0; // 친구 응원 홍보 버프는 하루 영업에 쓰고 사라짐
  return result;
}

// ---------- 손님 리뷰 ----------
const NAMES = ['배고픈 초딩', '동네 주민 박씨', '떡볶이 매니아', '퇴근길 직장인', '맛집 탐험가', '할머니 손님', '축구부 주장', '김밥 러버', '야식 요정', '학원 가는 길'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function makeReviews(state, s) {
  const f = currentForecast(state);
  const pool = [];
  const menuName = () => {
    const ms = branchMenus(state);
    return pick(ms.map((m) => MENUS[m].name));
  };
  if (s.grades[3] > 0) pool.push(
    { stars: 5, text: `${menuName()} 진짜 미쳤어요! 인생 맛집 등극 🔥` },
    { stars: 5, text: `사장님 손맛 최고! 매일 오고 싶어요.` },
    { stars: 5, text: `${menuName()}이(가) 완벽했어요. 팁 드리고 왔어요 😊` },
  );
  if (s.grades[2] > 0) pool.push({ stars: 4, text: `${menuName()} 무난하게 맛있어요. 다음엔 특상급 기대할게요!` });
  if (s.grades[1] > 0) pool.push(
    { stars: 2, text: `음식이 좀 탔어요… 😢 문제를 차근차근 풀어 주세요!` },
    { stars: 1, text: `${menuName()}에서 탄 맛이 났어요. 다음엔 더 잘해 주세요.` },
  );
  if (s.lost > 0) pool.push({ stars: 2, text: `너무 오래 기다리다 그냥 나왔어요 ⏰` });
  if (s.noStock > 0) pool.push({ stars: 2, text: `먹고 싶은 메뉴 재료가 다 떨어졌대요. 장 좀 넉넉히 봐 주세요!` });
  if (s.trashSeconds > 40) pool.push({ stars: 2, text: `테이블에 빈 그릇이 쌓여 있었어요. 청소 부탁드려요 🧹` });
  else if (s.served > 3) pool.push({ stars: 5, text: `가게가 깔끔해서 기분 좋게 먹었어요 ✨` });
  if (s.rowdyHandled > 0) pool.push({ stars: 5, text: `시끄러운 손님을 ${state.staff.some((x) => x.role === 'guard') ? '경호원이' : '사장님이'} 바로 해결해 주셨어요 👍` });
  if (s.rowdyIgnored > 0) pool.push({ stars: 1, text: `옆 테이블 진상 손님 때문에 밥맛이 없었어요 😡` });
  const MICHELIN = {
    pass: { stars: 5, text: '🕵️ [미슐랭 심사위원] 완벽한 한 접시. 이 가게에 별을 드립니다. ✨' },
    ok: { stars: 3, text: '🕵️ [미슐랭 심사위원] 나쁘지 않지만, 아직 별을 주기엔 아쉽군요.' },
    fail: { stars: 1, text: '🕵️ [미슐랭 심사위원] 탄 요리를 내놓다니… 실망입니다.' },
    lost: { stars: 1, text: '🕵️ [미슐랭 심사위원] 주문도 받지 않다니, 다시 오지 않겠습니다.' },
  };
  if (state.forecast?.id === 'tourists' && s.served > 0) pool.push({ stars: 5, text: `So delicious! I will come back again! 🌏`, eng: true });
  if (state.forecast?.id === 'rain' && s.served > 0) pool.push({ stars: 5, text: `비 오는 날엔 역시 따끈한 국물이죠 ☔` });
  if (!pool.length) pool.push({ stars: 3, text: `손님이 별로 없어서 조용했어요.` });

  const out = [];
  const used = new Set();
  const n = Math.min(pool.length, 3 + (Math.random() < 0.5 ? 1 : 0));
  for (const r of pool.sort(() => Math.random() - 0.5)) {
    if (out.length >= n) break;
    if (used.has(r.text)) continue;
    used.add(r.text);
    out.push({ ...r, who: r.eng ? 'Tourist Emma' : pick(NAMES) });
  }
  if (s.michelin && MICHELIN[s.michelin]) out.unshift({ ...MICHELIN[s.michelin], who: '미슐랭 심사위원', michelin: true });
  return out.sort((a, b) => (b.michelin ? 9 : b.stars) - (a.michelin ? 9 : a.stars)).slice(0, 4);
}

export const won = (n) => `${Math.round(n).toLocaleString('ko-KR')}원`;
export { INGREDIENTS, MENUS, BRANCHES, ITEMS, FRIDGE_LEVELS };
