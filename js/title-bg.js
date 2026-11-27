// 메인 화면 배경: 달밤 모닥불 포장마차 그림(458×256 도트) + 별·모닥불·초롱·반딧불 움직임
// 처음에는 그림 + 로고 + '게임 시작' 버튼, 누르면 그림이 어두워지고 로그인 칸이 뜸
const SRC = 'assets/px/title.png';
const IW = 458, IH = 256;
const FIRE = { x: 230, y: 205 };
const LANTERNS = [[303, 43], [373, 41], [411, 46], [342, 66]];
const SKY = '#01011d', GROUND = '#04141c';

// ---------- 캐릭터 움직임 (그림 좌표) ----------
// body: 숨쉬기(아래 기준으로 위로 살짝 늘었다 줄었다), head: 냠냠 씹기, fan: 부채질, eyes: 눈 깜빡임(lid: 눈꺼풀 색 뽑을 곳)
const ACTORS = [
  { name: 'chef', body: [60, 86, 128, 197], breath: [0.011, 2.1, 0.0] },
  { name: 'caveman', body: [129, 100, 190, 198], breath: [0.010, 2.5, 1.3], head: [129, 102, 190, 158], chew: [13, 0.6],
    eyes: [[151, 133, 7, 6], [166, 133, 7, 6]], lid: [160, 138] },
  { name: 'scholar', body: [203, 76, 262, 170], breath: [0.008, 1.7, 2.6], fan: [203, 137, 244, 163],
    eyes: [[221, 125, 9, 5], [237, 125, 9, 5]], lid: [233, 128] },
  { name: 'alien', body: [283, 112, 338, 190], breath: [0.012, 2.7, 4.0],
    eyes: [[292, 135, 9, 9], [306, 134, 10, 10]], lid: [303, 131] },
  { name: 'girl', body: [343, 118, 402, 200], breath: [0.010, 2.3, 5.1], head: [343, 120, 402, 158], chew: [12, 2.4] },
];
const STEAM = [[112, 171], [303, 165], [356, 169], [336, 82], [312, 90]];
const lidColor = {};
const blinkAt = {};
const steam = [];
function sampleLids() {
  const c = document.createElement('canvas'); c.width = IW; c.height = IH;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  for (const a of ACTORS) if (a.lid) { const d = g.getImageData(a.lid[0], a.lid[1], 1, 1).data; lidColor[a.name] = `rgb(${d[0]},${d[1]},${d[2]})`; }
}

let img = null;
let canvas = null;
let raf = 0;
let running = false;
let dim = false;
let t0 = 0;
const sparks = [];
const flies = Array.from({ length: 16 }, () => ({ x: Math.random() * IW, y: 120 + Math.random() * 120, a: Math.random() * 6, s: 0.5 + Math.random() * 0.8 }));
const stars = Array.from({ length: 30 }, () => ({ x: Math.random() * IW, y: Math.random() * 70, p: Math.random() * 6, f: 1 + Math.random() * 2 }));

export async function initTitleBg() {
  canvas = document.getElementById('titleBg');
  if (!canvas) return;
  img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = SRC; });
  if (!img) return;
  try { sampleLids(); } catch (e) { /* ignore */ }
  window.addEventListener('resize', () => { if (running) draw(performance.now()); });
  showTitleBg(!canvas.dataset.off);
}

export function showTitleBg(on) {
  if (!canvas) return;
  canvas.hidden = !on;
  canvas.dataset.off = on ? '' : '1';
  if (on && !running && img) { running = true; t0 = performance.now(); raf = requestAnimationFrame(loop); }
  if (!on) { running = false; cancelAnimationFrame(raf); }
}

/** 로그인 칸이 떠 있을 때는 그림을 어둡게 */
export function dimTitleBg(on) { dim = on; }

function loop(now) {
  if (!running) return;
  draw(now);
  raf = requestAnimationFrame(loop);
}

function draw(now) {
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  const t = (now - t0) / 1000;
  // 가로 화면: 화면을 꽉 채움(양옆·위아래 조금 잘림) / 세로 화면: 가로에 맞추고 위아래는 하늘·풀색
  const portrait = H > W * 1.1;
  // 세로 화면: 화면 높이의 절반쯤 크기로 키우고, 양옆은 조금 잘라도 캐릭터들(x≈205)이 가운데 오게
  const s = portrait ? Math.max(W / IW, Math.min((H * 0.5) / IH, W / 350)) : Math.max(W / IW, H / IH);   // 캐릭터 5명(x 30~380)은 다 보이게
  const ox = Math.round(portrait ? Math.min(0, Math.max(W - IW * s, W / 2 - 206 * s)) : (W - IW * s) / 2);
  const oy = Math.round(portrait ? H * 0.42 - (IH * s) / 2 : (H - IH * s) / 2);
  g.fillStyle = SKY; g.fillRect(0, 0, W, Math.max(0, oy) + 2);
  g.fillStyle = GROUND; g.fillRect(0, oy + IH * s - 2, W, H);
  g.drawImage(img, ox, oy, IW * s, IH * s);
  const X = (x) => ox + x * s, Y = (y) => oy + y * s;
  const px = Math.max(1, Math.round(s));
  drawActors(g, t, X, Y, s);
  drawSteam(g, X, Y, px);
  // 별 반짝
  for (const st of stars) {
    const a = 0.5 + 0.5 * Math.sin(t * st.f + st.p);
    if (a < 0.6) continue;
    g.fillStyle = `rgba(255, 246, 210, ${a})`;
    g.fillRect(Math.round(X(st.x)), Math.round(Y(st.y)), px, px);
  }
  if (portrait && oy > 20) for (let i = 0; i < 14; i++) {      // 세로 화면 위쪽 하늘에도 별
    const a = 0.5 + 0.5 * Math.sin(t * (1 + (i % 3)) + i);
    if (a < 0.6) continue;
    g.fillStyle = `rgba(255, 246, 210, ${a})`;
    g.fillRect(Math.round(((i * 97) % 100) / 100 * W), Math.round(((i * 53) % 100) / 100 * (oy - 10)), px, px);
  }
  g.globalCompositeOperation = 'lighter';
  // 초롱 불빛
  LANTERNS.forEach(([lx, ly], i) => {
    const k = 0.16 + 0.07 * Math.sin(t * 2.3 + i * 1.7);
    const r = 16 * s;
    const grd = g.createRadialGradient(X(lx), Y(ly), 0, X(lx), Y(ly), r);
    grd.addColorStop(0, `rgba(255, 120, 60, ${k})`); grd.addColorStop(1, 'rgba(255, 120, 60, 0)');
    g.fillStyle = grd; g.fillRect(X(lx) - r, Y(ly) - r, r * 2, r * 2);
  });
  // 모닥불 빛 일렁
  const fk = 0.26 + 0.07 * Math.sin(t * 9) + 0.05 * Math.sin(t * 23);
  const fr = (58 + 3 * Math.sin(t * 7)) * s;
  const fg = g.createRadialGradient(X(FIRE.x), Y(FIRE.y), 0, X(FIRE.x), Y(FIRE.y), fr);
  fg.addColorStop(0, `rgba(255, 160, 60, ${fk})`); fg.addColorStop(0.45, `rgba(255, 110, 40, ${fk * 0.4})`); fg.addColorStop(1, 'rgba(255, 90, 30, 0)');
  g.fillStyle = fg; g.fillRect(X(FIRE.x) - fr, Y(FIRE.y) - fr, fr * 2, fr * 2);
  g.globalCompositeOperation = 'source-over';
  // 불티
  if (Math.random() < 0.45) sparks.push({ x: FIRE.x + (Math.random() - 0.5) * 12, y: FIRE.y - 10, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 18, life: 0, max: 0.9 + Math.random() * 0.9 });
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    p.life += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vx += (Math.random() - 0.5) * 0.8;
    if (p.life > p.max) { sparks.splice(i, 1); continue; }
    g.fillStyle = `rgba(255, ${170 + Math.round(70 * (1 - p.life / p.max))}, 80, ${1 - p.life / p.max})`;
    g.fillRect(Math.round(X(p.x)), Math.round(Y(p.y)), px, px);
  }
  // 반딧불
  for (const f of flies) {
    f.a += 0.015 * f.s;
    const fx = X(f.x + Math.sin(f.a * 1.3) * 14 * f.s), fy = Y(f.y + Math.cos(f.a) * 6);
    const al = 0.3 + 0.7 * Math.max(0, Math.sin(f.a * 3));
    g.fillStyle = `rgba(210, 255, 120, ${al})`;
    g.fillRect(Math.round(fx), Math.round(fy), px, px);
  }
  if (dim) { g.fillStyle = 'rgba(5, 3, 12, 0.5)'; g.fillRect(0, 0, W, H); }
}

// 그림의 한 부분을 아래(anchor) 기준으로 위아래로 늘려 다시 그림 (늘리기만 해서 원래 그림이 비치지 않음)
function stretchY(g, X, Y, s, [x0, y0, x1], anchorSrc, anchorDst, sy) {
  const w = x1 - x0, h = anchorSrc - y0;
  const top = anchorDst - h * sy;
  g.drawImage(img, x0, y0, w, h, X(x0), Y(top), w * s, (anchorDst - top) * s);
}
function stretchX(g, X, Y, s, [x0, y0, x1, y1], anchorX, sx) {
  const w = anchorX - x0, h = y1 - y0;
  const left = anchorX - w * sx;
  g.drawImage(img, x0, y0, w, h, X(left), Y(y0), (anchorX - left) * s, h * s);
}

function drawActors(g, t, X, Y, s) {
  for (const a of ACTORS) {
    const [amp, rate, ph] = a.breath;
    const [x0, y0, x1, base] = a.body;
    const sb = 1 + amp * (0.5 + 0.5 * Math.sin(t * rate + ph));
    stretchY(g, X, Y, s, [x0, y0, x1], base, base, sb);
    // 냠냠: 몇 초마다 1.5초쯤 머리가 오물오물
    if (a.head) {
      const [hx0, hy0, hx1, neck] = a.head;
      const [crate, coff] = a.chew;
      const chewing = ((t + coff) % 4) < 1.6;
      const sc = chewing ? 1 + 0.03 * (0.5 + 0.5 * Math.sin(t * crate)) : 1;
      const neckDst = base - (base - neck) * sb;
      if (chewing) stretchY(g, X, Y, s, [hx0, hy0, hx1], neck, neckDst, sc);
    }
    // 부채질: 손잡이(오른쪽) 기준으로 부채가 살랑살랑
    if (a.fan) {
      const sx = 1 + 0.09 * (0.5 + 0.5 * Math.sin(t * 5.5));
      stretchX(g, X, Y, s, a.fan, a.fan[2], sx);
    }
    // 눈 깜빡임
    if (a.eyes && lidColor[a.name]) {
      if (!blinkAt[a.name]) blinkAt[a.name] = t + 1 + Math.random() * 4;
      if (t > blinkAt[a.name] + 0.14) blinkAt[a.name] = t + 2.5 + Math.random() * 3.5;
      if (t >= blinkAt[a.name]) {
        const lift = (base - a.eyes[0][1]) * (sb - 1);
        for (const [ex, ey, ew, eh] of a.eyes) {
          g.fillStyle = lidColor[a.name];
          g.fillRect(X(ex), Y(ey - lift), ew * s, eh * s);
          g.fillStyle = '#2a160b';
          g.fillRect(X(ex), Y(ey - lift + eh * 0.55), ew * s, Math.max(1, s));
        }
      }
    }
  }
}

// 그릇·냄비에서 김이 모락모락
function drawSteam(g, X, Y, px) {
  if (Math.random() < 0.5) {
    const [sx, sy] = STEAM[Math.floor(Math.random() * STEAM.length)];
    steam.push({ x: sx + (Math.random() - 0.5) * 6, y: sy, vx: (Math.random() - 0.5) * 2, vy: -6 - Math.random() * 5, life: 0, max: 1.4 + Math.random(), ph: Math.random() * 6 });
  }
  for (let i = steam.length - 1; i >= 0; i--) {
    const p = steam[i];
    p.life += 1 / 60; p.y += p.vy / 60; p.x += (p.vx + Math.sin(p.life * 4 + p.ph) * 3) / 60;
    if (p.life > p.max) { steam.splice(i, 1); continue; }
    const k = p.life / p.max;
    g.fillStyle = `rgba(235, 240, 245, ${0.5 * (1 - k)})`;
    const z = px * (k > 0.5 ? 2 : 1);
    g.fillRect(Math.round(X(p.x)), Math.round(Y(p.y)), z, z);
  }
}
