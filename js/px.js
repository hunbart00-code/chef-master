// 픽셀 에셋 로더 (assets/px) — 모든 그림을 같은 1배 픽셀 격자로 관리
import { PX_SRC, PX_ROOM, PX } from './px-atlas.js';
import { nativeDish } from './sprites.js';

const cache = {};
const urls = {};
let roomImg = null;

export async function loadPx() {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [atlas, room] = await Promise.all([load(PX_SRC), load(PX_ROOM)]);
  roomImg = room;
  for (const [name, [x, y, w, h]] of Object.entries(PX)) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(atlas, x, y, w, h, 0, 0, w, h);
    cache[name] = c;
  }
  cache.dish_twigim = nativeDish('twigim');
  cache.dish_eomuktang = nativeDish('eomuktang');
}

export const px = (name) => cache[name] || null;
export const room = () => roomImg;

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

export const ITEM_PX = { table_wood: 'table', table_long: 'table_long', plant_pot: 'plant', trophy: 'trophy', aboard: 'aboard' };
