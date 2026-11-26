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
