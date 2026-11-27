// 퀴즈 엔진: 과목 비중, 적응형 난이도(기초→보통→도전), 중복 방지(최근 20문제), 오답 재출제, 정답률 통계
import { generateMath, UNITS } from './math-g5.js?v=20261127004038';
import { WORDS, DIALOGS, SENTENCES, PICTURES } from './data-english-g5.js?v=20261127004038';

const MEM_KEY = 'chefmaster_quiz_v1';
const RECENT_MAX = 20;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const LEVEL_NAME = { 1: '기초', 2: '보통', 3: '도전' };

// 그림 문장 묶음 펼치기
const PIC_ITEMS = PICTURES.flatMap((g, gi) => g.items.map(([pic, en], ii) => ({ gi, ii, pic, en, lv: g.lv })));
// 어순 배열용 문장 (4~7단어)
const ORDER_SRC = [
  ...DIALOGS.map((d) => ({ en: d.a, ko: `(${d.ko}) 에 대한 대답`, lv: d.lv })),
  ...SENTENCES.map((s) => ({ en: s.s.replace('___', s.a), ko: s.ko, lv: s.lv })),
  ...PIC_ITEMS.map((p) => ({ en: p.en, ko: p.pic, lv: p.lv })),
].filter((o) => { const n = o.en.split(' ').length; return n >= 3 && n <= 7 && !o.en.includes('—'); });

function loadMem(key = MEM_KEY) {
  try {
    const m = JSON.parse(localStorage.getItem(key));
    if (m && Array.isArray(m.recent)) return { mathWrong: [], stats: {}, hist: [], ...m };
  } catch (e) { /* ignore */ }
  return { recent: [], wrongQueue: [], mathWrong: [], stats: {}, hist: [] };
}

// 난이도에 맞는 항목 고르기: 지금 단계 70%, 더 쉬운 단계 30%
function poolByLv(list, lv) {
  const cur = list.map((x, i) => [x, i]).filter(([x]) => x.lv === lv);
  const easy = list.map((x, i) => [x, i]).filter(([x]) => x.lv < lv);
  const src = cur.length && (Math.random() < 0.7 || !easy.length) ? cur : easy.length ? easy : list.map((x, i) => [x, i]);
  return src;
}

export class QuizEngine {
  constructor() {
    this.key = MEM_KEY;
    this.mem = loadMem();
  }

  useScope(id) {
    this.key = id ? `${MEM_KEY}:${id}` : MEM_KEY;
    this.mem = loadMem(this.key);
  }

  save() { try { localStorage.setItem(this.key, JSON.stringify(this.mem)); } catch (e) { /* ignore */ } }

  reset() { this.mem = { recent: [], wrongQueue: [], mathWrong: [], stats: {}, hist: [] }; this.save(); }

  /**
   * 난이도: 영업 일수로 기본 단계를 정하고, 최근 정답률로 올리거나 내림
   * DAY1~2 기초 → DAY3~5 기초·보통 → DAY6~10 보통 → DAY11~ 보통·도전
   */
  levelFor(day = 1) {
    let x = day <= 2 ? 1 : day <= 5 ? 1.5 : day <= 10 ? 2 : 2.5;
    const h = this.mem.hist || [];
    if (h.length >= 6) {
      const acc = h.filter(Boolean).length / h.length;
      if (acc >= 0.85) x += 0.6; else if (acc >= 0.7) x += 0.25; else if (acc < 0.4) x -= 0.8; else if (acc < 0.55) x -= 0.4;
    }
    x = Math.max(1, Math.min(3, x));
    const lv = Math.floor(x) + (Math.random() < x - Math.floor(x) ? 1 : 0);
    return Math.max(1, Math.min(3, lv));
  }

  /**
   * @param {object} opt { day, term:'ALL'|'5-1'|'5-2'|단원키, subjectRatio, engBoost }
   */
  next(opt = {}) {
    const { day = 1, term = 'ALL', subjectRatio = '50:50', engBoost = 0 } = opt;
    const engP = subjectRatio === 'MATH_ONLY' ? 0 : subjectRatio === 'ENG_ONLY' ? 1 : Math.min(0.9, 0.5 + engBoost);
    const lv = this.levelFor(day);
    let q;
    for (let i = 0; i < 8; i++) {
      q = Math.random() < engP ? this.makeEnglish(lv) : this.makeMath(lv, term);
      if (!this.mem.recent.includes(q.recentKey)) break;
    }
    q.lv = lv;
    q.levelName = LEVEL_NAME[lv];
    this.mem.recent.push(q.recentKey);
    if (this.mem.recent.length > RECENT_MAX) this.mem.recent.shift();
    return q;
  }

  // ---------- 수학 ----------
  makeMath(lv, term) {
    const weak = this.mem.mathWrong.filter((u) => UNITS[u] && (term === 'ALL' || UNITS[u].term === term || u === term));
    const unit = weak.length && Math.random() < 0.3 ? pick(weak) : undefined;
    const raw = generateMath({ term, lv, unit });
    const { choices, answerIdx } = buildChoices(raw.answer, raw.distractors);
    return {
      subject: 'math', type: 'choice', key: raw.key, unit: raw.unit, label: raw.unitName,
      prompt: raw.prompt + (raw.fig ? `<div class="qfig">${raw.fig}</div>` : ''),
      choices, answerIdx, answerText: raw.answerText || raw.answer.text, explain: raw.explain,
      recentKey: `${raw.key}:${raw.prompt}`,
    };
  }

  // ---------- 영어 ----------
  makeEnglish(lv) {
    // 틀린 문제 다시 (30%)
    const wq = this.mem.wrongQueue.filter((k) => !this.mem.recent.slice(-4).includes(k));
    if (wq.length && Math.random() < 0.3) { const q = this.fromKey(pick(wq), lv); if (q) return q; }
    const types = lv === 1
      ? [['picWord', 22], ['enKo', 16], ['koEn', 12], ['picSent', 16], ['dialog', 10], ['spell', 8], ['sentence', 4]]
      : lv === 2
        ? [['dialog', 18], ['sentence', 16], ['picSent', 12], ['enKo', 8], ['koEn', 8], ['spell', 12], ['order', 10], ['picWord', 6]]
        : [['order', 18], ['sentence', 18], ['dialog', 18], ['spell', 14], ['koEn', 10], ['picSent', 6], ['enKo', 6]];
    const usable = types;
    const total = usable.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total, type = usable[0][0];
    for (const [t, w] of usable) { if ((r -= w) < 0) { type = t; break; } }
    return this.makeType(type, lv);
  }

  makeType(type, lv, idx) {
    switch (type) {
      case 'enKo': case 'koEn': case 'picWord': case 'spell': {
        let list = WORDS.map((w, i) => [w, i]);
        if (type === 'picWord') list = list.filter(([w]) => w.pic);
        if (type === 'spell') list = list.filter(([w]) => /^[a-z]+$/.test(w.en) && w.en.length >= 3 && w.en.length <= (lv === 1 ? 5 : lv === 2 ? 7 : 10));
        const pool = idx !== undefined ? [[WORDS[idx], idx]] : poolByLvPairs(list, lv);
        const [, i] = pick(pool);
        return this.wordQ(i, type);
      }
      case 'dialog': return this.dialogQ(idx ?? pick(poolByLv(DIALOGS, lv))[1]);
      case 'sentence': return this.sentenceQ(idx ?? pick(poolByLv(SENTENCES, lv))[1]);
      case 'picSent': return this.picQ(idx ?? pick(poolByLv(PIC_ITEMS, lv))[1]);
      case 'order': return this.orderQ(idx ?? pick(poolByLv(ORDER_SRC, lv))[1]);
      default: return this.wordQ(0, 'enKo');
    }
  }

  fromKey(key, lv) {
    const [, type, idxStr] = key.split('_');
    const idx = Number(idxStr);
    const map = { W: 'enKo', D: 'dialog', S: 'sentence', P: 'picSent', O: 'order' };
    if (!map[type] || Number.isNaN(idx)) return null;
    // 단어는 이번엔 다른 방식으로 (뜻 ↔ 영어 ↔ 스펠링)
    const t = type === 'W' ? pick(['enKo', 'koEn', 'spell']) : map[type];
    try { return this.makeType(t, lv, idx); } catch (e) { return null; }
  }

  wordQ(idx, mode) {
    const w = WORDS[idx];
    const key = `E_W_${idx}`;
    const others = shuffle(WORDS.filter((o) => o.en !== w.en && o.ko !== w.ko && (mode !== 'picWord' || (o.pic && o.pic !== w.pic)))).slice(0, 3);
    const opts = shuffle([w, ...others]);
    const base = { subject: 'eng', key, recentKey: key, word: w.en, explain: `${w.pic ? w.pic + ' ' : ''}${w.en} = ${w.ko}` };
    if (mode === 'spell' && /^[a-z]+$/.test(w.en)) {
      let letters = shuffle(w.en.split(''));
      for (let i = 0; i < 6 && letters.join('') === w.en; i++) letters = shuffle(letters);
      return { ...base, type: 'spell', label: '스펠링 조합', tokens: letters, joiner: '', answerText: w.en,
        prompt: `${w.pic ? `<div class="pic">${w.pic}</div>` : ''}‘<b>${esc(w.ko)}</b>’을(를) 영어로 써 보세요! <span class="hint">(${w.en.length}글자)</span>` };
    }
    if (mode === 'picWord') {
      return { ...base, type: 'choice', label: '그림 보고 단어 고르기', answerIdx: opts.indexOf(w), answerText: w.en,
        prompt: `<div class="pic big">${w.pic}</div><div class="hint">그림에 알맞은 영어 단어는?</div>`,
        choices: opts.map((o) => `<span class="eng">${esc(o.en)}</span>`) };
    }
    if (mode === 'koEn') {
      return { ...base, type: 'choice', label: '우리말 → 영어', answerIdx: opts.indexOf(w), answerText: w.en,
        prompt: `${w.pic ? `<div class="pic">${w.pic}</div>` : ''}‘<b>${esc(w.ko)}</b>’을(를) 영어로 하면?`,
        choices: opts.map((o) => `<span class="eng">${esc(o.en)}</span>`) };
    }
    return { ...base, type: 'choice', label: '단어 뜻 맞히기', answerIdx: opts.indexOf(w), answerText: w.ko,
      prompt: `<span class="eng big">${esc(w.en)}</span><div class="hint">이 단어의 뜻은?</div>`,
      choices: opts.map((o) => esc(o.ko)) };
  }

  dialogQ(idx) {
    const d = DIALOGS[idx];
    const opts = shuffle([d.a, ...d.w]);
    return {
      subject: 'eng', type: 'choice', key: `E_D_${idx}`, recentKey: `E_D_${idx}`, label: '알맞은 대답 고르기', word: d.a,
      prompt: `<div class="dlg"><span class="who">A</span><span class="eng">${esc(d.q)}</span></div><div class="dlg"><span class="who b">B</span><span class="eng">________</span></div><div class="hint">💬 ${esc(d.ko)}</div>`,
      choices: opts.map((o) => `<span class="eng">${esc(o)}</span>`), answerIdx: opts.indexOf(d.a),
      answerText: d.a, explain: `A: ${d.q} → B: ${d.a}`,
    };
  }

  sentenceQ(idx) {
    const s = SENTENCES[idx];
    const opts = shuffle([s.a, ...s.w]);
    return {
      subject: 'eng', type: 'choice', key: `E_S_${idx}`, recentKey: `E_S_${idx}`, label: '빈칸 문장 완성', word: s.a,
      prompt: `<span class="eng">${esc(s.s).replace('___', '<u>&nbsp;?&nbsp;</u>')}</span><div class="hint">💬 ${esc(s.ko)}</div>`,
      choices: opts.map((o) => `<span class="eng">${esc(o)}</span>`), answerIdx: opts.indexOf(s.a),
      answerText: s.a, explain: `${s.s.replace('___', s.a)} — ${s.ko}`,
    };
  }

  picQ(idx) {
    const p = PIC_ITEMS[idx];
    const group = PICTURES[p.gi].items.map(([pic, en]) => ({ pic, en })).filter((o) => o.en !== p.en);
    const opts = shuffle([{ pic: p.pic, en: p.en }, ...shuffle(group).slice(0, 3)]);
    const ai = opts.findIndex((o) => o.en === p.en);
    return { subject: 'eng', type: 'choice', key: `E_P_${idx}`, recentKey: `E_P_${idx}`, label: '그림에 맞는 문장', word: p.en,
      prompt: `<div class="pic big">${p.pic}</div><div class="hint">그림에 알맞은 문장은?</div>`,
      choices: opts.map((o) => `<span class="eng">${esc(o.en)}</span>`), answerIdx: ai, answerText: p.en, explain: `${p.pic} ${p.en}` };
  }

  orderQ(idx) {
    const o = ORDER_SRC[idx];
    const words = o.en.split(' ');
    let tokens = shuffle(words);
    for (let i = 0; i < 6 && tokens.join(' ') === o.en; i++) tokens = shuffle(words);
    const isPic = o.ko.startsWith('<svg') || /\p{Extended_Pictographic}/u.test(o.ko);
    return {
      subject: 'eng', type: 'spell', key: `E_O_${idx}`, recentKey: `E_O_${idx}`, label: '문장 순서 맞추기', word: o.en,
      tokens, joiner: ' ', answerText: o.en, explain: o.en,
      prompt: `${isPic ? `<div class="pic">${o.ko}</div>` : `<div class="hint">💬 ${esc(o.ko)}</div>`}<div>낱말을 순서대로 눌러 문장을 만드세요!</div>`,
    };
  }

  // ---------- 채점 기록 ----------
  record(q, correct) {
    const st = this.mem.stats[q.key] || (this.mem.stats[q.key] = { c: 0, w: 0 });
    if (correct) st.c++; else st.w++;
    (this.mem.hist ||= []).push(!!correct);
    if (this.mem.hist.length > 12) this.mem.hist.shift();
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

  /** 선생님 현황판용 요약: 과목별 정답률, 푼 문제 수, 자주 틀리는 수학 단원 */
  summary() {
    const sum = { m: [0, 0], e: [0, 0] };
    for (const [k, v] of Object.entries(this.mem.stats)) { const t = k.startsWith('M_') ? sum.m : sum.e; t[0] += v.c; t[1] += v.c + v.w; }
    const unitAcc = {};
    for (const [k, v] of Object.entries(this.mem.stats)) if (k.startsWith('M_')) { const u = k.slice(2); unitAcc[u] = { c: v.c, n: v.c + v.w }; }
    const weak = Object.entries(unitAcc).filter(([, v]) => v.n >= 3).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).slice(0, 2)
      .filter(([, v]) => v.c / v.n < 0.7).map(([u]) => UNITS[u]?.name || u);
    return { mathN: sum.m[1], mathC: sum.m[0], engN: sum.e[1], engC: sum.e[0], weak, at: Date.now() };
  }

  accuracy() {
    let c = 0, w = 0;
    for (const s of Object.values(this.mem.stats)) { c += s.c; w += s.w; }
    return c + w ? c / (c + w) : 0;
  }
}

function poolByLvPairs(pairs, lv) {
  const cur = pairs.filter(([x]) => x.lv === lv), easy = pairs.filter(([x]) => x.lv < lv);
  return cur.length && (Math.random() < 0.7 || !easy.length) ? cur : easy.length ? easy : pairs;
}

function buildChoices(answer, distractors) {
  const opts = shuffle([answer, ...distractors.slice(0, 3)]);
  return { choices: opts.map((o) => renderMath(o.text)), answerIdx: opts.indexOf(answer) };
}

// {3/4} → 세로 분수, {1 3/4} → 대분수
export function renderMath(text) {
  return String(text).replace(/\{(?:(\d+) )?(\d+)\/(\d+)\}/g, (_, w, n, d) =>
    `${w ? `<span class="whole">${w}</span>` : ''}<span class="frac"><span>${n}</span><span>${d}</span></span>`);
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
