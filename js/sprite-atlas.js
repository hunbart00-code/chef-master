// assets/sprites.png 아틀라스 좌표 [x, y, w, h]
// 원본 스프라이트 시트(마젠타 배경)에서 실제 픽셀 경계를 자동 검출해 잘라낸 뒤 배경을 투명 처리했습니다.
export const ATLAS_SRC = 'assets/sprites.png';
export const RECTS = {
  angry: [952, 98, 48, 48],
  angry2: [0, 166, 48, 48],
  broom: [138, 166, 41, 47],
  broom2: [181, 166, 40, 47],
  coin: [902, 98, 48, 48],
  counter: [548, 0, 112, 87],
  dish_burnt: [334, 98, 80, 61],
  dish_kimbap: [498, 98, 98, 60],
  dish_ramen: [146, 98, 92, 64],
  dish_tteokbokki: [598, 98, 100, 56],
  fridge: [490, 0, 56, 93],
  gold_egg: [302, 166, 39, 46],
  heart: [489, 166, 46, 41],
  heart2: [537, 166, 46, 41],
  ing_box: [807, 98, 47, 48],
  ing_crate: [441, 166, 46, 45],
  ing_egg: [627, 166, 46, 37],
  ing_hanwoo: [700, 98, 60, 53],
  ing_mushroom: [94, 166, 42, 47],
  ing_mushroom2: [856, 98, 44, 48],
  ing_noodle: [258, 166, 42, 46],
  ing_sack: [50, 166, 42, 47],
  ing_seaweed: [223, 166, 33, 46],
  ing_tteok: [762, 98, 43, 50],
  plant: [292, 98, 40, 62],
  rack: [662, 0, 91, 82],
  sparkle: [585, 166, 40, 38],
  star: [343, 166, 48, 46],
  star2: [393, 166, 46, 46],
  stove: [755, 0, 169, 82],
  table: [0, 98, 144, 66],
  tile_brick: [98, 0, 96, 96],
  tile_check: [392, 0, 96, 96],
  tile_cream: [196, 0, 96, 96],
  tile_diamond: [294, 0, 96, 96],
  tile_wood: [0, 0, 96, 96],
  trashcan: [240, 98, 50, 62],
  trashpile: [416, 98, 80, 60],
  trophy: [926, 0, 66, 82],
};

// 메뉴 → 음식 스프라이트 (튀김·어묵탕은 sprites.js에서 도트로 직접 그림)
export const DISH_SPRITE = {
  tteokbokki: 'dish_tteokbokki', kimbap: 'dish_kimbap', ramen: 'dish_ramen',
  twigim: 'dish_twigim', eomuktang: 'dish_eomuktang',
};

// 식재료 → 아이콘 스프라이트
export const ING_SPRITE = {
  tteok: 'ing_tteok', seaweed: 'ing_seaweed', rice: 'ing_sack', noodle: 'ing_noodle',
  egg: 'ing_egg', fishcake: 'ing_crate', flour: 'ing_box', veggie: 'ing_mushroom',
};

// 가구 → 스프라이트
export const ITEM_SPRITE = { table_wood: 'table', plant_pot: 'plant', trophy: 'trophy' };
