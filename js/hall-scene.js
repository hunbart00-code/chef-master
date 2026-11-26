// 매장 배경(정적 레이어) — 카이로소프트풍 2.5D 3단 구성
// [상단] 붉은 벽돌 뒷벽 + 체크 바닥 주방(냉장고·화구·반납대·포스기)  [중앙] 원목 마루 홀  [하단] 유리문 입구 + 보도블록 + 도로
import { getSprite } from './sprites.js';

export const W = 1000;
export const H = 680;
export const Z = {
  wallBottom: 86,      // 벽돌 벽 끝
  kitchenBottom: 160,  // 주방 바닥 끝 (홀 시작)
  hallTop: 168,
  hallBottom: 560,     // 앞벽
  frontBottom: 582,
  sidewalkBottom: 648,
  doorX: 500,
};
export const MARGIN = 220; // 넓은 화면에서 좌우로 이어지는 배경 여유분
export const HALL = { x0: 30, x1: 970, y0: 168, y1: 556 };
export const APPLIANCE_FLOOR = 156;

// 가구 배치 좌표
export function cellCenter(gx, gy, G = 4) {
  const cw = (HALL.x1 - HALL.x0) / G;
  const ch = (HALL.y1 - HALL.y0) / G;
  return { x: HALL.x0 + (gx + 0.5) * cw, y: HALL.y0 + (gy + 0.5) * ch, cw, ch };
}

// 스프라이트를 '바닥 중앙' 기준으로 그림. 그린 사각형 반환
export function drawAt(g, name, cx, bottom, width) {
  const s = getSprite(name);
  if (!s) return null;
  const w = width, h = (s.height / s.width) * width;
  g.drawImage(s, cx - w / 2, bottom - h, w, h);
  return { x: cx - w / 2, y: bottom - h, w, h };
}

export function spriteSize(name, width) {
  const s = getSprite(name);
  return s ? { w: width, h: (s.height / s.width) * width } : { w: width, h: width };
}

function tile(g, name, x0, y0, x1, y1, size) {
  const s = getSprite(name);
  if (!s) return;
  g.save();
  g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  for (let y = y0; y < y1; y += size) for (let x = x0; x < x1; x += size) g.drawImage(s, x, y, size + 0.5, size + 0.5);
  g.restore();
}

const OUT = '#24160f';

function px(g, x, y, w, h, fill, outline = true) {
  g.fillStyle = fill; g.fillRect(x, y, w, h);
  if (outline) { g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); }
}

/**
 * 정적 배경 렌더 (해상도 배수 scale)
 * @returns {{canvas:HTMLCanvasElement, appliances:object}}
 */
export function buildBackground({ menuLines = [], shopName = '', scale = 2 }) {
  const c = document.createElement('canvas');
  const M = MARGIN, L = -M, R = W + M;
  c.width = (W + 2 * M) * scale; c.height = H * scale;
  const g = c.getContext('2d');
  g.scale(scale, scale);
  g.translate(M, 0);
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';

  // ---------- 상단: 벽돌 벽 ----------
  tile(g, 'tile_brick', L, 0, R, Z.wallBottom, 58);
  g.fillStyle = 'rgba(40,10,0,0.12)'; g.fillRect(L, 0, R - L, Z.wallBottom);
  // 걸레받이
  px(g, L, Z.wallBottom - 8, R - L, 10, '#8a5426');
  g.fillStyle = '#c98a4b'; g.fillRect(L, Z.wallBottom - 6, R - L, 3);

  // ---------- 주방 체크 바닥 ----------
  tile(g, 'tile_check', L, Z.wallBottom + 2, R, Z.kitchenBottom, 36);
  g.fillStyle = 'rgba(255,240,220,0.18)'; g.fillRect(L, Z.wallBottom + 2, R - L, Z.kitchenBottom - Z.wallBottom);

  // ---------- 중앙: 원목 마루 홀 ----------
  tile(g, 'tile_wood', L, Z.kitchenBottom, R, Z.hallBottom, 84);
  // 홀 테두리 그림자(입체감)
  const grd = g.createLinearGradient(0, Z.kitchenBottom, 0, Z.kitchenBottom + 26);
  grd.addColorStop(0, 'rgba(40,20,5,0.35)'); grd.addColorStop(1, 'rgba(40,20,5,0)');
  g.fillStyle = grd; g.fillRect(L, Z.kitchenBottom, R - L, 26);
  // 주방-홀 경계 카운터 턱
  px(g, L, Z.kitchenBottom - 4, 110 - L, 10, '#c98a4b');
  px(g, 560, Z.kitchenBottom - 4, R - 560, 10, '#c98a4b');
  g.fillStyle = '#e8b878'; g.fillRect(L, Z.kitchenBottom - 2, 108 - L, 2); g.fillRect(562, Z.kitchenBottom - 2, R - 562, 2);

  // ---------- 벽 장식: 창문·메뉴판·간판 ----------
  // 창문 프레임 (안쪽 하늘은 동적 레이어에서)
  px(g, 492, 8, 132, 66, '#8a5426');
  // 메뉴판
  px(g, 640, 6, 170, 72, '#6b4a2b');
  px(g, 646, 12, 158, 60, '#2f4a32', false);
  g.fillStyle = '#ffe9a8'; g.font = 'bold 11px Galmuri11, sans-serif'; g.textBaseline = 'top';
  g.fillText('★ MENU ★', 696, 14);
  g.font = '10px Galmuri11, sans-serif';
  menuLines.slice(0, 6).forEach((l, i) => {
    const col = i < 3 ? 0 : 1;
    const x = 651 + col * 78, y = 29 + (i % 3) * 14;
    const price = l.price.replace('원', '');
    g.fillStyle = '#ffffff'; g.fillText(l.name, x, y);
    g.fillStyle = l.bonus ? '#8cff86' : '#ffd23f';
    const tw = g.measureText(price).width; g.fillText(price, x + 74 - tw, y);
  });
  g.fillStyle = '#5f7a5f'; g.fillRect(726, 28, 2, 40);
  // 간판
  px(g, 830, 10, 160, 30, '#e0533d');
  g.fillStyle = '#fff'; g.font = 'bold 13px Galmuri11, sans-serif';
  const sw = g.measureText(shopName).width; g.fillText(shopName, 910 - sw / 2, 18);
  // 벽 시계
  g.fillStyle = OUT; g.beginPath(); g.arc(456, 34, 17, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff7e6'; g.beginPath(); g.arc(456, 34, 14, 0, Math.PI * 2); g.fill();

  // ---------- 주방 기구 일렬 배치 ----------
  const ap = {};
  ap.fridge = drawAt(g, 'fridge', 50, APPLIANCE_FLOOR + 2, 74);
  ap.stove = drawAt(g, 'stove', 230, APPLIANCE_FLOOR, 220);
  ap.rack = drawAt(g, 'rack', 395, APPLIANCE_FLOOR, 104);
  ap.counter = drawAt(g, 'counter', 905, APPLIANCE_FLOOR + 4, 150);
  drawAt(g, 'trashcan', 470, APPLIANCE_FLOOR + 2, 34);

  // ---------- 하단: 앞벽 + 유리문 ----------
  const dx0 = Z.doorX - 46, dx1 = Z.doorX + 46;
  // 앞벽(낮은 원목 벽 + 쇼윈도)
  for (const [x0, x1] of [[L, dx0], [dx1, R]]) {
    px(g, x0, Z.hallBottom, x1 - x0, Z.frontBottom - Z.hallBottom, '#a86a35');
    g.fillStyle = '#c98a4b'; g.fillRect(x0 + 2, Z.hallBottom + 2, x1 - x0 - 4, 4);
    g.fillStyle = '#8a5426'; g.fillRect(x0 + 2, Z.frontBottom - 6, x1 - x0 - 4, 4);
  }
  // 문틀
  px(g, dx0 - 4, Z.hallBottom - 6, 8, Z.frontBottom - Z.hallBottom + 8, '#6b4a2b');
  px(g, dx1 - 4, Z.hallBottom - 6, 8, Z.frontBottom - Z.hallBottom + 8, '#6b4a2b');
  // 문 앞 매트
  px(g, Z.doorX - 40, Z.hallBottom - 22, 80, 18, '#c0392b');
  g.fillStyle = '#e8b878'; g.font = 'bold 9px Galmuri11, sans-serif'; g.fillText('WELCOME', Z.doorX - 21, Z.hallBottom - 17);

  // ---------- 보도블록 ----------
  tile(g, 'tile_diamond', L, Z.frontBottom, R, Z.sidewalkBottom, 46);
  g.fillStyle = 'rgba(120,90,50,0.12)'; g.fillRect(L, Z.frontBottom, R - L, Z.sidewalkBottom - Z.frontBottom);
  g.fillStyle = 'rgba(40,20,5,0.25)'; g.fillRect(L, Z.frontBottom, R - L, 5);
  // 연석
  px(g, L, Z.sidewalkBottom - 4, R - L, 8, '#b8b2a6');
  // ---------- 도로 ----------
  g.fillStyle = '#4f5058'; g.fillRect(L, Z.sidewalkBottom + 4, R - L, H - Z.sidewalkBottom - 4);
  for (let i = 0; i < 520; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#5a5b63' : '#46474e';
    g.fillRect(L + Math.random() * (R - L), Z.sidewalkBottom + 6 + Math.random() * 26, 2, 2);
  }
  g.fillStyle = '#ffd23f';
  for (let x = L + 10; x < R; x += 70) g.fillRect(x, H - 12, 36, 4);

  return { canvas: c, appliances: ap };
}

// ---------- 나무 (도트, 동적 정렬 대상) ----------
let treeCanvas = null;
export function treeSprite() {
  if (treeCanvas) return treeCanvas;
  const rows = [
    '.....LLLLLL.....',
    '...LLLLLLLLLL...',
    '..LLLlLLLLLLLL..',
    '.LLLllLLLLLLlLL.',
    '.LLLLLLLLLLLLLL.',
    'LLLLLLLLLlLLLLLL',
    'LLlLLLLLLLLLLLLL',
    '.LLLLLLLLLLLLLL.',
    '.LLLLLlLLLLLLLL.',
    '..LLLLLLLLLLLL..',
    '....LLLLLLLL....',
    '.......BB.......',
    '.......BB.......',
    '.......BB.......',
    '......BBBB......',
  ];
  const pal = { L: '#4fae4a', l: '#8fd86a', B: '#8a5426' };
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = (w + 2) * 4; c.height = (h + 2) * 4;
  const g = c.getContext('2d');
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] : '.');
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const ch = at(x, y);
    let col = null;
    if (ch === '.') { if ([at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((k) => k !== '.')) col = OUT; }
    else { col = pal[ch]; if (ch === 'L' && (at(x + 1, y) === '.' || at(x, y + 1) === '.')) col = '#2f7a2c'; }
    if (col) { g.fillStyle = col; g.fillRect((x + 1) * 4, (y + 1) * 4, 4, 4); }
  }
  treeCanvas = c;
  return c;
}
