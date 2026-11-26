// 가게 씬: 준비(prep) 모드와 영업(business) 모드를 한 화면에서 처리
// - 1배 픽셀 캔버스(px)에 방·가구·캐릭터를 그리고 정수배로 확대 → 모든 그림이 같은 픽셀 격자
// - 글자(돈 플로팅 등)는 화면 해상도 오버레이 캔버스(ui)에 픽셀 폰트로
// 규칙: 손님 입장·주문·인내심·요리(퀴즈, 시간 정지)·★1~3·식사·결제·쓰레기·진상 손님·종업원 AI
import {
  MENUS, ITEMS, GRADE, TIP_RATE, tablesOf, branchMenus, canCook, anyCookable,
  consume, menuPrice, gradeFromCorrect, currentForecast, newDayStats, won, staffOf, furnitureBuffs,
} from './shop-engine.js';
import { geometry, levelOf } from './shop-levels.js';
import { px, roomFor, DISH_PX, ITEM_PX } from './px.js';

export const DAY_LENGTH = 150;      // 실제 초 (2분 30초)
const EAT_TIME = 4.0;
const BASE_PATIENCE = 32;
const ROWDY_TIME = 18;
const CALM_TIME = 1.8;
const COOK_TIME = 1.6;            // 화구에서 음식이 익는 모습이 보이도록
const CHEF_SWEEP_TIME = 1.5;
const OPEN_HOUR = 11, CLOSE_HOUR = 21;

// ---------- 방 좌표 (1배 픽셀) — 가게 확장 단계에 따라 바뀜 (shop-levels.js) ----------
const BAR_H = 26;                 // 하단 UI 바가 덮는 높이
let RW, RH, KITCHEN_Y, KITCHEN, BAR, KDOOR_X, HALL, DOOR, AISLE_Y, PASS, PASS_DISH_X, CHEF_HOME, HALL_TOP, STOOLS, LAMPS, APPL, POS_X, CHALK_X, HOMES, GRID, WALL;
function applyGeometry(level) {
  ({ RW, RH, KITCHEN_Y, KITCHEN, BAR, KDOOR_X, HALL, DOOR, AISLE_Y, PASS, PASS_DISH_X, CHEF_HOME, HALL_TOP, STOOLS, LAMPS, APPL, POS_X, CHALK_X, HOMES, GRID, WALL } = geometry(level));
}
applyGeometry(2);

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const OUT = '#1a0f0a';
const ROWDY_TYPES = ['rowdy_loud', 'rowdy_picky', 'rowdy_sneak'];
const GUEST_TYPES = ['cust_office_m', 'cust_kid', 'cust_office_f'];

export function slotCenter(gx, gy) {
  const cw = (HALL.x1 - HALL.x0) / GRID.cols;
  const ch = (HALL.y1 - HALL.y0) / GRID.rows;
  return { x: Math.round(HALL.x0 + (gx + 0.5) * cw), y: Math.round(HALL.y0 + (gy + 0.5) * ch), cw, ch };
}

export class Business {
  /**
   * @param {object} o state, pxCanvas, uiCanvas, hooks{ log, hud, stock, onEnd, onMoney, toast, openQuiz, onSlot }, sfx
   */
  constructor(o) {
    Object.assign(this, o);
    this.mode = 'prep';
    this.forecast = currentForecast(this.state);
    this.stats = newDayStats();
    this.time = 0;
    this.clock = 0;
    this.paused = false;
    this.ended = false;
    this.customers = [];
    this.particles = [];
    this.floats = [];
    this.busy = null;
    this.spawnTimer = 1.2;
    this.outOfStockShown = false;
    this.hudTimer = 0;
    this.edit = null;      // 배치 모드
    this.hoverSlot = null;

    this.px = this.pxCanvas.getContext('2d');
    this.ui = this.uiCanvas.getContext('2d');
    this.rebuild();

    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.onPointer = (e) => this.pointer(e);
    this.onMove = (e) => this.pointerMove(e);
    this.uiCanvas.addEventListener('pointerdown', this.onPointer);
    this.uiCanvas.addEventListener('pointermove', this.onMove);

    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  // 가구·직원 배치가 바뀌면 다시 구성
  rebuild() {
    this.level = levelOf(this.state);
    applyGeometry(this.level);
    this.forecast = currentForecast(this.state);
    this._bar = null; this._tiles = null;
    if (this.pxCanvas && this.s) this.resize();
    this.tables = [];
    this.seats = [];
    for (const t of tablesOf(this.state)) {
      const c = slotCenter(t.x, t.y);
      const long = t.type === 'table_long';
      const tb = { type: t.type, gx: t.x, gy: t.y, cx: c.x, cy: c.y, base: c.y + 14 };
      this.tables.push(tb);
      const offs = long ? [-14, 14] : [-15];
      for (const ox of offs) {
        this.seats.push({
          table: tb, cust: null, trash: false, reserved: false, dish: null, flip: ox > 0,
          base: tb.base,
          seat: { x: c.x + ox, y: c.y + (long ? 6 : 8) },
          serve: { x: c.x + (long ? ox : 2), y: AISLE_Y, face: c.y < AISLE_Y ? 'back' : 'front' }, // 상 앞 통로에서 서빙
          trashPos: { x: c.x + (long ? ox / 2 : 1), y: c.y + 2 },
          // 상판 위 음식 자리 (바닥 y): 2인 상은 가운데, 4인 긴 상은 손님마다 위·아래
          dishPos: long ? { x: c.x + (ox < 0 ? -2 : 2), y: c.y + (ox < 0 ? -9 : 2) } : { x: c.x, y: c.y + 1 },
        });
      }
    }
    this.decos = this.state.layout.filter((l) => ITEMS[l.type]?.kind === 'deco').map((l) => {
      const c = slotCenter(l.x, l.y);
      return { type: l.type, gx: l.x, gy: l.y, x: c.x, y: c.y + 14 };
    });

    // 사장님 + 종업원
    const look = this.state.chefLook || 'chef_m';
    this.chef = this.chef || this.actor(look, CHEF_HOME, 120, 'dir4');
    if (this.chef.mode === 'idle' || !this.chef.mode) { this.chef.x = CHEF_HOME.x; this.chef.y = CHEF_HOME.y; this.chef.path = []; }
    this.chef.sheet = look;
    Object.assign(this.chef, { tasks: this.chef.tasks || [], mode: this.chef.mode || 'idle', idleDir: 'front' });
    this.pass = this.pass || [];
    const cl = staffOf(this.state, 'cleaner');
    const sv = staffOf(this.state, 'server');
    const gd = staffOf(this.state, 'guard');
    const keep = (old, def) => (old && old.def?.id === def?.id ? old : null);
    this.cleaner = cl ? keep(this.cleaner, cl) || Object.assign(this.actor(cl.id, HOMES.cleaner, cl.speed * 0.5, 'single'), { def: cl, home: HOMES.cleaner, mode: 'idle', tasks: [] }) : null;
    this.server = sv ? keep(this.server, sv) || Object.assign(this.actor(`server${sv.tier}`, HOMES.server, sv.speed * 0.5, 'dir4'), { def: sv, home: HOMES.server, mode: 'idle' }) : null;
    this.guard = gd ? keep(this.guard, gd) || Object.assign(this.actor(gd.id, HOMES.guard, gd.speed * 0.5, 'single'), { def: gd, home: HOMES.guard, mode: 'idle' }) : null;
    this.buffs = furnitureBuffs(this.state);
    this.patienceMult = (sv ? sv.patienceMult : 1) / (1 + this.buffs.patience);
    this.staffList = [this.cleaner, this.server, this.guard].filter(Boolean);
  }

  actor(sheet, pos, speed, kind) {
    return { sheet, kind, x: pos.x, y: pos.y, path: [], speed, t: Math.random() * 10, dir: 'front', face: 1 };
  }

  guestActor(rowdy) {
    const a = { x: DOOR.x + rand(-3, 3), y: RH + 18, path: [], speed: rand(52, 64), t: Math.random() * 10, dir: 'back', face: 1 };
    a.kind = 'single';
    a.sheet = pick(rowdy ? ROWDY_TYPES : GUEST_TYPES);
    return a;
  }

  // ---------- 친구 가게 방문: 내가 손님으로 들어가 시식 ----------
  startVisit(me) {
    this.mode = 'visit';
    this.edit = null;
    const free = this.seats.filter((t) => !t.cust);
    const menus = branchMenus(this.state);
    const c = this.guestActor(false);
    c.sheet = 'cust_kid';
    const seat = free[0];
    Object.assign(c, { visitor: true, visitorName: me.name, menuId: pick(menus), state: 'enter', patience: 1, maxPatience: 1 });
    if (seat) {
      c.table = seat; seat.cust = c;
      c.path = this.entryPath(seat.seat);
    } else {
      // 테이블이 없으면 바 앞에 서서 시식
      const spot = { x: Math.round((BAR.x0 + BAR.x1) / 2), y: HALL_TOP };
      c.table = { seat: spot, serve: spot, trashPos: { x: spot.x, y: BAR.top + 6 }, dishPos: { x: spot.x, y: BAR.top + 9 }, base: HALL_TOP, cust: c };
      c.path = this.entryPath(spot);
    }
    this.customers.push(c);
    this.visitor = c;
  }

  visitorLeave() {
    const c = this.visitor;
    if (!c || c.state === 'leave') return;
    if (this.seats.includes(c.table)) this.leave(c, false);
    else { c.state = 'leave'; c.path = this.exitPath(c); }
  }

  // ---------- 영업 시작 ----------
  startDay() {
    this.mode = 'business';
    this.edit = null;
    this.stats = newDayStats();
    this.time = 0;
    this.spawnTimer = 1.2;
    this.forecast = currentForecast(this.state);
    this.promo = this.state.promo || 0; // 친구 응원 홍보 버프
    this.log(`${this.forecast.icon} ${this.forecast.name} — 영업을 시작합니다!`);
    if (this.promo) this.log(`📣 친구 응원 홍보 효과! 오늘 매출 +${Math.round(this.promo * 100)}%`);
    if (this.staffList.length) this.log(`👥 오늘 근무: ${this.staffList.map((a) => a.def.name).join(', ')}`);
    this.pushHud(true);
  }

  log(m) { if (this.mode !== 'visit') this.hooks.log?.(m); }
  toast(m) { this.hooks.toast?.(m); }

  // ---------- 화면 크기: 정수배 확대 ----------
  resize() {
    const wrap = this.pxCanvas.parentElement;
    const W = wrap.clientWidth, Hh = wrap.clientHeight;
    // 하단 바는 방 아래쪽 돌벽 위에 겹쳐도 되므로 방 높이 기준으로 맞춤
    const fit = Math.min(W / RW, Hh / RH);
    // 정수배가 원칙, 단 내림 때문에 화면이 20% 넘게 비면 소수배 허용 (1280×800 크롬북 등)
    const s = Math.floor(fit) >= 2 && Math.floor(fit) / fit >= 0.8 ? Math.floor(fit) : Math.max(1, fit);
    this.s = s;
    const vw = Math.floor(W / s), vh = Math.floor(Hh / s);
    this.vw = vw; this.vh = vh;
    this.ox = Math.floor((vw - RW) / 2);
    this.oy = Math.max(0, Math.min(Math.floor((vh - RH) / 2), vh - RH - BAR_H + 16));
    // 배치 중에는 아래 가구 트레이에 가리지 않게 화면을 위로 올림
    if (this.edit && this.editPad) this.oy = Math.max(-56, Math.min(this.oy, vh - RH - this.editPad));
    this.pxCanvas.width = vw; this.pxCanvas.height = vh;
    this.pxCanvas.style.width = `${vw * s}px`; this.pxCanvas.style.height = `${vh * s}px`;
    const dpr = window.devicePixelRatio || 1;
    this.uiCanvas.width = Math.floor(vw * s * dpr); this.uiCanvas.height = Math.floor(vh * s * dpr);
    this.uiCanvas.style.width = `${vw * s}px`; this.uiCanvas.style.height = `${vh * s}px`;
    this.dpr = dpr;
    document.documentElement.style.setProperty('--s', s);
    document.documentElement.style.setProperty('--u', s >= 4 ? 3 : 2);
    this.px.imageSmoothingEnabled = false;
  }

  toWorld(e) {
    const r = this.uiCanvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / this.s - this.ox, y: (e.clientY - r.top) / this.s - this.oy };
  }

  // ---------- 루프 ----------
  loop(now) {
    if (this.destroyed) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const running = !this.paused && !this.locked && !this.ended;
    if (running) this.tick(dt);
    this.draw(running ? dt : 0);
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  tick(dt) {
    this.clock += dt;
    if (this.mode === 'visit') {
      for (const c of this.customers.slice()) this.updateCustomer(c, dt, false);
      this.updateChef(dt);
      this.updateServer(dt);
      return;
    }
    if (this.mode !== 'business') {
      for (const a of [this.chef, ...this.staffList]) { a.t += dt; this.move(a, dt); }
      return;
    }
    this.time += dt;
    if (this.time < DAY_LENGTH - 6) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.spawn();
    }
    const rowdyActive = this.customers.some((c) => c.state === 'rowdy');
    for (const c of this.customers.slice()) this.updateCustomer(c, dt, rowdyActive);
    this.updateChef(dt);
    this.updateCleaner(dt);
    this.updateServer(dt);
    this.updateGuard(dt);
    for (const t of this.seats) if (t.trash) this.stats.trashSeconds += dt;
    if (this.busy) {
      this.busy.left -= dt;
      if (this.busy.left <= 0) { const b = this.busy; this.busy = null; b.done(); }
    }
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) { this.hudTimer = 0.2; this.pushHud(); }
    if (this.time >= DAY_LENGTH) this.endDay();
  }

  pushHud(force) {
    const pct = Math.min(1, this.time / DAY_LENGTH);
    const minutes = Math.floor((OPEN_HOUR + (CLOSE_HOUR - OPEN_HOUR) * pct) * 60);
    this.hooks.hud?.({
      pct,
      clock: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
      revenue: this.stats.revenue + this.stats.tips,
      served: this.stats.served,
      perfect: this.stats.grades[3],
    });
    const key = branchMenus(this.state).map((id) => this.cookable(id)).join(',');
    if (force || key !== this.stockKey) { this.stockKey = key; this.hooks.stock?.(); }
    this.hooks.onMoney?.();
  }

  cookable(id) {
    const m = MENUS[id];
    return Math.min(...Object.entries(m.needs).map(([ing, k]) => Math.floor((this.state.fridge.items[ing] || 0) / k)));
  }

  move(a, dt) {
    a.moving = false;
    if (!a.path.length) return true;
    const tgt = a.path[0];
    const d = dist(a, tgt);
    const step = a.speed * dt;
    a.moving = true;
    const ddx = tgt.x - a.x, ddy = tgt.y - a.y;
    if (Math.abs(ddx) > 0.5) a.face = ddx < 0 ? -1 : 1;
    a.dir = Math.abs(ddx) > Math.abs(ddy) * 0.8 ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'front' : 'back');
    if (d <= step) { a.x = tgt.x; a.y = tgt.y; a.path.shift(); return !a.path.length; }
    a.x += (ddx / d) * step;
    a.y += (ddy / d) * step;
    return false;
  }

  entryPath(seat) {
    return [{ x: DOOR.x, y: RH - 18 }, { x: DOOR.x, y: AISLE_Y }, { x: seat.x, y: AISLE_Y }, seat];
  }

  exitPath(from) {
    return [{ x: from.x, y: AISLE_Y }, { x: DOOR.x, y: AISLE_Y }, { x: DOOR.x, y: RH - 18 }, { x: DOOR.x + rand(-3, 3), y: RH + 24 }];
  }

  // 사장님 동선: 주방 안 ↔ 홀은 바 오른쪽 출입구로만
  inKitchen(p) { return p.y < BAR.base - 2 && p.x < KDOOR_X - 2; }
  route(a, dest) {
    const ai = this.inKitchen(a), di = this.inKitchen(dest);
    if (ai && di) return [{ x: a.x, y: CHEF_HOME.y }, dest];
    if (ai) return [{ x: a.x, y: CHEF_HOME.y }, { x: KDOOR_X, y: CHEF_HOME.y }, ...this.walk({ x: KDOOR_X, y: HALL_TOP }, dest)];
    if (di) return [...this.walk(a, { x: KDOOR_X, y: HALL_TOP }), { x: KDOOR_X, y: CHEF_HOME.y }, dest];
    return this.walk(a, dest);
  }

  // 홀 이동: 바 앞 통로(HALL_TOP) ↔ 테이블 칸 사이 빈 기둥 ↔ 가운데 통로(AISLE_Y). 테이블을 뚫고 지나가지 않음
  gapX(x) {
    const cw = (HALL.x1 - HALL.x0) / GRID.cols;
    const k = Math.max(0, Math.min(GRID.cols, Math.round((x - HALL.x0) / cw)));
    return Math.round(HALL.x0 + k * cw + (k === 0 ? 6 : k === GRID.cols ? -6 : 0));
  }
  lane(y) { return y <= HALL_TOP + 2 ? 'top' : Math.abs(y - AISLE_Y) <= 2 ? 'aisle' : 'other'; }
  walk(a, dest) {
    const pts = [];
    const fromTop = a.y <= HALL_TOP + 6;
    const toTop = dest.y <= HALL_TOP + 6;
    if (fromTop && toTop) return [{ x: a.x, y: HALL_TOP }, { x: dest.x, y: HALL_TOP }, dest];
    if (fromTop) {
      const gx = this.gapX(a.x);
      pts.push({ x: a.x, y: HALL_TOP }, { x: gx, y: HALL_TOP }, { x: gx, y: AISLE_Y });
    } else {
      pts.push({ x: a.x, y: AISLE_Y });
    }
    if (toTop) {
      const gx = this.gapX(dest.x);
      pts.push({ x: gx, y: AISLE_Y }, { x: gx, y: HALL_TOP }, { x: dest.x, y: HALL_TOP }, dest);
    } else {
      pts.push({ x: dest.x, y: AISLE_Y }, dest);
    }
    return pts;
  }

  // ---------- 손님 ----------
  spawn() {
    const n = Math.max(1, this.seats.length);
    const interval = rand(6.5, 10.5) * Math.sqrt(2 / n) / (this.forecast.spawnMult || 1) / (1 + this.buffs.visit);
    this.spawnTimer = Math.max(2, interval);
    const free = this.seats.filter((t) => !t.cust && !t.trash);
    if (!free.length) { this.spawnTimer = 2; return; }

    const rowdy = this.state.day >= 2 && Math.random() < 0.12 * (this.guard ? this.guard.def.rowdyMult : 1) && !this.customers.some((c) => c.rowdy);
    let menuId = null;
    if (!rowdy) {
      const avail = branchMenus(this.state).filter((m) => canCook(this.state, m));
      if (!avail.length) {
        if (!this.outOfStockShown) {
          this.outOfStockShown = true;
          this.log('⚠️ 재료가 모두 떨어졌어요! 오늘은 일찍 마감해도 좋아요.');
          this.toast('재료가 모두 떨어졌어요! 마감해도 좋아요.');
        }
        return;
      }
      menuId = pick(avail);
      consume(this.state, menuId);
    }
    const seat = pick(free);
    const patience = BASE_PATIENCE * (this.forecast.patienceMult || 1);
    // 미슐랭 심사위원: 겉모습은 일반 손님과 똑같음 (3일차부터, 별점이 높을수록 자주, 하루 1명)
    const michelin = !rowdy && this.state.day >= 3 && !this.michelinCame
      && Math.random() < 0.05 + Math.max(0, this.state.rating - 3) * 0.06;
    if (michelin) this.michelinCame = true;
    const c = this.guestActor(rowdy);
    Object.assign(c, { table: seat, menuId, rowdy, michelin, state: 'enter', patience, maxPatience: patience });
    c.path = this.entryPath(seat.seat);
    seat.cust = c;
    this.customers.push(c);
    if (rowdy) this.sfx?.play('rowdy');
  }

  updateCustomer(c, dt, rowdyActive) {
    c.t += dt;
    switch (c.state) {
      case 'enter':
        if (this.move(c, dt)) {
          c.face = c.table.flip ? -1 : 1;
          if (c.rowdy) {
            c.state = 'rowdy'; c.timer = ROWDY_TIME;
            this.log('😡 진상 손님 등장! 클릭해서 진정시켜요.');
          } else c.state = 'order';
        }
        break;
      case 'order':
        if (c.visitor) {
          c.state = 'cooked'; c.grade = 3;
          this.chef.tasks.push({ type: 'cook', c, grade: 3 });
          break;
        }
        c.patience -= dt * (rowdyActive ? 2.5 : 1) * this.patienceMult;
        if (c.patience <= 0) {
          this.stats.lost++;
          consume(this.state, c.menuId, +1);
          this.float(c.x, c.y - 30, '너무 늦어요!', '#ff8a7a');
          if (c.michelin) {
            this.stats.michelin = 'lost'; this.stats.michelinRating = -0.15;
            this.float(c.x, c.y - 44, '🕵️ 미슐랭 심사위원이었어요…', '#ff8a7a', null, true);
            this.log('🕵️ 떠난 손님은 <b>미슐랭 심사위원</b>이었어요! 별점 −0.15');
          }
          this.log(`⏰ ${MENUS[c.menuId].name} 손님이 기다리다 떠났어요.`);
          this.sfx?.play('bad');
          this.leave(c, false);
        }
        break;
      case 'rowdy':
        if (this.busy?.target === c || c.handledBy) break;
        c.timer -= dt;
        if (c.timer <= 0) {
          this.stats.rowdyIgnored++;
          this.log('💢 진상 손님이 소란을 피우고 떠났어요. (별점 하락)');
          this.leave(c, true);
        }
        break;
      case 'eat':
        c.timer -= dt;
        if (c.timer <= 0) {
          if (c.visitor) {
            c.state = 'ate'; c.table.dish = null;
            this.float(c.x, c.y - 20, '잘 먹었습니다! 😋', '#ffd23f', null, true);
            this.sparkle(c.x, c.y - 20, 6);
            this.sfx?.play('perfect');
            this.hooks.onTasted?.();
          } else this.pay(c);
        }
        break;
      case 'leave':
        if (this.move(c, dt)) this.customers.splice(this.customers.indexOf(c), 1);
        break;
      default: break;
    }
  }

  // ---------- 사장님 ----------
  updateChef(dt) {
    const ch = this.chef;
    ch.t += dt;
    const arrived = this.move(ch, dt);
    switch (ch.mode) {
      case 'idle':
        ch.idleDir = 'front'; // 주방에서 정면을 보고 대기
        if (!ch.tasks.length) break;
        ch.task = ch.tasks.shift();
        if (ch.task.type === 'escort') {
          const c = ch.task.c;
          if (c.state !== 'rowdy') break;
          ch.mode = 'toRowdy';
          ch.path = this.route(ch, { x: c.table.serve.x, y: c.table.serve.y });
        } else if (ch.task.type === 'clean') {
          const t = ch.task.t;
          if (!t.trash) { t.reserved = false; break; }
          ch.mode = 'toTrash';
          ch.path = this.route(ch, t.serve);
        } else {
          ch.mode = 'toStove';
          ch.path = dist(ch, CHEF_HOME) > 2 ? this.route(ch, CHEF_HOME) : [];
        }
        break;
      case 'toRowdy':
        if (ch.task.c.state !== 'rowdy') { ch.mode = 'returning'; ch.path = this.route(ch, CHEF_HOME); break; }
        if (arrived) { ch.mode = 'calming'; ch.calmT = 0; ch.idleDir = 'back'; }
        break;
      case 'calming': {
        const c = ch.task.c;
        ch.calmT += dt;
        if (ch.calmT >= CALM_TIME) {
          this.stats.rowdyHandled++;
          // 손님과 나란히 문까지 걸어감
          this.leave(c, false);
          c.handledBy = null;
          ch.walkSpeed = ch.speed;
          ch.speed = c.speed;
          ch.path = c.path.slice(0, -1).map((p) => ({ x: p.x + 10, y: p.y }));
          ch.path.push({ x: DOOR.x + 10, y: RH - 20 });
          ch.mode = 'escorting';
        }
        break;
      }
      case 'escorting':
        if (arrived) {
          ch.speed = ch.walkSpeed || 120;
          ch.mode = 'returning';
          ch.path = this.route(ch, CHEF_HOME);
        }
        break;
      case 'toStove':
        if (arrived) { ch.mode = 'cooking'; ch.cook = 0; ch.idleDir = 'back'; }
        break;
      case 'cooking':
        ch.cook += dt;
        if (Math.random() < dt * 14) { const b = this.burnerPos(); this.particles.push({ kind: 'steam', x: b.x + rand(-5, 5), y: b.y - 8, vx: rand(-1, 1), vy: -rand(8, 14), life: 0, max: 0.9 }); }
        if (ch.cook >= COOK_TIME) {
          const { grade } = ch.task;
          const pan = this.burnerPos();
          if (grade === 3) { this.sparkle(pan.x, pan.y, 6); this.sfx?.play('perfect'); }
          else if (grade === 1) { this.smoke(pan.x, pan.y, 8); this.sfx?.play('bad'); }
          else this.sfx?.play('tap');
          if (this.server) { this.pass.push(ch.task); ch.mode = 'idle'; } else {
            ch.carry = ch.task;
            ch.mode = 'delivering';
            ch.path = this.route(ch, ch.task.c.table.serve);
          }
        }
        break;
      case 'delivering':
        if (arrived) {
          ch.idleDir = ch.carry.c.table.serve.face || 'back';
          this.serve(ch.carry.c, ch.carry.grade);
          ch.carry = null;
          ch.mode = 'returning';
          ch.path = this.route(ch, CHEF_HOME);
        }
        break;
      case 'toTrash':
        if (arrived) { ch.mode = 'sweeping'; ch.sweepT = 0; ch.idleDir = 'back'; }
        break;
      case 'sweeping':
        ch.sweepT += dt;
        if (Math.random() < dt * 10) this.dust(ch.task.t.trashPos.x, ch.task.t.trashPos.y);
        if (ch.sweepT >= CHEF_SWEEP_TIME) {
          this.finishClean(ch.task.t);
          ch.mode = 'returning';
          ch.path = this.route(ch, CHEF_HOME);
        }
        break;
      case 'returning':
        if (arrived || ch.tasks.length) ch.mode = 'idle';
        break;
      default: break;
    }
  }

  finishClean(t) {
    t.trash = false; t.reserved = false;
    this.stats.trashCleaned++;
    this.sparkle(t.trashPos.x, t.trashPos.y - 6, 4);
    this.sfx?.play('clean');
  }

  // ---------- 종업원 ----------
  updateCleaner(dt) {
    const cl = this.cleaner;
    if (!cl) return;
    cl.t += dt;
    const arrived = this.move(cl, dt);
    switch (cl.mode) {
      case 'idle': {
        let t = null;
        while (cl.tasks.length && !t) { const x = cl.tasks.shift(); if (x.trash && x.reservedBy !== 'chef') t = x; }
        if (!t) t = this.seats.find((x) => x.trash && !x.reserved);
        if (!t) break;
        t.reserved = true; t.reservedBy = 'cleaner';
        cl.task = t; cl.mode = 'going';
        cl.path = this.walk(cl, t.serve);
        break;
      }
      case 'going':
        if (arrived) { cl.mode = 'sweeping'; cl.sweepT = 0; }
        break;
      case 'sweeping':
        cl.sweepT += dt;
        if (Math.random() < dt * 10) this.dust(cl.task.trashPos.x, cl.task.trashPos.y);
        if (cl.sweepT >= cl.def.work) {
          this.finishClean(cl.task);
          cl.mode = 'returning';
          cl.path = this.walk(cl, cl.home);
        }
        break;
      case 'returning':
        if (arrived || this.seats.some((x) => x.trash && !x.reserved)) cl.mode = 'idle';
        break;
      default: break;
    }
  }

  updateServer(dt) {
    const sv = this.server;
    if (!sv) return;
    sv.t += dt;
    const arrived = this.move(sv, dt);
    switch (sv.mode) {
      case 'idle':
        sv.idleDir = 'front';
        if (this.pass.length) { sv.mode = 'toPass'; sv.path = [...this.walk(sv, { x: PASS.x, y: HALL_TOP }), PASS]; }
        break;
      case 'toPass':
        if (arrived) { sv.mode = 'picking'; sv.pickT = 0; sv.idleDir = 'back'; }
        break;
      case 'picking':
        sv.pickT += dt;
        if (sv.pickT >= 0.35) {
          sv.carry = this.pass.shift();
          if (!sv.carry) { sv.mode = 'idle'; break; }
          sv.mode = 'delivering';
          sv.path = this.walk({ x: sv.x, y: HALL_TOP }, sv.carry.c.table.serve);
        }
        break;
      case 'delivering':
        if (arrived) { sv.mode = 'handing'; sv.handT = 0; sv.idleDir = sv.carry.c.table.serve.face || 'back'; }
        break;
      case 'handing': // 손님 상 앞에서 테이블 쪽을 보고 내려놓기
        sv.handT += dt;
        if (sv.handT >= 0.3) {
          this.serve(sv.carry.c, sv.carry.grade);
          sv.carry = null;
          sv.mode = 'returning';
          sv.path = this.walk(sv, sv.home);
        }
        break;
      case 'returning':
        if (arrived || this.pass.length) sv.mode = 'idle';
        break;
      default: break;
    }
  }

  updateGuard(dt) {
    const gd = this.guard;
    if (!gd) return;
    gd.t += dt;
    const arrived = this.move(gd, dt);
    const target = gd.target;
    switch (gd.mode) {
      case 'idle': {
        const c = this.customers.find((x) => x.state === 'rowdy' && !x.handledBy);
        if (!c) break;
        c.handledBy = gd; gd.target = c; gd.mode = 'going';
        gd.path = this.walk(gd, c.table.serve);
        this.log(`🛡️ ${gd.def.name} 출동!`);
        break;
      }
      case 'going':
        if (!target || target.state !== 'rowdy') { gd.mode = 'returning'; gd.path = [gd.home]; break; }
        if (arrived) { gd.mode = 'handling'; gd.workT = 0; }
        break;
      case 'handling':
        if (!target || target.state !== 'rowdy') { gd.mode = 'returning'; gd.path = [gd.home]; break; }
        gd.workT += dt;
        if (gd.workT >= gd.def.work) {
          if (Math.random() < gd.def.success) {
            this.stats.rowdyHandled++;
            this.float(target.x, target.y - 34, '퇴치 성공!', '#8cff86');
            this.log(`🛡️ ${gd.def.name}: 진상 손님 퇴치 성공!`);
            this.sfx?.play('clean');
            target.handledBy = null;
            this.leave(target, false);
            gd.target = null; gd.mode = 'returning'; gd.path = [gd.home];
          } else {
            this.float(target.x, target.y - 34, '실패… 다시!', '#ff8a7a');
            this.sfx?.play('wrong');
            gd.workT = -1.0;
          }
        }
        break;
      case 'returning':
        if (arrived || this.customers.some((x) => x.state === 'rowdy' && !x.handledBy)) gd.mode = 'idle';
        break;
      default: break;
    }
  }

  // ---------- 입력 ----------
  slotAt(p) {
    const { cols, rows } = GRID;
    const cw = (HALL.x1 - HALL.x0) / cols, ch = (HALL.y1 - HALL.y0) / rows;
    const gx = Math.floor((p.x - HALL.x0) / cw), gy = Math.floor((p.y - HALL.y0) / ch);
    return gx >= 0 && gy >= 0 && gx < cols && gy < rows ? { gx, gy } : null;
  }

  hitTest(p) {
    const list = this.customers.filter((c) => c.state === 'order' || c.state === 'rowdy').sort((a, b) => b.y - a.y);
    for (const c of list) if (Math.abs(p.x - c.x) < 11 && p.y > this.headY(c) - 22 && p.y < c.y + 2) return { kind: 'cust', c };
    for (const t of this.seats) if (t.trash && Math.abs(p.x - t.trashPos.x) < 14 && Math.abs(p.y - t.trashPos.y) < 12) return { kind: 'trash', t };
    return null;
  }

  pointerMove(e) {
    const p = this.toWorld(e);
    if (this.edit) {
      this.hoverSlot = this.slotAt(p);
      this.uiCanvas.style.cursor = this.hoverSlot ? 'pointer' : 'default';
      return;
    }
    this.uiCanvas.style.cursor = this.mode === 'business' && this.hitTest(p) ? 'pointer' : 'default';
  }

  pointer(e) {
    const p = this.toWorld(e);
    if (this.edit) {
      const s = this.slotAt(p);
      if (s) this.hooks.onSlot?.(s.gx, s.gy);
      return;
    }
    if (this.mode !== 'business' || this.paused || this.ended || this.locked) return;
    const h = this.hitTest(p);
    if (!h) return;
    e.preventDefault();
    if (h.kind === 'trash') return this.clickTrash(h.t);
    const c = h.c;
    if (c.state === 'order') {
      if (this.busy) { this.toast(`지금은 ${this.busy.label} 중이에요!`); return; }
      this.cook(c);
    } else if (c.state === 'rowdy') {
      if (c.handledBy) return;
      c.handledBy = 'chef';
      this.chef.tasks.unshift({ type: 'escort', c });
      this.sfx?.play('tap');
    }
  }

  clickTrash(t) {
    if (this.cleaner) {
      if (!t.reserved) this.cleaner.tasks.unshift(t);
      this.toast(`${this.cleaner.def.name}이(가) 곧 치울 거예요! 🧹`);
      return;
    }
    if (t.reserved) return;
    t.reserved = true; t.reservedBy = 'chef';
    this.chef.tasks.push({ type: 'clean', t });
    this.sfx?.play('tap');
  }

  cook(c) {
    c.state = 'cooking';
    this.paused = true;
    this.cookPreview = c.menuId; // 문제 푸는 동안에도 화구에 재료가 올라가 있음
    const m = MENUS[c.menuId];
    this.hooks.openQuiz({ title: `${m.icon} ${m.name} 요리 중!`, engBoost: this.forecast.engBoost || 0 }, (correct, total) => {
      this.paused = false;
      this.cookPreview = null;
      this.last = performance.now();
      this.stats.quizCorrect += correct;
      this.stats.quizTotal += total;
      const grade = gradeFromCorrect(correct);
      c.state = 'cooked';
      c.grade = grade;
      this.chef.tasks.push({ type: 'cook', c, grade });
    });
  }

  serve(c, grade) {
    if (this.ended) return;
    c.grade = grade;
    c.state = 'eat';
    c.timer = EAT_TIME;
    c.table.dish = { sprite: grade === 1 ? 'dish_burnt' : DISH_PX[c.menuId], grade };
    const m = MENUS[c.menuId];
    const stars = '★'.repeat(grade) + '☆'.repeat(3 - grade);
    if (grade === 3) this.sparkle(c.table.trashPos.x, c.table.trashPos.y - 8, 6);
    if (grade === 1) this.smoke(c.table.trashPos.x, c.table.trashPos.y - 6, 6);
    this.stats.served++;
    this.stats.grades[grade]++;
    this.log(`${m.icon} ${m.name} — <b class="g${grade}">${GRADE[grade].name} ${stars}</b>`);
  }

  pay(c) {
    const base = menuPrice(this.state, c.menuId);
    const price = Math.round(base * GRADE[c.grade].mult * (1 + (this.promo || 0)) / 10) * 10;
    const tipBonus = 1 + (this.server ? this.server.def.tipBonus : 0) + this.buffs.tip;
    const tip = c.grade === 3 ? Math.round(base * TIP_RATE * (this.forecast.tipMult || 1) * tipBonus / 10) * 10 : 0;
    this.state.money += price + tip;
    this.stats.revenue += price;
    this.stats.tips += tip;
    this.float(c.x, c.y - 36, `+${won(price)}`, c.grade === 1 ? '#ff8a7a' : '#ffd23f', 'coin', true);
    if (tip) this.float(c.x, c.y - 26, `팁 +${won(tip)}`, '#ff9ac8', 'heart', false, 0.25);
    if (c.grade >= 2) for (let i = 0; i < (c.grade === 3 ? 3 : 1); i++) this.particles.push({ kind: 'icon', sprite: c.grade === 3 && i ? 'star' : 'heart', x: c.x + rand(-8, 8), y: c.y - 22, vx: rand(-3, 3), vy: -rand(14, 22), life: -i * 0.15, max: 1.3 });
    if (c.michelin) this.revealMichelin(c, tip);
    this.sfx?.play('receipt');
    if (c.grade === 1) this.sfx?.play('bad');
    c.table.dish = null;
    this.leave(c, Math.random() < 0.8 * (this.cleaner ? this.cleaner.def.trashMult : 1));
  }

  // 결제 순간 정체 공개
  revealMichelin(c, tip) {
    const g = c.grade;
    let bonus = 0;
    if (g === 3) { bonus = 20000 + tip * 2; this.stats.michelin = 'pass'; this.stats.michelinRating = 0.15; }
    else if (g === 2) { bonus = 5000; this.stats.michelin = 'ok'; }
    else { this.stats.michelin = 'fail'; this.stats.michelinRating = -0.15; }
    this.stats.bonus += bonus;
    this.state.money += bonus;
    this.float(c.x, c.y - 50, '🕵️ 사실 미슐랭 심사위원!', g === 3 ? '#8cff86' : g === 2 ? '#ffd23f' : '#ff8a7a', null, true, 0.4);
    if (bonus) this.float(c.x, c.y - 60, `보너스 +${won(bonus)}`, '#8cff86', 'coin', true, 0.9);
    if (g === 3) { this.sparkle(c.x, c.y - 20, 14); this.sfx?.play('perfect'); }
    this.log(g === 3 ? `🕵️ <b>미슐랭 심사위원</b>이었어요! 특상급 요리에 감동 → 보너스 ${won(bonus)}, 별점 +0.15`
      : g === 2 ? `🕵️ <b>미슐랭 심사위원</b>이었어요. 무난한 평가 → 보너스 ${won(bonus)}`
        : '🕵️ <b>미슐랭 심사위원</b>에게 탄 요리를… 별점 −0.15');
    this.hooks.toast?.(g === 3 ? '🕵️ 미슐랭 심사위원 통과! ✨' : g === 2 ? '🕵️ 미슐랭 심사위원이 다녀갔어요' : '🕵️ 미슐랭 심사위원 불합격…');
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
  // 화구 왼쪽 버너 (음식이 올라가는 자리)
  burnerPos() { const s = px('stove_empty'); return { x: APPL.stove, y: KITCHEN_Y - (s ? s.height : 36) + 16 }; }

  drawStoveCooking() {
    const ch = this.chef;
    const cooking = ch.mode === 'cooking' && ch.task;
    const menuId = cooking ? ch.task.c.menuId : this.cookPreview;
    if (!menuId) return;
    const g = this.px;
    const b = this.burnerPos();
    const k = cooking ? ch.cook / COOK_TIME : 0;
    const burnt = cooking && ch.task.grade === 1 && k > 0.6;
    // 불꽃
    const fl = Math.floor(this.clock * 12) % 3;
    for (let i = -4; i <= 4; i += 4) {
      g.fillStyle = (i / 4 + fl) % 2 ? '#ffb020' : '#ff5a1f';
      g.fillRect(Math.round(b.x + i + this.ox), Math.round(b.y - 1 - ((i / 4 + fl) % 2) + this.oy), 2, 2);
    }
    // 팬 + 음식 (보글보글 튀어오름)
    g.fillStyle = '#1a0e08'; g.fillRect(Math.round(b.x - 9 + this.ox), Math.round(b.y - 3 + this.oy), 18, 3);
    g.fillStyle = '#3a3a44'; g.fillRect(Math.round(b.x - 8 + this.ox), Math.round(b.y - 3 + this.oy), 16, 2);
    g.fillRect(Math.round(b.x + 8 + this.ox), Math.round(b.y - 3 + this.oy), 6, 1);
    const hop = cooking ? -(Math.floor(this.clock * 10) % 2) : 0;
    this.spr(burnt ? 'dish_burnt' : DISH_PX[menuId], b.x, b.y - 2 + hop);
  }

  panPos() { return this.burnerPos(); }
  steam(strong) { const p = this.panPos(); this.particles.push({ kind: 'steam', x: p.x + rand(-4, 4), y: p.y, vx: rand(-1, 1), vy: -rand(6, 12), life: 0, max: strong ? 1 : 1.5 }); }
  sparkle(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ kind: 'spark', x: x + rand(-10, 10), y: y + rand(-6, 4), vx: rand(-6, 6), vy: -rand(4, 14), life: 0, max: rand(0.5, 1) }); }
  smoke(x, y, n) { for (let i = 0; i < n; i++) this.particles.push({ kind: 'smoke', x: x + rand(-6, 6), y: y + rand(-3, 3), vx: rand(-3, 3), vy: -rand(6, 12), life: 0, max: rand(0.8, 1.4) }); }
  dust(x, y) { this.particles.push({ kind: 'dust', x: x + rand(-6, 6), y: y - rand(0, 3), vx: rand(-10, 10), vy: -rand(2, 6), life: 0, max: 0.5 }); }
  float(x, y, text, color, icon, big = false, delay = 0) { this.floats.push({ x, y, text, color, icon, big, life: -delay, max: 1.7 }); }

  // ---------- 그리기 ----------
  spr(name, x, y, flip = false) {
    const s = px(name);
    if (!s) return;
    const g = this.px;
    const dx = Math.round(x - s.width / 2 + this.ox), dy = Math.round(y - s.height + this.oy);
    if (flip) { g.save(); g.translate(dx + s.width, dy); g.scale(-1, 1); g.drawImage(s, 0, 0); g.restore(); } else g.drawImage(s, dx, dy);
  }

  draw(dt) {
    const g = this.px;
    g.fillStyle = '#0b0705';
    g.fillRect(0, 0, this.vw, this.vh);
    const R = roomFor(this.level);
    if (R) g.drawImage(R, this.ox, this.oy);

    // 주방 타일 바닥 + 벽 장식
    g.drawImage(this.kitchenTiles(), KITCHEN.x0 + this.ox, KITCHEN.y0 + this.oy);
    this.spr('chalkboard', CHALK_X, 44);
    for (const lx of LAMPS) this.spr('lantern', lx, 34);

    const items = [];
    const add = (y, fn) => items.push({ y, fn });
    add(KITCHEN_Y, () => this.spr('rack', APPL.rack, KITCHEN_Y));
    add(KITCHEN_Y, () => this.spr('fridge', APPL.fridge, KITCHEN_Y));
    add(KITCHEN_Y, () => { this.spr('stove_empty', APPL.stove, KITCHEN_Y); this.drawStoveCooking(); });
    add(BAR.base, () => this.drawBar());
    for (const x of STOOLS) add(134, () => this.spr('stool2', x, 134));
    for (const e of APPL.extra || []) add(KITCHEN_Y, () => this.spr(e.name, e.x, KITCHEN_Y));
    for (const w of WALL) this.spr(w.name, w.x, w.y);
    add(112, () => this.spr('pos', POS_X, 112));
    for (const tb of this.tables) add(tb.base, () => this.spr(ITEM_PX[tb.type], tb.cx, tb.base));
    for (const s of this.seats) {
      if (s.dish) add(s.base + 0.5, () => this.spr(s.dish.sprite, s.dishPos.x, s.dishPos.y));
      if (s.trash) add(s.base + 0.6, () => this.drawTrash(s));
    }
    for (const d of this.decos) add(d.y, () => this.spr(ITEM_PX[d.type], d.x, d.y));
    for (const c of this.customers) {
      const seated = ['order', 'cooking', 'cooked', 'eat', 'rowdy', 'ate'].includes(c.state);
      add(seated ? c.table.base + 1 : c.y, () => this.drawActor(c, seated));
    }
    add(this.chef.y, () => { this.drawActor(this.chef); if (this.chef.carry) this.carry(this.chef); if (this.chef.mode === 'sweeping') this.broom(this.chef); });
    for (const a of this.staffList) add(a.y, () => { this.drawActor(a); if (a.carry) this.carry(a); });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();


    this.drawParticles(dt);
    this.drawLight();
    if (this.edit) this.drawSlots();
    if (this.mode === 'business' || this.mode === 'visit') for (const c of this.customers) this.drawCustomerUI(c);
    this.drawBars();
    this.drawUI(dt);
  }

  // ---------- 바 (팔레트는 PixelLab 카운터에서 추출) ----------
  kitchenTiles() {
    if (this._tiles) return this._tiles;
    const w = KITCHEN.x1 - KITCHEN.x0, h = KITCHEN.y1 - KITCHEN.y0;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
      g.fillStyle = ((x + y) / 8) % 2 ? '#d9cbb0' : '#e8dcc4'; g.fillRect(x, y, 8, 8);
      g.fillStyle = '#b8a888'; g.fillRect(x, y + 7, 8, 1); g.fillRect(x + 7, y, 1, 8);
    }
    const sh = g.createLinearGradient(0, 0, 0, 10); sh.addColorStop(0, 'rgba(40,20,5,0.45)'); sh.addColorStop(1, 'rgba(40,20,5,0)');
    g.fillStyle = sh; g.fillRect(0, 0, w, 10);
    return (this._tiles = c);
  }

  // ㄱ자 바: PixelLab 직선 카운터 모듈(bar_seg)을 이어 붙이고, 벽 쪽 꺾임은 같은 상판을 세로로 돌려 이음
  barCanvas() {
    if (this._bar) return this._bar;
    const seg = px('bar_seg');
    const c = document.createElement('canvas'); c.width = RW; c.height = BAR.base + 3;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const { x0, x1, top, base, vx1, vy0 } = BAR;
    if (!seg) return (this._bar = c);
    // 꺾인 부분: 상판(윗줄 1~10) 을 90도 돌려 세로로 타일
    const strip = document.createElement('canvas'); strip.width = 11; strip.height = seg.width;
    const sg = strip.getContext('2d');
    sg.translate(11, 0); sg.rotate(Math.PI / 2);
    sg.drawImage(seg, 0, 0, seg.width, 11, 0, 0, seg.width, 11);
    const armW = vx1 - x0 + 2;
    for (let y = vy0; y < top + 4; y += seg.width - 1) g.drawImage(strip, 0, 0, 11, Math.min(seg.width, top + 4 - y), x0 - 1, y, armW, Math.min(seg.width, top + 4 - y));
    // 긴 카운터: 모듈을 1px 겹쳐 이어 붙임
    const step = seg.width - 1;
    for (let x = x0 - 1; x < x1; x += step) {
      const w = Math.min(seg.width, x1 + 1 - x);
      g.drawImage(seg, 0, 0, w, seg.height, x, base - seg.height, w, seg.height);
    }
    g.fillStyle = '#1a0e08'; g.fillRect(x1, base - seg.height + 1, 1, seg.height - 1);
    g.fillStyle = 'rgba(10,5,2,0.35)'; g.fillRect(x0, base, x1 - x0, 2);
    // 바 위 소품
    const props = [['bottles', x0 + 20], ['sauces', x0 + 42], ['utensils', x0 + 64], ['napkins', x0 + 88]];
    for (const [name, x] of props) {
      const p = px(name);
      if (p && x + p.width / 2 < x1 - 4) g.drawImage(p, Math.round(x - p.width / 2), top + 9 - p.height);
    }
    return (this._bar = c);
  }

  stool() {
    if (this._stool) return this._stool;
    const rows = [
      '..OOOOOOOO..', '.OHHHHHHHHO.', 'OLLLLLLLLLLO', 'OLLLLLLLLLLO', '.OMMMMMMMMO.', '..OOOOOOOO..',
      '..OD....DO..', '..OD....DO..', '..ODOOOODO..', '..ODDDDDDO..', '..OD....DO..', '..OD....DO..', '..OD....DO..', '..OO....OO..',
    ];
    const pal = { O: '#1a0e08', H: '#c07e4c', L: '#a3633a', M: '#734223', D: '#6b3c21' };
    const c = document.createElement('canvas'); c.width = 12; c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return (this._stool = c);
  }

  drawBar() {
    this.px.drawImage(this.barCanvas(), this.ox, this.oy);
    // 바 위에 올려 둔 완성 요리 (서빙 담당이 가져감)
    this.pass.forEach((task, i) => this.spr(task.grade === 1 ? 'dish_burnt' : DISH_PX[task.c.menuId], PASS_DISH_X - (i % 3) * 16, BAR.top + 9 - Math.floor(i / 3) * 3));
  }

  drawTrash(s) {
    this.spr('trash', s.dishPos.x, s.dishPos.y + 1);
    if (!s.reserved && !this.cleaner) {
      const g = this.px;
      const bob = Math.floor(this.clock * 3) % 2;
      const X = Math.round(s.trashPos.x + this.ox) - 1;
      g.fillStyle = '#ffd23f';
      g.fillRect(X, Math.round(s.trashPos.y - 14 + this.oy - bob), 2, 4);
      g.fillRect(X, Math.round(s.trashPos.y - 9 + this.oy - bob), 2, 1);
    }
  }

  drawActor(a, seated = false) {
    const g = this.px;
    const moving = a.moving;
    let bob = moving ? -(Math.floor(a.t * 8) % 2) : 0;
    if (a.state === 'eat') bob = -(Math.floor(a.t * 4) % 2);
    if (a.mode === 'sweeping' || a.mode === 'handling' || a.mode === 'cooking' || a.mode === 'calming') bob = -(Math.floor(a.t * 8) % 2);
    const shake = a.state === 'rowdy' ? (Math.floor(this.clock * 12) % 2 ? 1 : -1) : 0;
    if (!seated) { g.fillStyle = 'rgba(10,5,2,0.35)'; g.fillRect(Math.round(a.x - 5 + this.ox), Math.round(a.y - 1 + this.oy), 10, 2); }
    if (a.kind === 'proc') {
      const s = seated ? a.spr.sit : moving ? (Math.floor(a.t * 8) % 2 ? a.spr.a : a.spr.b) : a.spr.stand;
      g.drawImage(s, Math.round(a.x - s.width / 2 + this.ox + shake), Math.round(a.y - s.height + this.oy + bob + (seated ? 2 : 0)));
      return;
    }
    if (a.kind === 'dir4') this.spr(`${a.sheet}_${moving ? a.dir : (a.idleDir || 'front')}`, a.x + shake, a.y + bob);
    else this.spr(a.sheet, a.x + shake, a.y + bob + (seated ? 2 : 0), a.face < 0);
  }

  carry(a) {
    const name = a.carry.grade === 1 ? 'dish_burnt' : DISH_PX[a.carry.c.menuId];
    const bob = a.moving ? -(Math.floor(a.t * 8) % 2) : 0;
    // 머리 위가 아니라 손(쟁반) 높이, 몸 앞쪽에 들고 감
    const side = a.dir === 'left' ? -4 : a.dir === 'right' ? 4 : 0;
    if (a.dir === 'back') return; // 뒤돌아 걸을 땐 몸에 가려 안 보임
    this.spr(name, a.x + side, a.y - 9 + bob);
  }

  broom(a) {
    const s = px('broom');
    if (!s) return;
    const g = this.px;
    g.save();
    g.translate(Math.round(a.x + this.ox + 4), Math.round(a.y + this.oy - 12));
    if (Math.floor(a.sweepT * 8) % 2) g.scale(-1, 1);
    g.drawImage(s, -2, 0);
    g.restore();
  }

  drawParticles(dt) {
    const g = this.px;
    for (const p of this.particles) {
      p.life += dt;
      if (p.life < 0) continue;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const k = p.life / p.max;
      g.globalAlpha = Math.max(0, 1 - k);
      const X = Math.round(p.x + this.ox), Y = Math.round(p.y + this.oy);
      if (p.kind === 'steam') { g.fillStyle = '#f5efe6'; const z = k < 0.5 ? 1 : 2; g.fillRect(X, Y, z, z); }
      else if (p.kind === 'smoke') { g.fillStyle = '#2e2a28'; const z = 2 + Math.floor(k * 2); g.fillRect(X, Y, z, z); }
      else if (p.kind === 'dust') { g.fillStyle = '#c8b28a'; g.fillRect(X, Y, 1, 1); }
      else if (p.kind === 'spark') this.spr('sparkle', p.x, p.y);
      else if (p.kind === 'icon') this.spr(p.sprite, p.x, p.y);
      g.globalAlpha = 1;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
  }

  // 등불 아래 따뜻한 빛 + 가장자리 어둡게
  drawLight() {
    const g = this.px;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const lx of LAMPS) {
      const gr = g.createRadialGradient(lx + this.ox, 40 + this.oy, 2, lx + this.ox, 40 + this.oy, 70);
      gr.addColorStop(0, 'rgba(255,180,90,0.20)'); gr.addColorStop(1, 'rgba(255,180,90,0)');
      g.fillStyle = gr; g.fillRect(lx - 70 + this.ox, this.oy, 140, 110);
    }
    g.restore();
    const v = g.createRadialGradient(RW / 2 + this.ox, RH / 2 + this.oy, RH * 0.45, RW / 2 + this.ox, RH / 2 + this.oy, RW * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,4,0,0.35)');
    g.fillStyle = v; g.fillRect(this.ox, this.oy, RW, RH);
  }

  drawSlots() {
    const g = this.px;
    const { cols, rows } = GRID;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const c = slotCenter(x, y);
      const X = Math.round(c.x - c.cw / 2 + 2 + this.ox), Y = Math.round(c.y - c.ch / 2 + 2 + this.oy);
      const w = Math.round(c.cw - 4), h = Math.round(c.ch - 4);
      const hov = this.hoverSlot && this.hoverSlot.gx === x && this.hoverSlot.gy === y;
      const used = this.state.layout.some((l) => l.x === x && l.y === y);
      g.fillStyle = hov ? 'rgba(140,255,134,0.28)' : used ? 'rgba(255,210,63,0.10)' : 'rgba(255,255,255,0.07)';
      g.fillRect(X, Y, w, h);
      g.fillStyle = hov ? '#8cff86' : 'rgba(255,233,168,0.55)';
      for (let i = 0; i < w; i += 4) { g.fillRect(X + i, Y, 2, 1); g.fillRect(X + i, Y + h - 1, 2, 1); }
      for (let i = 0; i < h; i += 4) { g.fillRect(X, Y + i, 1, 2); g.fillRect(X + w - 1, Y + i, 1, 2); }
    }
  }

  bubble(x, y, w, h, border, fill) {
    const g = this.px;
    const X = Math.round(x - w / 2 + this.ox), Y = Math.round(y - h + this.oy);
    g.fillStyle = border; g.fillRect(X + 1, Y, w - 2, h); g.fillRect(X, Y + 1, w, h - 2);
    g.fillStyle = fill; g.fillRect(X + 1, Y + 1, w - 2, h - 2);
    g.fillStyle = border; g.fillRect(Math.round(x + this.ox) - 1, Y + h, 3, 1); g.fillRect(Math.round(x + this.ox), Y + h + 1, 1, 1);
  }

  pbar(x, y, w, ratio, color) {
    const g = this.px;
    const X = Math.round(x - w / 2 + this.ox), Y = Math.round(y + this.oy);
    g.fillStyle = OUT; g.fillRect(X - 1, Y - 1, w + 2, 4);
    g.fillStyle = '#3b2a20'; g.fillRect(X, Y, w, 2);
    g.fillStyle = color; g.fillRect(X, Y, Math.round(w * Math.max(0, Math.min(1, ratio))), 2);
  }

  // 머리 꼭대기 y (스프라이트 키에 맞춰 말풍선 위치 결정)
  headY(c) {
    const s = px(c.sheet);
    return c.y - (s ? s.height : 24) + 2;
  }

  bubbleWOf(menuId) { const s = px(DISH_PX[menuId]); return Math.max(18, (s ? s.width : 14) + 4); }

  bubbleW(c) { const s = px(DISH_PX[c.menuId]); return Math.max(18, (s ? s.width : 14) + 4); }

  drawCustomerUI(c) {
    const hy = this.headY(c);
    if (c.state === 'order') {
      const blink = Math.floor(this.clock * 3) % 2;
      this.spr(DISH_PX[c.menuId], c.x, hy - 3 - blink); // 배경 없이 음식만 통통
      const r = c.patience / c.maxPatience;
      this.pbar(c.x, hy - 19, 16, r, r < 0.3 ? '#e0533d' : r < 0.6 ? '#ffc83d' : '#6bd35f');
      if (r < 0.3) this.spr('angry', c.x + 11, hy - 10 - blink);
    } else if (c.state === 'cooking' || c.state === 'cooked') {
      this.px.globalAlpha = 0.45 + 0.3 * (Math.floor(this.clock * 4) % 2);
      this.spr(DISH_PX[c.menuId], c.x, hy - 4);
      this.px.globalAlpha = 1;
    } else if (c.state === 'eat') {
      for (let i = 0; i < c.grade; i++) this.spr('star', c.x - 9 + i * 9, hy - 2);
      this.pbar(c.x, hy - 1, 16, c.timer / EAT_TIME, '#5aa8ff');
    } else if (c.state === 'rowdy') {
      const blink = Math.floor(this.clock * 6) % 2;
      this.spr('angry', c.x, hy - 4 - blink);
      if (this.busy?.target === c) this.pbar(c.x, hy - 19, 20, 1 - this.busy.left / this.busy.total, '#ffc83d');
      else this.pbar(c.x, hy - 19, 16, c.timer / ROWDY_TIME, '#b35ae0');
    }
  }

  drawBars() {
    const ch = this.chef;
    if (ch.mode === 'sweeping') this.pbar(ch.x, ch.y - 32, 16, ch.sweepT / CHEF_SWEEP_TIME, '#6bd35f');
    if (ch.mode === 'calming') this.pbar(ch.x, ch.y - 32, 16, ch.calmT / CALM_TIME, '#ffc83d');
    const cl = this.cleaner;
    if (cl?.mode === 'sweeping') this.pbar(cl.x, cl.y - 30, 16, cl.sweepT / cl.def.work, '#6bd35f');
    const gd = this.guard;
    if (gd?.mode === 'handling' && gd.workT > 0) this.pbar(gd.x, gd.y - 30, 16, gd.workT / gd.def.work, '#5aa8ff');
  }

  // 화면 해상도 글자 레이어
  drawUI(dt) {
    const g = this.ui;
    const k = this.s * this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
    const X = (x) => (x + this.ox) * k, Y = (y) => (y + this.oy) * k;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (this.mode === 'visit') {
      for (const c of this.customers) if (c.visitor && c.state !== 'leave') this.tag(g, X(c.x), Y(this.headY(c) - (['enter', 'leave'].includes(c.state) ? 6 : c.state === 'ate' ? 4 : 22)), `${c.visitorName} (나)`, '#2f7a2c');
    }
    if (this.mode === 'business') {
      const bob = Math.floor(this.clock * 3) % 2 ? -2 * this.dpr : 0;
      // 직원이 없으면 아이들이 뭘 눌러야 하는지 바로 보이게
      for (const t of this.seats) {
        if (!t.trash) continue;
        if (this.cleaner) continue;
        if (!t.reserved) this.tag(g, X(t.trashPos.x), Y(t.trashPos.y - 22) + bob, '🧹 눌러서 청소!', '#c0392b');
      }
      // 주문 대기 손님: 머리 위 음식을 누르라는 안내 (처음 며칠, 또는 오래 기다리는 손님)
      for (const c of this.customers) {
        if (c.state !== 'order') continue;
        this.tag(g, X(c.x), Y(this.headY(c) - 30) + bob, '👆 클릭하세요!', '#2f7a2c');
      }
      for (const c of this.customers) {
        if (c.state !== 'rowdy' || this.busy?.target === c) continue;
        if (c.handledBy) continue;
        this.tag(g, X(c.x), Y(this.headY(c) - 30) + bob, '😡 눌러서 진정!', '#8e24aa');
      }
      for (const c of this.customers) if (c.state === 'rowdy' && this.busy?.target === c) this.tag(g, X(c.x), Y(c.y - 50), '진정시키는 중…', '#5a3a22');
    }
    for (const f of this.floats) {
      f.life += dt;
      if (f.life < 0) continue;
      g.globalAlpha = Math.max(0, 1 - f.life / f.max);
      const size = Math.round((f.big ? 17 : 13) * this.dpr * Math.max(1, this.s / 3));
      g.font = `bold ${size}px Galmuri11, sans-serif`;
      const x = X(f.x), y = Y(f.y - f.life * 12);
      if (f.icon) {
        const ic = px(f.icon);
        const tw = g.measureText(f.text).width;
        if (ic) { g.imageSmoothingEnabled = false; g.drawImage(ic, x - tw / 2 - ic.width * k - 2, y - (ic.height * k) / 2, ic.width * k, ic.height * k); }
      }
      g.lineWidth = Math.max(3, size / 4); g.strokeStyle = '#1a0f0a';
      g.strokeText(f.text, x, y);
      g.fillStyle = f.color; g.fillText(f.text, x, y);
      g.globalAlpha = 1;
    }
    this.floats = this.floats.filter((f) => f.life < f.max);
  }

  tag(g, x, y, text, bg) {
    const size = Math.round(14 * this.dpr * Math.max(1, this.s / 3));
    g.font = `bold ${size}px Galmuri11, sans-serif`;
    const w = g.measureText(text).width + 10 * this.dpr;
    g.fillStyle = bg; g.fillRect(x - w / 2, y - size * 0.75, w, size * 1.5);
    g.fillStyle = '#fff'; g.fillText(text, x, y);
  }

  // ---------- 마감 ----------
  closeEarly() { if (this.mode === 'business' && !this.ended && !this.paused) this.time = DAY_LENGTH; }

  endDay() {
    if (this.ended) return;
    for (const c of this.customers.slice()) if (c.state === 'cooked') this.serve(c, c.grade);
    this.chef.carry = null;
    if (this.chef.walkSpeed) this.chef.speed = this.chef.walkSpeed;
    if (this.server) this.server.carry = null;
    this.pass = [];
    for (const c of this.customers.slice()) {
      if (c.state === 'eat') this.pay(c);
      else if (c.menuId && ['enter', 'order'].includes(c.state)) consume(this.state, c.menuId, +1);
    }
    this.ended = true;
    this.pushHud(true);
    this.hooks.onEnd(this.stats);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.uiCanvas.removeEventListener('pointerdown', this.onPointer);
    this.uiCanvas.removeEventListener('pointermove', this.onMove);
  }
}

export { anyCookable };
