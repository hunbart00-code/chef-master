// 가게 확장 단계: 돈을 모아 방을 넓히면 테이블 자리가 늘어남
// 각 단계의 방 크기(1배 픽셀)와 가게 안 배치 좌표를 계산
export const SHOP_LEVELS = [
  { name: '작은 분식집', price: 0, w: 256, h: 200, cols: 3, rows: 1 },
  { name: '동네 분식집', price: 80000, w: 352, h: 256, cols: 4, rows: 2 },
  { name: '넓은 분식집', price: 250000, w: 448, h: 256, cols: 5, rows: 2 },
];

export const levelOf = (state) => Math.max(0, Math.min(SHOP_LEVELS.length - 1, state?.shopLevel ?? 0));
export const gridOf = (state) => { const L = SHOP_LEVELS[levelOf(state)]; return { cols: L.cols, rows: L.rows }; };

/** 단계별 가게 안 좌표 */
const POS_X_OF = (barX1) => barX1 + 30;

export function geometry(level) {
  const L = SHOP_LEVELS[level];
  const w = L.w, h = L.h;
  const small = level === 0;
  const barX1 = small ? 168 : level === 1 ? 236 : 300;
  const hallY1 = h - 24;
  const stools = [];
  for (let x = 70; x < barX1 - 50; x += 40) stools.push(x); // 오른쪽 끝은 픽업 자리
  return {
    RW: w, RH: h,
    KITCHEN_Y: 84,
    KITCHEN: { x0: 41, x1: barX1, y0: 48, y1: 100 },
    BAR: { x0: 28, x1: barX1, top: 86, base: 121, vx1: 38, vy0: 48 },
    KDOOR_X: barX1 + 8,
    HALL: { x0: 24, x1: w - 24, y0: 140, y1: hallY1 },
    DOOR: { x: 64, y: h - 4 },
    AISLE_Y: L.rows === 1 ? hallY1 + 2 : 186,
    PASS: { x: barX1 - 22, y: 127 },   // 서빙 직원이 서는 바 앞 픽업 자리
    PASS_DISH_X: barX1 - 22,          // 셰프가 요리를 올려 두는 바 위 자리
    CHEF_HOME: { x: small ? 104 : 160, y: 94 },
    HALL_TOP: 137,
    STOOLS: stools,
    LAMPS: [Math.round(w * 0.27), Math.round(w * 0.76)],
    APPL: small ? { fridge: 58, stove: 104, rack: 146 }
      : level === 1 ? { rack: 72, fridge: 112, stove: 160, extra: [{ name: 'prep', x: 200 }, { name: 'sink', x: 224 }] }
        : { rack: 72, fridge: 112, stove: 160, extra: [{ name: 'prep', x: 200 }, { name: 'sink', x: 224 }, { name: 'pot', x: 250 }, { name: 'spice_shelf', x: 278 }] },
    // 벽 장식 (중심 x, 바닥 y)
    WALL: small ? [{ name: 'clock', x: 160, y: 30 }, { name: 'poster', x: 228, y: 40 }]
      : level === 1 ? [{ name: 'window', x: 212, y: 40 }, { name: 'menu_frame', x: 302, y: 40 }]
        : [{ name: 'window', x: 262, y: 40 }, { name: 'menu_frame', x: 302, y: 40 }, { name: 'clock', x: 380, y: 32 }, { name: 'poster', x: 410, y: 40 }],
    POS_X: barX1 + 30,
    CHALK_X: Math.round((41 + barX1) / 2) + (small ? 0 : 20),
    HOMES: {
      server: { x: barX1 + 38, y: 134 },
      cleaner: { x: w - 76, y: 128 },
      guard: { x: 92, y: hallY1 - 4 },
    },
    GRID: { cols: L.cols, rows: L.rows },
  };
}
