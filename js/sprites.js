// 스프라이트 로더 + 도트 캐릭터/음식 생성기
// - 아틀라스(assets/sprites.png)의 각 영역을 개별 캔버스로 잘라 둡니다.
// - 시트에 없는 캐릭터(손님·사장님·알바)와 튀김·어묵탕은 픽셀 템플릿으로 직접 그리고,
//   1px 검은 외곽선 + 오른쪽/아래 음영 + 왼쪽 위 하이라이트를 자동으로 넣어 16비트 도트 느낌을 냅니다.
import { ATLAS_SRC, RECTS } from './sprite-atlas.js?v=20261127020605';

const cache = {};
const urlCache = {};
const OUTLINE = '#24160f';

export function getSprite(name) { return cache[name] || null; }

export async function loadSprites() {
  const load = async (src, rects) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    for (const [name, [x, y, w, h]] of Object.entries(rects)) {
      const c = makeCanvas(w, h);
      c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      cache[name] = c;
    }
  };
  await load(ATLAS_SRC, RECTS);
  cache.dish_twigim = drawTwigim();
  cache.dish_eomuktang = drawEomuktang();
  try { await document.fonts.load('12px Galmuri11'); } catch (e) { /* 폰트 없이도 동작 */ }
}

/** HTML 안에 넣을 <img> 태그 */
export function spriteImg(name, size = 32, cls = '') {
  const c = cache[name];
  if (!c) return '';
  if (!urlCache[name]) urlCache[name] = c.toDataURL();
  return `<img class="spr ${cls}" src="${urlCache[name]}" style="height:${size}px" alt="" draggable="false">`;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---------- 픽셀 그리드 → 외곽선·음영이 들어간 캔버스 ----------
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

function renderPixels(rows, pal) {
  const h = rows.length, w = rows[0].length;
  const c = makeCanvas(w + 2, h + 2);
  const g = c.getContext('2d');
  const at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? rows[y][x] : '.');
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y);
      if (ch === '.') {
        if ([at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((k) => k !== '.')) {
          g.fillStyle = OUTLINE; g.fillRect(x + 1, y + 1, 1, 1);
        }
        continue;
      }
      const base = pal[ch];
      if (!base) continue;
      let col = base;
      if (!'EMO'.includes(ch)) {
        if (at(x + 1, y) === '.' || at(x, y + 1) === '.') col = shade(base, 0.78);
        else if (at(x - 1, y) === '.' || at(x, y - 1) === '.') col = shade(base, 1.12);
      }
      g.fillStyle = col; g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  return c;
}

// ---------- 캐릭터 ----------
const HEAD = [
  '...HHHHHH...',
  '..HHHHHHHH..',
  '.HHHHHHHHHH.',
  '.HHHHHHHHHH.',
  '.HSSHSSHSSH.',
  '.SSSSSSSSSS.',
  '.SSESSSSESS.',
  '.SSESSSSESS.',
  '.SCSSMMSSCS.',
  '..SSSSSSSS..',
];
const HAT_CHEF = [
  '..WWW..WWW..',
  '.WWWWWWWWWW.',
  '.WWWWWWWWWW.',
  '..WWWWWWWW..',
  '..HHHHHHHH..',
];
const HAT_CAP = [
  '............',
  '...GGGGGG...',
  '..GGGGGGGG..',
  '.GGGGGGGGGGG',
  '.HHHHHHHHHH.',
];
const BODY = [
  '..TTTTTTTT..',
  '.STTTTTTTTS.',
  '.STTTTTTTTS.',
  '..TTTTTTTT..',
  '..PPPPPPPP..',
];
const LEGS = {
  stand: ['..PPP..PPP..', '..KKK..KKK..'],
  a: ['..PPP...PP..', '..KKK...KK..'],
  b: ['..PP...PPP..', '..KK...KKK..'],
  sit: ['............', '............'],
};

const HAIRS = ['#3a2416', '#1f1a1a', '#7a4a22', '#c98a3a', '#e8c46a', '#9a3b2a', '#5a5a6a'];
const SKINS = ['#ffd9b8', '#f5c79f', '#e8b48a', '#c98e64'];
const SHIRTS = ['#e0533d', '#3d8fe0', '#4fae4a', '#f2b632', '#9b5fd1', '#ef7fb0', '#36b5b0', '#ff8f3d'];
const PANTS = ['#3b4a7a', '#4a3b2e', '#2e2e3a', '#5d6e8e'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function charRows(kind, legs, opt) {
  let head = HEAD.map((r) => r);
  if (kind === 'chef') head = [...HAT_CHEF, ...HEAD.slice(4)];
  if (kind === 'cleaner') head = [...HAT_CAP, ...HEAD.slice(4)];
  if (opt.longHair && kind === 'guest') {
    head = head.map((r, i) => (i >= 4 && i <= 9 ? `H${r.slice(1, 11)}H` : r));
    head.push('.H........H.');
  }
  let body = BODY.map((r) => r);
  if (kind === 'chef') body = ['..TTTRRTTT..', '.STTTTTTTTS.', '.STTTTTTTTS.', '..TTTTTTTT..', '..PPPPPPPP..'];
  if (kind === 'cleaner') body = ['..TTAAAATT..', '.STAAAAAATS.', '.STAAAAAATS.', '..TAAAAAAT..', '..PPPPPPPP..'];
  const rows = [...head, ...body, ...LEGS[legs]];
  if (opt.longHair && kind === 'guest') {
    // 긴 머리 줄이 몸통과 겹치면 몸통 쪽을 남김
    const i = head.length - 1;
    rows[i] = rows[i];
  }
  return rows;
}

/**
 * 캐릭터 스프라이트 세트
 * @param {'guest'|'chef'|'cleaner'|'rowdy'} kind
 */
export function makeCharacter(kind = 'guest', seed = {}) {
  const pal = {
    H: seed.hair || pick(HAIRS),
    S: seed.skin || pick(SKINS),
    E: '#24160f',
    C: '#ff9a9a',
    M: '#b5574a',
    T: seed.shirt || pick(SHIRTS),
    P: seed.pants || pick(PANTS),
    K: '#3a2a20',
    W: '#ffffff',
    R: '#e0533d',
    G: '#3d9a4a',
    A: '#5fc06a',
  };
  if (kind === 'chef') { pal.T = '#f4f4f0'; pal.P = '#3a3a48'; pal.H = '#3a2416'; }
  if (kind === 'cleaner') { pal.T = '#f2e6c8'; pal.P = '#4a4a5a'; }
  if (kind === 'rowdy') { pal.T = '#6b2a8a'; pal.S = '#f28a6a'; pal.C = '#e0533d'; pal.H = '#1f1a1a'; }
  const k = kind === 'rowdy' ? 'guest' : kind;
  const opt = { longHair: kind === 'guest' && Math.random() < 0.4 };
  return {
    stand: renderPixels(charRows(k, 'stand', opt), pal),
    a: renderPixels(charRows(k, 'a', opt), pal),
    b: renderPixels(charRows(k, 'b', opt), pal),
    sit: renderPixels(charRows(k, 'sit', opt), pal),
  };
}

// ---------- 시트에 없는 음식: 튀김·어묵탕 (도트) ----------
function drawTwigim(k = 4) {
  const rows = [
    '......................',
    '....OOOOOOOOOOOOOO....',
    '..OOWWWWWWWWWWWWWWOO..',
    '.OWWWYYYY.WWWWWWWWWWO.',
    'OWWWYYYYYYWWYYYYRWWWWO',
    'OWWYYyYYyYYYYyYYYRWWWO',
    'OWWWYYYYYYYYYYYYYYWWWO',
    'OWWWWWYYyYYYYyYYWWWWWO',
    'OWWWWWWYYYYYYYYWWWWWWO',
    '.OWWWWWWWWWWWWWWWWWWO.',
    '..OOGGGGGGGGGGGGGGOO..',
    '....OOOOOOOOOOOOOO....',
  ].map((r) => r.replace(/\./g, '.'));
  const pal = { O: '#5b5b66', W: '#ffffff', Y: '#f2b632', y: '#c98a1e', R: '#e0533d', G: '#c9c9d4' };
  return k === 1 ? renderPixels(rows, pal) : upscale(renderPixels(rows, pal), k);
}

function drawEomuktang(k = 4) {
  const rows = [
    '....b.......b.....b...',
    '....b..FFF..b.FFF.b...',
    '...FFF.FfF.FFF.FfF....',
    '...FfF.FFF.FfF.FFFb...',
    '..OOOOOOOOOOOOOOOOOO..',
    'HHOUUUUUUUUUUUUUUUUOHH',
    'HHOuUUUUUUUUUUUUUUUOHH',
    '..OPPPPPPPPPPPPPPPPO..',
    '..OPPPPPPPPPPPPPPPPO..',
    '..OPPPPPPPPPPPPPPPPO..',
    '...OPPPPPPPPPPPPPPO...',
    '....OOOOOOOOOOOOOO....',
  ];
  const pal = { O: '#5b5b66', H: '#8a8a96', U: '#d9a25a', u: '#f2c97a', P: '#c4c8d4', F: '#f2d7a0', f: '#d9b070', b: '#8a5426' };
  return k === 1 ? renderPixels(rows, pal) : upscale(renderPixels(rows, pal), k);
}

function upscale(src, k) {
  const c = makeCanvas(src.width * k, src.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/** 1배 픽셀 크기 음식 (튀김·어묵탕) */
export function nativeDish(kind) {
  return kind === 'twigim' ? drawTwigim(1) : drawEomuktang(1);
}
