// WebAudio 효과음 + BGM (파일 없이 합성)
let ctx = null;
let enabled = true;
let master = null;

const SOUNDS = {
  tap:     [[660, 0.04]],
  correct: [[784, 0.08], [1047, 0.12]],
  wrong:   [[220, 0.15, 'sawtooth']],
  coin:    [[988, 0.06], [1319, 0.12]],
  perfect: [[784, 0.07], [988, 0.07], [1319, 0.18]],
  bad:     [[330, 0.1, 'square'], [247, 0.16, 'square']],
  clean:   [[523, 0.05], [659, 0.06]],
  rowdy:   [[180, 0.12, 'square'], [160, 0.12, 'square']],
  bell:    [[1047, 0.1], [784, 0.1], [1047, 0.2]],
};

function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, t, dur, type = 'triangle', vol = 0.12, dest = master) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// 영수증 프린터 "지지직-" + 계산대 "띵!"
function receipt() {
  const t0 = ctx.currentTime;
  const len = 0.55;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const tt = i / ctx.sampleRate;
    const tick = Math.sin(tt * 2 * Math.PI * 34) > 0.2 ? 1 : 0.25; // 줄 단위로 끊기는 인쇄음
    d[i] = (Math.random() * 2 - 1) * tick * 0.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.18, t0 + 0.03);
  g.gain.setValueAtTime(0.18, t0 + len - 0.08);
  g.gain.linearRampToValueAtTime(0.0001, t0 + len);
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
  // 종이 찢는 소리
  tone(1800, t0 + len + 0.02, 0.05, 'square', 0.03);
  // 계산대 벨 + 동전
  tone(2093, t0 + len + 0.08, 0.5, 'sine', 0.12);
  tone(2637, t0 + len + 0.08, 0.35, 'sine', 0.06);
  tone(1319, t0 + len + 0.2, 0.12, 'triangle', 0.08);
}

// ---------- BGM ----------
// 음표: [반음(0=C4), 박자] / null = 쉼표
const N = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const hz = (semi) => 261.63 * Math.pow(2, semi / 12);
const TRACKS = {
  prep: { // 느긋한 분식집 준비 시간
    bpm: 92,
    lead: [['E', 1], ['G', 1], ['A', 2], ['G', 1], ['E', 1], ['D', 2], ['C', 1], ['D', 1], ['E', 1], ['G', 1], ['E', 4],
      ['A', 1], ['C+', 1], ['D+', 2], ['C+', 1], ['A', 1], ['G', 2], ['E', 1], ['G', 1], ['D', 1], ['E', 1], ['C', 4]],
    bass: ['C', 'C', 'A-', 'A-', 'F-', 'F-', 'G-', 'G-'],
  },
  biz: { // 바쁜 영업 시간
    bpm: 128,
    lead: [['C+', 0.5], ['A', 0.5], ['G', 1], ['E', 0.5], ['G', 0.5], ['A', 1], ['G', 0.5], ['E', 0.5], ['D', 0.5], ['E', 0.5], ['G', 2],
      ['A', 0.5], ['C+', 0.5], ['D+', 1], ['C+', 0.5], ['A', 0.5], ['G', 1], ['E', 0.5], ['D', 0.5], ['C', 0.5], ['D', 0.5], ['C', 2]],
    bass: ['C', 'A-', 'F-', 'G-', 'C', 'A-', 'F-', 'G-'],
  },
};
const semi = (n) => {
  const base = N[n[0]];
  return n.endsWith('+') ? base + 12 : n.endsWith('-') ? base - 12 : base;
};

let bgmName = null;
let bgmTimer = null;
let bgmGain = null;
let nextAt = 0;
let step = 0;

function schedule() {
  const tr = TRACKS[bgmName];
  if (!tr || !enabled) return;
  const beat = 60 / tr.bpm;
  const ahead = ctx.currentTime + 0.6;
  const total = tr.lead.reduce((s, [, b]) => s + b, 0);
  while (nextAt < ahead) {
    // 한 마디(4박) 단위로 예약
    const barStart = nextAt;
    let t = barStart;
    let pos = 0;
    // 멜로디 중 이번 마디에 해당하는 음 찾기
    const barIdx = step % (total / 4);
    let acc = 0;
    for (const [n, b] of tr.lead) {
      if (acc >= barIdx * 4 && acc < barIdx * 4 + 4) {
        tone(hz(semi(n)), barStart + (acc - barIdx * 4) * beat, b * beat * 0.9, 'square', 0.035, bgmGain);
      }
      acc += b;
    }
    // 베이스 (마디 첫 박 + 셋째 박)
    const bn = tr.bass[barIdx % tr.bass.length];
    tone(hz(semi(bn) - 12), t, beat * 1.6, 'triangle', 0.09, bgmGain);
    tone(hz(semi(bn) - 5), t + beat * 2, beat * 1.4, 'triangle', 0.06, bgmGain);
    // 가벼운 리듬 (짧은 잡음 대신 고음 틱)
    for (let k = 0; k < 4; k++) tone(k % 2 ? 1568 : 1046, t + k * beat, 0.03, 'square', bgmName === 'biz' ? 0.012 : 0.006, bgmGain);
    pos += 4;
    nextAt = barStart + 4 * beat;
    step++;
  }
}

export const sfx = {
  setEnabled(v) {
    enabled = v;
    if (!v) this.stopBgm(); else if (bgmName) this.bgm(bgmName, true);
  },
  get enabled() { return enabled; },
  play(name) {
    if (!enabled) return;
    try {
      audio();
      if (name === 'receipt') { receipt(); return; }
      let t = ctx.currentTime;
      for (const [freq, dur, type = 'triangle'] of SOUNDS[name] || []) {
        tone(freq, t, dur, type, 0.12);
        t += dur * 0.9;
      }
    } catch (e) { /* 오디오 미지원 */ }
  },
  /** BGM 전환: 'prep' | 'biz' | null */
  bgm(name, force = false) {
    if (!force && name === bgmName && bgmTimer) return;
    bgmName = name;
    clearInterval(bgmTimer); bgmTimer = null;
    if (!name || !enabled) return;
    try {
      audio();
      if (bgmGain) { const old = bgmGain; old.gain.setTargetAtTime(0, ctx.currentTime, 0.2); setTimeout(() => old.disconnect(), 1500); }
      bgmGain = ctx.createGain();
      bgmGain.gain.value = 0.9;
      bgmGain.connect(master);
      nextAt = ctx.currentTime + 0.1;
      step = 0;
      schedule();
      bgmTimer = setInterval(schedule, 200);
    } catch (e) { /* 오디오 미지원 */ }
  },
  stopBgm() {
    clearInterval(bgmTimer); bgmTimer = null;
    if (bgmGain && ctx) { const old = bgmGain; old.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(() => old.disconnect(), 1000); bgmGain = null; }
  },
};
