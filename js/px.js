// 픽셀 에셋 로더 (assets/px) — 모든 그림을 같은 1배 픽셀 격자로 관리
import { PX_SRC, PX_ROOM, PX } from './px-atlas.js';
import { nativeDish } from './sprites.js';
import { SHOP_LEVELS } from './shop-levels.js';

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

/**
 * 확장 단계별 방 이미지: PixelLab 방(256×256)을 잘라 이어 붙여 원하는 크기로 합성
 * 윗벽(돌+나무 벽판) / 원목 바닥(8px 줄 맞춤) / 아랫벽(왼쪽 아래 문틈)
 */
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

export const ITEM_PX = { table_wood: 'table', table_long: 'table_long', plant_pot: 'plant', trophy: 'trophy', aboard: 'aboard', rug: 'rug', water: 'water', bookshelf: 'bookshelf' };
