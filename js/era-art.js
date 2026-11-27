// 시간여행 장소의 손님·사치품·장식 도트를 코드로 그려서 등록 (외곽선·음영 자동)
import { setSprite, hasSprite } from './px.js?v=20261127021108';

// ---------- 공통: 글자 격자 → 픽셀 캔버스 ----------
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
const NO_SHADE = 'EXMZ';
function render(rows, pal, flip = false) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas'); c.width = w + 2; c.height = h + 2;
  const g = c.getContext('2d');
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? (rows[y][x] || '.') : '.');
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    const ch = at(x, y);
    let col = null;
    if (ch === '.') { if ([at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((k) => k !== '.')) col = '#1a0f0a'; }
    else {
      col = pal[ch] || '#ff00ff';
      if (!NO_SHADE.includes(ch) && col.startsWith('#')) {
        if (at(x + 1, y) === '.' || at(x, y + 1) === '.') col = shade(col, 0.8);
        else if (at(x - 1, y) === '.' || at(x, y - 1) === '.') col = shade(col, 1.1);
      }
    }
    if (col) { g.fillStyle = col; g.fillRect(flip ? w - x : x + 1, y + 1, 1, 1); }
  }
  return c;
}

// ---------- 사람(손님) 만들기: 16 × 23 앞모습 ----------
const W = 16, H = 23;
const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
const put = (g, r, c, ch) => { if (r >= 0 && r < H && c >= 0 && c < W) g[r][c] = ch; };
const fill = (g, r, c0, c1, ch) => { for (let c = c0; c <= c1; c++) put(g, r, c, ch); };
const paint = (g, rows, at = 0) => rows.forEach((s, i) => [...s].forEach((ch, c) => { if (ch !== '.') put(g, at + i, c, ch); }));

const HEAD = ['..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '..SSSSSSSSSSSS..', '...SSSSSSSSSS...', '....SSSSSSSS....'];
const BODIES = {
  shirt: ['....NNNNNNNN....', '...TTTTTTTTTT...', '..STTTTUUTTTTS..', '..STTTTUUTTTTS..', '...TTTTTTTTTT...', '....VVVVVVVV....', '....PPPPPPPP....', '....PPP..PPP....', '....KKK..KKK....'],
  robe: ['....NNNNNNNN....', '...TTTTTTTTTT...', '..STTTTUUTTTTS..', '..STTTTTTTTTTS..', '...TTVVVVVVTT...', '...TTTTTTTTTT...', '...TTTTTTTTTT...', '...TTTTTTTTTT...', '....KKK..KKK....'],
  hanbok: ['....NNNNNNNN....', '...TTTTTTTTTT...', '..STTTTLLTTTTS..', '..STTTTTLTTTTS..', '...QQQQQQQQQQ...', '...QQQQQQQQQQ...', '..QQQQQQQQQQQQ..', '..QQQQQQQQQQQQ..', '....KKK..KKK....'],
  fur: ['....SSSSSSSS....', '...TTTSSSSSSS...', '..STTOTTSSSSSS..', '..STTTTTOTTTTS..', '...TOTTTTTTOT...', '...TTTTOTTTTT...', '....T.TT.TT.T...', '....SSS..SSS....', '....KKK..KKK....'],
  armor: ['....NNNNNNNN....', '...TUTUTUTUTU...', '..STUTUTUTUTUS..', '..STTTTYYTTTTS..', '...UTUTUTUTUT...', '....VVVVVVVV....', '....PPPPPPPP....', '....PPP..PPP....', '....KKK..KKK....'],
  kasa: ['....NNNNNNNN....', '...TTTTTUUTTT...', '..STTTTUUTTTTS..', '..STTTUUTTTTTS..', '...TTUUTTTTTT...', '...TUUTTTTTTT...', '...TTTTTTTTTT...', '...TTTTTTTTTT...', '....KKK..KKK....'],
  suit: ['....NNNNNNNN....', '...TTTTTTTTTT...', '..STTTTYYTTTTS..', '..STTTTTTTTTTS..', '...TTTTTTTTTT...', '....VVVVVVVV....', '....TTTTTTTT....', '....TTT..TTT....', '....KKK..KKK....'],
  cape: ['....NNNNNNNN....', '..UTTTTTTTTTTU..', '.USTTTTYYTTTTSU.', '.USTTTTTTTTTTSU.', '.UUTTTTTTTTTTUU.', '.UU.VVVVVVVV.UU.', '.UU.PPPPPPPP.UU.', '.U..PPP..PPP..U.', '....KKK..KKK....'],
  stripe: ['....NNNNNNNN....', '...TTTTTTTTTT...', '..SUUUUUUUUUUS..', '..STTTTTTTTTTS..', '...UUUUUUUUUU...', '....VVVVVVVV....', '....PPPPPPPP....', '....PPP..PPP....', '....KKK..KKK....'],
};

function hair(g, style) {
  const sides = (to, outer) => { for (let r = 6; r <= to; r++) { put(g, r, 2, 'R'); put(g, r, 13, 'R'); if (outer && r >= 7) { put(g, r, 1, 'R'); put(g, r, 14, 'R'); } } };
  switch (style) {
    case 'none': break;
    case 'short': fill(g, 6, 2, 13, 'R'); fill(g, 7, 2, 9, 'R'); sides(9, false); break;
    case 'long': fill(g, 6, 2, 13, 'R'); fill(g, 7, 2, 13, 'R'); sides(18, true); break;
    case 'wild': for (let c = 1; c <= 14; c += 2) put(g, 4, c, 'R'); fill(g, 5, 1, 14, 'R'); fill(g, 6, 1, 14, 'R'); fill(g, 7, 2, 13, 'R'); sides(12, true); break;
    case 'topknot': fill(g, 6, 2, 13, 'R'); fill(g, 7, 2, 13, 'R'); fill(g, 5, 6, 9, 'R'); fill(g, 4, 7, 8, 'R'); fill(g, 3, 7, 8, 'R'); sides(8, false); break;
    case 'bun': fill(g, 6, 2, 13, 'R'); fill(g, 7, 3, 12, 'R'); fill(g, 4, 6, 9, 'R'); fill(g, 5, 5, 10, 'R'); sides(11, false); break;
    case 'braid': fill(g, 6, 2, 13, 'R'); fill(g, 7, 2, 13, 'R'); sides(10, false); for (let r = 11; r <= 17; r++) put(g, r, 14, r % 2 ? 'R' : 'R'); put(g, 17, 14, 'L'); put(g, 18, 14, 'L'); break;
    case 'tentacle': for (let c = 2; c <= 13; c += 3) { put(g, 3, c, 'R'); put(g, 4, c + 1, 'R'); put(g, 5, c, 'R'); } fill(g, 6, 2, 13, 'R'); sides(8, false); break;
    default: fill(g, 6, 2, 13, 'R'); sides(8, false);
  }
}

function hat(g, type) {
  switch (type) {
    case 'gat': fill(g, 5, 0, 15, 'G'); for (let r = 2; r <= 4; r++) fill(g, r, 5, 10, 'G'); put(g, 12, 2, 'G'); put(g, 13, 3, 'G'); put(g, 12, 13, 'G'); put(g, 13, 12, 'G'); break;
    case 'helmet': for (let r = 2; r <= 5; r++) fill(g, r, 3 + (r === 2 ? 2 : 0), 12 - (r === 2 ? 2 : 0), 'F'); fill(g, 6, 2, 13, 'F'); fill(g, 0, 7, 8, 'L'); fill(g, 1, 7, 8, 'L'); break;
    case 'headband': fill(g, 7, 2, 13, 'L'); put(g, 8, 13, 'L'); put(g, 9, 14, 'L'); break;
    case 'bandana': fill(g, 4, 4, 11, 'L'); fill(g, 5, 3, 12, 'L'); fill(g, 6, 2, 13, 'L'); put(g, 7, 14, 'L'); put(g, 8, 15, 'L'); break;
    case 'feathers': fill(g, 6, 2, 13, 'O'); for (const c of [3, 6, 9, 12]) for (let r = 1; r <= 5; r++) put(g, r, c, r < 3 ? 'Z' : 'Y'); break;
    case 'furband': fill(g, 6, 2, 13, 'O'); put(g, 5, 4, 'W'); put(g, 4, 4, 'W'); break;
    case 'tallcap': for (let r = 1; r <= 5; r++) fill(g, r, 4, 11, 'G'); fill(g, 6, 3, 12, 'G'); break;
    case 'turban': fill(g, 3, 5, 10, 'W'); fill(g, 4, 3, 12, 'W'); fill(g, 5, 2, 13, 'W'); fill(g, 6, 2, 13, 'W'); put(g, 4, 8, 'Y'); break;
    case 'ikseon': for (let r = 3; r <= 6; r++) fill(g, r, 4, 11, 'G'); fill(g, 2, 2, 4, 'G'); fill(g, 2, 11, 13, 'G'); put(g, 5, 7, 'Y'); break;
    case 'straw': fill(g, 5, 1, 14, 'F'); fill(g, 4, 4, 11, 'F'); fill(g, 3, 5, 10, 'F'); fill(g, 5, 4, 11, 'L'); break;
    case 'jokduri': fill(g, 4, 6, 9, 'G'); fill(g, 5, 5, 10, 'G'); put(g, 4, 7, 'Y'); put(g, 3, 7, 'Y'); break;
    case 'antenna': for (let r = 2; r <= 5; r++) { put(g, r, 4, 'D'); put(g, r, 11, 'D'); } put(g, 1, 4, 'Z'); put(g, 1, 11, 'Z'); break;
    case 'captain': for (let r = 3; r <= 5; r++) fill(g, r, 3, 12, 'G'); fill(g, 6, 2, 13, 'G'); put(g, 4, 7, 'Y'); put(g, 4, 8, 'Y'); put(g, 3, 7, 'Y'); break;
    default: break;
  }
}

function face(g, f) {
  const eyes = f.eyes || 'dot';
  if (eyes === 'dot') for (const c of [5, 10]) { put(g, 9, c, 'E'); put(g, 10, c, 'E'); }
  if (eyes === 'big') for (const c of [4, 9]) { fill(g, 9, c, c + 2, 'E'); fill(g, 10, c, c + 2, 'E'); put(g, 9, c + 2, 'X'); }
  if (eyes === 'three') { for (const c of [4, 7, 10]) { put(g, 9, c, 'E'); put(g, 10, c, 'E'); } }
  if (eyes === 'visor') { fill(g, 9, 3, 12, 'Z'); fill(g, 10, 3, 12, 'Z'); }
  if (eyes === 'patch') { put(g, 9, 10, 'E'); put(g, 10, 10, 'E'); fill(g, 9, 4, 6, 'D'); fill(g, 10, 4, 6, 'D'); fill(g, 8, 2, 13, 'D'); }
  if (f.angry) { put(g, 8, 4, 'E'); put(g, 8, 5, 'E'); put(g, 8, 10, 'E'); put(g, 8, 11, 'E'); put(g, 7, 4, 'E'); put(g, 7, 11, 'E'); }
  if (f.beard) { fill(g, 12, 3, 12, 'R'); fill(g, 13, 4, 11, 'R'); put(g, 12, 7, 'M'); put(g, 12, 8, 'M'); }
  else if (f.mustache) { fill(g, 11, 5, 10, 'R'); put(g, 12, 7, 'M'); put(g, 12, 8, 'M'); }
  else if (f.mouth === 'open') { fill(g, 11, 6, 9, 'M'); fill(g, 12, 7, 8, 'M'); }
  else { put(g, 11, 6, 'M'); put(g, 11, 9, 'M'); fill(g, 12, 7, 8, 'M'); }
  if (f.blush) { put(g, 11, 3, 'C'); put(g, 11, 12, 'C'); }
}

function gear(g, items = []) {
  for (const it of items) {
    if (it === 'club') { for (let r = 13; r <= 19; r++) put(g, r, 14, 'D'); fill(g, 12, 13, 15, 'D'); fill(g, 13, 13, 15, 'D'); }
    if (it === 'spear') { for (let r = 4; r <= 20; r++) put(g, r, 15, 'D'); put(g, 3, 15, 'W'); put(g, 2, 15, 'W'); }
    if (it === 'bones') { for (const c of [5, 7, 9]) put(g, 15, c, 'W'); }
    if (it === 'sword') { for (let r = 17; r <= 21; r++) put(g, r, 13, 'F'); put(g, 16, 13, 'Y'); }
    if (it === 'fan') { fill(g, 16, 13, 15, 'W'); fill(g, 15, 14, 15, 'W'); }
    if (it === 'mapae') { put(g, 18, 10, 'Y'); put(g, 18, 11, 'Y'); put(g, 19, 10, 'Y'); put(g, 19, 11, 'Y'); }
    if (it === 'pack') { for (let r = 9; r <= 20; r++) { put(g, r, 0, 'D'); put(g, r, 15, 'D'); } fill(g, 9, 0, 1, 'D'); fill(g, 9, 14, 15, 'D'); }
    if (it === 'bag') { fill(g, 18, 12, 14, 'U'); fill(g, 19, 12, 14, 'U'); }
    if (it === 'staff') { for (let r = 6; r <= 21; r++) put(g, r, 15, 'F'); put(g, 5, 15, 'Y'); }
    if (it === 'flower') { put(g, 7, 12, 'Z'); put(g, 6, 12, 'Y'); }
    if (it === 'star') { put(g, 16, 6, 'Y'); }
  }
}

function person(spec) {
  const g = blank();
  paint(g, HEAD, 6);
  paint(g, BODIES[spec.body || 'shirt'], 14);
  face(g, spec.face || {});
  hair(g, spec.hair || 'short');
  hat(g, spec.hat);
  gear(g, spec.gear);
  return g.map((r) => r.join(''));
}

const P = (o) => ({ E: '#24160f', X: '#ffffff', M: '#a8463c', C: '#f49a94', W: '#f4f2ec', K: '#2b1d14', D: '#4a3424', Y: '#f2c230', L: '#d9413a', Z: '#7fe0ff', V: '#6b4226', ...o });

// 장소별 손님 (손님 3 + 진상 1 + VIP 1)
export const ERA_PEOPLE = {
  stone_hunter:   { name: '사냥꾼', spec: { body: 'fur', hair: 'wild', hat: 'furband', gear: ['spear', 'bones'] }, pal: P({ S: '#d9a57a', R: '#3b2619', T: '#a0703c', O: '#5e3a22', K: '#5e3a22' }) },
  stone_gatherer: { name: '열매 채집꾼', spec: { body: 'fur', hair: 'long', gear: ['flower'], face: { blush: true } }, pal: P({ S: '#e8b48a', R: '#5e3a22', T: '#c08a4a', O: '#7a4e2a', K: '#5e3a22', Z: '#ef7fb0' }) },
  stone_kid:      { name: '동굴 꼬마', spec: { body: 'fur', hair: 'short', face: { mouth: 'open', blush: true } }, pal: P({ S: '#f0c49a', R: '#2b1d14', T: '#b88a5a', O: '#6b4226', K: '#6b4226' }) },
  stone_brute:    { name: '몽둥이 원시인', rowdy: true, spec: { body: 'fur', hair: 'wild', gear: ['club'], face: { angry: true, beard: true } }, pal: P({ S: '#c98e64', R: '#2b1d14', T: '#6b4226', O: '#3b2619', K: '#3b2619' }) },
  stone_chief:    { name: '부족 족장', vip: true, spec: { body: 'fur', hair: 'wild', hat: 'feathers', gear: ['bones', 'staff'], face: { beard: true } }, pal: P({ S: '#d9a57a', R: '#cfcfcf', T: '#8a5a32', O: '#f2c230', K: '#5e3a22', Z: '#e0533d', F: '#6b4226' }) },

  sg_hwarang:  { name: '화랑', spec: { body: 'shirt', hair: 'topknot', gear: ['sword'] }, pal: P({ S: '#f7cfa8', R: '#1c1714', T: '#3d6fb0', U: '#f2c230', N: '#2f5a94', P: '#e8e2d2', V: '#f2c230', F: '#9aa4ad' }) },
  sg_farmer:   { name: '장터 아낙', spec: { body: 'hanbok', hair: 'bun', face: { blush: true } }, pal: P({ S: '#f0c49a', R: '#2b1d14', T: '#d8c9a0', N: '#c4b48a', Q: '#8a6a4a', L: '#b0443a' }) },
  sg_merchant: { name: '비단 상인', spec: { body: 'robe', hair: 'topknot', hat: 'headband', gear: ['bag'], face: { mustache: true } }, pal: P({ S: '#e8b48a', R: '#2b1d14', T: '#9b5fd1', U: '#f2c230', N: '#7a45ad', V: '#f2c230', L: '#e8e2d2' }) },
  sg_bandit:   { name: '산적', rowdy: true, spec: { body: 'shirt', hair: 'short', hat: 'bandana', gear: ['sword'], face: { angry: true, beard: true } }, pal: P({ S: '#c98e64', R: '#2b1d14', T: '#4a4a3a', U: '#6b4226', N: '#3a3a2c', P: '#3a3a2c', F: '#9aa4ad' }) },
  sg_general:  { name: '고구려 장군', vip: true, spec: { body: 'armor', hair: 'short', hat: 'helmet', gear: ['sword'], face: { mustache: true } }, pal: P({ S: '#e8b48a', R: '#1c1714', T: '#b0443a', U: '#f2c230', N: '#8a3028', P: '#4a3424', F: '#f2c230' }) },

  gr_merchant: { name: '고려 상인', spec: { body: 'robe', hair: 'short', hat: 'tallcap', gear: ['bag'] }, pal: P({ S: '#f7cfa8', R: '#1c1714', T: '#2f8a7a', U: '#e8e2d2', N: '#23695d', V: '#6b4226', G: '#24160f' }) },
  gr_monk:     { name: '스님', spec: { body: 'kasa', hair: 'none', gear: ['staff'] }, pal: P({ S: '#f0c49a', T: '#8a8a8a', U: '#b0443a', N: '#6a6a6a', F: '#8a5a32' }) },
  gr_trader:   { name: '먼 나라 상인', spec: { body: 'robe', hair: 'short', hat: 'turban', gear: ['bag'], face: { beard: true } }, pal: P({ S: '#c98e64', R: '#1c1714', T: '#d98a2a', U: '#3d6fb0', N: '#b06a1a', V: '#3d6fb0' }) },
  gr_sailor:   { name: '술 취한 뱃사람', rowdy: true, spec: { body: 'stripe', hair: 'short', hat: 'bandana', face: { angry: true, blush: true, mustache: true } }, pal: P({ S: '#e8a27a', R: '#3b2619', T: '#e8e2d2', U: '#3d6fb0', N: '#c4bca8', P: '#3a3a48', L: '#3d6fb0', C: '#e0533d' }) },
  gr_envoy:    { name: '외국 사신', vip: true, spec: { body: 'robe', hair: 'short', hat: 'tallcap', gear: ['mapae'], face: { mustache: true } }, pal: P({ S: '#f0c49a', R: '#1c1714', T: '#c0392b', U: '#f2c230', N: '#962d22', V: '#f2c230', G: '#24160f' }) },

  js_seonbi:   { name: '선비', spec: { body: 'robe', hair: 'topknot', hat: 'gat', gear: ['fan'] }, pal: P({ S: '#f7cfa8', R: '#1c1714', T: '#f4f2ec', U: '#d8d2c2', N: '#d8d2c2', V: '#3d6fb0', G: '#1c1714' }) },
  js_lady:     { name: '양반 댁 아씨', spec: { body: 'hanbok', hair: 'bun', hat: 'jokduri', face: { blush: true } }, pal: P({ S: '#ffe0c4', R: '#1c1714', T: '#ef9fc0', N: '#d982a5', Q: '#2f3a7a', L: '#c0392b', G: '#2f3a7a' }) },
  js_peddler:  { name: '보부상', spec: { body: 'shirt', hair: 'topknot', hat: 'straw', gear: ['pack'] }, pal: P({ S: '#e8b48a', R: '#1c1714', T: '#e8e2d2', U: '#c4bca8', N: '#c4bca8', P: '#e8e2d2', F: '#d9b46a', V: '#6b4226' }) },
  js_kid:      { name: '댕기 머리 아이', spec: { body: 'hanbok', hair: 'braid', face: { blush: true, mouth: 'open' } }, pal: P({ S: '#ffe0c4', R: '#1c1714', T: '#f2c230', N: '#d9a822', Q: '#e0533d', L: '#e0533d' }) },
  js_thug:     { name: '왈패', rowdy: true, spec: { body: 'shirt', hair: 'topknot', hat: 'headband', gear: ['club'], face: { angry: true, mustache: true } }, pal: P({ S: '#c98e64', R: '#1c1714', T: '#8a8a7a', U: '#6a6a5a', N: '#6a6a5a', P: '#6a6a5a' }) },
  js_inspector:{ name: '암행어사', vip: true, spec: { body: 'robe', hair: 'topknot', hat: 'gat', gear: ['mapae'], face: { mustache: true } }, pal: P({ S: '#f0c49a', R: '#1c1714', T: '#d8d2c2', U: '#b8b2a2', N: '#b8b2a2', V: '#6b4226', G: '#1c1714' }) },

  sp_green:   { name: '초록 외계인', spec: { body: 'suit', hair: 'none', hat: 'antenna', face: { eyes: 'big' } }, pal: P({ S: '#7fd36a', T: '#c8ccd4', N: '#a8acb4', V: '#7a7f8a', K: '#5a5f6a', Z: '#ffe066' }) },
  sp_blue:    { name: '눈 셋 외계인', spec: { body: 'suit', hair: 'none', face: { eyes: 'three', mouth: 'open' } }, pal: P({ S: '#6aa8e8', T: '#9b5fd1', N: '#7a45ad', V: '#f2c230', K: '#3a2a5a' }) },
  sp_pink:    { name: '촉수 머리 외계인', spec: { body: 'suit', hair: 'tentacle', face: { eyes: 'big', blush: true } }, pal: P({ S: '#f0a0d0', R: '#d870b0', T: '#4fbfb0', N: '#3a9a8e', V: '#f4f2ec', K: '#2a5a54' }) },
  sp_pirate:  { name: '우주 해적', rowdy: true, spec: { body: 'shirt', hair: 'short', hat: 'bandana', gear: ['sword'], face: { eyes: 'patch', angry: true } }, pal: P({ S: '#5ed0d0', R: '#1c1714', T: '#2f2f3a', U: '#e0533d', N: '#24242c', P: '#24242c', L: '#e0533d', F: '#7fe0ff' }) },
  sp_captain: { name: '은하 함장', vip: true, spec: { body: 'cape', hair: 'none', hat: 'captain', face: { eyes: 'big' } }, pal: P({ S: '#b08ae0', T: '#24305a', U: '#e0533d', N: '#1a2244', V: '#f2c230', P: '#1a2244', G: '#24305a' }) },
};

// ---------- 사치품 (가게 바닥에 놓는 가구) ----------
const LUX = {
  lux_toad: { pal: { Y: '#f2c230', E: '#24160f', M: '#8a5a12', C: '#d9a822' }, rows: [
    '......YYYY......', '....YYYYYYYY....', '...YYEYYYYEYY...', '..YYYYYYYYYYYY..', '..YYYYMMMMYYYY..', '.YYYYYYYYYYYYYY.',
    'YYYYYYYYYYYYYYYY', '.YYY.YYYYYY.YYY.', '..CCCCCCCCCCCC..', '.CCCCCCCCCCCCCC.'] },
  lux_aquarium: { pal: { D: '#3a3a48', B: '#4fa8e0', O: '#f2a030', W: '#ffffff', L: '#e0533d', G: '#4fae4a', Y: '#e8d08a' }, rows: [
    'DDDDDDDDDDDDDDDDDDDDDD', 'DBBBBBBBBBBBBBBBBBBBBD', 'DBBBOOBBBBBBBBWBBBBBBD', 'DBBOOOOBBBBBBBBBBLLBBD', 'DBBBOOBBBBBBBBBLLLLBBD',
    'DBBBBBBBBWBBBBBBLLBBBD', 'DBBGBBBBBBBBBBBBBBBGBD', 'DBGGBBBBBBBBBBBBBBGGBD', 'DGGGGYYYYYYYYYYYYGGGGD', 'DDDDDDDDDDDDDDDDDDDDDD',
    '.DD................DD.', '.DD................DD.', '.DD................DD.'] },
  lux_piano: { pal: { D: '#24242c', W: '#f4f2ec', K: '#101014', Y: '#f2c230' }, rows: [
    '......DDDDDDDDDDDDDD..', '....DDDDDDDDDDDDDDDDDD', '..DDDDDDDDDDDDDDDDDDDD', '.DDDDDDDDDDDDDDDDDDDD.', 'DDDDDDDDDDDDDDDDDDD...',
    'WKWKWWKWKWKWWKWDDD....', 'WWWWWWWWWWWWWWWDD.....', 'DDDDDDDDDDDDDDDDD.....', '.D....Y........D......', '.D.............D......', '.D.............D......'] },
  lux_fossil: { pal: { W: '#e8e0c8', D: '#4a3424', F: '#8a5a32' }, rows: [
    '.....WWWWWWW........', '...WWWWWWWWWWW......', '..WWWDDWWWWWWWWW....', '..WWWDDWWWWWWWWWWW..', '..WWWWWWWWWWWWWWWWW.',
    '...WWWWWWWWDWDWDWDW.', '....WWWWW.W.W.W.W...', '....WWWWWWWWWWWWW...', '.....WWWWWWWWWWW....', '.......FFFFFF.......', '........FFFF........', '......FFFFFFFF......'] },
  lux_goldcrown: { pal: { Q: '#cfe8ef', Y: '#f2c230', L: '#4fae4a', F: '#8a5a32', G: '#9ec8d8' }, rows: [
    'GGGGGGGGGGGGGGGGG', 'GQQQQQQQQQQQQQQQG', 'GQQYQQQQYQQQQYQQG', 'GQQYYQQYYYQQYYQQG', 'GQQQYQQQYQQQYQQQG', 'GQQQYYQQYQQYYQQQG',
    'GQYYYYYYYYYYYYYQG', 'GQYLYYYLYYYLYYYQG', 'GQYQLQQQQQQQLQYQG', 'GQQQQQQQQQQQQQQQG', 'GGGGGGGGGGGGGGGGG', '.FFFFFFFFFFFFFFF.', '.F.............F.', '.F.............F.'] },
  lux_celadon: { pal: { A: '#8fbfa8', W: '#f4f2ec', F: '#6b4226' }, rows: [
    '....AAAA....', '.....AA.....', '...AAAAAA...', '..AAAAAAAA..', '.AAAAWAAAAA.', '.AAAWWWAAAA.', '.AAAAAWAAAA.', '..AAAAAAAA..', '..AAAAAAAA..',
    '...AAAAAA...', '...AAAAAA...', '....AAAA....', '...FFFFFF...', '..FFFFFFFF..'] },
  lux_moonjar: { pal: { W: '#f4f2ec', V: '#e2ddd0', F: '#6b4226' }, rows: [
    '.....WWWWW.....', '....WWWWWWW....', '..WWWWWWWWWWW..', '.WWWWWWWWWWWVV.', 'WWWWWWWWWWWWVVV', 'WWWWWWWWWWWWVVV', 'WWWWWWWWWWWWVVV',
    '.WWWWWWWWWWWVV.', '..WWWWWWWWWVV..', '....WWWWWWW....', '...FFFFFFFFF...', '..FFFFFFFFFFF..'] },
  lux_screen: { pal: { F: '#7a4a22', B: '#4f86c0', L: '#e0533d', W: '#f4f2ec', G: '#3f8a4a', C: '#7fb8e8' }, rows: [
    'FFFFFFFFFFFFFFFFFFFFFFFF', 'FBBBBBFBBBBBFBBBBBFBBBBF', 'FBLLBBFBBBBBFBBBBBFBBWWF', 'FBLLBBFBBGBBFBBGBBFBBWWF', 'FBBBBGFGBGGBFBGGGBFGBBBF',
    'FBBGGGFGGGGGFGGGGGFGGGBF', 'FBGGGGFGGGGGFGGGGGFGGGGF', 'FGGGGGFGGGGGFGGGGGFGGGGF', 'FCCCCCFCCCCCFCCCCCFCCCCF', 'FFFFFFFFFFFFFFFFFFFFFFFF', '.F....F.....F.....F....F'] },
  lux_ufo: { pal: { Q: '#9fe8f0', D: '#8a8fa0', Y: '#ffe066', F: '#4a4a58' }, rows: [
    '......QQQQQQ......', '.....QQQQQQQQ.....', '....DDDDDDDDDD....', '.DDDDDDDDDDDDDDDD.', 'DDYDDYDDYDDYDDYDDD', '.DDDDDDDDDDDDDDDD.', '....DDDDDDDDDD....',
    '........F.........', '........F.........', '......FFFFF.......'] },
  lux_crystal: { pal: { A: '#a070e0', W: '#e8d8ff', F: '#3a3a48', B: '#7040c0' }, rows: [
    '.....A......', '....AWA.....', '....AWA..A..', '.A..AWA.AWA.', 'AWA.AWAAAWA.', 'AWAAAWAAAWA.', 'AWAABAABAAA.', 'AAABBAABBAA.',
    '.AABBBBBBA..', '..FFFFFFFF..', '.FFFFFFFFFF.'] },
};

// ---------- 장소 장식 (벽·바닥) ----------
const DECO = {
  deco_cave_paint: { pal: { L: '#a8462a', D: '#6b3a22' }, rows: [
    '..L.........L.L.....', '..LL.......LLLLL....', 'LLLLLLL......LLL....', '.LLLLL...L....L.....', '.L...L..LLL..L.L....', '..........L.........'] },
  deco_bonfire: { pal: { D: '#5e3a22', L: '#e0533d', Y: '#f2c230', O: '#f28a30' }, rows: [
    '.....Y......', '....YOY.....', '...YOLOY.Y..', '..YOLLLOYO..', '..OLLLLLLO..', '.DDOLLLLODD.', 'DDDDDDDDDDDD', '.DD......DD.'] },
  deco_banner: { pal: { F: '#6b4226', L: '#b0443a', Y: '#f2c230' }, rows: [
    'F.........', 'FLLLLLLLL.', 'FLLLYYLLL.', 'FLLYLLYLL.', 'FLLLYYLLL.', 'FLLLLLLLL.', 'FLLLLLLL..', 'FLLLLLL...', 'F.........', 'F.........', 'F.........', 'F.........'] },
  deco_rooftile: { pal: { G: '#8a8f96', D: '#5a5f66', W: '#c8ccd2' }, rows: [
    '...GGGGG...', '.GGGWGWGGG.', 'GGWGGWGGWGG', 'GGGWWDWWGGG', 'GWWWDDDWWWG', 'GGGWWDWWGGG', 'GGWGGWGGWGG', '.GGGWGWGGG.', '...GGGGG...'] },
  deco_ship: { pal: { F: '#7a4a22', B: '#7fb8e8', W: '#f4f2ec', D: '#5e3a22', C: '#3d6fb0' }, rows: [
    'FFFFFFFFFFFFFFFFFF', 'FBBBBBBBWBBBBBBBBF', 'FBBBBBBWWWBBBBBBBF', 'FBBBBBWWWWWBBBBBBF', 'FBBBBBBBDBBBBBBBBF', 'FBBBDDDDDDDDDBBBBF', 'FBBBBDDDDDDDBBBBBF', 'FCCCCCCCCCCCCCCCCF', 'FFFFFFFFFFFFFFFFFF'] },
  deco_lantern: { pal: { D: '#4a3424', L: '#d9413a', B: '#3d6fb0', Y: '#f2c230' }, rows: [
    '...D....', '...D....', '..YYYY..', '.LLLLLL.', '.LLLLLL.', '.BBBBBB.', '.BBBBBB.', '..YYYY..', '...Y....'] },
  deco_hanji: { pal: { F: '#8a5a32', W: '#f4ecd8' }, rows: [
    'FFFFFFFFFFFFF', 'FWWFWWFWWFWWF', 'FWWFWWFWWFWWF', 'FFFFFFFFFFFFF', 'FWWFWWFWWFWWF', 'FWWFWWFWWFWWF', 'FFFFFFFFFFFFF', 'FWWFWWFWWFWWF', 'FFFFFFFFFFFFF'] },
  deco_starwin: { pal: { D: '#5a5f6a', K: '#14142a', W: '#ffffff', A: '#e0a040', B: '#6aa8e8' }, rows: [
    '....DDDDDDD....', '..DDKKKKKKKDD..', '.DKKWKKKKKKKKD.', '.DKKKKKKAAKKKD.', 'DKKKKKKAAAAKKKD', 'DKWKKKKAAAAKKKD', 'DKKKKKKKAAKKWKD', 'DKKKBBKKKKKKKKD', '.DKBBBBKKKKKKD.', '.DKKBBKKKWKKKD.', '..DDKKKKKKKDD..', '....DDDDDDD....'] },
  deco_robot: { pal: { D: '#8a8fa0', Z: '#7fe0ff', K: '#3a3a48', Y: '#ffe066' }, rows: [
    '.....Y.....', '.....K.....', '..DDDDDDD..', '..DZZDZZD..', '..DDDDDDD..', '...DKKKD...', '.DDDDDDDDD.', '.DDDYDDDDD.', '.DDDDDDDDD.', '..DD...DD..', '..KK...KK..'] },
};

let done = false;
/** 시간여행 도트 전부 등록 (한 번만) */
export function registerEraArt() {
  if (done) return;
  done = true;
  for (const [id, p] of Object.entries(ERA_PEOPLE)) {
    const key = `era_${id}`;
    if (!hasSprite(key)) setSprite(key, render(person(p.spec), p.pal));
  }
  for (const [id, a] of Object.entries({ ...LUX, ...DECO })) if (!hasSprite(id)) setSprite(id, render(a.rows, a.pal));
}
