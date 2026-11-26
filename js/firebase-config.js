// Firebase 설정 (3차 업데이트에서 연결)
// 값이 null이면 localStorage 단독 모드로 100% 플레이할 수 있습니다.
export const firebaseConfig = {
  apiKey: 'AIzaSyD3w34NI6eN7kPszciTghGC8s0h1M32DbY',
  authDomain: 'chef-master-2c7c6.firebaseapp.com',
  projectId: 'chef-master-2c7c6',
  storageBucket: 'chef-master-2c7c6.firebasestorage.app',
  messagingSenderId: '343564777727',
  appId: '1:343564777727:web:c609ca18ec61533bbc74ca',
};
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
