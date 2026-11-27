// 픽셀 에셋 로더 (assets/px) — 모든 그림을 같은 1배 픽셀 격자로 관리
import { PX_SRC, PX_ROOM, PX } from './px-atlas.js?v=20261127014359';
import { nativeDish } from './sprites.js?v=20261127014359';
import { SHOP_LEVELS } from './shop-levels.js?v=20261127014359';

const cache = {};
const urls = {};
let roomImg = null;
let roomSrc = null;
const roomCache = {};

export async function loadPx() {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [atlas, room, src] = await Promise.all([load(PX_SRC), load(PX_ROOM), load('assets/px/room_src.png')]);
  roomImg = room;
  roomSrc = src;
  for (const [name, [x, y, w, h]] of Object.entries(PX)) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(atlas, x, y, w, h, 0, 0, w, h);
    cache[name] = c;
  }
}

export const px = (name) => cache[name] || null;
export const hasSprite = (name) => !!cache[name];
export function setSprite(name, canvas) { cache[name] = canvas; delete urls[name]; }
export const room = () => roomImg;

// ---------- 걷기 모션: 서 있는 그림에서 두 걸음 그림을 자동으로 만듦 ----------
// k=0: 왼발을 1픽셀 들어 올림, k=1: 오른발. 다리 = 그림 맨 아래 약 22% (3~7줄)
const walkCache = {};
export function walkFrame(name, k) {
  const key = `${name}|${k}`;
  if (key in walkCache) return walkCache[key];
  const src = cache[name];
  if (!src) return (walkCache[key] = null);
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const op = (x, y) => d[(y * w + x) * 4 + 3] > 40;
  const rowHas = (y) => { for (let x = 0; x < w; x++) if (op(x, y)) return true; return false; };
  let bottom = h - 1; while (bottom > 0 && !rowHas(bottom)) bottom--;
  let top = 0; while (top < bottom && !rowHas(top)) top++;
  const legH = Math.max(3, Math.min(7, Math.round((bottom - top + 1) * 0.22)));
  const lift = bottom - top + 1 >= 22 ? 2 : 1;   // 큰 캐릭터는 발을 2픽셀 들어 걸음이 잘 보이게
  const legTop = bottom - legH + 1;
  let minX = w, maxX = -1;
  for (let y = legTop; y <= bottom; y++) for (let x = 0; x < w; x++) if (op(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
  if (maxX - minX < 3) return (walkCache[key] = null);
  const mid = (minX + maxX) / 2;
  const side = (x) => (k === 0 ? x < mid - 0.25 : x > mid + 0.25);
  const at = (x, y) => (y * w + x) * 4;
  // 한쪽 다리를 위로 1픽셀 (위쪽 줄부터 차례로 옮겨서 덮어쓰기 꼬임 방지)
  const orig = new Uint8ClampedArray(d);
  for (let x = minX; x <= maxX; x++) {
    if (!side(x)) continue;
    // 다리 줄을 lift만큼 위로 (원본에서 읽어서 옮김), 맨 아래 lift줄은 비움
    for (let y = legTop - lift; y <= bottom; y++) {
      const sy = y + lift, t0 = at(x, y);
      if (sy <= bottom) { const s0 = at(x, sy); if (orig[s0 + 3] > 40 || y >= legTop) for (let i = 0; i < 4; i++) d[t0 + i] = orig[s0 + i]; }
      else d[t0 + 3] = 0;
    }
  }
  g.putImageData(img, 0, 0);
  return (walkCache[key] = c);
}


/**
 * 확장 단계별 방 이미지: PixelLab 방(256×256)을 잘라 이어 붙여 원하는 크기로 합성
 * 윗벽(돌+나무 벽판) / 원목 바닥(8px 줄 맞춤) / 아랫벽(왼쪽 아래 문틈)
 */
/** 시대별 색 보정한 방 [r, g, b 곱하기, r, g, b 더하기] */
export function roomTinted(level, tint) {
  const base = roomFor(level);
  if (!tint || !base) return base;
  const key = `${level}|${tint.join(',')}`;
  if (roomCache[key]) return roomCache[key];
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  const g = c.getContext('2d');
  g.drawImage(base, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = d[i] * tint[0] + tint[3]; d[i + 1] = d[i + 1] * tint[1] + tint[4]; d[i + 2] = d[i + 2] * tint[2] + tint[5]; }
  g.putImageData(img, 0, 0);
  return (roomCache[key] = c);
}

export function roomFor(level) {
  if (roomCache[level]) return roomCache[level];
  const { w, h } = SHOP_LEVELS[level];
  const S = roomSrc;
  if (!S) return roomImg;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const cp = (sx, sy, sw, sh, dx, dy) => g.drawImage(S, sx, sy, sw, sh, dx, dy, sw, sh);
  // 가로 띠: 왼쪽 32 + 가운데(원본 32~224 반복) + 오른쪽 32
  const band = (sy, sh, dy) => {
    cp(0, sy, 32, sh, 0, dy);
    for (let x = 32; x < w - 32; x += 192) cp(32, sy, Math.min(192, w - 32 - x), sh, x, dy);
    cp(224, sy, 32, sh, w - 32, dy);
  };
  band(0, 48, 0);                       // 윗벽
  const floorH = h - 64;                // 바닥 높이 (8의 배수)
  const top = Math.min(80, Math.floor(floorH / 2 / 8) * 8);
  band(48, top, 48);                    // 바닥 위쪽 (벽 그림자 포함)
  band(240 - (floorH - top), floorH - top, 48 + top); // 바닥 아래쪽 (아래 그림자 포함)
  // 아랫벽: 왼쪽 모서리 + 문틈 + 돌 반복 + 오른쪽 모서리
  cp(0, 240, 48, 16, 0, h - 16);
  cp(112, 240, 32, 16, 48, h - 16);
  for (let x = 80, k = 0; x < w - 16; x += 96, k++) {
    const sx = k % 2 ? 16 : 144;
    cp(sx, 240, Math.min(96, w - 16 - x), 16, x, h - 16);
  }
  cp(240, 240, 16, 16, w - 16, h - 16);
  return (roomCache[level] = c);
}

/** HTML용 <img> (픽셀 그대로 scale배 확대) */
export function pxImg(name, scale = 2, cls = '') {
  const c = cache[name];
  if (!c) return '';
  if (!urls[name]) urls[name] = c.toDataURL();
  return `<img class="pximg ${cls}" src="${urls[name]}" width="${c.width * scale}" height="${c.height * scale}" alt="" draggable="false">`;
}

export const DISH_PX = {
  tteokbokki: 'dish_tteokbokki', kimbap: 'dish_kimbap', ramen: 'dish_ramen',
  twigim: 'dish_twigim', eomuktang: 'dish_eomuktang',
};

export const ITEM_PX = {
  table_wood: 'table', table_long: 'table_long', plant_pot: 'plant', trophy: 'trophy', aboard: 'aboard', rug: 'rug', water: 'water', bookshelf: 'bookshelf',
  lux_toad: 'lux_toad', lux_aquarium: 'lux_aquarium', lux_piano: 'lux_piano', lux_fossil: 'lux_fossil', lux_goldcrown: 'lux_goldcrown',
  lux_celadon: 'lux_celadon', lux_moonjar: 'lux_moonjar', lux_screen: 'lux_screen', lux_ufo: 'lux_ufo', lux_crystal: 'lux_crystal',
};
