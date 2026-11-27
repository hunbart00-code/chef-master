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
  // 💎 사치품: 비싸지만 버프가 큼. era가 있으면 그 시대에 가 본 뒤에 살 수 있음
  lux_toad:      { name: '황금 두꺼비', icon: '🐸', kind: 'deco', lux: true, price: 80000, desc: '돈을 불러온다는 황금 두꺼비', ratingBonus: 0.05, buff: { sales: 0.06 }, buffText: '매출 +6%' },
  lux_aquarium:  { name: '대형 수족관', icon: '🐠', kind: 'deco', lux: true, price: 120000, desc: '물고기를 보며 기다리면 마음이 편해요', ratingBonus: 0.05, buff: { patience: 0.12, visit: 0.05 }, buffText: '인내심 +12% · 방문 +5%' },
  lux_piano:     { name: '그랜드 피아노', icon: '🎹', kind: 'deco', lux: true, price: 200000, desc: '우아한 음악이 흐르는 가게', ratingBonus: 0.10, buff: { tip: 0.20 }, buffText: '팁 +20% · 별점 +0.1' },
  lux_fossil:    { name: '공룡 화석', icon: '🦖', kind: 'deco', lux: true, era: 'stone', price: 150000, desc: '선사시대에서 가져온 진짜 화석!', ratingBonus: 0.06, buff: { visit: 0.15 }, buffText: '방문 +15%' },
  lux_goldcrown: { name: '신라 금관 진열장', icon: '👑', kind: 'deco', lux: true, era: 'samguk', price: 300000, desc: '번쩍이는 금관에 손님이 몰려요', ratingBonus: 0.08, buff: { sales: 0.08 }, buffText: '매출 +8% · 별점 +0.08' },
  lux_celadon:   { name: '고려청자 매병', icon: '🏺', kind: 'deco', lux: true, era: 'goryeo', price: 400000, desc: '비취색 청자에 학이 날아요', ratingBonus: 0.06, buff: { tip: 0.25 }, buffText: '팁 +25%' },
  lux_moonjar:   { name: '백자 달항아리', icon: '🌕', kind: 'deco', lux: true, era: 'joseon', price: 500000, desc: '보름달처럼 둥근 하얀 항아리', ratingBonus: 0.10, buff: { patience: 0.15 }, buffText: '인내심 +15% · 별점 +0.1' },
  lux_screen:    { name: '일월오봉도 병풍', icon: '🏔️', kind: 'deco', lux: true, era: 'joseon', price: 700000, desc: '해와 달, 다섯 봉우리 그림 병풍', ratingBonus: 0.08, buff: { sales: 0.10 }, buffText: '매출 +10%' },
  lux_ufo:       { name: 'UFO 모형', icon: '🛸', kind: 'deco', lux: true, era: 'space', price: 1000000, desc: '외계인 손님이 반가워해요', ratingBonus: 0.06, buff: { visit: 0.20, sales: 0.10 }, buffText: '방문 +20% · 매출 +10%' },
  lux_crystal:   { name: '우주 수정', icon: '🔮', kind: 'deco', lux: true, era: 'space', price: 1500000, desc: '은하의 기운이 담긴 수정', ratingBonus: 0.12, buff: { sales: 0.08, tip: 0.15, patience: 0.08 }, buffText: '매출 +8% · 팁 +15% · 인내심 +8%' },
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

export const DECO_BONUS_CAP = 0.5;
// 가구 버프 최대치
export const BUFF_CAP = { patience: 0.45, tip: 0.80, visit: 0.60, sales: 0.40 };

// 홀 배치 칸 (가로 5 × 세로 2)
export const LAYOUT_GRID = { cols: 5, rows: 2 };
