// 시간여행: 가게를 다른 시대·행성으로 옮겨 장사하기
// 조건을 채우면 다음 장소가 열리고, 열린 장소끼리는 영업 준비 때 자유롭게 이동
// priceMult: 손님이 내는 돈 배수, patience: 손님 인내심 배수
// tint: 방 색 보정 [r, g, b 곱하기, r, g, b 더하기]
export const ERAS = [
  {
    id: 'modern', name: '현대 분식집', icon: '🏙️', short: '현대',
    desc: '우리 동네 분식집. 학생과 직장인 손님이 찾아와요.',
    priceMult: 1, patience: 1, tint: null,
    guests: ['cust_office_m', 'cust_kid', 'cust_office_f'], rowdy: ['rowdy_loud', 'rowdy_picky', 'rowdy_sneak'], vip: null,
    wall: [], floor: null, unlock: null,
  },
  {
    id: 'stone', name: '선사시대 동굴 식당', icon: '🦴', short: '선사',
    desc: '돌도끼 들고 온 원시인들! 느긋하지만 몽둥이 든 손님은 조심해요.',
    priceMult: 1.15, patience: 1.2, tint: [0.8, 0.72, 0.6, 12, 6, 0],
    guests: ['era_stone_hunter', 'era_stone_gatherer', 'era_stone_kid'], rowdy: ['era_stone_brute'], vip: 'era_stone_chief',
    wall: ['deco_cave_paint', 'deco_cave_paint'], floor: 'deco_bonfire',
    unlock: { assets: 150000, day: 4 },
  },
  {
    id: 'samguk', name: '삼국시대 장터', icon: '⚔️', short: '삼국',
    desc: '화랑과 장군이 북적이는 장터 국밥집! 손님 지갑이 두둑해요.',
    priceMult: 1.3, patience: 1.0, tint: [1.1, 0.88, 0.76, 6, 0, 0],
    guests: ['era_sg_hwarang', 'era_sg_farmer', 'era_sg_merchant'], rowdy: ['era_sg_bandit'], vip: 'era_sg_general',
    wall: ['deco_banner', 'deco_rooftile'], floor: null,
    unlock: { assets: 400000, perfect: 30 },
  },
  {
    id: 'goryeo', name: '고려 벽란도 객주', icon: '🏺', short: '고려',
    desc: '세계 상인이 모이는 국제 무역항! 먼 나라 손님도 와요.',
    priceMult: 1.5, patience: 1.0, tint: [0.84, 1.0, 0.98, 0, 8, 10],
    guests: ['era_gr_merchant', 'era_gr_monk', 'era_gr_trader'], rowdy: ['era_gr_sailor'], vip: 'era_gr_envoy',
    wall: ['deco_ship', 'deco_rooftile'], floor: null,
    unlock: { assets: 900000, rating: 3.8 },
  },
  {
    id: 'joseon', name: '조선 한양 주막', icon: '🏮', short: '조선',
    desc: '선비와 보부상이 쉬어 가는 주막. 양반 손님은 조금 급해요. 암행어사를 조심!',
    priceMult: 1.7, patience: 0.9, tint: [1.08, 1.04, 0.9, 16, 12, 0],
    guests: ['era_js_seonbi', 'era_js_lady', 'era_js_peddler', 'era_js_kid'], rowdy: ['era_js_thug'], vip: 'era_js_inspector',
    wall: ['deco_lantern', 'deco_hanji', 'deco_lantern'], floor: null,
    unlock: { assets: 1800000, perfect: 120 },
  },
  {
    id: 'space', name: '우주 정거장 분식집', icon: '🛸', short: '우주',
    desc: '은하계 최초의 떡볶이 가게! 외계인 손님은 돈을 아주 많이 내요.',
    priceMult: 2.0, patience: 1.1, tint: [0.72, 0.78, 1.18, 0, 4, 14],
    guests: ['era_sp_green', 'era_sp_blue', 'era_sp_pink'], rowdy: ['era_sp_pirate'], vip: 'era_sp_captain',
    wall: ['deco_starwin', 'deco_starwin'], floor: 'deco_robot',
    unlock: { assets: 3500000, rating: 4.3, perfect: 250 },
  },
];

export const eraById = (id) => ERAS.find((e) => e.id === id) || ERAS[0];
export const eraOf = (state) => eraById(state?.era);

// 현대 손님 이름 (도감용)
export const MODERN_NAMES = {
  cust_office_m: '회사원 아저씨', cust_kid: '초등학생', cust_office_f: '회사원 언니',
  rowdy_loud: '시끄러운 손님', rowdy_picky: '까다로운 손님', rowdy_sneak: '몰래 가는 손님',
};
/** 장소의 도감 목록 [{ sheet, kind: 'guest'|'rowdy'|'vip' }] */
export const dexListOf = (era) => [
  ...era.guests.map((sheet) => ({ sheet, kind: 'guest' })),
  ...era.rowdy.map((sheet) => ({ sheet, kind: 'rowdy' })),
  ...(era.vip ? [{ sheet: era.vip, kind: 'vip' }] : []),
];
/** 도감 한 장소를 모두 모으면 받는 보상 */
export const dexReward = (era) => 30000 * (ERAS.indexOf(era) + 1);
