// Firebase Firestore 연동 (firebase-config.js에 설정값이 있을 때만 동작, 없으면 아무것도 안 함)
// shops/{반-번호}      : 학생 가게 전체 (+ 이름, 코드 해시)
// guestbooks/{자동ID}  : 칭찬 스티커 { to, from, sticker, at }
// classes/{반}         : 교사 통제 { isPaused, subjectRatio, maxBranchUnlocked }
import { firebaseConfig, isFirebaseEnabled } from './firebase-config.js';

const V = '10.12.2';
let db = null;
let F = null;
const mates = {};          // 반별 친구 가게 캐시
let saveTimer = null;

export const cloudOn = () => !!db;

export async function initCloud() {
  if (!isFirebaseEnabled()) return false;
  try {
    const app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    F = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
    db = F.getFirestore(app.initializeApp(firebaseConfig));
    return true;
  } catch (e) {
    console.warn('[cloud] Firebase 연결 실패, 이 기기 저장만 사용', e);
    db = null;
    return false;
  }
}

/** 서버에 있는 학생 가게 (없으면 null) */
export async function cloudGetShop(id) {
  if (!db) return null;
  const snap = await F.getDoc(F.doc(db, 'shops', id));
  return snap.exists() ? snap.data() : null;
}

/** 가게 저장 (잦은 저장은 3초 모아서 한 번) */
export function cloudSaveShop(state, codeHash, now = false) {
  if (!db || !state?.accountId) return;
  const run = () => {
    const data = JSON.parse(JSON.stringify(state));
    if (codeHash) data.codeHash = codeHash;
    data.updatedAt = Date.now();
    F.setDoc(F.doc(db, 'shops', state.accountId), data, { merge: true }).catch((e) => console.warn('[cloud] 저장 실패', e));
  };
  clearTimeout(saveTimer);
  if (now) run(); else saveTimer = setTimeout(run, 3000);
}

/** 같은 반 친구 가게 목록 새로 받기 */
export async function cloudRefreshClass(ban) {
  if (!db) return [];
  const q = F.query(F.collection(db, 'shops'), F.where('ban', '==', Number(ban)));
  const res = await F.getDocs(q);
  mates[ban] = res.docs.map((d) => { const s = d.data(); delete s.codeHash; return { ...s, id: d.id }; });
  return mates[ban];
}
export const cloudClassmates = (ban) => mates[ban] || [];

export async function cloudSendCheer(toId, fromName, sticker) {
  if (!db) return;
  await F.addDoc(F.collection(db, 'guestbooks'), { to: toId, from: fromName, sticker, at: Date.now() });
}

export async function cloudGuestbook(id) {
  if (!db) return [];
  const q = F.query(F.collection(db, 'guestbooks'), F.where('to', '==', id));
  const res = await F.getDocs(q);
  return res.docs.map((d) => d.data()).sort((a, b) => b.at - a.at).slice(0, 10);
}

/** 교사 실시간 통제 구독 */
export function cloudWatchClass(ban, cb) {
  if (!db) return () => {};
  return F.onSnapshot(F.doc(db, 'classes', String(ban)), (snap) => { if (snap.exists()) cb(snap.data()); });
}

// ================= 실시간: 접속 상태 · 친구 방문 · 반 채팅 · 교사 공지 =================
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const ONLINE_MS = 90 * 1000;

/** 접속 상태 (30초마다 갱신) */
export function cloudPresence(id, data) {
  if (!db) return;
  F.setDoc(F.doc(db, 'presence', id), { ...data, at: Date.now() }).catch(() => {});
}
/** 반 친구들 접속 상태 구독 → cb({id: presence}) */
export function cloudWatchPresence(ban, cb) {
  if (!db) return () => {};
  const q = F.query(F.collection(db, 'presence'), F.where('ban', '==', Number(ban)));
  return F.onSnapshot(q, (res) => { const m = {}; res.docs.forEach((d) => { m[d.id] = d.data(); }); cb(m); }, () => {});
}

/** 친구 가게에 손님으로 들어감 → 방문 문서 id */
export function cloudVisitStart(v) {
  if (!db) return null;
  const id = rid();
  F.setDoc(F.doc(db, 'visits', id), { ...v, state: 'in', sticker: null, at: Date.now() }).catch(() => {});
  return id;
}
export function cloudVisitUpdate(id, patch) {
  if (!db || !id) return;
  F.updateDoc(F.doc(db, 'visits', id), { ...patch, at: Date.now() }).catch(() => {});
}
export function cloudVisitEnd(id) {
  if (!db || !id) return;
  F.deleteDoc(F.doc(db, 'visits', id)).catch(() => {});
}
/** 어떤 가게(to)에 와 있는 손님들 구독 */
export function cloudWatchVisits(to, cb) {
  if (!db) return () => {};
  const q = F.query(F.collection(db, 'visits'), F.where('to', '==', to));
  return F.onSnapshot(q, (res) => {
    const now = Date.now();
    cb(res.docs.map((d) => ({ id: d.id, ...d.data() })).filter((v) => v.state === 'in' && now - v.at < ONLINE_MS * 2));
  }, () => {});
}

/** 반 채팅 */
export function cloudWatchChat(ban, cb) {
  if (!db) return () => {};
  const q = F.query(F.collection(db, 'chats', String(ban), 'msgs'), F.orderBy('at', 'desc'), F.limit(40));
  return F.onSnapshot(q, (res) => cb(res.docs.map((d) => ({ id: d.id, ...d.data() })).reverse()), () => {});
}
export async function cloudSendChat(ban, msg, teacherPw) {
  if (!db) throw new Error('offline');
  const id = rid();
  if (!teacherPw) return F.setDoc(F.doc(db, 'chats', String(ban), 'msgs', id), { ...msg, teacher: false, at: Date.now() });
  const b = F.writeBatch(db), op = rid();
  b.set(F.doc(db, 'auth', op), { pw: teacherPw });
  b.set(F.doc(db, 'chats', String(ban), 'msgs', id), { ...msg, teacher: true, op, at: Date.now() });
  return b.commit();
}

/** 교사 전체 공지 (세계 확성기) */
export function cloudWatchAnnounce(cb) {
  if (!db) return () => {};
  const q = F.query(F.collection(db, 'announcements'), F.orderBy('at', 'desc'), F.limit(1));
  return F.onSnapshot(q, (res) => { const d = res.docs[0]; if (d) cb({ id: d.id, ...d.data() }); }, () => {});
}
export async function cloudAnnounce(text, by, teacherPw) {
  const b = F.writeBatch(db), op = rid();
  b.set(F.doc(db, 'auth', op), { pw: teacherPw });
  b.set(F.doc(db, 'announcements', rid()), { text, by, op, at: Date.now() });
  return b.commit();
}
/** 교사: 반 통제 (화면 멈춤, 수학 범위) */
export async function cloudClassControl(ban, patch, teacherPw) {
  const b = F.writeBatch(db), op = rid();
  b.set(F.doc(db, 'auth', op), { pw: teacherPw });
  b.set(F.doc(db, 'classes', String(ban)), { ...patch, op }, { merge: true });
  return b.commit();
}
/** 교사 비밀번호 확인 (서버 규칙이 맞을 때만 쓰기 허용) */
export async function cloudTeacherCheck(teacherPw) {
  if (!db) throw new Error('offline');
  await F.setDoc(F.doc(db, 'auth', rid()), { pw: teacherPw });
  return true;
}
/** 처음 한 번: 교사 비밀번호 등록 (이미 있으면 서버가 거절) */
export async function cloudTeacherSetup(pwHash) {
  if (!db) throw new Error('offline');
  return F.setDoc(F.doc(db, 'config', 'teacher'), { pwHash });
}

// ================= 선생님 관리: 서버 열기/닫기 · 코드 초기화 · 학생 현황 =================
/** 서버 상태 구독 { open, msg } */
export function cloudWatchServer(cb) {
  if (!db) return () => {};
  return F.onSnapshot(F.doc(db, 'config', 'server'), (snap) => cb(snap.exists() ? snap.data() : { open: true }), () => {});
}
export async function cloudSetServer(open, msg, teacherPw) {
  const b = F.writeBatch(db), op = rid();
  b.set(F.doc(db, 'auth', op), { pw: teacherPw });
  b.set(F.doc(db, 'config', 'server'), { open, msg: msg || '', op, at: Date.now() });
  return b.commit();
}
/** 학생 4자리 코드 초기화 → 학생이 다음에 입력하는 코드가 새 코드가 됨 */
export async function cloudResetCode(id, teacherPw) {
  const b = F.writeBatch(db), op = rid();
  b.set(F.doc(db, 'auth', op), { pw: teacherPw });
  b.set(F.doc(db, 'shops', id), { codeHash: null, op }, { merge: true });
  return b.commit();
}
/** 선생님용: 반 가게 목록 (코드 해시 제외) */
export async function cloudClassShops(ban) {
  if (!db) return [];
  const res = await F.getDocs(F.query(F.collection(db, 'shops'), F.where('ban', '==', Number(ban))));
  return res.docs.map((d) => { const s = d.data(); const reset = s.codeHash === null; delete s.codeHash; return { ...s, id: d.id, codeReset: reset }; });
}
