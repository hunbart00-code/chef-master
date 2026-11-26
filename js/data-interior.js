// 가구·인테리어·주방 설비 데이터
// kind: table(손님 착석) | deco(별점 보너스)

export const ITEMS = {
  table_wood: { name: '2인 테이블', icon: '🪑', kind: 'table', seats: 1, price: 15000, desc: '손님 1팀이 앉아요.', buffText: '손님 자리 +1' },
  table_long: { name: '4인 긴 테이블', icon: '🪑', kind: 'table', seats: 2, price: 35000, desc: '손님 2팀이 함께 앉아요.', buffText: '손님 자리 +2' },
  aboard:     { name: '입간판', icon: '📋', kind: 'deco', price: 4000, desc: '오늘의 메뉴 홍보', ratingBonus: 0.03, buff: { visit: 0.10 }, buffText: '손님 방문 +10%' },
  plant_pot:  { name: '화분',       icon: '🪴', kind: 'deco',  price: 6000,  desc: '싱그러운 가게 분위기', ratingBonus: 0.04, buff: { patience: 0.06 }, buffText: '손님 인내심 +6%' },
  trophy:     { name: '황금 트로피', icon: '🏆', kind: 'deco',  price: 9000,  desc: '맛집 인증 트로피', ratingBonus: 0.06, buff: { tip: 0.10 }, buffText: '팁 +10% · 별점 +0.06' },
  rug:        { name: '빨간 깔개', icon: '🟥', kind: 'deco', price: 5000, desc: '포근한 바닥 깔개', ratingBonus: 0.05, buffText: '별점 +0.05' },
  water:      { name: '정수기', icon: '🚰', kind: 'deco', price: 12000, desc: '셀프 물 코너', ratingBonus: 0.02, buff: { patience: 0.08 }, buffText: '손님 인내심 +8%' },
  bookshelf:  { name: '만화 책장', icon: '📚', kind: 'deco', price: 15000, desc: '기다리며 읽는 만화책', ratingBonus: 0.02, buff: { visit: 0.08 }, buffText: '손님 방문 +8%' },
};

// 냉장고 단계(보관 칸 수 = 재료 총 개수 상한)
export const FRIDGE_LEVELS = [
  { capacity: 20,  price: 0 },
  { capacity: 30,  price: 20000 },
  { capacity: 45,  price: 50000 },
  { capacity: 60,  price: 100000 },
  { capacity: 80,  price: 200000 },
  { capacity: 100, price: 400000 },
  { capacity: 130, price: 800000 },
  { capacity: 160, price: 1500000 },
  { capacity: 200, price: 3000000 },
];

export const DECO_BONUS_CAP = 0.3;
// 가구 버프 최대치
export const BUFF_CAP = { patience: 0.30, tip: 0.50, visit: 0.40 };

// 홀 배치 칸 (가로 5 × 세로 2)
export const LAYOUT_GRID = { cols: 5, rows: 2 };
