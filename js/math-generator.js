// 수학 문제 무한 자동 생성기 (초등 5학년 교육과정)
// 분수는 토큰 {3/4}, 대분수는 {1 3/4} 형식으로 표기하고 UI에서 세로 분수로 렌더링합니다.

const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
export const lcm = (a, b) => (a / gcd(a, b)) * b;

export const MATH_UNITS = {
  arith:   '자연수의 사칙연산',
  mixed:   '자연수의 혼합 계산',
  divisor: '약수와 배수',
  reduce:  '약분과 통분',
  fracAdd: '분수의 덧셈과 뺄셈',
  fracMul: '분수의 곱셈',
  area:    '다각형의 넓이',
  average: '평균',
};

// 지점이 올라갈수록 난이도 스케일링 [단원, 가중치]
const BRANCH_UNITS = {
  1: [['arith', 5], ['mixed', 5]],
  2: [['mixed', 3], ['divisor', 4], ['reduce', 3]],
  3: [['divisor', 2], ['fracAdd', 5], ['fracMul', 3]],
  4: [['fracAdd', 2], ['area', 5], ['average', 3]],
};

export function unitsForBranch(branch) {
  return (BRANCH_UNITS[branch] || BRANCH_UNITS[1]).map(([u]) => u);
}

function weightedUnit(branch) {
  const list = BRANCH_UNITS[branch] || BRANCH_UNITS[1];
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [u, w] of list) { if ((r -= w) < 0) return u; }
  return list[0][0];
}

// ---------- 값 표현 ----------
const N = (n, suffix = '') => ({ text: `${n.toLocaleString('ko-KR')}${suffix}`, val: n });

function frac(n, d) {
  const g = gcd(n, d);
  n /= g; d /= g;
  if (d === 1) return { text: `${n}`, val: n, n, d };
  if (n > d) return { text: `{${Math.floor(n / d)} ${n % d}/${d}}`, val: n / d, n, d };
  return { text: `{${n}/${d}}`, val: n / d, n, d };
}
// 약분하지 않은 분수 표기
const rawFrac = (n, d) => `{${n}/${d}}`;
// 기약 진분수의 분자
function coprimeNum(d) {
  let n = ri(1, d - 1);
  while (gcd(n, d) !== 1) n = ri(1, d - 1);
  return n;
}

// ---------- 단원별 생성기 ----------
const GEN = {
  arith() {
    const t = pick(['add', 'sub', 'mul', 'div']);
    if (t === 'add') {
      const a = ri(120, 899), b = ri(110, 899), ans = a + b;
      return { prompt: `${a} + ${b} = ?`, answer: N(ans), distractors: [N(ans + 10), N(ans - 10), N(ans + 100), N(ans - 1)],
        explain: `일의 자리부터 차례로 더해요. ${a} + ${b} = ${ans}` };
    }
    if (t === 'sub') {
      const a = ri(400, 999), b = ri(105, a - 50), ans = a - b;
      return { prompt: `${a} − ${b} = ?`, answer: N(ans), distractors: [N(ans + 10), N(ans - 10), N(ans + 100), N(ans + 1)],
        explain: `받아내림에 주의해요. ${a} − ${b} = ${ans}` };
    }
    if (t === 'mul') {
      const a = ri(12, 49), b = ri(11, 29), ans = a * b;
      return { prompt: `${a} × ${b} = ?`, answer: N(ans), distractors: [N(ans + a), N(ans - a), N(ans + 10), N(a * (b % 10) + Math.floor(b / 10) * a)],
        explain: `${a} × ${b} = ${a} × ${Math.floor(b / 10) * 10} + ${a} × ${b % 10} = ${ans}` };
    }
    const b = ri(11, 25), q = ri(11, 39), a = b * q;
    return { prompt: `${a} ÷ ${b} = ?`, answer: N(q), distractors: [N(q + 1), N(q - 1), N(q + 10), N(q + 2)],
      explain: `${b} × ${q} = ${a} 이므로 ${a} ÷ ${b} = ${q}` };
  },

  mixed() {
    const t = ri(0, 4);
    if (t === 0) { // a + b × c
      const a = ri(5, 40), b = ri(2, 12), c = ri(2, 9), ans = a + b * c;
      return { prompt: `${a} + ${b} × ${c} = ?`, answer: N(ans), distractors: [N((a + b) * c), N(ans + c), N(ans - b)],
        explain: `곱셈을 먼저! ${b} × ${c} = ${b * c}, ${a} + ${b * c} = ${ans}` };
    }
    if (t === 1) { // (a + b) × c
      const a = ri(3, 20), b = ri(2, 15), c = ri(2, 8), ans = (a + b) * c;
      return { prompt: `(${a} + ${b}) × ${c} = ?`, answer: N(ans), distractors: [N(a + b * c), N(ans + c), N(ans - c)],
        explain: `괄호 먼저! ${a} + ${b} = ${a + b}, ${a + b} × ${c} = ${ans}` };
    }
    if (t === 2) { // a − b ÷ c
      const c = ri(2, 9), q = ri(2, 9), b = c * q, a = ri(q + 5, 60), ans = a - q;
      const wrong = (a - b) % c === 0 && a - b > 0 ? (a - b) / c : ans + c;
      return { prompt: `${a} − ${b} ÷ ${c} = ?`, answer: N(ans), distractors: [N(wrong), N(ans + 1), N(ans - 2)],
        explain: `나눗셈을 먼저! ${b} ÷ ${c} = ${q}, ${a} − ${q} = ${ans}` };
    }
    if (t === 3) { // a × b − c ÷ d
      const a = ri(3, 12), b = ri(3, 9), d = ri(2, 6), q = ri(2, 8), c = d * q, ans = a * b - q;
      return { prompt: `${a} × ${b} − ${c} ÷ ${d} = ?`, answer: N(ans), distractors: [N(a * b - c), N(ans + d), N(ans - 1)],
        explain: `×, ÷ 먼저! ${a}×${b}=${a * b}, ${c}÷${d}=${q}, ${a * b} − ${q} = ${ans}` };
    }
    // a + (b − c) × d
    const c = ri(2, 9), b = c + ri(2, 9), d = ri(2, 7), a = ri(3, 30), ans = a + (b - c) * d;
    return { prompt: `${a} + (${b} − ${c}) × ${d} = ?`, answer: N(ans), distractors: [N((a + b - c) * d), N(a + b - c * d > 0 ? a + b - c * d : ans + 2 * d), N(ans - d)],
      explain: `괄호 → 곱셈 → 덧셈 순서! ${b}−${c}=${b - c}, ×${d}=${(b - c) * d}, +${a} = ${ans}` };
  },

  divisor() {
    const t = ri(0, 3);
    if (t === 0) {
      const n = pick([12, 16, 18, 20, 24, 28, 30, 32, 36, 40, 42, 45, 48]);
      const divs = []; for (let i = 1; i <= n; i++) if (n % i === 0) divs.push(i);
      const k = divs.length;
      return { prompt: `${n}의 약수는 모두 몇 개일까요?`, answer: N(k, '개'), distractors: [N(k - 1, '개'), N(k + 1, '개'), N(k - 2, '개'), N(k + 2, '개')],
        explain: `${n}의 약수: ${divs.join(', ')} → ${k}개` };
    }
    if (t === 1) {
      const g = ri(2, 9); let m = ri(2, 7), k = ri(2, 7);
      while (k === m || gcd(m, k) !== 1) { m = ri(2, 7); k = ri(2, 7); }
      const a = g * m, b = g * k;
      return { prompt: `${a}와 ${b}의 최대공약수는?`, answer: N(g), distractors: [N(lcm(a, b)), N(g * 2), N(g + 1), N(Math.max(1, g - 1))],
        explain: `${a} = ${g}×${m}, ${b} = ${g}×${k} → 최대공약수 ${g}` };
    }
    if (t === 2) {
      let a = ri(3, 12), b = ri(3, 15);
      while (a === b || a % b === 0 || b % a === 0) { a = ri(3, 12); b = ri(3, 15); }
      const L = lcm(a, b);
      return { prompt: `${a}와 ${b}의 최소공배수는?`, answer: N(L), distractors: [N(a * b === L ? L + a : a * b), N(gcd(a, b)), N(L + b), N(L * 2)],
        explain: `${a}의 배수와 ${b}의 배수 중 가장 작은 공통 배수 → ${L}` };
    }
    const n = pick([18, 20, 24, 30, 36, 40, 48]);
    const divs = []; for (let i = 2; i < n; i++) if (n % i === 0) divs.push(i);
    let non = ri(4, n - 1); while (n % non === 0) non = ri(4, n - 1);
    const shuffled = divs.sort(() => Math.random() - 0.5).slice(0, 3);
    return { prompt: `다음 중 ${n}의 약수가 <b>아닌</b> 것은?`, answer: N(non), distractors: shuffled.map((d) => N(d)),
      explain: `${n} ÷ ${non}은 나누어떨어지지 않아요.` };
  },

  reduce() {
    if (Math.random() < 0.6) {
      let n = ri(1, 8), d = ri(n + 1, 12); while (gcd(n, d) !== 1) { n = ri(1, 8); d = ri(n + 1, 12); }
      const k = ri(2, 6), A = n * k, B = d * k;
      const ans = frac(n, d);
      const half = k % 2 === 0 && k > 2 ? { text: rawFrac(A / 2, B / 2), val: -1 } : null;
      const ds = [{ text: rawFrac(n + 1, d), val: (n + 1) / d }, { text: rawFrac(n, d + 1), val: n / (d + 1) }, { text: rawFrac(Math.max(1, n - 1), d), val: Math.max(1, n - 1) / d + 0.0001 }];
      if (half) ds.unshift(half);
      return { prompt: `${rawFrac(A, B)}을(를) 기약분수로 나타내면?`, answer: ans, distractors: ds,
        explain: `분모와 분자를 최대공약수 ${k}로 나눠요 → ${ans.text}`, fracValStrict: true };
    }
    // 크기 비교
    let a = ri(1, 6), b = ri(a + 1, 9), c = ri(1, 6), d = ri(c + 1, 9);
    while (a * d === b * c) { c = ri(1, 6); d = ri(c + 1, 9); }
    const bigger = a / b > c / d ? [a, b] : [c, d];
    const smaller = a / b > c / d ? [c, d] : [a, b];
    const L = lcm(b, d);
    return { prompt: `${rawFrac(a, b)}와 ${rawFrac(c, d)} 중 더 큰 분수는?`, answer: { text: rawFrac(...bigger), val: 1 }, distractors: [{ text: rawFrac(...smaller), val: 2 }, { text: '두 수가 같다', val: 3 }],
      explain: `분모를 ${L}로 통분해 분자끼리 비교해요: ${a * (L / b)}/${L}, ${c * (L / d)}/${L}` };
  },

  fracAdd() {
    let d1 = ri(2, 9), d2 = ri(2, 9); while (d1 === d2) d2 = ri(2, 9);
    let n1 = coprimeNum(d1), n2 = coprimeNum(d2);
    const sub = Math.random() < 0.45;
    if (sub && n1 / d1 < n2 / d2) { [d1, d2] = [d2, d1]; [n1, n2] = [n2, n1]; }
    if (sub && n1 * d2 === n2 * d1) return GEN.fracAdd();
    const L = lcm(d1, d2), x = n1 * (L / d1), y = n2 * (L / d2);
    const rn = sub ? x - y : x + y;
    const ans = frac(rn, L);
    const op = sub ? '−' : '+';
    const wrongN = sub ? n1 - n2 : n1 + n2;
    const ds = [
      wrongN > 0 ? frac(wrongN, sub ? Math.abs(d1 - d2) || d1 : d1 + d2) : frac(rn + 1, L),
      frac(rn + 1, L),
      rn - 1 > 0 ? frac(rn - 1, L) : frac(rn + 2, L),
      wrongN > 0 ? frac(wrongN, L) : frac(rn + 3, L),
    ];
    return { prompt: `${rawFrac(n1, d1)} ${op} ${rawFrac(n2, d2)} = ?`, answer: ans, distractors: ds,
      explain: `분모를 ${L}로 통분: ${rawFrac(x, L)} ${op} ${rawFrac(y, L)} = ${rawFrac(rn, L)} → ${ans.text}` };
  },

  fracMul() {
    if (Math.random() < 0.5) {
      const d = ri(3, 9), n = coprimeNum(d), k = ri(2, 9);
      const ans = frac(n * k, d);
      return { prompt: `${rawFrac(n, d)} × ${k} = ?`, answer: ans, distractors: [frac(n, d * k), frac(n * k, d * k), frac(n + k, d), frac(n * k + 1, d)],
        explain: `분자에 자연수를 곱해요: ${n}×${k} = ${n * k} → ${rawFrac(n * k, d)} = ${ans.text}` };
    }
    const b = ri(2, 9), a = coprimeNum(b), d = ri(2, 9), c = coprimeNum(d);
    const ans = frac(a * c, b * d);
    return { prompt: `${rawFrac(a, b)} × ${rawFrac(c, d)} = ?`, answer: ans, distractors: [frac(a + c, b + d), frac(a * c, b + d), frac(a * d, b * c), frac(a * c + 1, b * d)],
      explain: `분자끼리, 분모끼리 곱해요: ${rawFrac(a * c, b * d)} → ${ans.text}` };
  },

  area() {
    const t = ri(0, 5), cm2 = 'cm²';
    if (t === 0) { const w = ri(4, 15), h = ri(3, 12);
      return { prompt: `가로 ${w}cm, 세로 ${h}cm인 직사각형의 넓이는?`, answer: N(w * h, cm2), distractors: [N(2 * (w + h), cm2), N(w * h + w, cm2), N(w + h, cm2)], explain: `직사각형 넓이 = 가로 × 세로 = ${w}×${h} = ${w * h}${cm2}` }; }
    if (t === 1) { const s = ri(3, 14);
      return { prompt: `한 변이 ${s}cm인 정사각형의 넓이는?`, answer: N(s * s, cm2), distractors: [N(4 * s, cm2), N(s * 2, cm2), N(s * s + s, cm2)], explain: `정사각형 넓이 = 한 변 × 한 변 = ${s}×${s} = ${s * s}${cm2}` }; }
    if (t === 2) { const b = ri(4, 15), h = ri(3, 12);
      return { prompt: `밑변 ${b}cm, 높이 ${h}cm인 평행사변형의 넓이는?`, answer: N(b * h, cm2), distractors: [N((b * h) / 2 | 0 || b, cm2), N(2 * (b + h), cm2), N(b * h + h, cm2)], explain: `평행사변형 넓이 = 밑변 × 높이 = ${b * h}${cm2}` }; }
    if (t === 3) { let b = ri(4, 16), h = ri(3, 12); if ((b * h) % 2) b++;
      return { prompt: `밑변 ${b}cm, 높이 ${h}cm인 삼각형의 넓이는?`, answer: N((b * h) / 2, cm2), distractors: [N(b * h, cm2), N(b + h, cm2), N((b * h) / 2 + h, cm2)], explain: `삼각형 넓이 = 밑변 × 높이 ÷ 2 = ${b}×${h}÷2 = ${(b * h) / 2}${cm2}` }; }
    if (t === 4) { const a = ri(3, 9), b = ri(a + 1, 14); let h = ri(2, 10); if (((a + b) * h) % 2) h++;
      const ans = ((a + b) * h) / 2;
      return { prompt: `윗변 ${a}cm, 아랫변 ${b}cm, 높이 ${h}cm인 사다리꼴의 넓이는?`, answer: N(ans, cm2), distractors: [N((a + b) * h, cm2), N(a * b, cm2), N(ans + h, cm2)], explain: `사다리꼴 = (윗변 + 아랫변) × 높이 ÷ 2 = (${a}+${b})×${h}÷2 = ${ans}${cm2}` }; }
    let p = ri(4, 14), q = ri(4, 14); if ((p * q) % 2) p++;
    return { prompt: `두 대각선이 ${p}cm, ${q}cm인 마름모의 넓이는?`, answer: N((p * q) / 2, cm2), distractors: [N(p * q, cm2), N(p + q, cm2), N((p * q) / 2 + 2, cm2)], explain: `마름모 = 한 대각선 × 다른 대각선 ÷ 2 = ${(p * q) / 2}${cm2}` };
  },

  average() {
    const k = ri(3, 5), avg = ri(5, 30);
    const nums = [];
    for (let i = 0; i < k - 1; i++) nums.push(Math.max(1, avg + ri(-6, 6)));
    const last = avg * k - nums.reduce((s, v) => s + v, 0);
    if (last < 1 || last > 60) return GEN.average();
    nums.push(last);
    const sum = avg * k;
    return { prompt: `${nums.join(', ')}의 평균은?`, answer: N(avg), distractors: [N(sum), N(avg + 1), N(avg - 1), N(avg + 2)],
      explain: `(자료의 합) ÷ (개수) = ${sum} ÷ ${k} = ${avg}` };
  },
};

/**
 * 수학 문제 생성
 * @param {number} branch 1~4
 * @param {string} [forceUnit]
 */
export function generateMath(branch = 1, forceUnit) {
  const unit = forceUnit && GEN[forceUnit] ? forceUnit : weightedUnit(branch);
  const q = GEN[unit]();
  return { subject: 'math', unit, unitName: MATH_UNITS[unit], key: `M_${unit}`, ...q };
}
