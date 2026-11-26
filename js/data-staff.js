// 종업원 데이터: 역할 3종 × 등급 4단계
// hire = 계약금(고용 시 1회), wage = 일급(매일 마감 정산 때 지급)
// 역할마다 1명씩 고용할 수 있고, 더 좋은 직원을 고용하면 기존 직원과 교체됩니다.

export const STAFF_ROLES = {
  cleaner: {
    name: '청소 담당', icon: '🧹',
    desc: '생긴 쓰레기를 알아서 찾아가 치워요. (없으면 사장님이 직접 치워야 해요)',
    tiers: [
      { id: 'cleaner1', name: '청소 알바 지민', hire: 20000, wage: 3000, speed: 150, work: 1.4, trashMult: 1.0, line: '천천히 꼼꼼하게 쓸어요.' },
      { id: 'cleaner2', name: '청소 전문가 박씨', hire: 60000, wage: 6000, speed: 200, work: 0.9, trashMult: 0.9, line: '쓰레받기로 한 번에 싹!' },
      { id: 'cleaner3', name: '환경미화 반장', hire: 150000, wage: 12000, speed: 240, work: 0.6, trashMult: 0.75, line: '집게와 봉투로 깔끔 정리, 쓰레기 자체가 줄어요.' },
      { id: 'cleaner4', name: '청소 로봇 클리-X', hire: 500000, wage: 20000, speed: 300, work: 0.35, trashMult: 0.6, robot: true, line: '쉬지 않는 자동 청소 로봇. (일급 = 전기료)' },
    ],
  },
  server: {
    name: '서빙 담당', icon: '🛎️',
    desc: '사장님이 요리에만 집중하도록 음식을 대신 날라요. 손님 응대로 인내심이 천천히 줄고 팁도 늘어요.',
    tiers: [
      { id: 'server1', name: '서빙 알바 수아', hire: 25000, wage: 4000, speed: 170, patienceMult: 0.9, tipBonus: 0, line: '밝은 미소로 응대해요.' },
      { id: 'server2', name: '홀 서버 준호', hire: 70000, wage: 8000, speed: 210, patienceMult: 0.8, tipBonus: 0.1, line: '쟁반 들고 척척, 팁 +10%.' },
      { id: 'server3', name: '수석 웨이터', hire: 180000, wage: 15000, speed: 240, patienceMult: 0.7, tipBonus: 0.2, line: '고급 서비스로 손님이 오래 기다려 줘요. 팁 +20%.' },
      { id: 'server4', name: '서빙 로봇 딜리봇', hire: 550000, wage: 22000, speed: 300, patienceMult: 0.6, tipBonus: 0.25, robot: true, line: '빠르고 정확한 배달 로봇. 팁 +25%.' },
    ],
  },
  guard: {
    name: '경호 담당', icon: '🛡️',
    desc: '진상 손님에게 달려가 내보내요. 퇴치에 실패하면 다시 시도해요.',
    tiers: [
      { id: 'guard1', name: '경비 알바 태오', hire: 30000, wage: 4000, speed: 160, work: 1.4, success: 0.6, rowdyMult: 1.0, line: '경광봉으로 정리! 가끔 실패해요.' },
      { id: 'guard2', name: '블랙 경호원', hire: 90000, wage: 9000, speed: 200, work: 1.0, success: 0.8, rowdyMult: 0.9, line: '선글라스 한 번이면 조용해져요.' },
      { id: 'guard3', name: '특수 경호팀', hire: 220000, wage: 16000, speed: 230, work: 0.8, success: 0.95, rowdyMult: 0.75, line: '방패까지 든 정예 요원. 진상 손님이 덜 와요.' },
      { id: 'guard4', name: '경비 로봇 가디언', hire: 600000, wage: 25000, speed: 260, work: 0.6, success: 1.0, rowdyMult: 0.5, robot: true, line: '퇴치 성공률 100%, 진상 손님 절반으로!' },
    ],
  },
};

export const STAFF_ORDER = ['cleaner', 'server', 'guard'];

export function staffTier(role, tier) {
  return STAFF_ROLES[role]?.tiers[tier - 1] || null;
}

// 능력치 표시용 별점(1~4)
export function speedStars(speed) {
  return speed >= 290 ? 4 : speed >= 230 ? 3 : speed >= 190 ? 2 : 1;
}

export const CHEF_LOOKS = {
  chef_m: '사장님 (남)',
  chef_f: '사장님 (여)',
};
