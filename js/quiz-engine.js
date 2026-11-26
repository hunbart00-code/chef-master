// 퀴즈 엔진: 과목 비중, 중복 방지 큐(최근 15문제), 오답 우선 재출제(wrongQueue), 정답률 통계
import { generateMath, unitsForBranch } from './math-generator.js';
import { WORDS, SENTENCES } from './data-english.js';

const MEM_KEY = 'chefmaster_quiz_v1';
const RECENT_MAX = 15;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

function loadMem() {
  try {
    const m = JSON.parse(localStorage.getItem(MEM_KEY));
    if (m && Array.isArray(m.recent)) return { mathWrong: [], stats: {}, ...m };
  } catch (e) { /* ignore */ }
  return { recent: [], wrongQueue: [], mathWrong: [], stats: {} };
}

export class QuizEngine {
  constructor() {
    this.mem = loadMem();
  }

  save() {
    try { localStorage.setItem(MEM_KEY, JSON.stringify(this.mem)); } catch (e) { /* ignore */ }
  }

  reset() {
    this.mem = { recent: [], wrongQueue: [], mathWrong: [], stats: {} };
    this.save();
  }

  /**
   * @param {object} opt { branch, subjectRatio: '50:50'|'MATH_ONLY'|'ENG_ONLY', engBoost }
   */
  next(opt = {}) {
    const { branch = 1, subjectRatio = '50:50', engBoost = 0 } = opt;
    let engP = subjectRatio === 'MATH_ONLY' ? 0 : subjectRatio === 'ENG_ONLY' ? 1 : Math.min(0.9, 0.5 + engBoost);
    const q = Math.random() < engP ? this.makeEnglish() : this.makeMath(branch);
    this.pushRecent(q.recentKey || q.key);
    return q;
  }

  pushRecent(key) {
    this.mem.recent.push(key);
    if (this.mem.recent.length > RECENT_MAX) this.mem.recent.shift();
  }

  // ---------- 수학 ----------
  makeMath(branch) {
    const allowed = unitsForBranch(branch);
    const weak = this.mem.mathWrong.filter((u) => allowed.includes(u));
    const force = weak.length && Math.random() < 0.3 ? pick(weak) : undefined;
    let raw;
    for (let i = 0; i < 6; i++) {
      raw = generateMath(branch, force);
      const sig = `${raw.key}:${raw.prompt}`;
      if (!this.mem.recent.includes(sig)) break;
    }
    const { choices, answerIdx } = buildChoices(raw.answer, raw.distractors);
    return {
      subject: 'math', type: 'choice', key: raw.key, unit: raw.unit, label: raw.unitName,
      prompt: raw.prompt, choices, answerIdx, answerText: raw.answer.text, explain: raw.explain,
      recentKey: `${raw.key}:${raw.prompt}`,
    };
  }

  // ---------- 영어 ----------
  makeEnglish() {
    const recent = this.mem.recent;
    let item = null;
    // 오답 우선 재출제 (35%)
    const wq = this.mem.wrongQueue.filter((k) => !recent.slice(-3).includes(k));
    if (wq.length && Math.random() < 0.35) item = this.itemFromKey(pick(wq));
    if (!item) {
      for (let i = 0; i < 20; i++) {
        const useSentence = Math.random() < 0.34;
        const cand = useSentence
          ? { kind: 'S', idx: Math.floor(Math.random() * SENTENCES.length) }
          : { kind: 'W', idx: Math.floor(Math.random() * WORDS.length) };
        if (!recent.includes(keyOf(cand))) { item = cand; break; }
      }
      if (!item) item = { kind: 'W', idx: Math.floor(Math.random() * WORDS.length) };
    }
    return item.kind === 'S' ? this.sentenceQ(item.idx) : this.wordQ(item.idx);
  }

  itemFromKey(key) {
    const [, kind, idxStr] = key.split('_');
    const idx = Number(idxStr);
    if (kind === 'S' && SENTENCES[idx]) return { kind, idx };
    if (kind === 'W' && WORDS[idx]) return { kind, idx };
    return null;
  }

  sentenceQ(idx) {
    const s = SENTENCES[idx];
    const opts = shuffle([s.a, ...s.w]);
    return {
      subject: 'eng', type: 'choice', key: `E_S_${idx}`, label: '빈칸 문장 완성', word: s.a,
      prompt: `<span class="eng">${escapeHtml(s.s).replace('___', '<u>&nbsp;?&nbsp;</u>')}</span><div class="hint">💬 ${escapeHtml(s.ko)}</div>`,
      choices: opts.map((o) => `<span class="eng">${escapeHtml(o)}</span>`), answerIdx: opts.indexOf(s.a),
      answerText: s.a, explain: `${s.s.replace('___', s.a)} — ${s.ko}`,
    };
  }

  wordQ(idx) {
    const w = WORDS[idx];
    const key = `E_W_${idx}`;
    const r = Math.random();
    const canSpell = /^[a-z]{3,9}$/.test(w.en);
    if (canSpell && r < 0.33) {
      let letters = shuffle(w.en.split(''));
      for (let i = 0; i < 5 && letters.join('') === w.en; i++) letters = shuffle(letters);
      return {
        subject: 'eng', type: 'spell', key, label: '스펠링 조합', word: w.en,
        prompt: `‘<b>${escapeHtml(w.ko)}</b>’을(를) 영어로 써 보세요! <span class="hint">(${w.en.length}글자)</span>`,
        letters, answerText: w.en, explain: `${w.ko} = ${w.en}`,
      };
    }
    const others = shuffle(WORDS.filter((o, i) => i !== idx && o.ko !== w.ko)).slice(0, 3);
    if (r < 0.66) { // 영어 → 뜻
      const opts = shuffle([w, ...others]);
      return {
        subject: 'eng', type: 'choice', key, label: '단어 뜻 맞히기', word: w.en,
        prompt: `<span class="eng big">${escapeHtml(w.en)}</span><div class="hint">이 단어의 뜻은?</div>`,
        choices: opts.map((o) => escapeHtml(o.ko)), answerIdx: opts.indexOf(w),
        answerText: w.ko, explain: `${w.en} = ${w.ko}`,
      };
    }
    const opts = shuffle([w, ...others]); // 뜻 → 영어
    return {
      subject: 'eng', type: 'choice', key, label: '단어 뜻 맞히기', word: w.en,
      prompt: `‘<b>${escapeHtml(w.ko)}</b>’을(를) 영어로 하면?`,
      choices: opts.map((o) => `<span class="eng">${escapeHtml(o.en)}</span>`), answerIdx: opts.indexOf(w),
      answerText: w.en, explain: `${w.ko} = ${w.en}`,
    };
  }

  // ---------- 채점 기록 ----------
  record(q, correct) {
    const st = this.mem.stats[q.key] || (this.mem.stats[q.key] = { c: 0, w: 0 });
    if (correct) st.c++; else st.w++;
    if (q.subject === 'eng') {
      const wq = this.mem.wrongQueue;
      const i = wq.indexOf(q.key);
      if (correct && i >= 0) wq.splice(i, 1);
      if (!correct && i < 0) { wq.push(q.key); if (wq.length > 30) wq.shift(); }
    } else {
      const mw = this.mem.mathWrong;
      const i = mw.indexOf(q.unit);
      if (correct && i >= 0 && Math.random() < 0.5) mw.splice(i, 1);
      if (!correct && i < 0) mw.push(q.unit);
    }
    this.save();
  }

  accuracy() {
    let c = 0, w = 0;
    for (const s of Object.values(this.mem.stats)) { c += s.c; w += s.w; }
    return c + w ? c / (c + w) : 0;
  }
}

const keyOf = (item) => `E_${item.kind}_${item.idx}`;

function buildChoices(answer, distractors) {
  const same = (a, b) => a.text === b.text || (Math.abs(a.val - b.val) < 1e-9);
  const pool = [];
  for (const d of distractors) {
    if (d.val < 0 && d.val !== -1) continue;
    if (d.text === answer.text) continue;
    if (d.val !== -1 && Math.abs(d.val - answer.val) < 1e-9) continue;
    if (pool.some((p) => same(p, d))) continue;
    pool.push(d);
  }
  // 부족하면 근처 수로 채움
  let bump = 1;
  while (pool.length < 3 && typeof answer.val === 'number' && /^[\d,]+/.test(answer.text)) {
    const v = answer.val + bump * (bump % 2 ? 1 : -1) * Math.ceil(bump / 2) * 2;
    bump++;
    const suffix = answer.text.replace(/^[\d,]+/, '');
    const d = { text: `${v.toLocaleString('ko-KR')}${suffix}`, val: v };
    if (v > 0 && !pool.some((p) => same(p, d)) && v !== answer.val) pool.push(d);
    if (bump > 20) break;
  }
  const opts = shuffle([answer, ...shuffle(pool).slice(0, 3)]);
  return { choices: opts.map((o) => renderMath(o.text)), answerIdx: opts.indexOf(answer) };
}

// {3/4} → 세로 분수, {1 3/4} → 대분수
export function renderMath(text) {
  return String(text).replace(/\{(?:(\d+) )?(\d+)\/(\d+)\}/g, (_, w, n, d) =>
    `${w ? `<span class="whole">${w}</span>` : ''}<span class="frac"><span>${n}</span><span>${d}</span></span>`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
