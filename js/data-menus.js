// 메뉴·식재료·지점·예보 데이터
// 1차: 1호점(동네 분식집) 메뉴 완성. 2~4호점은 2차 업데이트에서 메뉴가 채워집니다.

export const INGREDIENTS = {
  tteok:    { name: '떡',       icon: '🍡', price: 700 },
  fishcake: { name: '어묵',     icon: '🐟', price: 600 },
  rice:     { name: '밥',       icon: '🍚', price: 300 },
  seaweed:  { name: '김',       icon: '🍃', price: 300 },
  veggie:   { name: '채소',     icon: '🥬', price: 400 },
  noodle:   { name: '라면사리', icon: '🥡', price: 500 },
  egg:      { name: '계란',     icon: '🥚', price: 300 },
  flour:    { name: '튀김가루', icon: '🌾', price: 400 },
};

// needs: 1인분에 필요한 재료 수, soup: 국물 요리(비 오는 날 보너스)
export const MENUS = {
  tteokbokki: { name: '떡볶이', icon: '🥘', price: 4500, needs: { tteok: 1, fishcake: 1 }, soup: false, branch: 1 },
  kimbap:     { name: '김밥',   icon: '🍙', price: 3500, needs: { rice: 1, seaweed: 1, veggie: 1 }, soup: false, branch: 1 },
  ramen:      { name: '라면',   icon: '🍜', price: 4000, needs: { noodle: 1, egg: 1 }, soup: true, branch: 1 },
  twigim:     { name: '튀김',   icon: '🍤', price: 3500, needs: { flour: 1, veggie: 1 }, soup: false, branch: 1 },
  eomuktang:  { name: '어묵탕', icon: '🍢', price: 4000, needs: { fishcake: 2 }, soup: true, branch: 1 },
};

export const BRANCHES = {
  1: { name: '동네 분식집', icon: '🏪', menus: ['tteokbokki', 'kimbap', 'ramen', 'twigim', 'eomuktang'], grid: 4 },
  2: { name: '디저트 카페', icon: '🧁', menus: [], grid: 5 },
  3: { name: '5성급 레스토랑', icon: '🍷', menus: [], grid: 5 },
  4: { name: '우주 정거장 지점', icon: '🚀', menus: [], grid: 6 },
};

// 오늘의 예보(날씨·트렌드 이벤트)
export const FORECASTS = {
  sunny:    { name: '맑음',           icon: '☀️', desc: '평범한 하루예요. 손님이 꾸준히 찾아와요.', weight: 4 },
  rain:     { name: '비 오는 날',     icon: '🌧️', desc: '국물 요리(라면·어묵탕) 가격 1.5배!', weight: 2, soupMult: 1.5 },
  cold:     { name: '추운 날',        icon: '❄️', desc: '국물 요리 가격 1.3배, 손님 인내심 조금 짧아요.', weight: 1.5, soupMult: 1.3, patienceMult: 0.9 },
  tourists: { name: '외국인 관광객',   icon: '✈️', desc: '영어 문제가 늘어나요. 대신 팁 2배!', weight: 1.5, engBoost: 0.3, tipMult: 2, minDay: 2 },
  group:    { name: '단체 손님',       icon: '🚌', desc: '손님이 2배로 몰려와요! 테이블을 빨리 치워요.', weight: 1.5, spawnMult: 2, minDay: 2 },
};

export function menuCost(menuId) {
  const m = MENUS[menuId];
  return Object.entries(m.needs).reduce((s, [ing, n]) => s + INGREDIENTS[ing].price * n, 0);
}
