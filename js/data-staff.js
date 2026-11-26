// 종업원 데이터 (2차 업데이트에서 고용·훈련·일당 시스템에 연결됩니다)
// 1차에서는 플레이어가 쓰레기·진상 손님을 직접 클릭해 처리합니다.

export const STAFF = {
  cleaner: { name: '청소 알바',     icon: '🧹', hire: 30000,  wage: 3000,  desc: '테이블 쓰레기를 자동으로 치워요.' },
  server:  { name: '서빙 알바',     icon: '🛎️', hire: 40000,  wage: 4000,  desc: '손님 인내심이 천천히 줄어요.' },
  bouncer: { name: '진상 전담 경호원', icon: '🕶️', hire: 60000,  wage: 5000,  desc: '진상 손님을 자동으로 내보내요.' },
  souschef:{ name: '보조 셰프',     icon: '👨‍🍳', hire: 120000, wage: 9000,  desc: '요리 보너스 매출이 올라요.' },
  manager: { name: '지점 매니저',   icon: '💼', hire: 300000, wage: 15000, desc: '이전 지점을 자동 운영해요.' },
};

export const STAFF_MAX_LV = 10;
