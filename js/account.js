// 간편 로그인: 반 + 번호 + 이름 + 4자리 비밀 코드
// - 처음 입장: 그 코드로 계정 생성 / 다음부터: 네 가지가 모두 맞아야 입장
// - 크롬북을 여럿이 같이 써도 반·번호마다 가게 저장이 따로 됨
// - 3차(Firebase)에서는 같은 정보로 학급 서버에 로그인
const ACC_KEY = 'chefmaster_accounts_v1';
const LAST_KEY = 'chefmaster_last_login_v1';

export const accountId = (ban, no) => `${Number(ban)}-${Number(no)}`;

// 코드를 그대로 저장하지 않도록 간단한 해시 (기기 안 보호용)
function hash(s) {
  let h = 0x811c9dc5;
  for (const ch of `chefmaster:${s}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16);
}

export function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACC_KEY)) || {}; } catch (e) { return {}; }
}
function saveAccounts(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); } catch (e) { /* ignore */ } }

export function lastLogin() {
  try { return JSON.parse(localStorage.getItem(LAST_KEY)) || null; } catch (e) { return null; }
}

/** 입력 검사 → 오류 메시지 또는 null */
export function validate({ ban, no, name, code }) {
  if (!(Number(ban) >= 1 && Number(ban) <= 4)) return '반을 골라 주세요.';
  if (!(Number(no) >= 1 && Number(no) <= 25)) return '번호를 골라 주세요.';
  if (!name || name.trim().length < 1) return '이름을 입력해 주세요.';
  if (name.trim().length > 10) return '이름은 10글자까지예요.';
  if (!/^\d{4}$/.test(code)) return '코드는 숫자 4자리예요.';
  return null;
}

/**
 * 로그인 시도
 * @returns {{ok:boolean, isNew?:boolean, id?:string, reason?:string}}
 */
export function tryLogin({ ban, no, name, code }) {
  const err = validate({ ban, no, name, code });
  if (err) return { ok: false, reason: err };
  const id = accountId(ban, no);
  const acc = loadAccounts()[id];
  if (!acc) return { ok: true, isNew: true, id };
  if (acc.name !== name.trim()) return { ok: false, reason: `${ban}반 ${no}번은 다른 이름으로 등록돼 있어요. 반·번호를 확인해 주세요.` };
  if (acc.code !== hash(code)) return { ok: false, reason: '코드가 달라요. 다시 입력해 주세요.' };
  rememberLogin(ban, no, name);
  return { ok: true, isNew: false, id };
}

export function createAccount({ ban, no, name, code }) {
  const id = accountId(ban, no);
  const all = loadAccounts();
  all[id] = { ban: Number(ban), no: Number(no), name: name.trim(), code: hash(code), created: Date.now() };
  saveAccounts(all);
  rememberLogin(ban, no, name);
  return id;
}

function rememberLogin(ban, no, name) {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ ban: Number(ban), no: Number(no), name: name.trim() })); } catch (e) { /* ignore */ }
}

/** 같은 반, 이 기기에 있는 다른 계정 */
export function classmatesOnDevice(ban, exceptId) {
  return Object.entries(loadAccounts())
    .filter(([id, a]) => a.ban === Number(ban) && id !== exceptId)
    .map(([id, a]) => ({ id, ...a }));
}
