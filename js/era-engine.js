// 시간여행 규칙: 장소 열기·이동·손님 도감
import { ERAS, eraById, dexListOf, dexReward } from './data-eras.js?v=20261127021108';
import { totalAssets } from './social-engine.js?v=20261127021108';

/** 예전 저장에도 시간여행 칸 채우기 */
export function ensureEra(s) {
  if (!s) return;
  if (!s.era || !ERAS.some((e) => e.id === s.era)) s.era = 'modern';
  if (!Array.isArray(s.erasUnlocked) || !s.erasUnlocked.length) s.erasUnlocked = ['modern'];
  if (!s.erasUnlocked.includes('modern')) s.erasUnlocked.unshift('modern');
  if (!s.erasUnlocked.includes(s.era)) s.era = 'modern';
  s.dex = s.dex || {};
  s.dexClaimed = s.dexClaimed || {};
}

export const isUnlocked = (s, id) => (s.erasUnlocked || ['modern']).includes(id);

/** 장소를 여는 조건과 지금 진행 상황 */
export function eraReq(s, era) {
  const u = era.unlock;
  if (!u) return [];
  const out = [];
  if (u.assets) out.push({ label: '총 자산', cur: totalAssets(s), need: u.assets, fmt: (v) => `${Math.floor(v).toLocaleString('ko-KR')}원` });
  if (u.day) out.push({ label: '영업 일수', cur: s.day, need: u.day, fmt: (v) => `DAY ${v}` });
  if (u.rating) out.push({ label: '별점', cur: s.rating, need: u.rating, fmt: (v) => `★ ${Number(v).toFixed(1)}` });
  if (u.perfect) out.push({ label: '완벽 요리', cur: s.perfectCookCount || 0, need: u.perfect, fmt: (v) => `${v}회` });
  return out.map((r) => ({ ...r, ok: r.cur >= r.need }));
}

/** 바로 앞 장소가 열려 있고 조건을 다 채웠으면 열 수 있음 */
export function canUnlock(s, era) {
  const i = ERAS.indexOf(era);
  if (i <= 0 || isUnlocked(s, era.id)) return false;
  return isUnlocked(s, ERAS[i - 1].id) && eraReq(s, era).every((r) => r.ok);
}

/** 조건을 채운 장소를 차례로 열고, 새로 열린 장소 목록을 돌려줌 */
export function checkUnlocks(s) {
  ensureEra(s);
  const fresh = [];
  for (const era of ERAS) if (canUnlock(s, era)) { s.erasUnlocked.push(era.id); fresh.push(era); }
  return fresh;
}

export function travel(s, id) {
  if (!isUnlocked(s, id)) return false;
  s.era = id;
  return true;
}

/** 손님을 처음 만나면 도감에 등록 → 처음이면 true */
export function recordDex(s, sheet) {
  if (!s || !sheet) return false;
  s.dex = s.dex || {};
  const first = !s.dex[sheet];
  s.dex[sheet] = (s.dex[sheet] || 0) + 1;
  return first;
}

export function dexProgress(s, era) {
  const list = dexListOf(era);
  const have = list.filter((d) => (s.dex || {})[d.sheet]).length;
  return { have, total: list.length, done: have === list.length, claimed: !!(s.dexClaimed || {})[era.id] };
}

/** 장소 도감을 다 모았으면 보상 */
export function claimDex(s, eraId) {
  const era = eraById(eraId);
  const p = dexProgress(s, era);
  if (!p.done || p.claimed) return 0;
  const money = dexReward(era);
  s.money += money;
  s.dexClaimed[era.id] = true;
  return money;
}
