// 영업(실시간) 루프: 손님 입장·주문·인내심·요리(퀴즈)·식사·결제·쓰레기·진상 손님
import {
  MENUS, BRANCHES, ITEMS, GRADE, TIP_RATE, tablesOf, branchMenus, canCook, anyCookable,
  consume, menuPrice, gradeFromCorrect, currentForecast, newDayStats, won,
} from './shop-engine.js';

export const DAY_LENGTH = 150;      // 실제 초 (2분 30초)
const WALK_TIME = 1.0;
const EAT_TIME = 4.0;
const BASE_PATIENCE = 32;
const ROWDY_TIME = 18;
const CLEAN_TIME = 1.2;
const CALM_TIME = 1.8;
const OPEN_HOUR = 11, CLOSE_HOUR = 21;

const FACES = ['🧑', '👧', '👦', '👩', '👨', '👵', '👴', '🧒', '👱', '🧑‍🦱', '👩‍🦰', '🧔'];
const TOURIST_FACES = ['👱‍♀️', '👱‍♂️', '🧑‍🦰', '👩‍🦳', '🤠'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export class Business {
  /**
   * @param {object} o
   *  state, hall(el), actors(el), grid(el), side{...els}, openQuiz(opts, cb), onEnd(stats), toast(msg), sfx
   */
  constructor(o) {
    Object.assign(this, o);
    this.forecast = currentForecast(this.state);
    this.G = BRANCHES[this.state.branch].grid;
    this.stats = newDayStats();
    this.time = 0;
    this.paused = false;
    this.ended = false;
    this.customers = [];
    this.nextId = 1;
    this.busy = null;
    this.spawnTimer = 1.2;
    this.outOfStockShown = false;
    this.tables = tablesOf(this.state).map((t) => ({ x: t.x, y: t.y, cust: null, trash: false, el: null }));
    this.buildHall();
    this.renderMenu();
    this.renderSide();
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
    this.log(`${this.forecast.icon} ${this.forecast.name} — 영업을 시작합니다!`);
  }

  // ---------- 화면 구성 ----------
  buildHall() {
    const { grid, actors, G } = this;
    grid.innerHTML = '';
    actors.innerHTML = '';
    grid.style.setProperty('--g', G);
    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G; x++) {
        const cell = document.createElement('div');
        cell.className = (x + y) % 2 ? 'cell alt' : 'cell';
        const it = this.state.layout.find((l) => l.x === x && l.y === y);
        if (it) {
          const def = ITEMS[it.type];
          cell.classList.add(def.kind);
          cell.innerHTML = def.kind === 'table'
            ? `<div class="table-sprite"><span class="chair l"></span><span class="tabletop"></span><span class="chair r"></span></div><div class="trash" hidden>🍽️<small>치우기</small></div>`
            : `<span class="deco-sprite">${def.icon}</span>`;
          const t = this.tables.find((tb) => tb.x === x && tb.y === y);
          if (t) {
            t.el = cell;
            cell.querySelector('.trash').addEventListener('pointerdown', (e) => { e.stopPropagation(); this.clickTrash(t); });
          }
        }
        grid.appendChild(cell);
      }
    }
  }

  renderMenu() {
    const box = this.side.menu;
    box.innerHTML = branchMenus(this.state).map((id) => {
      const m = MENUS[id];
      const p = menuPrice(this.state, id);
      const bonus = p > m.price ? ' bonus' : '';
      return `<div class="menu-row${bonus}"><span>${m.icon} ${m.name}</span><b>${won(p)}</b></div>`;
    }).join('');
  }

  renderSide() {
    const s = this.side;
    const pct = Math.min(1, this.time / DAY_LENGTH);
    const minutes = Math.floor((OPEN_HOUR + (CLOSE_HOUR - OPEN_HOUR) * pct) * 60);
    s.clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    s.timeBar.style.width = `${(1 - pct) * 100}%`;
    s.revenue.textContent = won(this.stats.revenue + this.stats.tips);
    s.served.textContent = `${this.stats.served}명`;
    s.perfect.textContent = `${this.stats.grades[3]}개`;
    s.stock.innerHTML = branchMenus(this.state).map((id) => {
      const m = MENUS[id];
      const n = Math.min(...Object.entries(m.needs).map(([ing, k]) => Math.floor((this.state.fridge.items[ing] || 0) / k)));
      return `<span class="stock-chip ${n === 0 ? 'zero' : ''}" title="${m.name}">${m.icon}<b>${n}</b></span>`;
    }).join('');
    this.onMoney?.();
  }

  log(msg) {
    const li = document.createElement('li');
    li.innerHTML = msg;
    this.side.log.prepend(li);
    while (this.side.log.children.length > 30) this.side.log.lastChild.remove();
  }

  // ---------- 루프 ----------
  loop(now) {
    if (this.ended) return;
    const dt = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && !this.locked) this.tick(dt);
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  tick(dt) {
    this.time += dt;

    // 손님 입장
    if (this.time < DAY_LENGTH - 6) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.spawn();
    }

    const rowdyActive = this.customers.some((c) => c.state === 'rowdy');
    for (const c of this.customers.slice()) this.updateCustomer(c, dt, rowdyActive);

    // 쓰레기 방치 시간
    for (const t of this.tables) if (t.trash) this.stats.trashSeconds += dt;

    // 직접 처리 중(청소·진정)
    if (this.busy) {
      this.busy.left -= dt;
      const p = 1 - this.busy.left / this.busy.total;
      if (this.busy.bar) this.busy.bar.style.width = `${p * 100}%`;
      if (this.busy.left <= 0) this.finishBusy();
    }

    this.renderSide();
    if (this.time >= DAY_LENGTH) this.endDay();
  }

  spawn() {
    const tableCount = Math.max(1, this.tables.length);
    const interval = rand(6.5, 10.5) * Math.sqrt(2 / tableCount) / (this.forecast.spawnMult || 1);
    this.spawnTimer = Math.max(2, interval);

    const free = this.tables.filter((t) => !t.cust && !t.trash);
    if (!free.length) { this.spawnTimer = 2; return; }

    const rowdy = this.state.day >= 2 && Math.random() < 0.12 && !this.customers.some((c) => c.rowdy);
    let menuId = null;
    if (!rowdy) {
      const avail = branchMenus(this.state).filter((m) => canCook(this.state, m));
      if (!avail.length) {
        if (!this.outOfStockShown) {
          this.outOfStockShown = true;
          this.side.banner.hidden = false;
          this.log('⚠️ 재료가 모두 떨어졌어요! 오늘은 일찍 마감해도 좋아요.');
        }
        return;
      }
      menuId = pick(avail);
      consume(this.state, menuId); // 주문 접수 시 재료 확보
    }

    const table = pick(free);
    const tourist = this.state.forecast?.id === 'tourists' && Math.random() < 0.6;
    const patience = BASE_PATIENCE * (this.forecast.patienceMult || 1);
    const c = {
      id: this.nextId++, table, menuId, rowdy, tourist,
      face: rowdy ? '🤬' : tourist ? pick(TOURIST_FACES) : pick(FACES),
      state: 'walk', timer: WALK_TIME, patience, maxPatience: patience,
    };
    table.cust = c;
    this.customers.push(c);
    this.createCustomerEl(c);
    if (rowdy) this.sfx?.play('rowdy');
  }

  createCustomerEl(c) {
    const el = document.createElement('div');
    el.className = 'cust' + (c.rowdy ? ' rowdy' : '');
    el.dataset.id = c.id;
    el.innerHTML = `<div class="bubble"></div><div class="face">${c.face}</div><div class="pbar"><i></i></div>`;
    el.style.left = '50%';
    el.style.top = '106%';
    this.actors.appendChild(el);
    c.el = el;
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.clickCustomer(c); });
    requestAnimationFrame(() => requestAnimationFrame(() => this.moveTo(c, c.table.x, c.table.y)));
  }

  moveTo(c, x, y) {
    c.el.style.left = `${((x + 0.5) / this.G) * 100}%`;
    c.el.style.top = `${((y + 0.5) / this.G) * 100}%`;
  }

  setBubble(c, html, cls = '') {
    const b = c.el.querySelector('.bubble');
    b.innerHTML = html;
    b.className = `bubble ${cls}`;
  }

  updateCustomer(c, dt, rowdyActive) {
    const bar = c.el.querySelector('.pbar i');
    switch (c.state) {
      case 'walk':
        c.timer -= dt;
        if (c.timer <= 0) {
          if (c.rowdy) {
            c.state = 'rowdy'; c.timer = ROWDY_TIME;
            this.setBubble(c, '💢 시끄러워!<small>클릭해서 진정</small>', 'angry');
            this.log('😡 진상 손님 등장! 클릭해서 진정시켜요. (방치하면 다른 손님 인내심 급감)');
          } else {
            c.state = 'order';
            this.setBubble(c, `${MENUS[c.menuId].icon}<small>${MENUS[c.menuId].name}</small>`, 'order');
            c.el.classList.add('clickable');
          }
        }
        break;
      case 'order': {
        c.patience -= dt * (rowdyActive ? 2.5 : 1);
        const r = Math.max(0, c.patience / c.maxPatience);
        bar.style.width = `${r * 100}%`;
        bar.className = r < 0.3 ? 'low' : r < 0.6 ? 'mid' : '';
        if (c.patience <= 0) {
          this.stats.lost++;
          consume(this.state, c.menuId, +1); // 재료 반환
          this.floatText(c, '😤 너무 늦어요!', 'bad');
          this.log(`⏰ ${MENUS[c.menuId].name} 손님이 기다리다 떠났어요.`);
          this.sfx?.play('bad');
          this.leave(c, false);
        }
        break;
      }
      case 'rowdy': {
        if (this.busy?.target === c) break;
        c.timer -= dt;
        bar.style.width = `${Math.max(0, c.timer / ROWDY_TIME) * 100}%`;
        bar.className = 'rowdy';
        if (c.timer <= 0) {
          this.stats.rowdyIgnored++;
          this.log('💢 진상 손님이 소란을 피우고 떠났어요. (별점 하락)');
          this.leave(c, true);
        }
        break;
      }
      case 'eat':
        c.timer -= dt;
        bar.style.width = `${Math.max(0, c.timer / EAT_TIME) * 100}%`;
        bar.className = 'eat';
        if (c.timer <= 0) this.pay(c);
        break;
      default:
        break;
    }
  }

  // ---------- 상호작용 ----------
  clickCustomer(c) {
    if (this.paused || this.ended || this.locked) return;
    if (c.state === 'order') {
      if (this.busy) { this.toast(`지금은 ${this.busy.label} 중이에요!`); return; }
      this.cook(c);
    } else if (c.state === 'rowdy') {
      this.startBusy('진정시키는', CALM_TIME, c, () => {
        this.stats.rowdyHandled++;
        this.floatText(c, '🙇 죄송합니다…', 'good');
        this.log('🤝 진상 손님을 진정시켜 내보냈어요!');
        this.leave(c, false);
      });
    }
  }

  clickTrash(t) {
    if (this.paused || this.ended || !t.trash || this.locked) return;
    this.startBusy('청소하는', CLEAN_TIME, t, () => {
      t.trash = false;
      t.el.querySelector('.trash').hidden = true;
      this.stats.trashCleaned++;
      this.sfx?.play('clean');
    });
  }

  startBusy(label, total, target, done) {
    if (this.busy) { this.toast(`지금은 ${this.busy.label} 중이에요!`); return; }
    const host = target.el;
    const prog = document.createElement('div');
    prog.className = 'busy-bar';
    prog.innerHTML = `<span>${label} 중…</span><i></i>`;
    host.appendChild(prog);
    this.busy = { label, total, left: total, target, done, bar: prog.querySelector('i'), node: prog };
  }

  finishBusy() {
    const b = this.busy;
    this.busy = null;
    b.node.remove();
    b.done();
  }

  cook(c) {
    c.state = 'cook';
    c.el.classList.remove('clickable');
    this.setBubble(c, '🍳', 'cooking');
    this.paused = true; // 퀴즈 중 영업 시간·인내심 정지
    const m = MENUS[c.menuId];
    this.openQuiz({ title: `${m.icon} ${m.name} 요리 중!`, engBoost: this.forecast.engBoost || 0 }, (correct, total) => {
      this.paused = false;
      this.last = performance.now();
      this.stats.quizCorrect += correct;
      this.stats.quizTotal += total;
      this.serve(c, gradeFromCorrect(correct));
    });
  }

  serve(c, grade) {
    if (this.ended) return;
    c.grade = grade;
    c.state = 'eat';
    c.timer = EAT_TIME;
    const m = MENUS[c.menuId];
    const stars = '★'.repeat(grade) + '☆'.repeat(3 - grade);
    this.setBubble(c, `${grade === 1 ? '🔥' : m.icon}<small class="g${grade}">${stars}</small>`, `served g${grade}`);
    this.stats.served++;
    this.stats.grades[grade]++;
    this.log(`${m.icon} ${m.name} — <b class="g${grade}">${GRADE[grade].name} ${stars}</b>`);
  }

  pay(c) {
    const base = menuPrice(this.state, c.menuId);
    const price = Math.round(base * GRADE[c.grade].mult / 10) * 10;
    const tip = c.grade === 3 ? Math.round(base * TIP_RATE * (this.forecast.tipMult || 1) / 10) * 10 : 0;
    this.state.money += price + tip;
    this.stats.revenue += price;
    this.stats.tips += tip;
    this.floatText(c, `+${won(price)}${tip ? ` 💝팁 ${won(tip)}` : ''}`, c.grade === 1 ? 'bad' : 'money');
    this.sfx?.play(c.grade === 1 ? 'bad' : 'coin');
    if (c.grade === 1) this.setBubble(c, '🤢', 'angry');
    this.leave(c, Math.random() < 0.8);
  }

  leave(c, leaveTrash) {
    c.state = 'leave';
    c.el.classList.remove('clickable');
    c.el.classList.add('leaving');
    const t = c.table;
    t.cust = null;
    if (leaveTrash && !this.ended) {
      t.trash = true;
      t.el.querySelector('.trash').hidden = false;
    }
    c.el.style.left = '50%';
    c.el.style.top = '106%';
    setTimeout(() => c.el.remove(), 1000);
    this.customers = this.customers.filter((x) => x !== c);
  }

  floatText(c, text, cls) {
    const f = document.createElement('div');
    f.className = `float-text ${cls}`;
    f.textContent = text;
    f.style.left = c.el.style.left;
    f.style.top = c.el.style.top;
    this.actors.appendChild(f);
    setTimeout(() => f.remove(), 1600);
  }

  // ---------- 마감 ----------
  closeEarly() { if (!this.ended && !this.paused) this.time = DAY_LENGTH; }

  endDay() {
    if (this.ended) return;
    this.ended = true;
    cancelAnimationFrame(this.raf);
    for (const c of this.customers.slice()) {
      if (c.state === 'eat') this.pay(c);
      else if (c.menuId) consume(this.state, c.menuId, +1); // 대기 중 손님 재료 반환
    }
    this.customers = [];
    this.renderSide();
    this.onEnd(this.stats);
  }

  destroy() {
    this.ended = true;
    cancelAnimationFrame(this.raf);
  }
}

export { anyCookable };
