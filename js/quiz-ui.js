// 퀴즈 팝업 UI: 3문제, 문제당 30초, 오답 1줄 해설
import { renderMath } from './quiz-engine.js';

import { GRADE, gradeFromCorrect } from './shop-engine.js';

const Q_TIME = 30;

export class QuizUI {
  constructor(root, engine, getContext, sfx) {
    this.root = root;
    this.engine = engine;
    this.getContext = getContext; // () => ({ branch, subjectRatio })
    this.sfx = sfx;
    root.innerHTML = `
      <div class="quiz-box pixel-box" role="dialog" aria-modal="true">
        <div class="quiz-head"><span class="q-title"></span><span class="q-dots"></span></div>
        <div class="quiz-timer"><i></i><b></b></div>
        <div class="quiz-tag"></div>
        <div class="quiz-prompt"></div>
        <div class="quiz-choices"></div>
        <div class="quiz-spell" hidden>
          <div class="slots"></div>
          <div class="tiles"></div>
          <button class="btn small ghost q-clear">⌫ 지우기</button>
        </div>
        <div class="quiz-feedback" hidden></div>
        <div class="quiz-result" hidden></div>
      </div>`;
    const $ = (s) => root.querySelector(s);
    this.el = {
      title: $('.q-title'), dots: $('.q-dots'), timerBar: $('.quiz-timer i'), timerSec: $('.quiz-timer b'),
      tag: $('.quiz-tag'), prompt: $('.quiz-prompt'), choices: $('.quiz-choices'), spell: $('.quiz-spell'),
      slots: $('.slots'), tiles: $('.tiles'), clear: $('.q-clear'), feedback: $('.quiz-feedback'), result: $('.quiz-result'),
    };
    this.el.clear.addEventListener('click', (e) => { if (this.fresh(e)) this.spellUndo(); });
    // 폰 '유령 터치' 막기: 손님을 눌러 퀴즈가 열린 그 터치가 손을 뗄 때 보기 버튼을 눌러 버리는 문제
    // → 문제가 화면에 나온 뒤에 퀴즈 창 안에서 시작된 터치만 인정
    this.shownAt = 0; this.downAt = -1; this.downIn = false;
    document.addEventListener('pointerdown', (e) => { this.downAt = performance.now(); this.downIn = this.root.contains(e.target); }, true);
    document.addEventListener('keydown', (e) => this.onKey(e));
  }

  get isOpen() { return !this.root.hidden; }

  // 키보드(Enter)로 누른 건 detail 0 → 그대로 인정
  fresh(e) { return !e || !e.detail || (this.downIn && this.downAt >= this.shownAt); }

  /**
   * @param {object} o { title, count=3, engBoost, resultHtml(correct,total), resultButton, onDone(correct,total) }
   */
  open(o) {
    this.opt = { count: 3, ...o };
    this.idx = 0;
    this.correct = 0;
    this.answers = [];
    this.root.hidden = false;
    this.el.title.textContent = o.title;
    this.el.result.hidden = true;
    this.nextQuestion();
  }

  nextQuestion() {
    const ctx = this.getContext();
    this.q = this.engine.next({ day: ctx.day, term: ctx.term, subjectRatio: ctx.subjectRatio, engBoost: this.opt.engBoost || 0 });
    this.answered = false;
    this.shownAt = performance.now();
    const q = this.q;
    this.renderDots();
    this.el.tag.innerHTML = `<span class="subj ${q.subject}">${q.subject === 'math' ? '수학' : '영어'}</span> ${q.label} <span class="lv lv${q.lv}">${q.levelName || ''}</span>`;
    this.el.prompt.hidden = false;
    this.root.querySelector('.quiz-timer').hidden = false;
    this.el.prompt.innerHTML = `<div>${q.subject === 'math' ? renderMath(q.prompt) : q.prompt}</div>`;
    this.el.feedback.hidden = true;
    this.el.choices.innerHTML = '';
    this.el.spell.hidden = q.type !== 'spell';
    this.el.choices.hidden = q.type === 'spell';
    this.root.querySelector('.quiz-box').classList.toggle('eng-mode', q.subject === 'eng');

    if (q.type === 'choice') {
      q.choices.forEach((html, i) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = `<span class="num">${i + 1}</span><span class="ctext">${html}</span>`;
        b.addEventListener('click', (e) => { if (this.fresh(e)) this.answer(i); });
        this.el.choices.appendChild(b);
      });
    } else {
      this.spellPicked = [];
      this.el.tiles.innerHTML = '';
      this.el.slots.className = `slots${q.joiner ? ' words' : ''}`;
      q.tokens.forEach((ch, i) => {
        const b = document.createElement('button');
        b.className = q.joiner ? 'tile word' : 'tile';
        b.textContent = ch;
        b.dataset.i = i;
        b.addEventListener('click', (e) => { if (this.fresh(e)) this.spellPick(i); });
        this.el.tiles.appendChild(b);
      });
      this.renderSlots();
    }
    this.startTimer();
  }

  renderDots() {
    const n = this.opt.count;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = this.answers[i];
      s += `<span class="dot ${a === true ? 'ok' : a === false ? 'no' : i === this.idx ? 'now' : ''}">${a === true ? '⭕' : a === false ? '❌' : i + 1}</span>`;
    }
    this.el.dots.innerHTML = s;
  }

  startTimer() {
    clearInterval(this.timer);
    this.left = Q_TIME;
    const tick = () => {
      this.el.timerBar.style.width = `${(this.left / Q_TIME) * 100}%`;
      this.el.timerBar.className = this.left < 8 ? 'low' : '';
      this.el.timerSec.textContent = `${Math.ceil(this.left)}초`;
    };
    tick();
    this.timer = setInterval(() => {
      if (this.locked) return;
      this.left -= 0.1;
      if (this.left <= 0) { this.left = 0; tick(); this.answer(-1, true); return; }
      tick();
    }, 100);
  }

  // ---------- 스펠링 ----------
  spellPick(i) {
    if (this.answered || this.spellPicked.includes(i)) return;
    this.spellPicked.push(i);
    this.el.tiles.children[i].classList.add('used');
    this.sfx?.play('tap');
    this.renderSlots();
    if (this.spellPicked.length === this.q.tokens.length) {
      const word = this.spellPicked.map((k) => this.q.tokens[k]).join(this.q.joiner);
      this.answer(word === this.q.answerText ? 'ok' : 'no');
    }
  }

  spellUndo() {
    if (this.answered || !this.spellPicked.length) return;
    const i = this.spellPicked.pop();
    this.el.tiles.children[i].classList.remove('used');
    this.renderSlots();
  }

  renderSlots() {
    const q = this.q;
    let s = '';
    if (q.joiner) { // 문장: 고른 낱말을 한 줄로
      const picked = this.spellPicked.map((k) => q.tokens[k]);
      s = picked.map((w) => `<span class="slot word filled">${w}</span>`).join('') + (picked.length < q.tokens.length ? '<span class="slot word cursor">?</span>' : '');
    } else for (let k = 0; k < q.tokens.length; k++) {
      const p = this.spellPicked[k];
      s += `<span class="slot ${p !== undefined ? 'filled' : ''}">${p !== undefined ? q.tokens[p] : ''}</span>`;
    }
    this.el.slots.innerHTML = s;
  }

  // ---------- 채점 ----------
  answer(choice, timeout = false) {
    if (this.answered) return;
    this.answered = true;
    clearInterval(this.timer);
    const q = this.q;
    const ok = !timeout && (q.type === 'spell' ? choice === 'ok' : choice === q.answerIdx);
    this.engine.record(q, ok);
    this.answers[this.idx] = ok;
    if (ok) this.correct++;
    this.renderDots();

    if (q.type === 'choice') {
      [...this.el.choices.children].forEach((b, i) => {
        b.disabled = true;
        if (i === q.answerIdx) b.classList.add('correct');
        else if (i === choice) b.classList.add('wrong');
      });
    } else {
      this.el.slots.classList.add(ok ? 'ok' : 'no');
      [...this.el.tiles.children].forEach((b) => (b.disabled = true));
    }

    const fb = this.el.feedback;
    fb.hidden = false;
    const last = this.idx + 1 >= this.opt.count;
    if (ok) {
      fb.className = 'quiz-feedback ok';
      fb.innerHTML = `⭕ 정답! 잘했어요!`;
      this.sfx?.play('correct');
      this.autoNext = setTimeout(() => this.advance(), 750);
    } else {
      const ans = q.subject === 'math' ? renderMath(q.answerText) : q.answerText;
      const ex = q.subject === 'math' ? renderMath(q.explain) : q.explain;
      fb.className = 'quiz-feedback no';
      fb.innerHTML = `<div>${timeout ? '⏰ 시간 초과!' : '❌ 아쉬워요!'} 정답: <b>${ans}</b></div>
        <div class="explain">💡 ${ex}</div>
        <button class="btn small primary q-next">${last ? '결과 보기' : '다음 문제'} ▶</button>`;
      fb.querySelector('.q-next').addEventListener('click', () => this.advance());
      this.sfx?.play('wrong');
    }
  }

  advance() {
    clearTimeout(this.autoNext);
    if (!this.answered) return;
    this.idx++;
    if (this.idx < this.opt.count) { this.nextQuestion(); return; }
    this.showResult();
  }

  showResult() {
    const { correct } = this;
    const total = this.opt.count;
    this.el.feedback.hidden = true;
    this.el.choices.hidden = true;
    this.el.spell.hidden = true;
    this.el.prompt.hidden = true;
    this.root.querySelector('.quiz-timer').hidden = true;
    this.el.tag.innerHTML = '';
    const r = this.el.result;
    r.hidden = false;
    let html;
    if (this.opt.resultHtml) html = this.opt.resultHtml(correct, total);
    else {
      const g = gradeFromCorrect(correct);
      const msg = g === 3 ? '완벽해요! 손님이 팁을 줄 거예요 💝' : g === 2 ? '괜찮은 요리예요. 정가에 팔아요.' : '앗, 요리가 탔어요… 반값에 팔아요 😢';
      html = `<div class="grade g${g}"><div class="stars">${'★'.repeat(g)}${'☆'.repeat(3 - g)}</div>
        <div class="gname">${GRADE[g].name}</div><div class="gmsg">${correct}/${total} 정답 · ${msg}</div></div>`;
      this.sfx?.play(g === 3 ? 'perfect' : g === 2 ? 'coin' : 'bad');
    }
    r.innerHTML = `${html}<button class="btn primary big q-done">${this.opt.resultButton || '서빙하기 🍽️'}</button>`;
    r.querySelector('.q-done').addEventListener('click', () => this.close());
    r.querySelector('.q-done').focus();
  }

  close() {
    clearInterval(this.timer);
    this.root.hidden = true;
    const cb = this.opt.onDone;
    this.opt.onDone = null;
    cb?.(this.correct, this.opt.count);
  }

  onKey(e) {
    if (!this.isOpen || this.locked) return;
    const q = this.q;
    if (!this.el.result.hidden) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.close(); }
      return;
    }
    if (this.answered) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.advance(); }
      return;
    }
    if (q.type === 'choice' && /^[1-4]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i < q.choices.length) this.answer(i);
    } else if (q.type === 'spell') {
      if (e.key === 'Backspace') { e.preventDefault(); this.spellUndo(); return; }
      const k = e.key.toLowerCase();
      if (k.length === 1 && !q.joiner) {
        const i = q.tokens.findIndex((ch, idx) => ch === k && !this.spellPicked.includes(idx));
        if (i >= 0) this.spellPick(i);
      }
    }
  }
}
