// 메인(로그인) 화면 배경: 128×128 포장마차 그림을 화면에 맞게 키우고, 양옆은 가장자리를 이어 붙여 채움
// 움직임: 별 반짝, 모닥불 빛 일렁 + 불티, 초롱 불빛, 반딧불
const SRC = 'assets/px/title.png';
const N = 128;
const FIRE = { x: 64, y: 104 };
const LANTERNS = [[44.5, 76], [52.5, 76], [74.5, 76], [82.5, 76]];
const SKY_TOP = '#1d2d54';

let img = null;
let wide = null;          // 양옆을 늘린 넓은 그림
let canvas = null;
let raf = 0;
let running = false;
let t0 = 0;
const sparks = [];
const flies = Array.from({ length: 10 }, () => ({ x: Math.random(), y: 0.55 + Math.random() * 0.35, a: Math.random() * 6, s: 0.4 + Math.random() * 0.6 }));
const stars = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random() * 0.4, p: Math.random() * 6, f: 1 + Math.random() * 2 }));

function load() {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = SRC; });
}

// 가장자리 24px를 거울처럼 이어 붙여 넓게 (하늘·산·풀이 자연스럽게 이어짐)
function makeWide(src, ext) {
  const c = document.createElement('canvas');
  c.width = N + ext * 2; c.height = N;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, ext, 0);
  const strip = 10;   // 캐릭터가 없는 가장 바깥 10px (하늘·산·풀만)
  for (let side = 0; side < 2; side++) {
    let filled = 0, flip = true;
    while (filled < ext) {
      const w = Math.min(strip, ext - filled);
      g.save();
      if (side === 0) {           // 왼쪽: 원본 왼쪽 띠를 뒤집어 붙여 나감
        const dx = ext - filled - w;
        if (flip) { g.translate(dx + w, 0); g.scale(-1, 1); g.drawImage(src, 0, 0, w, N, 0, 0, w, N); }
        else g.drawImage(src, strip - w, 0, w, N, dx, 0, w, N);
      } else {                    // 오른쪽
        const dx = ext + N + filled;
        if (flip) { g.translate(dx + w, 0); g.scale(-1, 1); g.drawImage(src, N - w, 0, w, N, 0, 0, w, N); }
        else g.drawImage(src, N - strip, 0, w, N, dx, 0, w, N);
      }
      g.restore();
      filled += w; flip = !flip;
    }
  }
  // 이어 붙인 부분의 달·별 같은 큰 밝은 점이 반복되지 않게 하늘 윗부분은 하늘색으로 덮음
  const top = g.getImageData(0, 0, c.width, 60);
  const d = top.data;
  for (let y = 0; y < 60; y++) for (let x = 0; x < c.width; x++) {
    if (x >= ext && x < ext + N) continue;
    const i = (y * c.width + x) * 4;
    if (d[i] + d[i + 1] + d[i + 2] > 330) { d[i] = 29; d[i + 1] = 45; d[i + 2] = 84; }
  }
  g.putImageData(top, 0, 0);
  return c;
}

export async function initTitleBg() {
  canvas = document.getElementById('titleBg');
  if (!canvas) return;
  img = await load();
  if (!img) return;
  wide = makeWide(img, 140);
  window.addEventListener('resize', () => { if (running) draw(performance.now()); });
  showTitleBg(!document.getElementById('titleCard')?.hidden);
}

export function showTitleBg(on) {
  if (!canvas) return;
  canvas.hidden = !on;
  if (on && !running && wide) { running = true; t0 = performance.now(); raf = requestAnimationFrame(loop); }
  if (!on) { running = false; cancelAnimationFrame(raf); }
}

function loop(now) {
  if (!running) return;
  draw(now);
  raf = requestAnimationFrame(loop);
}

// 화면 배치: 가로 화면은 그림을 로그인 칸 왼쪽 공간 가운데에, 세로 화면은 위쪽에
function layout(W, H) {
  const card = document.getElementById('titleCard');
  const r = card && !card.hidden ? card.getBoundingClientRect() : null;
  const portrait = H > W;
  let areaX = 0, areaW = W, areaH = H;
  if (r && !portrait && r.left > W * 0.35) areaW = r.left - 8;              // 카드가 오른쪽에 있을 때
  if (portrait && r) areaH = Math.max(120, r.top - 6);                       // 로그인 칸 위쪽 공간에 딱 맞게
  const fit = Math.min(areaW / N, areaH / N);
  const s = Math.max(1, fit >= 2 ? Math.floor(fit) : fit);
  return { s, cx: areaX + areaW / 2, portrait, areaH };
}

function draw(now) {
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  const { s, cx, portrait, areaH } = layout(W, H);
  const t = (now - t0) / 1000;
  // 하늘
  g.fillStyle = SKY_TOP; g.fillRect(0, 0, W, H);
  // 그림 위치 (원본 128 좌표 → 화면)
  const ox = Math.round(cx - (N / 2) * s), oy = Math.round(portrait ? Math.max(0, (areaH - N * s) / 2) : (H - N * s) / 2);
  const ext = (wide.width - N) / 2;
  g.drawImage(wide, ox - ext * s, oy, wide.width * s, N * s);
  // 아래 풀밭 이어서 채우기
  g.fillStyle = '#293d42';
  if (oy + N * s < H) g.fillRect(0, oy + N * s, W, H - (oy + N * s));
  const X = (x) => ox + x * s, Y = (y) => oy + y * s;
  const px = Math.max(1, Math.round(s));
  // 별 반짝 (넓은 하늘 전체에)
  for (const st of stars) {
    const a = 0.5 + 0.5 * Math.sin(t * st.f + st.p);
    if (a < 0.55) continue;
    g.fillStyle = `rgba(255, 244, 200, ${a})`;
    g.fillRect(Math.round(st.x * W), Math.round(oy + st.y * N * s * 0.9), px, px);
  }
  // 초롱 불빛 (은은하게 숨쉬기)
  g.globalCompositeOperation = 'lighter';
  LANTERNS.forEach(([lx, ly], i) => {
    const k = 0.18 + 0.06 * Math.sin(t * 2.2 + i);
    const r = 9 * s;
    const grd = g.createRadialGradient(X(lx), Y(ly), 0, X(lx), Y(ly), r);
    grd.addColorStop(0, `rgba(255, 200, 110, ${k})`); grd.addColorStop(1, 'rgba(255, 200, 110, 0)');
    g.fillStyle = grd; g.fillRect(X(lx) - r, Y(ly) - r, r * 2, r * 2);
  });
  // 모닥불 빛 일렁
  const fk = 0.32 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23);
  const fr = (30 + 2 * Math.sin(t * 7)) * s;
  const fg = g.createRadialGradient(X(FIRE.x), Y(FIRE.y), 0, X(FIRE.x), Y(FIRE.y), fr);
  fg.addColorStop(0, `rgba(255, 150, 60, ${fk})`); fg.addColorStop(0.5, `rgba(255, 110, 40, ${fk * 0.35})`); fg.addColorStop(1, 'rgba(255, 90, 30, 0)');
  g.fillStyle = fg; g.fillRect(X(FIRE.x) - fr, Y(FIRE.y) - fr, fr * 2, fr * 2);
  g.globalCompositeOperation = 'source-over';
  // 불티
  if (Math.random() < 0.35) sparks.push({ x: FIRE.x + (Math.random() - 0.5) * 6, y: FIRE.y - 6, vx: (Math.random() - 0.5) * 6, vy: -10 - Math.random() * 12, life: 0, max: 0.8 + Math.random() * 0.8 });
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.life += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vx += (Math.random() - 0.5) * 0.6;
    if (p.life > p.max) { sparks.splice(i, 1); continue; }
    g.fillStyle = `rgba(255, ${170 + Math.round(60 * (1 - p.life / p.max))}, 70, ${1 - p.life / p.max})`;
    g.fillRect(Math.round(X(p.x)), Math.round(Y(p.y)), px, px);
  }
  // 반딧불 (화면 가로 전체)
  for (const f of flies) {
    f.a += 0.02 * f.s;
    const fx = (f.x * W + Math.sin(f.a * 1.3) * 30 * f.s + W) % W;
    const fy = oy + (f.y * N + Math.cos(f.a) * 6) * s;
    const al = 0.4 + 0.6 * Math.max(0, Math.sin(f.a * 3));
    g.fillStyle = `rgba(210, 255, 120, ${al})`;
    g.fillRect(Math.round(fx), Math.round(fy), px, px);
  }
}
