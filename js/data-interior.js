// 가구·인테리어·주방 설비 데이터
// kind: table(손님 착석) | deco(별점 보너스)

export const ITEMS = {
  table_wood: { name: '나무 테이블', icon: '🪑', kind: 'table', price: 15000, desc: '손님 1팀이 앉아요.' },
  plant_pot:  { name: '화분',       icon: '🪴', kind: 'deco',  price: 6000,  desc: '가게 분위기 UP (별점 +)', ratingBonus: 0.04 },
  lamp:       { name: '스탠드 조명', icon: '🏮', kind: 'deco',  price: 9000,  desc: '따뜻한 조명 (별점 +)', ratingBonus: 0.06 },
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
