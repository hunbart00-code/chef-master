// Firebase 설정 (3차 업데이트에서 연결)
// 값이 null이면 localStorage 단독 모드로 100% 플레이할 수 있습니다.
export const firebaseConfig = null;
/* 예시:
export const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  appId: '...',
};
*/

export function isFirebaseEnabled() {
  return !!(firebaseConfig && firebaseConfig.projectId);
}
