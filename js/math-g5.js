// 초등 5학년 수학 문제 생성기 (2022 개정 5학년 1·2학기 단원 + 기초 연산 복습)
// 모든 생성기는 난이도 lv(1 기초 · 2 보통 · 3 도전)를 받아 무한히 새 문제를 만듭니다.
// 분수 표기: {3/4}, 대분수 {1 3/4} → 화면에서 세로 분수로 그려짐
// 그림이 필요한 문제는 fig(SVG)를 함께 돌려줍니다.

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const lcm = (a, b) => (a / gcd(a, b)) * b;
const L = (lv, a, b, c) => (lv <= 1 ? a : lv === 2 ? b : c); // 난이도별 값

// ---------- 값 ----------
const N = (n, suffix = '') => ({ text: `${n.toLocaleString('ko-KR')}${suffix}`, val: n });
const T = (text) => ({ text, val: NaN });            // 글자 보기
function F(n, d) {                                    // 기약 분수/대분수
  const g = gcd(n, d); n /= g; d /= g;
  if (d === 1) return { text: `${n}`, val: n };
  if (n > d) return { text: `{${Math.floor(n / d)} ${n % d}/${d}}`, val: n / d };
  return { text: `{${n}/${d}}`, val: n / d };
}
const fr = (n, d) => `{${n}/${d}}`;                   // 약분 안 한 분수
const mix = (w, n, d) => `{${w} ${n}/${d}}`;
function coprime(d, lo = 1) { let n = ri(lo, d - 1); for (let i = 0; i < 30 && gcd(n, d) !== 1; i++) n = ri(lo, d - 1); return gcd(n, d) === 1 ? n : 1; }
// 소수: 정수 v / 10^p
function dec(v, p) {
  const neg = v < 0; v = Math.abs(v);
  let s = String(v).padStart(p + 1, '0');
  if (p > 0) s = `${s.slice(0, -p)}.${s.slice(-p)}`.replace(/\.?0+$/, '');
  return (neg ? '-' : '') + s;
}
const D = (v, p, suffix = '') => ({ text: dec(v, p) + suffix, val: v / 10 ** p });

// ---------- 그림 (SVG) ----------
const INK = '#3a2414', FILL = '#f6c36b', FILL2 = '#9ad0ec', DASH = '#b0447a';
const svg = (w, h, body) => `<svg class="qsvg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const txt = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 12}" fill="${o.color || INK}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="middle" font-weight="${o.bold ? 700 : 400}">${t}</text>`;
const poly = (pts, fill = FILL, extra = '') => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${fill}" fill-opacity="0.55" stroke="${INK}" stroke-width="2" ${extra}/>`;
const line = (x1, y1, x2, y2, o = {}) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.color || INK}" stroke-width="${o.w || 2}" ${o.dash ? 'stroke-dasharray="4 3"' : ''}/>`;

function figRect(w, h, lw, lh) {
  const s = Math.min(150 / w, 80 / h), W = w * s, H = h * s, x = (200 - W) / 2, y = 12;
  return svg(200, H + 30, poly([[x, y], [x + W, y], [x + W, y + H], [x, y + H]]) + txt(x + W / 2, y + H + 11, lw) + txt(x + W + 18, y + H / 2, lh));
}
function figPara(b, h, lb, lh) {
  const s = Math.min(130 / b, 70 / h), B = b * s, H = h * s, k = 30, x = (200 - B - k) / 2, y = 10;
  return svg(200, H + 28, poly([[x + k, y], [x + k + B, y], [x + B, y + H], [x, y + H]]) + line(x + k, y, x + k, y + H, { dash: 1, color: DASH }) + txt(x + B / 2, y + H + 11, lb) + txt(x + k + 18, y + H / 2, lh, { color: DASH }));
}
function figTri(b, h, lb, lh) {
  const s = Math.min(140 / b, 75 / h), B = b * s, H = h * s, x = (200 - B) / 2, y = 10, ax = x + B * 0.35;
  return svg(200, H + 28, poly([[ax, y], [x + B, y + H], [x, y + H]]) + line(ax, y, ax, y + H, { dash: 1, color: DASH }) + txt(x + B / 2, y + H + 11, lb) + txt(ax + 16, y + H * 0.6, lh, { color: DASH }));
}
function figTrap(a, b, h, la, lb, lh) {
  const s = Math.min(150 / b, 70 / h), A = a * s, B = b * s, H = h * s, x = (200 - B) / 2, y = 14, off = (B - A) * 0.3;
  return svg(200, H + 34, poly([[x + off, y], [x + off + A, y], [x + B, y + H], [x, y + H]]) + line(x + off, y, x + off, y + H, { dash: 1, color: DASH })
    + txt(x + off + A / 2, y - 7, la) + txt(x + B / 2, y + H + 11, lb) + txt(x + off + 16, y + H / 2, lh, { color: DASH }));
}
function figRhombus(p, q, lp, lq) {
  const s = Math.min(150 / p, 90 / q), P = p * s, Q = q * s, cx = 100, cy = Q / 2 + 6;
  return svg(200, Q + 14, poly([[cx - P / 2, cy], [cx, cy - Q / 2], [cx + P / 2, cy], [cx, cy + Q / 2]]) + line(cx - P / 2, cy, cx + P / 2, cy, { dash: 1, color: DASH }) + line(cx, cy - Q / 2, cx, cy + Q / 2, { dash: 1, color: DASH })
    + txt(cx + P / 4, cy - 8, lp, { color: DASH }) + txt(cx + 16, cy + Q / 4, lq, { color: DASH }));
}
function figRegular(n, label) {
  const r = 42, cx = 100, cy = 50, pts = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  const [p0, p1] = [pts[0], pts[1]];
  return svg(200, 100, poly(pts) + txt((p0[0] + p1[0]) / 2 + 20, (p0[1] + p1[1]) / 2 - 4, label));
}
function figLShape(W, H, w, h) { // 큰 직사각형에서 오른쪽 위 모서리를 잘라낸 도형
  const s = Math.min(140 / W, 80 / H), X = 30, Y = 10, a = W * s, b = H * s, c = w * s, d = h * s;
  return svg(200, b + 30, poly([[X, Y], [X + a - c, Y], [X + a - c, Y + d], [X + a, Y + d], [X + a, Y + b], [X, Y + b]])
    + txt(X + a / 2, Y + b + 11, `${W}cm`) + txt(X - 14, Y + b / 2, `${H}cm`) + txt(X + a - c / 2, Y + d + 10, `${w}cm`, { size: 11 }) + txt(X + a - c - 18, Y + d / 2, `${h}cm`, { size: 11 }));
}
function figNumberLine(a, b, incA, incB, lo, hi) { // a~b 범위, 점 채움 = 포함
  const n = hi - lo, x0 = 14, step = 172 / n, X = (v) => x0 + (v - lo) * step;
  let ticks = '';
  for (let v = lo; v <= hi; v++) ticks += line(X(v), 34, X(v), 42, { w: 1.5 }) + txt(X(v), 54, v, { size: 10 });
  const dot = (v, inc) => `<circle cx="${X(v)}" cy="22" r="5" fill="${inc ? DASH : '#fff'}" stroke="${DASH}" stroke-width="2"/>`;
  return svg(200, 62, line(x0 - 6, 38, X(hi) + 6, 38) + ticks + line(X(a), 22, X(b), 22, { color: DASH, w: 3 }) + line(X(a), 22, X(a), 38, { color: DASH, w: 1 }) + line(X(b), 22, X(b), 38, { color: DASH, w: 1 }) + dot(a, incA) + dot(b, incB));
}
function figCuboid(a, b, c, labels = true) { // 가로 a, 세로(깊이) b, 높이 c
  const s = Math.min(100 / a, 60 / c, 70 / b), A = a * s, C = c * s, B = b * s * 0.5, x = 40, y = 12 + B;
  const f = [[x, y], [x + A, y], [x + A, y + C], [x, y + C]];
  const top = [[x, y], [x + B, y - B], [x + A + B, y - B], [x + A, y]];
  const side = [[x + A, y], [x + A + B, y - B], [x + A + B, y + C - B], [x + A, y + C]];
  return svg(200, C + B + 30, poly(f) + poly(top, FILL2) + poly(side, FILL2)
    + line(x, y + C, x + B, y + C - B, { dash: 1 }) + line(x + B, y + C - B, x + A + B, y + C - B, { dash: 1 }) + line(x + B, y - B, x + B, y + C - B, { dash: 1 })
    + (labels ? txt(x + A / 2, y + C + 11, `${a}cm`) + txt(x + A + B / 2 + 16, y + C - B / 2 + 4, `${b}cm`) + txt(x - 16, y + C / 2, `${c}cm`) : ''));
}
function figNet(cells, size = 13) {
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const w = (Math.max(...xs) + 1) * size + 4, h = (Math.max(...ys) + 1) * size + 4;
  return `<svg class="qsvg net" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}">${cells.map(([x, y]) => `<rect x="${2 + x * size}" y="${2 + y * size}" width="${size}" height="${size}" fill="${FILL}" stroke="${INK}" stroke-width="1.2"/>`).join('')}</svg>`;
}
function figSpinner(parts) { // parts: 색 배열
  const n = parts.length, cx = 50, cy = 50, r = 40;
  let body = '';
  parts.forEach((col, i) => {
    const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
    body += `<path d="M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 0 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z" fill="${col}" stroke="${INK}" stroke-width="1.5"/>`;
  });
  return svg(100, 100, body + `<polygon points="50,14 46,4 54,4" fill="${INK}"/>`);
}
function figBars(labels, vals, unit) {
  const max = Math.max(...vals), H = 70, bw = 22, gap = 12, x0 = 26;
  let body = line(x0 - 4, 8, x0 - 4, H + 10) + line(x0 - 4, H + 10, x0 + labels.length * (bw + gap), H + 10);
  vals.forEach((v, i) => {
    const h = (v / max) * (H - 6), x = x0 + i * (bw + gap);
    body += `<rect x="${x}" y="${H + 10 - h}" width="${bw}" height="${h}" fill="${FILL}" stroke="${INK}" stroke-width="1.5"/>` + txt(x + bw / 2, H + 10 - h - 7, v, { size: 11, bold: 1 }) + txt(x + bw / 2, H + 21, labels[i], { size: 10 });
  });
  return svg(x0 + labels.length * (bw + gap) + 10, H + 28, body + txt(12, 6, unit, { size: 9 }));
}
function figTables(n) { // 사각 탁자를 이어 붙인 모양 (의자 = 2n + 2)
  const t = 26, x0 = (200 - n * t) / 2, y = 26;
  let b = '';
  for (let i = 0; i < n; i++) b += `<rect x="${x0 + i * t}" y="${y}" width="${t}" height="${t}" fill="#c8894a" stroke="${INK}" stroke-width="1.5"/>`;
  const ch = (x, y2) => `<circle cx="${x}" cy="${y2}" r="5" fill="${FILL2}" stroke="${INK}" stroke-width="1.2"/>`;
  for (let i = 0; i < n; i++) b += ch(x0 + i * t + t / 2, y - 9) + ch(x0 + i * t + t / 2, y + t + 9);
  b += ch(x0 - 9, y + t / 2) + ch(x0 + n * t + 9, y + t / 2);
  return svg(200, 80, b);
}
function figSticks(n) { // 성냥개비로 정사각형 n개 이어 만들기 (3n+1)
  const s = 22, x0 = (200 - n * s) / 2, y = 14;
  let b = '';
  for (let i = 0; i <= n; i++) b += line(x0 + i * s, y, x0 + i * s, y + s, { color: '#b5651d', w: 3 });
  for (let i = 0; i < n; i++) b += line(x0 + i * s + 2, y, x0 + (i + 1) * s - 2, y, { color: '#b5651d', w: 3 }) + line(x0 + i * s + 2, y + s, x0 + (i + 1) * s - 2, y + s, { color: '#b5651d', w: 3 });
  return svg(200, 50, b);
}
const tableHtml = (rows) => `<table class="qtable">${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th>${c}</th>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</table>`;
const KOR = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ'];
function figCongruent(sides, flip) {
  const A = [[20, 80], [90, 80], [40, 20]], B = flip ? A.map(([x, y]) => [210 - x, 100 - y]) : A.map(([x, y]) => [x + 100, y]);
  const lab = (pts, names) => pts.map(([x, y], i) => txt(x + (i === 1 ? 7 : -7), y + (i === 2 ? (flip && names === 1 ? 8 : -7) : (flip && names === 1 ? -8 : 8)), KOR[i + names * 3], { size: 11, bold: 1 })).join('');
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const [m01, m12, m20] = [mid(A[0], A[1]), mid(A[1], A[2]), mid(A[2], A[0])];
  return svg(220, 100, poly(A) + poly(B, FILL2) + lab(A, 0) + lab(B, 1)
    + txt(m01[0], m01[1] + 9, sides[0], { size: 10 }) + txt(m12[0] + 12, m12[1], sides[1], { size: 10 }) + txt(m20[0] - 12, m20[1], sides[2], { size: 10 }));
}

// ---------- 단원 ----------
export const UNITS = {
  basic:   { name: '기초 연산 복습', term: '기초' },
  mixed:   { name: '자연수의 혼합 계산', term: '5-1' },
  divisor: { name: '약수와 배수', term: '5-1' },
  rule:    { name: '규칙과 대응', term: '5-1' },
  reduce:  { name: '약분과 통분', term: '5-1' },
  fracAdd: { name: '분수의 덧셈과 뺄셈', term: '5-1' },
  polygon: { name: '다각형의 둘레와 넓이', term: '5-1' },
  range:   { name: '수의 범위와 어림하기', term: '5-2' },
  fracMul: { name: '분수의 곱셈', term: '5-2' },
  congru:  { name: '합동과 대칭', term: '5-2' },
  decMul:  { name: '소수의 곱셈', term: '5-2' },
  cuboid:  { name: '직육면체', term: '5-2' },
  avgProb: { name: '평균과 가능성', term: '5-2' },
};

const MENU_PRICE = [['떡볶이', 4500], ['김밥', 3500], ['라면', 4000], ['튀김', 3000], ['어묵탕', 4000], ['순대', 4500]];

// 각 생성기: (lv) => { prompt, answer, distractors, explain, fig? }
const GEN = {
  // ===== 기초 (3~4학년 복습) =====
  basic(lv) {
    const t = pick(L(lv, ['gugu', 'gugu', 'add2', 'sub2', 'div1'], ['mul21', 'add3', 'sub3', 'div1', 'gugu'], ['mul22', 'div2', 'add3', 'mul21']));
    if (t === 'gugu') { const a = ri(2, 9), b = ri(2, 9), ans = a * b;
      return { prompt: `${a} × ${b} = ?`, answer: N(ans), distractors: [N(ans + a), N(ans - a), N(ans + 1), N(a + b)], explain: `${a}단: ${a} × ${b} = ${ans}` }; }
    if (t === 'add2') { const a = ri(15, 69), b = ri(12, 29), ans = a + b;
      return { prompt: `${a} + ${b} = ?`, answer: N(ans), distractors: [N(ans + 10), N(ans - 10), N(ans + 1), N(ans - 1)], explain: `일의 자리끼리 더하고, 10이 넘으면 받아올려요. ${ans}` }; }
    if (t === 'sub2') { const a = ri(40, 99), b = ri(11, a - 10), ans = a - b;
      return { prompt: `${a} − ${b} = ?`, answer: N(ans), distractors: [N(ans + 10), N(ans - 10), N(ans + 2), N(ans + 1)], explain: `일의 자리부터 빼요. 모자라면 십의 자리에서 10을 받아내려요. ${ans}` }; }
    if (t === 'add3') { const a = ri(120, 899), b = ri(110, 899), ans = a + b;
      return { prompt: `${a} + ${b} = ?`, answer: N(ans), distractors: [N(ans + 10), N(ans - 10), N(ans + 100), N(ans - 1)], explain: `일 → 십 → 백의 자리 순서로 더해요. ${ans}` }; }
    if (t === 'sub3') { const a = ri(400, 999), b = ri(105, a - 50), ans = a - b;
      return { prompt: `${a} − ${b} = ?`, answer: N(ans), distractors: [N(ans + 10), N(ans - 10), N(ans + 100), N(ans + 1)], explain: `받아내림에 주의해요. ${ans}` }; }
    if (t === 'div1') { const b = ri(2, 9), q = ri(L(lv, 2, 3, 5), L(lv, 9, 12, 19)), a = b * q;
      return { prompt: `${a} ÷ ${b} = ?`, answer: N(q), distractors: [N(q + 1), N(q - 1), N(q + 2), N(b)], explain: `${b} × ${q} = ${a} 이니까 ${a} ÷ ${b} = ${q}` }; }
    if (t === 'mul21') { const a = ri(12, 49), b = ri(3, 9), ans = a * b;
      return { prompt: `${a} × ${b} = ?`, answer: N(ans), distractors: [N(ans + b), N(ans - b), N(ans + 10), N(ans - 10)], explain: `${a} × ${b} = ${Math.floor(a / 10) * 10}×${b} + ${a % 10}×${b} = ${ans}` }; }
    if (t === 'mul22') { const a = ri(12, 49), b = ri(11, 29), ans = a * b;
      return { prompt: `${a} × ${b} = ?`, answer: N(ans), distractors: [N(ans + a), N(ans - a), N(ans + 10), N(a * (b % 10) + Math.floor(b / 10) * a)], explain: `${a} × ${b} = ${a}×${Math.floor(b / 10) * 10} + ${a}×${b % 10} = ${ans}` }; }
    const b = ri(11, 25), q = ri(11, 39), a = b * q;
    return { prompt: `${a} ÷ ${b} = ?`, answer: N(q), distractors: [N(q + 1), N(q - 1), N(q + 10), N(q + 2)], explain: `${b} × ${q} = ${a} 이므로 ${q}` };
  },

  // ===== 5-1 =====
  mixed(lv) {
    const t = pick(L(lv, ['ab', 'ab2', 'paren', 'first'], ['ab', 'paren', 'divsub', 'first', 'story', 'expr'], ['four', 'nest', 'story', 'story2', 'expr', 'divsub']));
    if (t === 'ab') { const a = ri(L(lv, 2, 5, 10), L(lv, 20, 40, 60)), b = ri(2, 9), c = ri(2, 9), ans = a + b * c;
      return { prompt: `${a} + ${b} × ${c} = ?`, answer: N(ans), distractors: [N((a + b) * c), N(ans + c), N(ans - b)], explain: `곱셈을 먼저! ${b} × ${c} = ${b * c}, ${a} + ${b * c} = ${ans}` }; }
    if (t === 'ab2') { const b = ri(2, 9), c = ri(2, 9), a = b * c + ri(1, 20), ans = a - b * c;
      return { prompt: `${a} − ${b} × ${c} = ?`, answer: N(ans), distractors: [N(Math.abs((a - b) * c)), N(ans + 1), N(ans + b)], explain: `곱셈을 먼저! ${b} × ${c} = ${b * c}, ${a} − ${b * c} = ${ans}` }; }
    if (t === 'paren') { const a = ri(3, 20), b = ri(2, 15), c = ri(2, 8), ans = (a + b) * c;
      return { prompt: `(${a} + ${b}) × ${c} = ?`, answer: N(ans), distractors: [N(a + b * c), N(ans + c), N(ans - c)], explain: `괄호 안을 먼저! ${a} + ${b} = ${a + b}, ${a + b} × ${c} = ${ans}` }; }
    if (t === 'divsub') { const c = ri(2, 9), q = ri(2, 9), b = c * q, a = ri(q + 5, 60), ans = a - q;
      return { prompt: `${a} − ${b} ÷ ${c} = ?`, answer: N(ans), distractors: [N(ans + c), N(ans + 1), N(ans - 2)], explain: `나눗셈을 먼저! ${b} ÷ ${c} = ${q}, ${a} − ${q} = ${ans}` }; }
    if (t === 'first') {
      const forms = [
        () => { const a = ri(2, 9), b = ri(2, 9), c = ri(10, 30), d = ri(2, 9); return { e: `${c} + ${a} × (${b + d} − ${d})`, f: `${b + d} − ${d}`, w: [`${c} + ${a}`, `${a} × ${b + d}`] }; },
        () => { const a = ri(10, 40), b = ri(2, 9), c = ri(2, 9), d = ri(2, 9); return { e: `${a} − ${b} × ${c} + ${d}`, f: `${b} × ${c}`, w: [`${a} − ${b}`, `${c} + ${d}`] }; },
        () => { const q = ri(2, 9), b = ri(2, 6), a = ri(2, 9); return { e: `${a} + ${q * b} ÷ ${b}`, f: `${q * b} ÷ ${b}`, w: [`${a} + ${q * b}`, `${a} + ${b}`] }; },
      ];
      const k = pick(forms)();
      return { prompt: `<b>${k.e}</b><div class="hint">가장 먼저 계산해야 하는 부분은?</div>`, answer: T(k.f), distractors: k.w.map(T).concat([T('왼쪽부터 차례로')]), explain: `( ) 안 → ×, ÷ → +, − 순서예요. 먼저 ${k.f}` };
    }
    if (t === 'four') { const a = ri(3, 12), b = ri(3, 9), d = ri(2, 6), q = ri(2, 8), c = d * q, ans = a * b - q;
      return { prompt: `${a} × ${b} − ${c} ÷ ${d} = ?`, answer: N(ans), distractors: [N(Math.abs(a * b - c)), N(ans + d), N(ans - 1)], explain: `×, ÷ 먼저! ${a}×${b}=${a * b}, ${c}÷${d}=${q}, ${a * b} − ${q} = ${ans}` }; }
    if (t === 'nest') { const c = ri(2, 9), b = c + ri(2, 9), d = ri(2, 7), e = ri(2, 5), a = ri(3, 30), q = ((b - c) * d), ans = a + q * e;
      return { prompt: `${a} + (${b} − ${c}) × ${d} × ${e} = ?`, answer: N(ans), distractors: [N((a + b - c) * d * e), N(ans - a), N(ans + d)], explain: `괄호 → 곱셈 → 덧셈! (${b}−${c})=${b - c}, ×${d}×${e}=${q * e}, +${a} = ${ans}` }; }
    if (t === 'story') { const [m, p] = pick(MENU_PRICE), [m2, p2] = pick(MENU_PRICE.filter((x) => x[0] !== m)), k = ri(2, 4), j = ri(1, 3), ans = p * k + p2 * j, pay = Math.ceil(ans / 10000) * 10000 + (lv >= 3 ? 10000 : 0);
      if (lv >= 3) return { prompt: `${m} ${k}인분(1인분 ${p.toLocaleString()}원)과 ${m2} ${j}개(1개 ${p2.toLocaleString()}원)를 사고 ${pay.toLocaleString()}원을 냈어요. 거스름돈은?`, answer: N(pay - ans, '원'), distractors: [N(pay - p * k, '원'), N(ans, '원'), N(pay - ans + 500, '원')], explain: `${pay} − (${p}×${k} + ${p2}×${j}) = ${pay} − ${ans} = ${pay - ans}원` };
      return { prompt: `${m} ${k}인분(1인분 ${p.toLocaleString()}원)과 ${m2} ${j}개(1개 ${p2.toLocaleString()}원)는 모두 얼마일까요?`, answer: N(ans, '원'), distractors: [N((p + p2) * k, '원'), N(p * k + p2, '원'), N(ans + 1000, '원')], explain: `${p}×${k} + ${p2}×${j} = ${p * k} + ${p2 * j} = ${ans}원` }; }
    if (t === 'story2') { const b = ri(3, 8), q = ri(4, 12), a = b * q, c = ri(1, q - 2), ans = q - c;
      return { prompt: `어묵 ${a}개를 ${b}개의 그릇에 똑같이 나누어 담았어요. 한 그릇에서 ${c}개를 먹었다면 그 그릇에 남은 어묵은?`, answer: N(ans, '개'), distractors: [N(a - c, '개'), N(q + c, '개'), N(Math.abs(a - b * c), '개')], explain: `${a} ÷ ${b} − ${c} = ${q} − ${c} = ${ans}개` }; }
    // expr: 하나의 식으로
    const a = ri(3, 9) * 6, b = pick([2, 3, 6]), c = ri(2, 9);
    return { prompt: `김밥 ${a}개를 ${b}명이 똑같이 나눠 먹고, 한 사람이 ${c}개를 더 먹었어요.<div class="hint">이 사람이 먹은 김밥 수를 하나의 식으로 나타내면?</div>`, answer: T(`${a} ÷ ${b} + ${c}`), distractors: [T(`${a} ÷ (${b} + ${c})`), T(`(${a} + ${c}) ÷ ${b}`), T(`${a} − ${b} + ${c}`)], explain: `똑같이 나누기(÷) 다음 더 먹은 만큼(+) → ${a} ÷ ${b} + ${c} = ${a / b + c}` };
  },

  divisor(lv) {
    const t = pick(L(lv, ['multK', 'isDiv', 'divCount', 'notDiv'], ['gcd', 'lcm', 'divCount', 'notDiv', 'pair', 'commonCnt'], ['gcdStory', 'lcmStory', 'gcd', 'lcm', 'commonCnt', 'pair']));
    if (t === 'multK') { const n = ri(L(lv, 2, 3, 6), 9), k = ri(3, 9);
      return { prompt: `${n}의 배수를 작은 수부터 쓸 때, ${k}번째 수는?`, answer: N(n * k), distractors: [N(n * (k - 1)), N(n * (k + 1)), N(n + k)], explain: `${n}의 배수: ${n}, ${n * 2}, ${n * 3}, … ${k}번째는 ${n} × ${k} = ${n * k}` }; }
    if (t === 'isDiv') { const n = pick([12, 16, 18, 20, 24, 30]); const divs = []; for (let i = 2; i < n; i++) if (n % i === 0) divs.push(i);
      const ans = pick(divs); const non = shuffle([5, 7, 9, 11, 13, 8, 14].filter((x) => n % x !== 0)).slice(0, 3);
      return { prompt: `다음 중 ${n}의 약수는?`, answer: N(ans), distractors: non.map((x) => N(x)), explain: `${n} ÷ ${ans} = ${n / ans}, 나누어떨어지니까 약수예요.` }; }
    if (t === 'divCount') { const n = pick(L(lv, [6, 8, 10, 12, 15], [12, 16, 18, 20, 24, 28], [30, 36, 40, 42, 45, 48, 60]));
      const divs = []; for (let i = 1; i <= n; i++) if (n % i === 0) divs.push(i);
      return { prompt: `${n}의 약수는 모두 몇 개일까요?`, answer: N(divs.length, '개'), distractors: [N(divs.length - 1, '개'), N(divs.length + 1, '개'), N(divs.length + 2, '개')], explain: `${n}의 약수: ${divs.join(', ')} → ${divs.length}개` }; }
    if (t === 'notDiv') { const n = pick([18, 20, 24, 30, 36, 40, 48]); const divs = []; for (let i = 2; i < n; i++) if (n % i === 0) divs.push(i);
      let non = ri(4, n - 1); while (n % non === 0) non = ri(4, n - 1);
      return { prompt: `다음 중 ${n}의 약수가 <b>아닌</b> 것은?`, answer: N(non), distractors: shuffle(divs).slice(0, 3).map((d) => N(d)), explain: `${n} ÷ ${non}은 나누어떨어지지 않아요.` }; }
    if (t === 'gcd' || t === 'gcdStory') { const g = ri(2, L(lv, 6, 9, 12)); let m = ri(2, 7), k = ri(2, 7); while (k === m || gcd(m, k) !== 1) { m = ri(2, 7); k = ri(2, 7); }
      const a = g * m, b = g * k;
      if (t === 'gcdStory') return { prompt: `떡 ${a}개와 어묵 ${b}개를 최대한 많은 그릇에 남김없이 똑같이 나누어 담으려고 해요. 그릇은 몇 개 필요할까요?`, answer: N(g, '개'), distractors: [N(lcm(a, b), '개'), N(g * 2, '개'), N(Math.max(1, g - 1), '개')], explain: `${a}와 ${b}의 최대공약수 = ${g} → ${g}개 (한 그릇에 떡 ${m}개, 어묵 ${k}개)` };
      return { prompt: `${a}와 ${b}의 최대공약수는?`, answer: N(g), distractors: [N(lcm(a, b)), N(g * 2), N(g + 1)], explain: `${a} = ${g}×${m}, ${b} = ${g}×${k} → 최대공약수 ${g}` }; }
    if (t === 'lcm' || t === 'lcmStory') { let a = ri(3, 12), b = ri(3, 15); while (a === b || a % b === 0 || b % a === 0 || lcm(a, b) > 90) { a = ri(3, 12); b = ri(3, 15); }
      const M = lcm(a, b);
      if (t === 'lcmStory') { const h = ri(9, 11), tm = (m) => `${h + Math.floor(m / 60)}시${m % 60 ? ` ${m % 60}분` : ''}`;
        return { prompt: `1번 버스는 ${a}분마다, 2번 버스는 ${b}분마다 출발해요. 오전 ${h}시에 두 버스가 동시에 출발했다면, 다음에 동시에 출발하는 시각은?`, answer: T(`오전 ${tm(M)}`), distractors: [T(`오전 ${tm(a * b === M ? M + a : a * b)}`), T(`오전 ${tm(a + b)}`), T(`오전 ${tm(M + 10)}`)], explain: `${a}와 ${b}의 최소공배수 = ${M} → ${M}분 뒤` }; }
      return { prompt: `${a}와 ${b}의 최소공배수는?`, answer: N(M), distractors: [N(a * b === M ? M + a : a * b), N(gcd(a, b)), N(M * 2)], explain: `${a}의 배수와 ${b}의 배수 중 가장 작은 공통 배수 → ${M}` }; }
    if (t === 'commonCnt') { const g = pick([6, 8, 12, 16, 18]); const a = g * 2, b = g * 3; const ds = []; for (let i = 1; i <= g; i++) if (g % i === 0) ds.push(i);
      return { prompt: `${a}와 ${b}의 공약수는 모두 몇 개일까요?`, answer: N(ds.length, '개'), distractors: [N(ds.length - 1, '개'), N(ds.length + 1, '개'), N(ds.length + 2, '개')], explain: `공약수 = 최대공약수 ${g}의 약수: ${ds.join(', ')} → ${ds.length}개` }; }
    // pair: 약수와 배수 관계
    const a = ri(3, 9), k = ri(2, 6), bad = [];
    while (bad.length < 3) { const x = ri(3, 12), y = ri(13, 40); if (y % x !== 0 && !bad.some((p) => p[0] === x)) bad.push([x, y]); }
    return { prompt: `두 수가 약수와 배수의 관계인 것은?`, answer: T(`(${a}, ${a * k})`), distractors: bad.map(([x, y]) => T(`(${x}, ${y})`)), explain: `${a * k} ÷ ${a} = ${k} → ${a * k}은 ${a}의 배수, ${a}는 ${a * k}의 약수` };
  },

  rule(lv) {
    const t = pick(L(lv, ['tableAdd', 'tableMul', 'tables'], ['tableMul', 'formula', 'tables', 'sticks', 'story'], ['formula', 'sticks', 'story', 'reverse', 'tables']));
    if (t === 'tableAdd' || t === 'tableMul' || t === 'reverse') {
      const mul = t !== 'tableAdd', k = mul ? ri(2, L(lv, 5, 9, 12)) : ri(2, 9), f = (x) => (mul ? x * k : x + k);
      const start = ri(1, 3), xs = [start, start + 1, start + 2, start + 3], ask = ri(7, L(lv, 10, 15, 25));
      if (t === 'reverse') { const y = f(ask);
        return { prompt: tableHtml([['□', ...xs, '?'], ['△', ...xs.map(f), y]]) + `<div class="hint">△가 ${y}일 때 □는?</div>`, answer: N(ask), distractors: [N(ask + 1), N(ask - 1), N(y - k)], explain: `△ = □ ${mul ? '×' : '+'} ${k} → □ = ${y} ${mul ? '÷' : '−'} ${k} = ${ask}` }; }
      return { prompt: tableHtml([['□', ...xs, ask], ['△', ...xs.map(f), '?']]) + `<div class="hint">□가 ${ask}일 때 △는?</div>`, answer: N(f(ask)), distractors: [N(mul ? ask + k : ask * k), N(f(ask) + k), N(f(ask) - 1)], explain: `△ = □ ${mul ? '×' : '+'} ${k} → ${ask} ${mul ? '×' : '+'} ${k} = ${f(ask)}` };
    }
    if (t === 'formula') { const k = ri(3, 9), mul = Math.random() < 0.6, f = (x) => (mul ? x * k : x + k), xs = [1, 2, 3, 4];
      const ans = `△ = □ ${mul ? '×' : '+'} ${k}`;
      return { prompt: tableHtml([['□', ...xs], ['△', ...xs.map(f)]]) + `<div class="hint">□와 △ 사이의 대응 관계를 식으로 나타내면?</div>`, answer: T(ans), distractors: [T(`△ = □ ${mul ? '+' : '×'} ${k}`), T(`□ = △ ${mul ? '×' : '+'} ${k}`), T(`△ = □ ${mul ? '×' : '+'} ${k + 1}`)], explain: `□가 1 커질 때 △가 ${mul ? k + ' 커지고 1일 때 ' + k : '같이 1 커지고 항상 ' + k + ' 차이'} → ${ans}` }; }
    if (t === 'tables') { const n = ri(L(lv, 4, 6, 10), L(lv, 6, 12, 20)), ans = 2 * n + 2;
      return { prompt: `사각 탁자를 한 줄로 이어 붙이고 의자를 놓아요.<div class="hint">탁자 ${n}개를 이어 붙이면 의자는 몇 개?</div>`, fig: figTables(3), answer: N(ans, '개'), distractors: [N(4 * n, '개'), N(2 * n, '개'), N(ans + 2, '개')], explain: `탁자 1개 → 4개, 2개 → 6개, 3개 → 8개… (의자) = (탁자) × 2 + 2 = ${ans}개` }; }
    if (t === 'sticks') { const n = ri(5, L(lv, 8, 12, 20)), ans = 3 * n + 1;
      return { prompt: `성냥개비로 정사각형을 옆으로 이어 만들어요.<div class="hint">정사각형 ${n}개를 만들려면 성냥개비는 몇 개?</div>`, fig: figSticks(3), answer: N(ans, '개'), distractors: [N(4 * n, '개'), N(3 * n, '개'), N(ans + 3, '개')], explain: `1개 → 4, 2개 → 7, 3개 → 10… (성냥개비) = (정사각형) × 3 + 1 = ${ans}개` }; }
    const s = pick([
      () => { const k = 8, n = ri(5, 12); return { p: `김밥 한 줄을 ${k}조각으로 잘라요. 김밥 ${n}줄을 자르면 몇 조각?`, a: N(n * k, '조각'), d: [N(n + k, '조각'), N(n * k - k, '조각'), N(n * (k - 1), '조각')], e: `(조각 수) = (줄 수) × ${k} = ${n * k}` }; },
      () => { const d = ri(2, 5), y = ri(15, 40); return { p: `형은 동생보다 ${d}살 많아요. 형이 ${y}살이 될 때 동생은 몇 살?`, a: N(y - d, '살'), d: [N(y + d, '살'), N(y, '살'), N(y - d - 1, '살')], e: `(동생 나이) = (형 나이) − ${d} = ${y - d}살` }; },
      () => { const n = ri(6, 15); return { p: `세발자전거 ${n}대의 바퀴는 모두 몇 개?`, a: N(n * 3, '개'), d: [N(n * 2, '개'), N(n + 3, '개'), N(n * 4, '개')], e: `(바퀴 수) = (자전거 수) × 3 = ${n * 3}개` }; },
      () => { const n = ri(4, 12), p = 3500; return { p: `김밥 한 줄은 ${p.toLocaleString()}원이에요. 김밥 □줄의 값을 △원이라 할 때, □가 ${n}이면 △는?`, a: N(n * p, '원'), d: [N((n + 1) * p, '원'), N(n * p - p, '원'), N(n + p, '원')], e: `△ = □ × ${p} = ${(n * p).toLocaleString()}` }; },
    ])();
    return { prompt: s.p, answer: s.a, distractors: s.d, explain: s.e };
  },

  reduce(lv) {
    const t = pick(L(lv, ['simplify', 'same', 'compare'], ['simplify', 'common', 'compare', 'same', 'isIrr'], ['common', 'decCompare', 'simplify', 'isIrr', 'compare3']));
    if (t === 'simplify') { let n = ri(1, 8), d = ri(n + 1, 12); while (gcd(n, d) !== 1) { n = ri(1, 8); d = ri(n + 1, 12); }
      const k = ri(2, L(lv, 3, 6, 9)), A = n * k, B = d * k, ans = F(n, d);
      const ds = [T(fr(n + 1, d)), T(fr(n, d + 1)), T(fr(Math.max(1, n - 1), d + 1))];
      if (k % 2 === 0 && k > 2) ds.unshift(T(fr(A / 2, B / 2)));
      return { prompt: `${fr(A, B)}을(를) 기약분수로 나타내면?`, answer: ans, distractors: ds, explain: `분모와 분자를 최대공약수 ${k}로 나눠요 → ${ans.text}` }; }
    if (t === 'same') { const d = ri(3, 9), n = coprime(d), k = ri(2, 5);
      return { prompt: `${fr(n, d)}와(과) 크기가 같은 분수는?`, answer: T(fr(n * k, d * k)), distractors: [T(fr(n + k, d + k)), T(fr(n * k, d + k)), T(fr(n + 1, d * k))], explain: `분모와 분자에 같은 수 ${k}를 곱하면 크기가 같아요 → ${fr(n * k, d * k)}` }; }
    if (t === 'compare' || t === 'compare3') { let a = ri(1, 6), b = ri(a + 1, 9), c = ri(1, 6), d = ri(c + 1, 9); while (a * d === b * c || b === d) { c = ri(1, 6); d = ri(c + 1, 9); }
      const big = a / b > c / d ? [a, b] : [c, d], small = a / b > c / d ? [c, d] : [a, b], M = lcm(b, d);
      return { prompt: `${fr(a, b)}와(과) ${fr(c, d)} 중 더 큰 분수는?`, answer: T(fr(...big)), distractors: [T(fr(...small)), T('두 분수는 크기가 같다')], explain: `분모를 ${M}로 통분: ${fr(a * (M / b), M)}, ${fr(c * (M / d), M)} → 분자가 큰 쪽이 커요.` }; }
    if (t === 'common') { let b = ri(2, 9), d = ri(2, 12); while (b === d || b * d === lcm(b, d) && Math.random() < 0.6) { b = ri(2, 9); d = ri(2, 12); }
      const a = coprime(b), c = coprime(d), M = lcm(b, d);
      const ans = `${fr(a * (M / b), M)}, ${fr(c * (M / d), M)}`;
      const ds = [T(`${fr(a, M)}, ${fr(c, M)}`), T(`${fr(c * (M / d), M)}, ${fr(a * (M / b), M)}`), T(`${fr(a * d, b * d + 1)}, ${fr(c * b, b * d + 1)}`)];
      if (M !== b * d) ds.unshift(T(`${fr(a * d, b * d)}, ${fr(c * b, b * d)}`));
      return { prompt: `${fr(a, b)}와(과) ${fr(c, d)}를 가장 작은 공통분모로 통분하면?`, answer: T(ans), distractors: ds, explain: `${b}와 ${d}의 최소공배수 ${M}를 공통분모로 → ${ans}` }; }
    if (t === 'isIrr') { const d = ri(5, 12), n = coprime(d), bads = [];
      for (const [x, y] of shuffle([[2, 4], [3, 9], [4, 6], [6, 8], [5, 10], [6, 9], [8, 12], [9, 12], [4, 10]])) { if (bads.length < 3) bads.push(T(fr(x, y))); }
      return { prompt: `다음 중 기약분수는?`, answer: T(fr(n, d)), distractors: bads, explain: `분모와 분자의 공약수가 1뿐이면 기약분수 → ${fr(n, d)}` }; }
    // decCompare
    const d = pick([2, 4, 5, 10, 20, 25]), n = coprime(d), v = n / d; let x = Math.round((v + pick([-0.1, 0.1, -0.05, 0.05])) * 100); if (x <= 0) x = Math.round(v * 100) + 10;
    const dx = dec(x, 2), bigger = x / 100 > v ? dx : fr(n, d), smaller = x / 100 > v ? fr(n, d) : dx;
    return { prompt: `${dx}와(과) ${fr(n, d)} 중 더 큰 수는?`, answer: T(bigger), distractors: [T(smaller), T('두 수는 크기가 같다')], explain: `${fr(n, d)} = ${dec(Math.round(v * 100), 2)} 로 바꿔 비교해요.` };
  },

  fracAdd(lv) {
    const t = pick(L(lv, ['same', 'same', 'proper'], ['proper', 'mixedAdd', 'story', 'properSub'], ['mixedAdd', 'mixedSub', 'wholeSub', 'story']));
    if (t === 'same') { const d = ri(4, 12), a = ri(1, d - 2), b = ri(1, d - a - 1), sub = Math.random() < 0.4;
      if (sub) { const [x, y] = a > b ? [a, b] : [b, a]; if (x === y) return GEN.fracAdd(lv); const ans = F(x - y, d);
        return { prompt: `${fr(x, d)} − ${fr(y, d)} = ?`, answer: ans, distractors: [T(fr(x - y, d * 2 === d ? d + 1 : 2 * d)), F(x + y, d), F(x - y + 1, d), T(fr(x - y, 0 + d - y > 0 ? d - y : d + 1))], explain: `분모가 같으면 분자끼리 빼요: ${fr(x - y, d)} → ${ans.text}` }; }
      const ans = F(a + b, d);
      return { prompt: `${fr(a, d)} + ${fr(b, d)} = ?`, answer: ans, distractors: [T(fr(a + b, d + d)), F(a + b + 1, d), F(Math.max(1, a + b - 1), d)], explain: `분모가 같으면 분자끼리 더해요: ${fr(a + b, d)} → ${ans.text}` }; }
    if (t === 'proper' || t === 'properSub') {
      let d1 = ri(2, 9), d2 = ri(2, 9); while (d1 === d2) d2 = ri(2, 9);
      let n1 = coprime(d1), n2 = coprime(d2); const sub = t === 'properSub' || Math.random() < 0.3;
      if (sub && n1 / d1 < n2 / d2) { [d1, d2] = [d2, d1]; [n1, n2] = [n2, n1]; }
      if (n1 * d2 === n2 * d1) return GEN.fracAdd(lv);
      const M = lcm(d1, d2), x = n1 * (M / d1), y = n2 * (M / d2), rn = sub ? x - y : x + y, ans = F(rn, M), op = sub ? '−' : '+';
      const wn = sub ? n1 - n2 : n1 + n2, wd = sub ? Math.abs(d1 - d2) || d1 : d1 + d2;
      return { prompt: `${fr(n1, d1)} ${op} ${fr(n2, d2)} = ?`, answer: ans, distractors: [wn > 0 && wd > 0 ? F(wn, wd) : F(rn + 1, M), F(rn + 1, M), rn > 1 ? F(rn - 1, M) : F(rn + 2, M)], explain: `분모를 ${M}로 통분: ${fr(x, M)} ${op} ${fr(y, M)} = ${fr(rn, M)} → ${ans.text}` }; }
    if (t === 'mixedAdd' || t === 'mixedSub') {
      let d1 = ri(2, 8), d2 = ri(2, 8); while (d1 === d2) d2 = ri(2, 8);
      const w1 = ri(2, 5), w2 = ri(1, w1 - 1), n1 = coprime(d1), n2 = coprime(d2), M = lcm(d1, d2);
      const A = w1 * M + n1 * (M / d1), B = w2 * M + n2 * (M / d2), sub = t === 'mixedSub', R = sub ? A - B : A + B, ans = F(R, M);
      return { prompt: `${mix(w1, n1, d1)} ${sub ? '−' : '+'} ${mix(w2, n2, d2)} = ?`, answer: ans, distractors: [F(R + M, M), F(R - M > 0 ? R - M : R + 2 * M, M), F(R + 1, M)], explain: `자연수끼리, 분수끼리 계산해요 (분모 ${M}로 통분${sub ? ', 모자라면 1을 분수로 바꿔 빼기' : ', 가분수가 되면 받아올림'}) → ${ans.text}` }; }
    if (t === 'wholeSub') { const w = ri(2, 5), d = ri(3, 9), n = coprime(d), v = ri(0, w - 1), R = w * d - (v * d + n), ans = F(R, d);
      const sub = v ? mix(v, n, d) : fr(n, d);
      return { prompt: `${w} − ${sub} = ?`, answer: ans, distractors: [F(R + d, d), F(Math.abs(w * d - v * d - (d - n)) || 1, d), F(R + 1, d)], explain: `${w}을(를) ${mix(w - 1, d, d)}로 바꿔서 빼요 → ${ans.text}` }; }
    // story
    const d1 = pick([2, 3, 4]), d2 = pick([3, 5, 6]), n1 = coprime(d1), n2 = coprime(d2), M = lcm(d1, d2), w = ri(2, 4);
    const A = w * M + n1 * (M / d1), B = n2 * (M / d2), ans = F(A - B, M);
    return { prompt: `떡볶이 소스 ${mix(w, n1, d1)}컵 중에서 ${fr(n2, d2)}컵을 썼어요. 남은 소스는 몇 컵?`, answer: ans, distractors: [F(A + B, M), F(A - B + 1, M), F(Math.abs(A - B - M) || 1, M)], explain: `${mix(w, n1, d1)} − ${fr(n2, d2)} = ${ans.text}(컵)` };
  },

  polygon(lv) {
    const t = pick(L(lv, ['regPeri', 'rectPeri', 'rect', 'square'], ['rect', 'para', 'tri', 'rectPeri', 'unit', 'reverse'], ['trap', 'rhombus', 'tri', 'lshape', 'reverse', 'unit', 'para']));
    const cm2 = 'cm²';
    if (t === 'regPeri') { const [nm, n] = pick([['정삼각형', 3], ['정사각형', 4], ['정오각형', 5], ['정육각형', 6], ['정팔각형', 8]]), s = ri(3, 12);
      return { prompt: `한 변이 ${s}cm인 ${nm}의 둘레는?`, fig: figRegular(n, `${s}cm`), answer: N(s * n, 'cm'), distractors: [N(s * (n - 1), 'cm'), N(s + n, 'cm'), N(s * (n + 1), 'cm')], explain: `정다각형 둘레 = 한 변 × 변의 수 = ${s} × ${n} = ${s * n}cm` }; }
    if (t === 'rectPeri') { const w = ri(4, 15), h = ri(3, 12);
      if (Math.random() < 0.3) { const s = ri(4, 15); return { prompt: `한 변이 ${s}cm인 마름모의 둘레는?`, answer: N(4 * s, 'cm'), distractors: [N(2 * s, 'cm'), N(s * s, 'cm'), N(3 * s, 'cm')], explain: `마름모는 네 변의 길이가 같아요: ${s} × 4 = ${4 * s}cm` }; }
      return { prompt: `직사각형의 둘레는?`, fig: figRect(w, h, `${w}cm`, `${h}cm`), answer: N(2 * (w + h), 'cm'), distractors: [N(w * h, 'cm'), N(w + h, 'cm'), N(2 * w + h, 'cm')], explain: `(가로 + 세로) × 2 = (${w} + ${h}) × 2 = ${2 * (w + h)}cm` }; }
    if (t === 'rect') { const w = ri(L(lv, 3, 4, 6), L(lv, 9, 15, 20)), h = ri(3, 12);
      return { prompt: `직사각형의 넓이는?`, fig: figRect(w, h, `${w}cm`, `${h}cm`), answer: N(w * h, cm2), distractors: [N(2 * (w + h), cm2), N(w * h + w, cm2), N(w + h, cm2)], explain: `가로 × 세로 = ${w} × ${h} = ${w * h}${cm2}` }; }
    if (t === 'square') { const s = ri(3, 12);
      return { prompt: `한 변이 ${s}cm인 정사각형의 넓이는?`, fig: figRect(s, s, `${s}cm`, `${s}cm`), answer: N(s * s, cm2), distractors: [N(4 * s, cm2), N(2 * s, cm2), N(s * s + s, cm2)], explain: `한 변 × 한 변 = ${s} × ${s} = ${s * s}${cm2}` }; }
    if (t === 'para') { const b = ri(4, 15), h = ri(3, 12), side = h + ri(1, 3);
      return { prompt: `평행사변형의 넓이는?<div class="hint">(빗변은 ${side}cm)</div>`, fig: figPara(b, h, `${b}cm`, `${h}cm`), answer: N(b * h, cm2), distractors: [N(b * side, cm2), N(Math.round((b * h) / 2), cm2), N(2 * (b + side), cm2)], explain: `밑변 × 높이 = ${b} × ${h} = ${b * h}${cm2} (빗변이 아니라 높이를 곱해요!)` }; }
    if (t === 'tri') { let b = ri(4, 16), h = ri(3, 12); if ((b * h) % 2) b++;
      return { prompt: `삼각형의 넓이는?`, fig: figTri(b, h, `${b}cm`, `${h}cm`), answer: N((b * h) / 2, cm2), distractors: [N(b * h, cm2), N(b + h, cm2), N((b * h) / 2 + h, cm2)], explain: `밑변 × 높이 ÷ 2 = ${b} × ${h} ÷ 2 = ${(b * h) / 2}${cm2}` }; }
    if (t === 'trap') { const a = ri(3, 9), b = ri(a + 2, 15); let h = ri(2, 10); if (((a + b) * h) % 2) h++; const ans = ((a + b) * h) / 2;
      return { prompt: `사다리꼴의 넓이는?`, fig: figTrap(a, b, h, `${a}cm`, `${b}cm`, `${h}cm`), answer: N(ans, cm2), distractors: [N((a + b) * h, cm2), N(a * b, cm2), N(ans + h, cm2)], explain: `(윗변 + 아랫변) × 높이 ÷ 2 = (${a}+${b}) × ${h} ÷ 2 = ${ans}${cm2}` }; }
    if (t === 'rhombus') { let p = ri(4, 16), q = ri(4, 14); if ((p * q) % 2) p++;
      return { prompt: `마름모의 넓이는?`, fig: figRhombus(p, q, `${p}cm`, `${q}cm`), answer: N((p * q) / 2, cm2), distractors: [N(p * q, cm2), N(p + q, cm2), N((p * q) / 2 + 2, cm2)], explain: `한 대각선 × 다른 대각선 ÷ 2 = ${p} × ${q} ÷ 2 = ${(p * q) / 2}${cm2}` }; }
    if (t === 'lshape') { const W = ri(8, 14), H = ri(6, 10), w = ri(2, W - 4), h = ri(2, H - 3), ans = W * H - w * h;
      return { prompt: `도형의 넓이는?`, fig: figLShape(W, H, w, h), answer: N(ans, cm2), distractors: [N(W * H, cm2), N(W * H + w * h, cm2), N(2 * (W + H), cm2)], explain: `큰 직사각형 − 잘린 부분 = ${W}×${H} − ${w}×${h} = ${ans}${cm2}` }; }
    if (t === 'unit') { const k = pick([['m2cm', ri(2, 9)], ['cm2m', ri(2, 9)], ['km2m', ri(2, 7)]]);
      if (k[0] === 'm2cm') return { prompt: `${k[1]}m² = □cm²`, answer: N(k[1] * 10000), distractors: [N(k[1] * 100), N(k[1] * 1000), N(k[1] * 100000)], explain: `1m² = 10000cm² → ${k[1]}m² = ${(k[1] * 10000).toLocaleString()}cm²` };
      if (k[0] === 'cm2m') return { prompt: `${(k[1] * 10000).toLocaleString()}cm² = □m²`, answer: N(k[1]), distractors: [N(k[1] * 10), N(k[1] * 100), N(k[1] * 1000)], explain: `10000cm² = 1m² → ${k[1]}m²` };
      return { prompt: `${k[1]}km² = □m²`, answer: N(k[1] * 1000000), distractors: [N(k[1] * 1000), N(k[1] * 10000), N(k[1] * 100000)], explain: `1km² = 1000000m²` }; }
    // reverse
    if (Math.random() < 0.5) { const w = ri(4, 12), h = ri(3, 12);
      return { prompt: `넓이가 ${w * h}${cm2}인 직사각형의 가로가 ${w}cm예요. 세로는?`, answer: N(h, 'cm'), distractors: [N(h + 1, 'cm'), N(w * h - w, 'cm'), N(Math.max(1, h - 1), 'cm')], explain: `세로 = 넓이 ÷ 가로 = ${w * h} ÷ ${w} = ${h}cm` }; }
    const b = ri(4, 14), h = ri(2, 10) * 2 / 2, A = (b * h) / 2;
    if (A % 1) return GEN.polygon(lv);
    return { prompt: `넓이가 ${A}${cm2}이고 밑변이 ${b}cm인 삼각형의 높이는?`, answer: N(h, 'cm'), distractors: [N(A / b > 0 && Number.isInteger(A / b) ? A / b : h + 2, 'cm'), N(h + 1, 'cm'), N(h * 2, 'cm')], explain: `높이 = 넓이 × 2 ÷ 밑변 = ${A}×2÷${b} = ${h}cm` };
  },

  // ===== 5-2 =====
  range(lv) {
    const t = pick(L(lv, ['inRange', 'roundSimple', 'line'], ['inRange', 'count', 'line', 'round', 'height'], ['count', 'round', 'roundDec', 'ceilStory', 'floorStory', 'line']));
    const words = { ge: '이상', le: '이하', gt: '초과', lt: '미만' };
    if (t === 'inRange' || t === 'count') {
      const a = ri(10, 40), b = a + ri(4, 9), lo = pick(['ge', 'gt']), hi = pick(['le', 'lt']);
      const ok = (x) => (lo === 'ge' ? x >= a : x > a) && (hi === 'le' ? x <= b : x < b);
      if (t === 'count') { let c = 0; for (let x = a - 1; x <= b + 1; x++) if (ok(x)) c++;
        return { prompt: `${a} ${words[lo]} ${b} ${words[hi]}인 자연수는 모두 몇 개?`, answer: N(c, '개'), distractors: [N(c + 1, '개'), N(c - 1, '개'), N(b - a + 1 === c ? c + 2 : b - a + 1, '개')], explain: `${words[lo] === '이상' ? a + '를 포함' : a + '는 빼고'}, ${words[hi] === '이하' ? b + '를 포함' : b + '는 빼고'} → ${c}개` }; }
      const ins = []; for (let x = a; x <= b; x++) if (ok(x)) ins.push(x);
      const outs = [a - ri(1, 5), b + ri(1, 5)]; if (!ok(a)) outs.push(a); if (!ok(b)) outs.push(b);
      return { prompt: `다음 중 <b>${a} ${words[lo]} ${b} ${words[hi]}</b>인 수는?`, answer: N(pick(ins)), distractors: shuffle(outs).slice(0, 3).map((x) => N(x)), explain: `이상·이하는 그 수를 포함, 초과·미만은 포함하지 않아요.` };
    }
    if (t === 'line') { const lo = ri(10, 40), a = lo + ri(1, 2), b = a + ri(3, 5), hi = b + ri(1, 2), incA = Math.random() < 0.5, incB = Math.random() < 0.5;
      const s = (ia, ib) => `${a} ${ia ? '이상' : '초과'} ${b} ${ib ? '이하' : '미만'}`;
      return { prompt: `수직선에 나타낸 수의 범위는?<div class="hint">● 포함 ○ 포함하지 않음</div>`, fig: figNumberLine(a, b, incA, incB, lo, hi), answer: T(s(incA, incB)), distractors: [T(s(!incA, incB)), T(s(incA, !incB)), T(s(!incA, !incB))], explain: `● 는 그 수를 포함(이상·이하), ○ 는 포함하지 않음(초과·미만) → ${s(incA, incB)}` }; }
    if (t === 'roundSimple' || t === 'round') {
      const how = pick(['올림', '버림', '반올림']), place = lv <= 1 ? pick([['십', 10], ['백', 100]]) : pick([['십', 10], ['백', 100], ['천', 1000]]);
      const P = place[1]; let n = ri(P + 1, P * 99); if (n % P === 0) n += ri(1, P - 1);
      const up = Math.ceil(n / P) * P, dn = Math.floor(n / P) * P, ro = Math.round(n / P) * P;
      const ans = how === '올림' ? up : how === '버림' ? dn : ro;
      const ds = [up, dn, ro, ans + P, ans - P].filter((v) => v !== ans && v > 0);
      return { prompt: `${n.toLocaleString()}을(를) <b>${how}</b>하여 ${place[0]}의 자리까지 나타내면?`, answer: N(ans), distractors: [...new Set(ds)].slice(0, 3).map((v) => N(v)), explain: how === '반올림' ? `${place[0]}의 자리 바로 아래 숫자가 5 이상이면 올리고, 4 이하면 버려요 → ${ans.toLocaleString()}` : `${how}: ${place[0]}의 자리 아래 수를 ${how === '올림' ? '올려서' : '버려서'} ${ans.toLocaleString()}` };
    }
    if (t === 'roundDec') { const v = ri(1001, 9999), p = 3; if (v % 10 === 5 || v % 10 === 0) return GEN.range(lv);
      const r1 = Math.round(v / 100), r2 = Math.round(v / 10);
      const one = Math.random() < 0.5;
      const ans = one ? D(r1, 1) : D(r2, 2);
      return { prompt: `${dec(v, p)}을(를) 반올림하여 소수 ${one ? '첫째' : '둘째'} 자리까지 나타내면?`, answer: ans, distractors: one ? [D(Math.floor(v / 100), 1), D(Math.floor(v / 100) + 1, 1), D(r2, 2)].filter((x) => x.text !== ans.text) : [D(Math.floor(v / 10), 2), D(Math.floor(v / 10) + 1, 2), D(r1, 1)].filter((x) => x.text !== ans.text), explain: `바로 아래 자리 숫자가 5 이상이면 올림, 4 이하면 버림 → ${ans.text}` }; }
    if (t === 'ceilStory') { const k = pick([8, 10, 12, 15]), n = ri(k * 2 + 1, k * 9); if (n % k === 0) return GEN.range(lv);
      return { prompt: `학생 ${n}명이 한 번에 ${k}명씩 탈 수 있는 엘리베이터로 모두 올라가려면 최소 몇 번 운행해야 할까요?`, answer: N(Math.ceil(n / k), '번'), distractors: [N(Math.floor(n / k), '번'), N(Math.ceil(n / k) + 1, '번'), N(n - k, '번')], explain: `남는 학생도 타야 하니까 올림! ${n} ÷ ${k} = ${Math.floor(n / k)}…${n % k} → ${Math.ceil(n / k)}번` }; }
    if (t === 'floorStory') { const n = ri(12, 98) * 100 + ri(10, 90) * 1;
      return { prompt: `저금통에 ${n.toLocaleString()}원이 있어요. 1000원짜리 지폐로 바꾸면 최대 몇 장까지 바꿀 수 있을까요?`, answer: N(Math.floor(n / 1000), '장'), distractors: [N(Math.ceil(n / 1000), '장'), N(Math.floor(n / 100), '장'), N(Math.floor(n / 1000) - 1, '장')], explain: `1000원이 안 되는 돈은 바꿀 수 없으니 버림 → ${Math.floor(n / 1000)}장` }; }
    // height
    const lim = pick([120, 130, 140]), names = shuffle(['민준', '서연', '지호', '하은', '도윤', '수아']).slice(0, 4);
    const hs = [lim - ri(1, 6), lim - ri(7, 12), lim + ri(0, 8), lim - ri(13, 20)];
    return { prompt: `키 <b>${lim}cm 이상</b>만 탈 수 있는 놀이기구예요. 탈 수 있는 사람은?`, answer: T(`${names[2]} (${hs[2]}cm)`), distractors: [0, 1, 3].map((i) => T(`${names[i]} (${hs[i]}cm)`)), explain: `${lim} 이상 = ${lim}과 같거나 큰 수 → ${names[2]}` };
  },

  fracMul(lv) {
    const t = pick(L(lv, ['fxn', 'unit', 'nxf'], ['fxn', 'nxf', 'fxf', 'of', 'story'], ['mixed', 'three', 'mixedN', 'story', 'fxf']));
    if (t === 'fxn') { const d = ri(3, 9), n = coprime(d), k = ri(2, 9), ans = F(n * k, d);
      return { prompt: `${fr(n, d)} × ${k} = ?`, answer: ans, distractors: [F(n, d * k), F(n + k, d), F(n * k + 1, d)], explain: `분자에 자연수를 곱해요: ${n} × ${k} = ${n * k} → ${ans.text}` }; }
    if (t === 'nxf') { const d = ri(3, 9), n = coprime(d), k = d * ri(1, 4) + (lv > 1 ? ri(0, 2) : 0), ans = F(k * n, d);
      return { prompt: `${k} × ${fr(n, d)} = ?`, answer: ans, distractors: [F(k * d, n), F(k + n, d), F(k * n + d, d)], explain: `${k} × ${n} ÷ ${d} → ${ans.text}` }; }
    if (t === 'unit') { const a = ri(2, 9), b = ri(2, 9), ans = F(1, a * b);
      return { prompt: `${fr(1, a)} × ${fr(1, b)} = ?`, answer: ans, distractors: [F(1, a + b), F(2, a * b), F(a + b, a * b)], explain: `단위분수끼리 곱하면 분모끼리 곱해요: 1 / (${a}×${b}) = ${ans.text}` }; }
    if (t === 'fxf') { const b = ri(2, 9), a = coprime(b), d = ri(2, 9), c = coprime(d), ans = F(a * c, b * d);
      return { prompt: `${fr(a, b)} × ${fr(c, d)} = ?`, answer: ans, distractors: [F(a + c, b + d), F(a * c, b + d), F(a * d, b * c)], explain: `분자끼리, 분모끼리 곱해요: ${fr(a * c, b * d)} → ${ans.text}` }; }
    if (t === 'of') { const d = pick([3, 4, 5, 6, 8]), n = coprime(d), base = d * ri(2, 8);
      return { prompt: `${base}의 ${fr(n, d)}은(는) 얼마일까요?`, answer: N((base / d) * n), distractors: [N(base / d), N(base * n), N((base / d) * n + n)], explain: `${base} × ${fr(n, d)} = ${base} ÷ ${d} × ${n} = ${(base / d) * n}` }; }
    if (t === 'mixed') { const d1 = ri(2, 5), w1 = ri(1, 3), n1 = coprime(d1), d2 = ri(2, 5), w2 = ri(1, 2), n2 = coprime(d2);
      const A = w1 * d1 + n1, B = w2 * d2 + n2, ans = F(A * B, d1 * d2);
      return { prompt: `${mix(w1, n1, d1)} × ${mix(w2, n2, d2)} = ?`, answer: ans, distractors: [F(w1 * w2 * d1 * d2 + n1 * n2, d1 * d2), F(A * B + d1, d1 * d2), F(A + B, d1 * d2)], explain: `대분수를 가분수로: ${fr(A, d1)} × ${fr(B, d2)} = ${fr(A * B, d1 * d2)} → ${ans.text}` }; }
    if (t === 'mixedN') { const d = ri(2, 6), w = ri(1, 4), n = coprime(d), k = ri(2, 6), A = w * d + n, ans = F(A * k, d);
      return { prompt: `${mix(w, n, d)} × ${k} = ?`, answer: ans, distractors: [F(w * k * d + n, d), F(A * k + 1, d), F(A + k, d)], explain: `가분수로 바꿔 곱해요: ${fr(A, d)} × ${k} = ${fr(A * k, d)} → ${ans.text}` }; }
    if (t === 'three') { const a = ri(2, 5), b = ri(2, 5), c = ri(2, 5), x = coprime(a), y = coprime(b), z = coprime(c), ans = F(x * y * z, a * b * c);
      return { prompt: `${fr(x, a)} × ${fr(y, b)} × ${fr(z, c)} = ?`, answer: ans, distractors: [F(x + y + z, a * b * c), F(x * y * z, a + b + c), F(x * y * z + 1, a * b * c)], explain: `세 분수의 분자끼리, 분모끼리 곱해요 → ${ans.text}` }; }
    // story
    const s = pick([
      () => { const d = pick([4, 5, 8]), n = coprime(d), k = ri(2, 7), a = F(n * k, d); return { p: `한 병에 ${fr(n, d)}L씩 들어 있는 주스가 ${k}병 있어요. 주스는 모두 몇 L?`, a, d: [F(n, d * k), F(n + k, d), F(n * k + 1, d)], e: `${fr(n, d)} × ${k} = ${a.text}(L)` }; },
      () => { const b = pick([3, 4, 5]), a = coprime(b), d = pick([2, 3]), c = coprime(d), ans = F(a * c, b * d); return { p: `피자 한 판의 ${fr(a, b)}이 남았는데, 그중 ${fr(c, d)}을 먹었어요. 먹은 피자는 한 판의 얼마?`, a: ans, d: [F(a + c, b + d), F(a * d, b * c), F(Math.abs(a * d - c * b) || 1, b * d)], e: `${fr(a, b)} × ${fr(c, d)} = ${ans.text}` }; },
      () => { const m = pick([30, 60]), d = pick([2, 3, 4, 5, 6]), n = coprime(d); return { p: `1시간의 ${fr(n, d)}은 몇 분일까요?`, a: N((60 / d) * n, '분'), d: [N(60 / d, '분'), N(60 * n, '분'), N((60 / d) * n + 10, '분')], e: `60 × ${fr(n, d)} = ${(60 / d) * n}분` }; },
    ])();
    return { prompt: s.p, answer: s.a, distractors: s.d, explain: s.e };
  },

  congru(lv) {
    const t = pick(L(lv, ['axisCount', 'lineLetter', 'side'], ['side', 'angle', 'axisCount', 'pointLetter', 'concept'], ['angle3', 'side', 'pointDist', 'concept', 'pointLetter']));
    if (t === 'axisCount') { const [nm, ans] = pick([['정삼각형', 3], ['정사각형', 4], ['정오각형', 5], ['정육각형', 6], ['직사각형', 2], ['마름모', 2], ['정팔각형', 8]]);
      return { prompt: `${nm}의 대칭축은 모두 몇 개일까요?`, answer: N(ans, '개'), distractors: [N(ans + 1, '개'), N(Math.max(1, ans - 1), '개'), N(ans * 2, '개')], explain: `${nm}은(는) 대칭축이 ${ans}개예요.${nm.startsWith('정') ? ' (정■각형의 대칭축 = 변의 수)' : ''}` }; }
    if (t === 'lineLetter') { const a = pick(['A', 'H', 'M', 'T', 'U', 'V', 'W', 'Y']), ds = shuffle(['F', 'G', 'J', 'L', 'P', 'R', 'S', 'Z', 'N']).slice(0, 3);
      return { prompt: `다음 중 <b>선대칭도형</b>인 알파벳은?<div class="hint">한 직선을 따라 접었을 때 완전히 겹쳐지는 것</div>`, answer: T(`<span class="eng big">${a}</span>`), distractors: ds.map((x) => T(`<span class="eng big">${x}</span>`)), explain: `${a}는 가운데 세로선으로 접으면 완전히 겹쳐요.` }; }
    if (t === 'pointLetter') { const a = pick(['N', 'S', 'Z', 'H', 'O', 'X']), ds = shuffle(['A', 'T', 'U', 'V', 'L', 'F', 'E', 'P']).slice(0, 3);
      return { prompt: `다음 중 <b>점대칭도형</b>인 알파벳은?<div class="hint">한 점을 중심으로 180° 돌렸을 때 처음 모양과 겹쳐지는 것</div>`, answer: T(`<span class="eng big">${a}</span>`), distractors: ds.map((x) => T(`<span class="eng big">${x}</span>`)), explain: `${a}를 180° 돌리면 처음 모양과 똑같아요.` }; }
    if (t === 'side' || t === 'angle' || t === 'angle3') {
      const s = [ri(5, 9), ri(6, 10), ri(4, 8)], flip = lv >= 2 && Math.random() < 0.5;
      if (t === 'side') { const k = ri(0, 2), nm = [['ㄹ', 'ㅁ'], ['ㅁ', 'ㅂ'], ['ㅂ', 'ㄹ']][k];
        return { prompt: `두 삼각형은 서로 합동이에요. (ㄱ↔ㄹ, ㄴ↔ㅁ, ㄷ↔ㅂ)<div class="hint">변 ${nm[0]}${nm[1]}의 길이는?</div>`, fig: figCongruent(s.map((x) => `${x}cm`), flip), answer: N(s[k], 'cm'), distractors: s.filter((_, i) => i !== k).map((x) => N(x, 'cm')).concat([N(s[k] + 1, 'cm')]), explain: `합동인 도형의 대응변의 길이는 같아요 → ${s[k]}cm` }; }
      const a1 = ri(40, 80), a2 = ri(40, 140 - a1), a3 = 180 - a1 - a2;
      if (t === 'angle') return { prompt: `두 삼각형 ㄱㄴㄷ과 ㄹㅁㅂ은 합동이에요. (ㄱ↔ㄹ, ㄴ↔ㅁ, ㄷ↔ㅂ)<div class="hint">각 ㄱㄴㄷ이 ${a1}°일 때, 각 ㄹㅁㅂ은?</div>`, fig: figCongruent(['', '', ''], flip), answer: N(a1, '°'), distractors: [N(180 - a1, '°'), N(90 - a1 > 0 ? 90 - a1 : a1 + 10, '°'), N(a1 + 5, '°')], explain: `대응각의 크기는 같아요 → ${a1}°` };
      return { prompt: `두 삼각형 ㄱㄴㄷ과 ㄹㅁㅂ은 합동이에요. (ㄱ↔ㄹ, ㄴ↔ㅁ, ㄷ↔ㅂ)<div class="hint">각 ㄱ = ${a1}°, 각 ㄴ = ${a2}°일 때, 각 ㅂ은?</div>`, fig: figCongruent(['', '', ''], flip), answer: N(a3, '°'), distractors: [N(a1, '°'), N(a2, '°'), N(180 - a1, '°')], explain: `각 ㄷ = 180° − ${a1}° − ${a2}° = ${a3}°, 각 ㅂ은 각 ㄷ의 대응각 → ${a3}°` }; }
    if (t === 'pointDist') { const x = ri(3, 12);
      return { prompt: `점대칭도형에서 대칭의 중심 ㅇ부터 점 ㄱ까지가 ${x}cm예요. 점 ㄱ의 대응점 ㄷ까지 선분 ㄱㄷ의 길이는?`, answer: N(2 * x, 'cm'), distractors: [N(x, 'cm'), N(x + 2, 'cm'), N(3 * x, 'cm')], explain: `대칭의 중심은 대응점을 이은 선분을 둘로 똑같이 나눠요 → ${x} × 2 = ${2 * x}cm` }; }
    const c = pick([
      { p: '선대칭도형에서 대칭축은 대응점끼리 이은 선분과 어떻게 만나나요?', a: '수직으로 만난다', d: ['평행하다', '만나지 않는다', '45°로 만난다'] },
      { p: '모양과 크기가 같아서 포개었을 때 완전히 겹치는 두 도형을 무엇이라고 하나요?', a: '서로 합동', d: ['선대칭', '점대칭', '닮음'] },
      { p: '원의 대칭축은 몇 개일까요?', a: '셀 수 없이 많다', d: ['1개', '2개', '4개'] },
      { p: '점대칭도형에서 대칭의 중심은 몇 개일까요?', a: '1개', d: ['2개', '4개', '셀 수 없이 많다'] },
      { p: '합동인 두 삼각형에서 대응하는 각의 크기는?', a: '서로 같다', d: ['2배 차이가 난다', '합이 90°다', '항상 다르다'] },
    ]);
    return { prompt: c.p, answer: T(c.a), distractors: c.d.map(T), explain: c.a };
  },

  decMul(lv) {
    const t = pick(L(lv, ['dn', 'nd', 'shift'], ['dn', 'nd', 'dd', 'shift', 'box'], ['dd', 'dd2', 'story', 'shift', 'box']));
    if (t === 'dn') { const a = ri(L(lv, 2, 11, 101), L(lv, 9, 99, 999)), p = lv <= 1 ? 1 : pick([1, 2]), k = ri(2, 9), v = a * k;
      return { prompt: `${dec(a, p)} × ${k} = ?`, answer: D(v, p), distractors: [D(v, p + 1), D(v, Math.max(0, p - 1)), D(v + k, p)], explain: `${a} × ${k} = ${v} 를 먼저 구하고 소수점 아래 ${p}자리 → ${dec(v, p)}` }; }
    if (t === 'nd') { const k = ri(2, 30), a = ri(2, 9), p = 1, v = a * k;
      return { prompt: `${k} × ${dec(a, p)} = ?`, answer: D(v, p), distractors: [D(v, 0), D(v, 2), D(v + 1, p)], explain: `${k} × ${a} = ${v} → 소수 한 자리 → ${dec(v, p)}` }; }
    if (t === 'dd' || t === 'dd2') { const a = ri(11, 99), b = t === 'dd2' ? ri(101, 399) : ri(2, 9), pa = 1, pb = t === 'dd2' ? 2 : 1, v = a * b;
      return { prompt: `${dec(a, pa)} × ${dec(b, pb)} = ?`, answer: D(v, pa + pb), distractors: [D(v, pa + pb - 1), D(v, pa + pb + 1), D(v + 10, pa + pb)], explain: `${a} × ${b} = ${v}, 소수점 아래 자리 수 ${pa}+${pb} = ${pa + pb}자리 → ${dec(v, pa + pb)}` }; }
    if (t === 'shift') { const a = ri(101, 999), p = 2, m = pick([10, 100, 1000, 0.1, 0.01]);
      const shift = { 10: -1, 100: -2, 1000: -3, 0.1: 1, 0.01: 2 }[m], np = p + shift;
      const ans = np >= 0 ? D(a, np) : N(a * 10 ** -np);
      const alt = (s) => (p + s >= 0 ? D(a, p + s) : N(a * 10 ** -(p + s)));
      return { prompt: `${dec(a, p)} × ${m} = ?`, answer: ans, distractors: [alt(shift + 1), alt(shift - 1), alt(-shift)].filter((x) => x.text !== ans.text), explain: m >= 10 ? `× ${m} 은 소수점을 오른쪽으로 ${-shift}칸` : `× ${m} 은 소수점을 왼쪽으로 ${shift}칸` }; }
    if (t === 'box') { const a = ri(11, 99), m = pick([10, 100, 1000]), p = 2;
      return { prompt: `${dec(a, p)} × □ = ${dec(a * m, p).replace(/\.$/, '')}`, answer: N(m), distractors: [10, 100, 1000, 0.1].filter((x) => x !== m).map((x) => N(x)), explain: `소수점이 오른쪽으로 ${Math.log10(m)}칸 옮겨졌으니 × ${m}` }; }
    const s = pick([
      () => { const w = ri(5, 95), l = ri(2, 9); return { p: `1m의 무게가 ${dec(w, 2)}kg인 철사 ${l}m의 무게는?`, a: D(w * l, 2, 'kg'), d: [D(w * l, 1, 'kg'), D(w + l * 100, 2, 'kg'), D(w * l, 3, 'kg')], e: `${dec(w, 2)} × ${l} = ${dec(w * l, 2)}kg` }; },
      () => { const p = pick([12, 15, 18]), n = ri(2, 4) * 10 + 5; return { p: `가로 ${dec(p, 1)}m, 세로 ${dec(n, 1)}m인 직사각형 텃밭의 넓이는?`, a: D(p * n, 2, 'm²'), d: [D(p * n, 1, 'm²'), D(2 * (p + n), 1, 'm²'), D(p * n + 10, 2, 'm²')], e: `${dec(p, 1)} × ${dec(n, 1)} = ${dec(p * n, 2)}m²` }; },
      () => { const v = ri(3, 9), w = ri(12, 25); return { p: `한 컵에 ${dec(w, 1)}dL씩 우유를 ${v}컵 마셨어요. 마신 우유는 몇 dL?`, a: D(w * v, 1, 'dL'), d: [D(w * v, 2, 'dL'), D(w + v * 10, 1, 'dL'), D(w * v + 10, 1, 'dL')], e: `${dec(w, 1)} × ${v} = ${dec(w * v, 1)}dL` }; },
    ])();
    return { prompt: s.p, answer: s.a, distractors: s.d, explain: s.e };
  },

  cuboid(lv) {
    const t = pick(L(lv, ['facts', 'facts', 'cubeEdge'], ['facts', 'visible', 'edgeSum', 'net', 'parallel'], ['edgeSum', 'net', 'netNo', 'reverseEdge', 'visible']));
    if (t === 'facts') { const f = pick([['면', 6], ['모서리', 12], ['꼭짓점', 8]]), sh = pick(['직육면체', '정육면체']);
      return { prompt: `${sh}의 ${f[0]}은(는) 모두 몇 개일까요?`, fig: figCuboid(sh === '정육면체' ? 4 : 6, sh === '정육면체' ? 4 : 3, sh === '정육면체' ? 4 : 3, false), answer: N(f[1], '개'), distractors: [6, 8, 12, 4].filter((x) => x !== f[1]).map((x) => N(x, '개')), explain: `면 6개, 모서리 12개, 꼭짓점 8개` }; }
    if (t === 'visible') { const q = pick([['보이는 모서리', 9], ['보이지 않는 모서리', 3], ['보이는 꼭짓점', 7], ['보이지 않는 꼭짓점', 1], ['보이는 면', 3]]);
      return { prompt: `직육면체의 겨냥도에서 <b>${q[0]}</b>은(는) 몇 개?<div class="hint">점선 = 보이지 않는 모서리</div>`, fig: figCuboid(6, 3, 3, false), answer: N(q[1], '개'), distractors: [q[1] + 1, Math.max(0, q[1] - 1), q[1] + 3].map((x) => N(x, '개')), explain: `보이는 모서리 9, 안 보이는 모서리 3, 보이는 꼭짓점 7, 안 보이는 꼭짓점 1, 보이는 면 3` }; }
    if (t === 'parallel') { const q = pick([['평행한', 1], ['수직인', 4]]);
      return { prompt: `직육면체에서 한 면과 <b>${q[0]}</b> 면은 몇 개일까요?`, fig: figCuboid(6, 3, 3, false), answer: N(q[1], '개'), distractors: [1, 2, 4, 6].filter((x) => x !== q[1]).map((x) => N(x, '개')), explain: `한 면과 평행한 면(마주 보는 면)은 1개, 수직인 면은 4개` }; }
    if (t === 'cubeEdge') { const s = ri(2, 12);
      return { prompt: `한 모서리가 ${s}cm인 정육면체의 모든 모서리 길이의 합은?`, fig: figCuboid(s, s, s, false), answer: N(12 * s, 'cm'), distractors: [N(6 * s, 'cm'), N(8 * s, 'cm'), N(4 * s, 'cm')], explain: `모서리 12개 → ${s} × 12 = ${12 * s}cm` }; }
    if (t === 'edgeSum') { const a = ri(4, 10), b = ri(2, 6), c = ri(3, 8);
      return { prompt: `직육면체의 모든 모서리 길이의 합은?`, fig: figCuboid(a, b, c), answer: N(4 * (a + b + c), 'cm'), distractors: [N(a + b + c, 'cm'), N(2 * (a + b + c), 'cm'), N(a * b * c, 'cm')], explain: `같은 길이의 모서리가 4개씩 → (${a}+${b}+${c}) × 4 = ${4 * (a + b + c)}cm` }; }
    if (t === 'reverseEdge') { const s = ri(3, 11);
      return { prompt: `모든 모서리 길이의 합이 ${12 * s}cm인 정육면체의 한 모서리는?`, answer: N(s, 'cm'), distractors: [N(2 * s, 'cm'), N(12 * s / 6, 'cm') .val === s ? N(s + 1, 'cm') : N(12 * s / 6, 'cm'), N(Math.round(12 * s / 8), 'cm')], explain: `${12 * s} ÷ 12 = ${s}cm` }; }
    // 전개도
    const VALID = [], top = [0, 1, 2, 3];
    for (const a of top) for (const b of top) VALID.push([[0, 1], [1, 1], [2, 1], [3, 1], [a, 0], [b, 2]]);
    VALID.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]]);
    const INVALID = [
      [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
      [[0, 1], [1, 1], [2, 1], [3, 1], [0, 0], [1, 0]],
      [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [2, 0]],
      [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [2, 0]],
      [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]],
      [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [3, 1]],
      [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]],
    ];
    if (t === 'netNo') { const bad = pick(INVALID), goods = shuffle(VALID).slice(0, 3);
      return { prompt: `정육면체의 전개도가 <b>될 수 없는</b> 것은?`, answer: T(figNet(bad)), distractors: goods.map((g) => T(figNet(g))), explain: `접었을 때 겹치는 면이 생기면 전개도가 될 수 없어요. (정사각형 4개가 2×2로 모이면 안 돼요)`, answerText: '그림 속 전개도' }; }
    const good = pick(VALID), bads = shuffle(INVALID).slice(0, 3);
    return { prompt: `정육면체의 전개도가 <b>될 수 있는</b> 것은?`, answer: T(figNet(good)), distractors: bads.map((g) => T(figNet(g))), explain: `면 6개가 겹치지 않고 접혀서 정육면체가 되는 것을 골라요.` };
  },

  avgProb(lv) {
    const t = pick(L(lv, ['avg', 'word', 'spinner'], ['avg', 'bars', 'missing', 'word', 'spinNum'], ['missing', 'bars', 'total', 'spinNum', 'dice']));
    if (t === 'avg') { const k = L(lv, 3, ri(3, 5), 5), avg = ri(L(lv, 3, 5, 10), L(lv, 10, 30, 80)), nums = [];
      for (let i = 0; i < k - 1; i++) nums.push(Math.max(1, avg + ri(-6, 6)));
      const last = avg * k - nums.reduce((s, v) => s + v, 0); if (last < 1 || last > avg + 15) return GEN.avgProb(lv);
      nums.push(last);
      return { prompt: `${nums.join(', ')}의 평균은?`, answer: N(avg), distractors: [N(avg * k), N(avg + 1), N(avg - 1)], explain: `(자료의 합) ÷ (자료의 수) = ${avg * k} ÷ ${k} = ${avg}` }; }
    if (t === 'bars' || t === 'total') { const days = ['월', '화', '수', '목', '금'], avg = ri(8, 20), vals = days.slice(0, 4).map(() => avg + ri(-5, 5)); const last = avg * 5 - vals.reduce((s, v) => s + v, 0); if (last < 2 || last > avg + 8) return GEN.avgProb(lv); vals.push(last);
      if (t === 'total') return { prompt: `5일 동안 하루 평균 ${avg}그릇의 떡볶이를 팔았어요. 5일 동안 판 떡볶이는 모두 몇 그릇?`, answer: N(avg * 5, '그릇'), distractors: [N(avg + 5, '그릇'), N(avg * 4, '그릇'), N(avg * 6, '그릇')], explain: `(합계) = (평균) × (날 수) = ${avg} × 5 = ${avg * 5}그릇` };
      return { prompt: `요일별로 판 떡볶이 그릇 수예요. 하루 평균 몇 그릇을 팔았나요?`, fig: figBars(days, vals, '(그릇)'), answer: N(avg, '그릇'), distractors: [N(avg * 5, '그릇'), N(avg + 2, '그릇'), N(avg - 2, '그릇')], explain: `${vals.join('+')} = ${avg * 5}, ÷ 5 = ${avg}그릇` }; }
    if (t === 'missing') { const k = 4, avg = ri(70, 90), first = [avg + ri(-8, 8), avg + ri(-8, 8), avg + ri(-8, 8)], need = avg * k - first.reduce((s, v) => s + v, 0); if (need > 100 || need < 40) return GEN.avgProb(lv);
      return { prompt: `수학 시험 1~3회 점수가 ${first.join('점, ')}점이에요. 4회까지 평균이 ${avg}점이 되려면 4회에 몇 점을 받아야 할까요?`, answer: N(need, '점'), distractors: [N(avg, '점'), N(need + 4, '점'), N(need - 4, '점')], explain: `필요한 합계 ${avg}×4 = ${avg * 4}, 지금까지 ${avg * 4 - need} → ${need}점` }; }
    const W = ['불가능하다', '~아닐 것 같다', '반반이다', '~일 것 같다', '확실하다'];
    if (t === 'word') { const ev = pick([
        ['주사위를 던졌을 때 7의 눈이 나올 가능성', 0], ['동전을 던졌을 때 그림 면이 나올 가능성', 2], ['1부터 6까지 있는 주사위를 던져 6 이하의 눈이 나올 가능성', 4],
        ['내일 아침 해가 서쪽에서 뜰 가능성', 0], ['흰 공 4개만 든 주머니에서 흰 공을 꺼낼 가능성', 4], ['빨간 공 1개, 파란 공 1개가 든 주머니에서 빨간 공을 꺼낼 가능성', 2],
        ['주사위를 던졌을 때 1이 아닌 눈이 나올 가능성', 3], ['주사위를 던졌을 때 1의 눈이 나올 가능성', 1], ['12월 다음에 1월이 올 가능성', 4]]);
      return { prompt: `${ev[0]}을 말로 나타내면?`, answer: T(W[ev[1]]), distractors: shuffle(W.filter((_, i) => i !== ev[1])).slice(0, 3).map(T), explain: `→ ${W[ev[1]]}` }; }
    const NUMS = [T('0'), T('{1/2}'), T('1')];
    if (t === 'spinner' || t === 'spinNum') { const R = '#e0574f', B = '#4f86e0', kind = pick([0, 1, 2]);
      const parts = kind === 0 ? [B, B, B, B] : kind === 1 ? [R, B, R, B] : [R, R, R, R];
      const ansWord = ['불가능하다', '반반이다', '확실하다'][kind];
      if (t === 'spinner') return { prompt: `회전판을 돌렸을 때 화살표가 <b style="color:${R}">빨간색</b>에 멈출 가능성은?`, fig: figSpinner(parts), answer: T(ansWord), distractors: W.filter((w) => w !== ansWord).slice(0, 3).map(T), explain: `빨간색이 ${kind === 0 ? '없으니 불가능' : kind === 1 ? '절반이니 반반' : '전부니 확실'}` };
      return { prompt: `회전판을 돌렸을 때 화살표가 <b style="color:${R}">빨간색</b>에 멈출 가능성을 수로 나타내면?`, fig: figSpinner(parts), answer: NUMS[kind], distractors: NUMS.filter((_, i) => i !== kind).concat([T('{1/4}')]), explain: `불가능 0, 반반 ½, 확실 1` }; }
    // dice
    const ev = pick([['짝수의 눈', 1], ['7 이상의 눈', 0], ['1 이상 6 이하의 눈', 2], ['홀수의 눈', 1]]);
    return { prompt: `주사위를 한 번 던질 때 <b>${ev[0]}</b>이 나올 가능성을 수로 나타내면?`, answer: NUMS[ev[1]], distractors: NUMS.filter((_, i) => i !== ev[1]).concat([T('{1/6}')]), explain: `불가능 0, 반반 ½, 확실 1` };
  },
};

// 학기·난이도별 단원 고르기
export function unitsFor(term = 'ALL', lv = 2) {
  const all = Object.keys(UNITS).filter((u) => u !== 'basic');
  let list = term === '5-1' || term === '5-2' ? all.filter((u) => UNITS[u].term === term) : all;
  if (term && UNITS[term]) list = [term];                 // 특정 단원만
  // 기초가 약할 때는 기초 연산 복습을 섞음
  const basicW = lv <= 1 ? 0.35 : lv === 2 ? 0.1 : 0;
  return { list, basicW };
}

// 오답 정리: 중복·정답과 같은 값 제거, 3개가 안 되면 정답 근처 그럴듯한 수로 채움
function finalize(q) {
  const a = q.answer, same = (x, y) => x.text === y.text || (Number.isFinite(x.val) && Number.isFinite(y.val) && Math.abs(x.val - y.val) < 1e-9);
  const out = [];
  for (const d of q.distractors) if (d && !same(d, a) && !(Number.isFinite(d.val) && d.val < 0) && !out.some((o) => same(o, d))) out.push(d);
  const m = /^(-?[\d,]+)(?:\.(\d+))?(.*)$/.exec(a.text);
  if (out.length < 3 && m && Number.isFinite(a.val)) {
    const places = m[2] ? m[2].length : 0, suffix = m[3];
    const iv = Math.round(a.val * 10 ** places);
    let step = 1; if (!places) { for (const p of [1000, 100, 10]) if (iv % p === 0 && iv >= p) { step = p; break; } }
    for (const k of [1, -1, 2, -2, 3, 10, -10]) {
      if (out.length >= 3) break;
      const v = iv + k * step; if (v <= 0) continue;
      const d = places ? { text: dec(v, places) + suffix, val: v / 10 ** places } : N(v, suffix);
      if (!same(d, a) && !out.some((o) => same(o, d))) out.push(d);
    }
  }
  q.distractors = out.slice(0, 3);
  return q;
}

/** 수학 문제 하나 */
export function generateMath({ term = 'ALL', lv = 2, unit } = {}) {
  const { list, basicW } = unitsFor(term, lv);
  const u = unit && GEN[unit] ? unit : Math.random() < basicW ? 'basic' : pick(list);
  let q;
  for (let i = 0; i < 5; i++) { try { q = GEN[u](lv); if (q) break; } catch (e) { q = null; } }
  if (!q) q = GEN.basic(lv);
  finalize(q);
  return { subject: 'math', unit: u, unitName: UNITS[u].name, key: `M_${u}`, ...q };
}
export const _GEN = GEN; // 검사용
export const _finalize = finalize;
