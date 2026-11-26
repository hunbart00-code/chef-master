// 셰프 꾸미기: 부위별 선택 → 4방향 도트 셰프를 즉석에서 그림 (외곽선·음영 자동)
// 머리 모양·머리색·피부색·눈·입·안경·볼터치·앞치마 색
import { setSprite, hasSprite } from './px.js';

export const CHEF_PARTS = {
  hair: ['긴 생머리', '단발 + 앞머리', '묶은 머리', '중단발', '바가지 머리', '짧은 머리', '삐죽 머리', '아주 짧은 머리'],
  hairColor: ['#1c1714', '#3b2619', '#5e3a22', '#8a5a32', '#c99a4a', '#3d5a9e'],
  skin: ['#ffe0c4', '#f7cfa8', '#e8b48a', '#c98e64'],
  eyes: ['동그란 눈', '웃는 눈', '반짝 눈', '점 눈'],
  mouth: ['미소', '활짝', '작은 입', '오 입'],
  glasses: ['없음', '동그란 안경', '네모 안경'],
  blush: ['없음', '있음'],
  apron: ['#e0533d', '#3d6fb0', '#4fae4a', '#f2b632', '#9b5fd1', '#ef7fb0', '#2f2f3a'],
};
export const CHEF_PART_LABEL = { hair: '머리 모양', hairColor: '머리색', skin: '피부색', eyes: '눈', mouth: '입', glasses: '안경', blush: '볼터치', apron: '앞치마' };

export const defaultChefStyle = () => ({ hair: 5, hairColor: 0, skin: 0, eyes: 0, mouth: 0, glasses: 0, blush: 1, apron: 0 });
export function randomChefStyle() {
  const s = {};
  for (const [k, v] of Object.entries(CHEF_PARTS)) s[k] = Math.floor(Math.random() * v.length);
  s.hairColor = Math.random() < 0.8 ? Math.floor(Math.random() * 3) : s.hairColor;
  s.glasses = Math.random() < 0.65 ? 0 : s.glasses;
  return s;
}

const W = 16;
const blank = () => Array.from({ length: 23 }, () => Array(W).fill('.'));
const put = (g, r, c, ch) => { if (r >= 0 && r < g.length && c >= 0 && c < W) g[r][c] = ch; };
const rowFill = (g, r, c0, c1, ch) => { for (let c = c0; c <= c1; c++) put(g, r, c, ch); };
const paint = (g, rows, at = 0) => rows.forEach((s, i) => [...s].forEach((ch, c) => { if (ch !== '.') put(g, at + i, c, ch); }));

// ---------- 몸 ----------
const HAT = ['....HHHHHHHH....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '...HHHHHHHHHH...', '...BBBBBBBBBB...'];
const HEAD = ['..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '...SSSSSSSSSS...', '....SSSSSSSS....'];
const BODY_F = ['....NNNNNNNN....', '...WWWNNNNWWW...', '..SWWWWAAWWWWS..', '..SWWAAAAAAWWS..', '...WAAAAAAAAW...', '....AAAAAAAA....', '....AAAAAAAA....', '....PPP..PPP....', '....KKK..KKK....'];
const BODY_B = ['....WWWWWWWW....', '...WWWWAAWWWW...', '..SWWWWAAWWWWS..', '..SWWWWAAWWWWS..', '...WWWAAAAWWW...', '....WWWWWWWW....', '....WWWWWWWW....', '....PPP..PPP....', '....KKK..KKK....'];
const BODY_S = ['.....NNNNNN.....', '....WWWWNNWW....', '....WWWWAAAS....', '....WWWAAAAS....', '....WWWAAAAA....', '.....WWAAAAA....', '.....WWAAAAA....', '.....PPP.PPP....', '.....KKK.KKK....'];
const HEAD_S = ['...SSSSSSSSSS...', '...SSSSSSSSSSS..', '...SSSSSSSSSSS..', '...SSSSSSSSSSS..', '...SSSSSSSSSSS..', '...SSSSSSSSSS...', '....SSSSSSSSS...', '.....SSSSSSS....'];

// 머리 길이(뒤·옆으로 내려오는 끝 행)
const LEN = [19, 13, 12, 15, 11, 10, 10, 8];

function hairFront(g, st) {
  rowFill(g, 6, 2, 13, 'R');
  const sides = (to, outer) => { for (let r = 6; r <= to; r++) { put(g, r, 2, 'R'); put(g, r, 13, 'R'); if (outer && r >= 7) { put(g, r, 1, 'R'); put(g, r, 14, 'R'); } } };
  switch (st) {
    case 0: rowFill(g, 7, 2, 8, 'R'); put(g, 8, 2, 'R'); sides(19, true); for (let r = 14; r <= 19; r++) { put(g, r, 2, 'R'); put(g, r, 13, 'R'); } break;
    case 1: rowFill(g, 7, 2, 13, 'R'); rowFill(g, 8, 2, 13, 'R'); sides(13, true); break;
    case 2: rowFill(g, 7, 2, 6, 'R'); rowFill(g, 7, 9, 13, 'R'); sides(10, false); put(g, 8, 14, 'R'); put(g, 9, 14, 'R'); break;
    case 3: rowFill(g, 7, 3, 12, 'R'); put(g, 8, 3, 'R'); put(g, 8, 12, 'R'); sides(15, true); break;
    case 4: rowFill(g, 7, 2, 13, 'R'); rowFill(g, 8, 2, 13, 'R'); sides(11, false); break;
    case 5: rowFill(g, 7, 2, 9, 'R'); put(g, 8, 2, 'R'); sides(9, false); break;
    case 6: for (let c = 2; c <= 13; c++) if (c % 2) put(g, 7, c, 'R'); put(g, 5, 3, 'R'); put(g, 5, 12, 'R'); rowFill(g, 7, 2, 3, 'R'); rowFill(g, 7, 12, 13, 'R'); sides(9, false); break;
    default: sides(8, false); break;
  }
}

function hairBack(g, st) {
  for (let r = 6; r <= 13; r++) for (let c = 0; c < W; c++) if (g[r][c] === 'S') g[r][c] = 'R';
  const len = LEN[st];
  if (st === 2) { for (let r = 12; r <= 18; r++) rowFill(g, r, 7, 8, 'R'); rowFill(g, 11, 6, 9, 'L'); return; }
  for (let r = 14; r <= len; r++) rowFill(g, r, len >= 17 ? 2 : 3, len >= 17 ? 13 : 12, 'R');
  if (len >= 14) for (let r = 7; r <= Math.min(len, 13); r++) { put(g, r, 1, 'R'); put(g, r, 14, 'R'); }
}

function hairSide(g, st) {
  rowFill(g, 6, 3, 13, 'R');
  for (let r = 6; r <= 12; r++) rowFill(g, r, 3, 6, 'R');
  const len = LEN[st];
  if ([0, 1, 4].includes(st)) rowFill(g, 7, 7, 13, 'R');
  else if (st !== 7) rowFill(g, 7, 7, 10, 'R');
  if (st === 4) rowFill(g, 8, 7, 12, 'R');
  if (st === 6) { put(g, 5, 4, 'R'); put(g, 5, 7, 'R'); }
  if (st === 2) { for (let r = 8; r <= 15; r++) put(g, r, 2, 'R'); put(g, 8, 1, 'R'); rowFill(g, 9, 2, 3, 'L'); return; }
  for (let r = 13; r <= len; r++) rowFill(g, r, len >= 17 ? 2 : 3, len >= 17 ? 5 : 6, 'R');
}

function eyesFront(g, t) {
  const L = 5, Rr = 10;
  if (t === 0) for (const c of [L, Rr]) { put(g, 9, c, 'E'); put(g, 10, c, 'E'); }
  if (t === 1) for (const c of [L, Rr]) { put(g, 9, c, 'E'); put(g, 10, c - 1, 'E'); put(g, 10, c + 1, 'E'); }
  if (t === 2) for (const c of [L, Rr]) { put(g, 9, c, 'X'); put(g, 9, c + 1, 'E'); put(g, 10, c, 'E'); put(g, 10, c + 1, 'E'); }
  if (t === 3) for (const c of [L, Rr]) put(g, 10, c, 'E');
}
function mouthFront(g, t, cx = 7) {
  if (t === 0) { put(g, 11, cx - 1, 'M'); put(g, 11, cx + 2, 'M'); rowFill(g, 12, cx, cx + 1, 'M'); }
  if (t === 1) { rowFill(g, 11, cx - 1, cx + 2, 'M'); rowFill(g, 11, cx, cx + 1, 'T'); rowFill(g, 12, cx, cx + 1, 'M'); }
  if (t === 2) rowFill(g, 12, cx, cx + 1, 'M');
  if (t === 3) { rowFill(g, 11, cx, cx + 1, 'M'); rowFill(g, 12, cx, cx + 1, 'M'); }
}
function glassesFront(g, t) {
  if (!t) return;
  for (const c0 of [3, 9]) {
    if (t === 1) { put(g, 8, c0 + 1, 'G'); put(g, 8, c0 + 2, 'G'); put(g, 11, c0 + 1, 'G'); put(g, 11, c0 + 2, 'G'); for (const r of [9, 10]) { put(g, r, c0, 'G'); put(g, r, c0 + 3, 'G'); } }
    else { rowFill(g, 8, c0, c0 + 3, 'G'); rowFill(g, 11, c0, c0 + 3, 'G'); for (const r of [9, 10]) { put(g, r, c0, 'G'); put(g, r, c0 + 3, 'G'); } }
  }
  rowFill(g, 9, 7, 8, 'G');
}

function build(dir, s) {
  const g = blank();
  paint(g, HAT, 0);
  if (dir === 'front') {
    paint(g, HEAD, 6); paint(g, BODY_F, 14);
    if (s.blush) { put(g, 11, 3, 'C'); put(g, 11, 12, 'C'); }
    eyesFront(g, s.eyes); mouthFront(g, s.mouth); glassesFront(g, s.glasses); hairFront(g, s.hair);
  } else if (dir === 'back') {
    paint(g, HEAD, 6); paint(g, BODY_B, 14); hairBack(g, s.hair);
  } else {
    paint(g, HEAD_S, 6); paint(g, BODY_S, 14);
    if (s.blush) put(g, 11, 10, 'C');
    if (s.eyes === 1) { put(g, 9, 10, 'E'); put(g, 10, 11, 'E'); } else if (s.eyes === 3) put(g, 10, 11, 'E'); else { put(g, 9, 11, 'E'); put(g, 10, 11, 'E'); }
    if (s.mouth === 1) { put(g, 12, 12, 'M'); put(g, 11, 12, 'T'); } else put(g, 12, 12, 'M');
    if (s.glasses) { rowFill(g, 8, 10, 12, 'G'); put(g, 9, 10, 'G'); put(g, 10, 10, 'G'); rowFill(g, 11, 10, 12, 'G'); rowFill(g, 9, 6, 9, 'G'); }
    hairSide(g, s.hair);
  }
  return g;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function render(grid, pal, flip = false) {
  const h = grid.length, w = W;
  const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2;
  const g = c.getContext('2d');
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? grid[y][x] : '.');
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const ch = at(x, y);
    let col = null;
    if (ch === '.') { if ([at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((k) => k !== '.')) col = '#1a0f0a'; }
    else {
      col = pal[ch];
      if (col && 'HWARSBPN'.includes(ch)) {
        if (at(x + 1, y) === '.' || at(x, y + 1) === '.') col = shade(col, 0.8);
        else if (at(x - 1, y) === '.' || at(x, y - 1) === '.') col = shade(col, 1.08);
      }
    }
    if (col) { g.fillStyle = col; g.fillRect(flip ? w - x : x + 1, y + 1, 1, 1); }
  }
  return c;
}

export const chefKey = (s) => `cc_${['hair', 'hairColor', 'skin', 'eyes', 'mouth', 'glasses', 'blush', 'apron'].map((k) => s[k] ?? 0).join('')}`;

/** 스타일 → 스프라이트 등록 (이미 있으면 재사용), 시트 이름 반환 */
export function registerChef(s) {
  const key = chefKey(s);
  if (hasSprite(`${key}_front`)) return key;
  const apron = CHEF_PARTS.apron[s.apron] || CHEF_PARTS.apron[0];
  const pal = {
    H: '#ffffff', B: '#e2ddd2', S: CHEF_PARTS.skin[s.skin] || CHEF_PARTS.skin[0], E: '#24160f', X: '#ffffff', M: '#a8463c', T: '#ffffff',
    C: '#f49a94', R: CHEF_PARTS.hairColor[s.hairColor] || CHEF_PARTS.hairColor[0], L: '#e0533d',
    W: '#f4f2ec', A: apron, N: shade(apron, 0.85), P: '#3a3a48', K: '#24160f', G: '#2a2a33',
  };
  setSprite(`${key}_front`, render(build('front', s), pal));
  setSprite(`${key}_back`, render(build('back', s), pal));
  setSprite(`${key}_right`, render(build('side', s), pal));
  setSprite(`${key}_left`, render(build('side', s), pal, true));
  return key;
}

/** 가게 데이터 → 셰프 시트 이름 (꾸미기 했으면 그걸, 아니면 예전 셰프) */
export const chefSheetOf = (shop) => (shop?.chefStyle ? registerChef(shop.chefStyle) : (shop?.chefLook || 'chef_m'));
