// 영업(실시간) 루프 — Canvas 2.5D 렌더링 버전
// 규칙은 1차와 동일: 손님 입장·주문·인내심·요리(퀴즈, 시간 정지)·★1~3 판정·식사·결제·쓰레기·진상 손님
// 연출: 도로에서 걸어 들어오는 손님, 화구에서 요리 후 직접 서빙하는 사장님, 빗자루 든 청소 알바, 코인·하트 플로팅
import {
  MENUS, BRANCHES, ITEMS, GRADE, TIP_RATE, tablesOf, branchMenus, canCook, anyCookable,
  consume, menuPrice, gradeFromCorrect, currentForecast, newDayStats, won,
} from './shop-engine.js';
import { getSprite, makeCharacter, spriteImg } from './sprites.js';
import { DISH_SPRITE } from './sprite-atlas.js';
import { W, H, Z, MARGIN, buildBackground, cellCenter, drawAt, spriteSize, treeSprite } from './hall-scene.js';

export const DAY_LENGTH = 150;      // 실제 초 (2분 30초)
const EAT_TIME = 4.0;
const BASE_PATIENCE = 32;
const ROWDY_TIME = 18;
const CALM_TIME = 1.8;
const COOK_TIME = 0.9;
const SWEEP_TIME = 1.1;
const OPEN_HOUR = 11, CLOSE_HOUR = 21;
const CHAR_SCALE = 3;
const TABLE_W = 150;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const OUT = '#24160f';

export class Business {
  /**
   * @param {object} o state, canvas, side{...}, openQuiz(opts, cb), onEnd(stats), onMoney(), toast(msg), sfx
   */
  constructor(o) {
    Object.assign(this, o);
    this.forecast = currentForecast(this.state);
    this.G = BRANCHES[this.state.branch].grid;
    this.stats = newDayStats();
    this.time = 0;
    this.clock = 0; // 연출용 실시간
    this.paused = false;
    this.ended = false;
    this.customers = [];
    this.walkers = [];
    this.particles = [];
    this.nextId = 1;
    this.busy = null;
    this.spawnTimer = 1.2;
    this.walkerTimer = 1;
    this.outOfStockShown = false;
    this.doorOpen = 0;
    this.sideTimer = 0;
    this.hover = null;

    this.tables = tablesOf(this.state).map((t) => {
      const c = cellCenter(t.x, t.y, this.G);
      return {
        gx: t.x, gy: t.y, cx: c.x, cy: c.y, cust: null, trash: false, reserved: false, dish: null,
        base: c.y + 40,
        seat: { x: c.x - 56, y: c.y + 26 },
        serve: { x: c.x + 30, y: c.y + 52 },
        trashPos: { x: c.x + 84, y: c.y + 36 },
        sweep: { x: c.x + 60, y: c.y + 50 },
      };
    });
    this.decos = this.state.layout.filter((l) => ITEMS[l.type]?.kind === 'deco').map((l) => {
      const c = cellCenter(l.x, l.y, this.G);
      return { type: l.type, x: c.x, y: c.y + 36 };
    });
    this.trees = [-160, 70, 300, 700, 930, 1160].map((x) => ({ x, y: Z.sidewalkBottom - 2 }));
    this.ox = 0;

    // 캐릭터
    this.chefHome = { x: 262, y: 170 };
    this.cleanerHome = { x: 436, y: 168 };
    this.chef = this.makeActor('chef', this.chefHome);
    this.chef.tasks = [];
    this.chef.mode = 'idle';
    this.cleaner = this.makeActor('cleaner', this.cleanerHome);
    this.cleaner.tasks = [];
    this.cleaner.mode = 'idle';

    const lines = branchMenus(this.state).map((id) => ({
      name: MENUS[id].name, price: won(menuPrice(this.state, id)), bonus: menuPrice(this.state, id) > MENUS[id].price,
    }));
    this.bg = buildBackground({ menuLines: lines, shopName: BRANCHES[this.state.branch].name });

    this.g = this.canvas.getContext('2d');
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.onPointer = (e) => this.pointer(e);
    this.onMove = (e) => this.pointerMove(e);
    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onMove);

    this.renderMenu();
    this.renderSide(true);
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
    this.log(`${this.forecast.icon} ${this.forecast.name} — 영업을 시작합니다!`);
  }

  makeActor(kind, pos) {
    return { kind, x: pos.x, y: pos.y, path: [], speed: kind === 'chef' ? 230 : kind === 'cleaner' ? 210 : rand(120, 150), spr: makeCharacter(kind), t: Math.random() * 10, face: 1 };
  }

  // ---------- 캔버스 크기 ----------
  resize() {
    const wrap = this.canvas.parentElement;
    // 높이에 맞추고, 남는 가로 공간은 좌우로 이어지는 배경(MARGIN)으로 채움
    const ww = wrap.clientWidth, wh = wrap.clientHeight;
    const k = Math.min(wh / H, ww / W);
    const vw = Math.min(ww / k, W + 2 * MARGIN);
    const dpr = window.devicePixelRatio || 1;
    this.k = k;
    this.ox = (vw - W) / 2;
    this.vw = vw;
    this.canvas.style.width = `${Math.floor(vw * k)}px`;
    this.canvas.style.height = `${Math.floor(H * k)}px`;
    this.canvas.width = Math.floor(vw * k * dpr);
    this.canvas.height = Math.floor(H * k * dpr);
    this.g.setTransform(k * dpr, 0, 0, k * dpr, this.ox * k * dpr, 0);
  }

  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.vw - this.ox, y: ((e.clientY - r.top) / r.height) * H };
  }

  // ---------- 사이드 패널 ----------
  renderMenu() {
    this.side.menu.innerHTML = branchMenus(this.state).map((id) => {
      const m = MENUS[id];
      const p = menuPrice(this.state, id);
      return `<div class="menu-row${p > m.price ? ' bonus' : ''}"><span>${spriteImg(DISH_SPRITE[id], 22)} ${m.name}</span><b>${won(p)}</b></div>`;
    }).join('');
  }

  renderSide(force = false) {
    const s = this.side;
    const pct = Math.min(1, this.time / DAY_LENGTH);
    const minutes = Math.floor((OPEN_HOUR + (CLOSE_HOUR - OPEN_HOUR) * pct) * 60);
    s.clock.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    s.timeBar.style.width = `${(1 - pct) * 100}%`;
    s.revenue.textContent = won(this.stats.revenue + this.stats.tips);
    s.served.textContent = `${this.stats.served}명`;
    s.perfect.textContent = `${this.stats.grades[3]}개`;
    const stockKey = branchMenus(this.state).map((id) => this.cookable(id)).join(',');
    if (force || stockKey !== this.lastStockKey) {
      this.lastStockKey = stockKey;
      s.stock.innerHTML = branchMenus(this.state).map((id) => {
        const n = this.cookable(id);
        return `<span class="stock-chip ${n === 0 ? 'zero' : ''}" title="${MENUS[id].name}">${spriteImg(DISH_SPRITE[id], 24)}<b>${n}</b></span>`;
      }).join('');
    }
    this.onMoney?.();
  }

  cookable(id) {
    const m = MENUS[id];
    return Math.min(...Object.entries(m.needs).map(([ing, k]) => Math.floor((this.state.fridge.items[ing] || 0) / k)));
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
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const running = !this.paused && !this.locked;
    if (running) this.tick(dt);
    this.draw(running ? dt : 0);
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  tick(dt) {
    this.time += dt;
    this.clock += dt;

    if (this.time < DAY_LENGTH - 6) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.spawn();
    }
    this.walkerTimer -= dt;
    if (this.walkerTimer <= 0) this.spawnWalker();

    const rowdyActive = this.customers.some((c) => c.state === 'rowdy');
    for (const c of this.customers.slice()) this.updateCustomer(c, dt, rowdyActive);
    for (const w of this.walkers.slice()) { this.move(w, dt); if (!w.path.length) this.walkers.splice(this.walkers.indexOf(w), 1); }
    this.updateChef(dt);
    this.updateCleaner(dt);

    for (const t of this.tables) if (t.trash) this.stats.trashSeconds += dt;

    if (this.busy) {
      this.busy.left -= dt;
      if (this.busy.left <= 0) { const b = this.busy; this.busy = null; b.done(); }
    }

    // 문 열림
    const near = [...this.customers, ...this.walkers].some((a) => Math.abs(a.x - Z.doorX) < 60 && Math.abs(a.y - Z.hallBottom - 10) < 46);
    this.doorOpen += ((near ? 1 : 0) - this.doorOpen) * Math.min(1, dt * 8);

    this.sideTimer -= dt;
    if (this.sideTimer <= 0) { this.sideTimer = 0.2; this.renderSide(); }
    if (this.time >= DAY_LENGTH) this.endDay();
  }

  // 이동 (경로 따라가기)
  move(a, dt) {
    a.t += dt;
    a.moving = false;
    if (!a.path.length) return true;
    const tgt = a.path[0];
    const d = dist(a, tgt);
    const step = a.speed * dt;
    a.moving = true;
    if (Math.abs(tgt.x - a.x) > 1) a.face = tgt.x < a.x ? -1 : 1;
    if (d <= step) { a.x = tgt.x; a.y = tgt.y; a.path.shift(); return !a.path.length; }
    a.x += ((tgt.x - a.x) / d) * step;
    a.y += ((tgt.y - a.y) / d) * step;
    return false;
  }

  entryPath(seat) {
    return [{ x: Z.doorX + rand(-6, 6), y: 615 }, { x: Z.doorX, y: Z.frontBottom - 6 }, { x: Z.doorX, y: Z.hallBottom - 18 }, { x: seat.x, y: Math.max(seat.y + 30, Z.hallTop + 30) }, seat];
  }

  exitPath(from) {
    const side = Math.random() < 0.5 ? -this.ox - 40 : W + this.ox + 40;
    return [{ x: from.x, y: Math.min(from.y + 30, Z.hallBottom - 18) }, { x: Z.doorX, y: Z.hallBottom - 18 }, { x: Z.doorX, y: Z.frontBottom - 6 }, { x: Z.doorX, y: 618 }, { x: side, y: 618 + rand(-6, 6) }];
  }

  spawnWalker() {
    this.walkerTimer = rand(2.5, 6);
    if (this.walkers.length >= 4) return;
    const left = Math.random() < 0.5;
    const y = rand(600, 636);
    const e0 = -this.ox - 30, e1 = W + this.ox + 30;
    const a = this.makeActor('guest', { x: left ? e0 : e1, y });
    a.speed = rand(70, 110);
    a.path = [{ x: left ? e1 : e0, y }];
    this.walkers.push(a);
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
    const fromLeft = Math.random() < 0.5;
    const c = this.makeActor(rowdy ? 'rowdy' : 'guest', { x: fromLeft ? -this.ox - 30 : W + this.ox + 30, y: rand(606, 630) });
    Object.assign(c, { id: this.nextId++, table, menuId, rowdy, tourist, state: 'enter', patience, maxPatience: patience });
    c.path = this.entryPath(table.seat);
    table.cust = c;
    this.customers.push(c);
    if (rowdy) this.sfx?.play('rowdy');
  }

  updateCustomer(c, dt, rowdyActive) {
    switch (c.state) {
      case 'enter':
        if (this.move(c, dt)) {
          c.face = 1;
          if (c.rowdy) {
            c.state = 'rowdy'; c.timer = ROWDY_TIME;
            this.log('😡 진상 손님 등장! 클릭해서 진정시켜요. (방치하면 다른 손님 인내심 급감)');
          } else {
            c.state = 'order';
          }
        }
        break;
      case 'order':
        c.t += dt;
        c.patience -= dt * (rowdyActive ? 2.5 : 1);
        if (c.patience <= 0) {
          this.stats.lost++;
          consume(this.state, c.menuId, +1);
          this.float(c.x, c.y - 70, '너무 늦어요!', '#e0533d', 'angry');
          this.log(`⏰ ${MENUS[c.menuId].name} 손님이 기다리다 떠났어요.`);
          this.sfx?.play('bad');
          this.leave(c, false);
        }
        break;
      case 'cooked':
        c.t += dt;
        break;
      case 'rowdy':
        c.t += dt;
        if (this.busy?.target === c) break;
        c.timer -= dt;
        if (c.timer <= 0) {
          this.stats.rowdyIgnored++;
          this.log('💢 진상 손님이 소란을 피우고 떠났어요. (별점 하락)');
          this.leave(c, true);
        }
        break;
      case 'eat':
        c.t += dt;
        c.timer -= dt;
        if (c.timer <= 0) this.pay(c);
        break;
      case 'leave':
        if (this.move(c, dt)) this.customers.splice(this.customers.indexOf(c), 1);
        break;
      default: break;
    }
  }

  // ---------- 사장님: 화구에서 요리 → 들고 가서 서빙 → 복귀 ----------
  updateChef(dt) {
    const ch = this.chef;
    const arrived = this.move(ch, dt);
    switch (ch.mode) {
      case 'idle':
        if (ch.tasks.length) {
          ch.task = ch.tasks.shift();
          ch.mode = 'toStove';
          ch.path = dist(ch, this.chefHome) > 2 ? [this.chefHome] : [];
        }
        break;
      case 'toStove':
        if (arrived) { ch.mode = 'cooking'; ch.cook = 0; ch.face = 1; }
        break;
      case 'cooking':
        ch.cook += dt;
        if (Math.random() < dt * 14) this.steam(true);
        if (ch.cook >= COOK_TIME) {
          const { grade } = ch.task;
          const pan = this.panPos();
          if (grade === 3) { this.sparkle(pan.x, pan.y, 10); this.sfx?.play('perfect'); }
          else if (grade === 1) { this.smoke(pan.x, pan.y, 10); this.sfx?.play('bad'); }
          else this.sfx?.play('tap');
          ch.carry = ch.task;
          ch.mode = 'delivering';
          const t = ch.task.c.table;
          ch.path = [{ x: ch.x, y: Z.hallTop + 14 }, { x: t.serve.x, y: Math.min(t.serve.y, Z.hallBottom - 20) }];
        }
        break;
      case 'delivering':
        if (arrived) {
          this.serve(ch.carry.c, ch.carry.grade);
          ch.carry = null;
          ch.mode = 'returning';
          ch.path = [{ x: ch.x, y: Z.hallTop + 14 }, this.chefHome];
        }
        break;
      case 'returning':
        if (arrived) ch.mode = 'idle';
        break;
      default: break;
    }
  }

  // ---------- 청소 알바: 빗자루 들고 가서 치우고 복귀 ----------
  updateCleaner(dt) {
    const cl = this.cleaner;
    const arrived = this.move(cl, dt);
    switch (cl.mode) {
      case 'idle':
        if (cl.tasks.length) {
          cl.task = cl.tasks.shift();
          if (!cl.task.trash) { cl.task.reserved = false; break; }
          cl.mode = 'going';
          cl.path = [{ x: cl.x, y: Z.hallTop + 22 }, cl.task.sweep];
        }
        break;
      case 'going':
        if (arrived) { cl.mode = 'sweeping'; cl.sweepT = 0; cl.face = 1; }
        break;
      case 'sweeping':
        cl.sweepT += dt;
        if (Math.random() < dt * 10) this.dust(cl.task.trashPos.x, cl.task.trashPos.y);
        if (cl.sweepT >= SWEEP_TIME) {
          const t = cl.task;
          t.trash = false; t.reserved = false;
          this.stats.trashCleaned++;
          this.sparkle(t.trashPos.x, t.trashPos.y - 20, 5);
          this.sfx?.play('clean');
          cl.mode = 'returning';
          cl.path = [{ x: cl.x, y: Z.hallTop + 22 }, this.cleanerHome];
        }
        break;
      case 'returning':
        if (arrived || cl.tasks.length) cl.mode = 'idle';
        break;
      default: break;
    }
  }

  // ---------- 입력 ----------
  hitTest(p) {
    const list = this.customers.filter((c) => c.state === 'order' || c.state === 'rowdy').sort((a, b) => b.y - a.y);
    for (const c of list) {
      if (p.x > c.x - 34 && p.x < c.x + 34 && p.y > c.y - 128 && p.y < c.y + 4) return { kind: 'cust', c };
    }
    for (const t of this.tables) {
      if (t.trash && Math.abs(p.x - t.trashPos.x) < 38 && p.y > t.trashPos.y - 50 && p.y < t.trashPos.y + 10) return { kind: 'trash', t };
    }
    return null;
  }

  pointerMove(e) {
    const h = this.hitTest(this.toWorld(e));
    this.canvas.style.cursor = h ? 'pointer' : 'default';
  }

  pointer(e) {
    if (this.paused || this.ended || this.locked) return;
    const h = this.hitTest(this.toWorld(e));
    if (!h) return;
    e.preventDefault();
    if (h.kind === 'trash') return this.clickTrash(h.t);
    const c = h.c;
    if (c.state === 'order') {
      if (this.busy) { this.toast(`지금은 ${this.busy.label} 중이에요!`); return; }
      this.cook(c);
    } else if (c.state === 'rowdy') {
      if (this.busy) { this.toast(`지금은 ${this.busy.label} 중이에요!`); return; }
      this.busy = {
        label: '진정시키는', total: CALM_TIME, left: CALM_TIME, target: c,
        done: () => {
          this.stats.rowdyHandled++;
          this.float(c.x, c.y - 80, '죄송합니다…', '#3d8fe0');
          this.log('🤝 진상 손님을 진정시켜 내보냈어요!');
          this.leave(c, false);
        },
      };
    }
  }

  clickTrash(t) {
    if (t.reserved) { this.toast('청소 알바가 치우러 가고 있어요! 🧹'); return; }
    t.reserved = true;
    this.cleaner.tasks.push(t);
    this.sfx?.play('tap');
  }

  cook(c) {
    c.state = 'cooking';
    this.paused = true; // 퀴즈 중 영업 시간·인내심 정지
    const m = MENUS[c.menuId];
    this.openQuiz({ title: `${m.icon} ${m.name} 요리 중!`, engBoost: this.forecast.engBoost || 0 }, (correct, total) => {
      this.paused = false;
      this.last = performance.now();
      this.stats.quizCorrect += correct;
      this.stats.quizTotal += total;
      const grade = gradeFromCorrect(correct);
      c.state = 'cooked';
      c.grade = grade;
      this.chef.tasks.push({ c, grade });
    });
  }

  serve(c, grade) {
    if (this.ended) return;
    c.grade = grade;
    c.state = 'eat';
    c.timer = EAT_TIME;
    c.table.dish = { sprite: grade === 1 ? 'dish_burnt' : DISH_SPRITE[c.menuId], grade };
    const m = MENUS[c.menuId];
    const stars = '★'.repeat(grade) + '☆'.repeat(3 - grade);
    if (grade === 3) this.sparkle(c.table.cx, c.table.cy - 30, 12);
    if (grade === 1) this.smoke(c.table.cx, c.table.cy - 30, 8);
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
    this.coinFloat(c, price, tip, c.grade);
    this.sfx?.play(c.grade === 1 ? 'bad' : 'coin');
    c.table.dish = null;
    this.leave(c, Math.random() < 0.8);
  }

  leave(c, leaveTrash) {
    c.state = 'leave';
    const t = c.table;
    t.cust = null;
    t.dish = null;
    if (leaveTrash && !this.ended) t.trash = true;
    c.path = this.exitPath(c);
  }

  // ---------- 이펙트 ----------
  panPos() { const s = this.bg.appliances.stove; return s ? { x: s.x + s.w * 0.73, y: s.y + s.h * 0.12 } : { x: 300, y: 80 }; }

  steam(strong = false) {
    const p = this.panPos();
    this.particles.push({ kind: 'steam', x: p.x + rand(-14, 14), y: p.y, vy: -rand(18, 30), vx: rand(-4, 4), life: 0, max: strong ? 1.2 : 1.6, r: rand(4, 8) });
  }
  sparkle(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push({ kind: 'spark', x: x + rand(-30, 30), y: y + rand(-20, 10), vy: -rand(10, 40), vx: rand(-20, 20), life: 0, max: rand(0.6, 1.1), s: rand(14, 24) });
  }
  smoke(x, y, n) {
    for (let i = 0; i < n; i++) this.particles.push({ kind: 'smoke', x: x + rand(-20, 20), y: y + rand(-10, 10), vy: -rand(20, 40), vx: rand(-10, 10), life: 0, max: rand(1, 1.6), r: rand(7, 13) });
  }
  dust(x, y) {
    this.particles.push({ kind: 'dust', x: x + rand(-18, 18), y: y - rand(0, 10), vy: -rand(5, 20), vx: rand(-30, 30), life: 0, max: 0.6, r: rand(3, 6) });
  }
  float(x, y, text, color, icon) {
    this.particles.push({ kind: 'text', x, y, vy: -32, vx: 0, life: 0, max: 1.6, text, color, icon });
  }
  coinFloat(c, price, tip, grade) {
    const y = c.y - 96;
    this.particles.push({ kind: 'text', x: c.x, y, vy: -30, vx: 0, life: 0, max: 1.8, text: `+${won(price)}`, color: grade === 1 ? '#ff8a7a' : '#ffd23f', icon: 'coin', big: true });
    if (tip) this.particles.push({ kind: 'text', x: c.x + 6, y: y + 24, vy: -30, vx: 0, life: -0.25, max: 1.8, text: `팁 +${won(tip)}`, color: '#ff9ac8', icon: 'heart' });
    if (grade >= 2) {
      for (let i = 0; i < (grade === 3 ? 3 : 1); i++) {
        this.particles.push({ kind: 'icon', sprite: grade === 3 && i ? 'star' : 'heart', x: c.x + rand(-26, 26), y: c.y - 60, vy: -rand(36, 56), vx: rand(-8, 8), life: -i * 0.15, max: 1.4, s: 22 });
      }
    }
  }

  // ---------- 그리기 ----------
  draw(dt) {
    const g = this.g;
    g.imageSmoothingEnabled = true;
    g.drawImage(this.bg.canvas, -MARGIN, 0, W + 2 * MARGIN, H);
    this.drawWindow(g);
    this.drawDoor(g);

    // 화구 김(상시)
    if (dt && Math.random() < dt * 3) this.steam(false);

    // 깊이 정렬 그리기 목록
    const items = [];
    for (const t of this.tables) {
      items.push({ y: t.base, fn: () => this.drawTable(g, t) });
      if (t.trash) items.push({ y: t.trashPos.y, fn: () => this.drawTrash(g, t) });
    }
    for (const d of this.decos) items.push({ y: d.y, fn: () => drawAt(g, d.type === 'trophy' ? 'trophy' : 'plant', d.x, d.y, d.type === 'trophy' ? 58 : 60) });
    for (const tr of this.trees) items.push({ y: tr.y, fn: () => { const s = treeSprite(); g.imageSmoothingEnabled = false; g.drawImage(s, tr.x - s.width * 0.6, tr.y - s.height * 1.2, s.width * 1.2, s.height * 1.2); g.imageSmoothingEnabled = true; } });
    for (const c of this.customers) {
      const seated = ['order', 'cooking', 'cooked', 'eat', 'rowdy'].includes(c.state);
      items.push({ y: seated ? c.table.base + 1 : c.y, fn: () => this.drawActor(g, c, seated) });
    }
    for (const w of this.walkers) items.push({ y: w.y, fn: () => this.drawActor(g, w, false) });
    items.push({ y: this.chef.y, fn: () => this.drawChef(g) });
    items.push({ y: this.cleaner.y, fn: () => this.drawCleaner(g) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();

    // 외부 비/눈
    this.drawWeatherOutside(g, dt);
    // 파티클
    this.drawParticles(g, dt);
    // UI 오버레이 (말풍선·게이지)
    for (const c of this.customers) this.drawCustomerUI(g, c);
    this.drawChefUI(g);
  }

  drawTable(g, t) {
    drawAt(g, 'table', t.cx, t.base, TABLE_W);
    if (t.dish) {
      const sz = spriteSize(t.dish.sprite, 54);
      drawAt(g, t.dish.sprite, t.cx + 2, t.cy - 6, sz.w);
      if (t.dish.grade === 1 && Math.random() < 0.05) this.smoke(t.cx, t.cy - 24, 1);
    }
  }

  drawTrash(g, t) {
    const bob = Math.sin(this.clock * 6) * 1.5;
    drawAt(g, 'trashpile', t.trashPos.x, t.trashPos.y + bob, 58);
    // 파리
    g.fillStyle = OUT;
    for (let i = 0; i < 2; i++) {
      const a = this.clock * 5 + i * 3;
      g.fillRect(t.trashPos.x + Math.cos(a) * 18, t.trashPos.y - 34 + Math.sin(a * 1.3) * 8, 3, 3);
    }
    if (!t.reserved) this.label(g, t.trashPos.x, t.trashPos.y + 6, '치우기', '#24160f', '#fff');
  }

  drawActor(g, a, seated) {
    const s = a.spr;
    let img = s.stand;
    if (seated) img = s.sit;
    else if (a.moving) img = Math.floor(a.t * 8) % 2 ? s.a : s.b;
    let bounce = a.moving ? -Math.abs(Math.sin(a.t * 14)) * 5 : 0;
    let shake = 0;
    if (a.state === 'rowdy') shake = Math.sin(this.clock * 40) * 2;
    if (a.state === 'eat') bounce = -Math.abs(Math.sin(a.t * 6)) * 2;
    const w = img.width * CHAR_SCALE, h = img.height * CHAR_SCALE;
    // 그림자
    if (!seated) { g.fillStyle = 'rgba(36,22,15,0.25)'; g.beginPath(); g.ellipse(a.x, a.y, 16, 5, 0, 0, Math.PI * 2); g.fill(); }
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(a.x + shake, a.y + bounce);
    if (a.face < 0) g.scale(-1, 1);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
    g.imageSmoothingEnabled = true;
  }

  drawChef(g) {
    const ch = this.chef;
    this.drawActor(g, ch, false);
    if (ch.carry) {
      const sp = ch.carry.grade === 1 ? 'dish_burnt' : DISH_SPRITE[ch.carry.c.menuId];
      const bounce = ch.moving ? -Math.abs(Math.sin(ch.t * 14)) * 5 : 0;
      drawAt(g, sp, ch.x, ch.y - 58 + bounce, 46);
    }
  }

  drawCleaner(g) {
    const cl = this.cleaner;
    this.drawActor(g, cl, false);
    const sweeping = cl.mode === 'sweeping';
    const ang = sweeping ? Math.sin(cl.sweepT * 18) * 0.5 : -0.25;
    const bounce = cl.moving ? -Math.abs(Math.sin(cl.t * 14)) * 5 : 0;
    const s = getSprite(sweeping && Math.floor(cl.sweepT * 6) % 2 ? 'broom2' : 'broom');
    if (!s) return;
    g.save();
    g.translate(cl.x + 16, cl.y - 22 + bounce);
    g.rotate(ang);
    g.drawImage(s, -16, -20, 34, 34);
    g.restore();
  }

  drawWindow(g) {
    const x = 496, y = 12, w = 124, h = 58;
    const f = this.state.forecast?.id;
    const sky = f === 'rain' ? '#8a96a8' : f === 'cold' ? '#c9d6e3' : '#8fd3ff';
    g.fillStyle = sky; g.fillRect(x, y, w, h);
    if (f === 'rain') {
      g.fillStyle = '#6e7a8c'; g.beginPath(); g.ellipse(x + 40, y + 14, 30, 10, 0, 0, Math.PI * 2); g.ellipse(x + 86, y + 18, 34, 11, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#dbe8ff'; g.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const rx = x + ((i * 17 + this.clock * 30) % w);
        const ry = y + 22 + ((i * 23 + this.clock * 140) % (h - 22));
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 3, ry + 7); g.stroke();
      }
    } else if (f === 'cold') {
      g.fillStyle = '#fff';
      for (let i = 0; i < 10; i++) g.fillRect(x + ((i * 13 + this.clock * 8) % w), y + ((i * 19 + this.clock * 22) % h), 3, 3);
      g.fillStyle = '#f2f6fa'; g.fillRect(x, y + h - 8, w, 8);
    } else {
      g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(x + 96, y + 18, 11, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#ffd23f'; g.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + this.clock * 0.6; g.beginPath(); g.moveTo(x + 96 + Math.cos(a) * 14, y + 18 + Math.sin(a) * 14); g.lineTo(x + 96 + Math.cos(a) * 18, y + 18 + Math.sin(a) * 18); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x + 34 + Math.sin(this.clock * 0.3) * 10, y + 28, 18, 7, 0, 0, Math.PI * 2); g.fill();
      if (f === 'tourists') { g.fillStyle = '#fff'; g.fillRect(x + ((this.clock * 25) % (w + 30)) - 20, y + 40, 16, 3); }
    }
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 6, y + 4, 10, h - 8);
    g.fillStyle = '#8a5426'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4);
    g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(x, y, w, h);
  }

  drawDoor(g) {
    const x0 = Z.doorX - 42, top = Z.hallBottom - 2, h = Z.frontBottom - Z.hallBottom + 2;
    const pw = 42 * (1 - this.doorOpen * 0.8);
    for (const [px, dir] of [[x0, 1], [Z.doorX + 42 - pw, -1]]) {
      g.fillStyle = 'rgba(170,220,255,0.55)'; g.fillRect(px, top, pw, h);
      g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(px + 1, top, pw - 2, h);
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(px + 5, top + 3, 3, h - 6);
      g.fillStyle = '#ffd23f'; g.fillRect(dir > 0 ? px + pw - 7 : px + 4, top + h / 2 - 3, 3, 6);
    }
  }

  drawWeatherOutside(g, dt) {
    const f = this.state.forecast?.id;
    if (f !== 'rain' && f !== 'cold') return;
    if (f === 'rain') {
      g.strokeStyle = 'rgba(210,230,255,0.75)'; g.lineWidth = 2;
      for (let i = 0; i < 56; i++) {
        const rx = -MARGIN + ((i * 53 + this.clock * 40) % (W + 2 * MARGIN));
        const ry = Z.frontBottom + ((i * 37 + this.clock * 220) % (H - Z.frontBottom));
        g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 4, ry + 10); g.stroke();
      }
    } else {
      g.fillStyle = '#fff';
      for (let i = 0; i < 42; i++) g.fillRect(-MARGIN + ((i * 67 + this.clock * 12) % (W + 2 * MARGIN)), Z.frontBottom + ((i * 29 + this.clock * 30) % (H - Z.frontBottom)), 3, 3);
    }
  }

  drawParticles(g, dt) {
    for (const p of this.particles) {
      p.life += dt;
      if (p.life < 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max;
      const alpha = Math.max(0, 1 - k);
      g.globalAlpha = alpha;
      if (p.kind === 'steam' || p.kind === 'smoke' || p.kind === 'dust') {
        g.fillStyle = p.kind === 'steam' ? '#ffffff' : p.kind === 'smoke' ? '#3a3a3a' : '#c8b28a';
        g.globalAlpha = alpha * (p.kind === 'steam' ? 0.7 : 0.8);
        const r = p.r * (1 + k);
        g.fillRect(Math.round(p.x - r / 2), Math.round(p.y - r / 2), Math.round(r), Math.round(r));
      } else if (p.kind === 'spark') {
        drawAt(g, 'sparkle', p.x, p.y, p.s * (1 - k * 0.5));
      } else if (p.kind === 'icon') {
        drawAt(g, p.sprite, p.x, p.y, p.s);
      } else if (p.kind === 'text') {
        g.font = `bold ${p.big ? 20 : 15}px Galmuri11, sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        const tw = g.measureText(p.text).width;
        const ix = p.x - tw / 2 - (p.icon ? 12 : 0);
        if (p.icon) drawAt(g, p.icon, ix, p.y + 10, p.big ? 22 : 18);
        g.lineWidth = 4; g.strokeStyle = OUT; g.strokeText(p.text, p.x + (p.icon ? 6 : 0), p.y);
        g.fillStyle = p.color; g.fillText(p.text, p.x + (p.icon ? 6 : 0), p.y);
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      }
      g.globalAlpha = 1;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  bubble(g, x, y, w, h, border = OUT, fill = '#fff7e6') {
    const x0 = Math.round(x - w / 2), y0 = Math.round(y - h);
    g.fillStyle = 'rgba(36,22,15,0.25)'; g.fillRect(x0 + 3, y0 + 3, w, h);
    g.fillStyle = fill; g.fillRect(x0, y0, w, h);
    g.strokeStyle = border; g.lineWidth = 3; g.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);
    g.fillStyle = fill; g.beginPath(); g.moveTo(x - 6, y0 + h - 2); g.lineTo(x, y0 + h + 7); g.lineTo(x + 6, y0 + h - 2); g.fill();
    g.strokeStyle = border; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 6, y0 + h); g.lineTo(x, y0 + h + 7); g.lineTo(x + 6, y0 + h); g.stroke();
    return { x0, y0 };
  }

  bar(g, x, y, w, ratio, color) {
    g.fillStyle = OUT; g.fillRect(x - w / 2 - 2, y - 2, w + 4, 9);
    g.fillStyle = '#fff'; g.fillRect(x - w / 2, y, w, 5);
    g.fillStyle = color; g.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, ratio)), 5);
  }

  label(g, x, y, text, bg, fg) {
    g.font = 'bold 11px Galmuri11, sans-serif';
    const tw = g.measureText(text).width;
    g.fillStyle = bg; g.fillRect(x - tw / 2 - 4, y, tw + 8, 15);
    g.fillStyle = fg; g.textBaseline = 'top'; g.fillText(text, x - tw / 2, y + 2); g.textBaseline = 'alphabetic';
  }

  drawCustomerUI(g, c) {
    const headY = c.y - 64;
    if (c.state === 'order') {
      const pulse = Math.floor(this.clock * 3) % 2;
      const by = headY - 4;
      this.bubble(g, c.x, by, 56, 48, pulse ? '#e0533d' : OUT, '#fffbe0');
      const sp = DISH_SPRITE[c.menuId];
      const sz = spriteSize(sp, 42);
      drawAt(g, sp, c.x, by - 24 + sz.h / 2, 42);
      const r = c.patience / c.maxPatience;
      this.bar(g, c.x, by - 60, 46, r, r < 0.3 ? '#e0533d' : r < 0.6 ? '#ffc83d' : '#4fae4a');
      if (r < 0.3) drawAt(g, 'angry', c.x + 30, by - 34 + Math.sin(this.clock * 10) * 2, 22);
      this.label(g, c.x, by - 80, '클릭!', '#e0533d', '#fff');
    } else if (c.state === 'cooking' || c.state === 'cooked') {
      const by = headY - 4;
      this.bubble(g, c.x, by, 56, 48, OUT, '#fff3c4');
      g.globalAlpha = 0.45 + 0.25 * Math.sin(this.clock * 6);
      drawAt(g, DISH_SPRITE[c.menuId], c.x, by - 12, 40);
      g.globalAlpha = 1;
      this.label(g, c.x, by + 10, '조리 중', '#ff9a3d', '#fff');
    } else if (c.state === 'eat') {
      for (let i = 0; i < 3; i++) {
        const sp = i < c.grade ? 'star' : null;
        const x = c.x - 22 + i * 22;
        if (sp) drawAt(g, sp, x, headY - 8, 20);
        else { g.fillStyle = 'rgba(36,22,15,0.35)'; g.fillRect(x - 6, headY - 22, 12, 12); }
      }
      this.bar(g, c.x, headY - 4, 46, c.timer / EAT_TIME, '#3d8fe0');
    } else if (c.state === 'rowdy') {
      const by = headY - 6;
      this.bubble(g, c.x, by, 94, 40, '#a93421', '#ffd9d2');
      drawAt(g, Math.floor(this.clock * 6) % 2 ? 'angry' : 'angry2', c.x - 30, by - 8, 26);
      g.font = 'bold 13px Galmuri11, sans-serif'; g.fillStyle = '#a93421'; g.fillText('시끄러워!', c.x - 14, by - 15);
      if (this.busy?.target === c) {
        this.bar(g, c.x, by - 54, 70, 1 - this.busy.left / this.busy.total, '#ffc83d');
        this.label(g, c.x, by - 72, '진정시키는 중…', OUT, '#fff');
      } else {
        this.bar(g, c.x, by - 54, 50, c.timer / ROWDY_TIME, '#9b3fd1');
        this.label(g, c.x, by + 8, '클릭해서 진정', '#a93421', '#fff');
      }
    }
  }

  drawChefUI(g) {
    const ch = this.chef;
    if (ch.mode === 'cooking') this.bar(g, ch.x, ch.y - 74, 50, ch.cook / COOK_TIME, '#ff9a3d');
    const waiting = ch.tasks.length;
    if (waiting) this.label(g, ch.x, ch.y - 96, `주문 대기 ${waiting}`, '#3d8fe0', '#fff');
  }

  // ---------- 마감 ----------
  closeEarly() { if (!this.ended && !this.paused) this.time = DAY_LENGTH; }

  endDay() {
    if (this.ended) return;
    // 조리·배달 중인 요리는 즉시 서빙 처리 후 결제
    for (const c of this.customers.slice()) if (c.state === 'cooked') this.serve(c, c.grade);
    this.chef.carry = null;
    for (const c of this.customers.slice()) {
      if (c.state === 'eat') this.pay(c);
      else if (c.menuId && ['enter', 'order'].includes(c.state)) consume(this.state, c.menuId, +1); // 대기 중 손님 재료 반환
    }
    this.ended = true;
    this.renderSide(true);
    this.draw(0);
    this.destroy();
    this.onEnd(this.stats);
  }

  destroy() {
    this.ended = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.canvas.removeEventListener('pointermove', this.onMove);
  }
}

export { anyCookable };
