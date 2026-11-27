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
  kick:    [[120, 0.08, 'square'], [80, 0.12, 'square'], [880, 0.06], [1320, 0.1]],
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

// ---------- BGM: 중세 주점 밴드 (리코더·피들·류트·프레임 드럼·탬버린, 6/8 지그) ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midi = (n) => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const mhz = (m) => 440 * Math.pow(2, (m - 69) / 12);
// 'F#5 E5 D5 | A4:2 D5' → 마디별 [[음, 8분음표 수]]  ('-' = 쉼표)
const bars = (str) => str.trim().split('|').map((bar) => bar.trim().split(/\s+/).map((tok) => { const [n, l] = tok.split(':'); return [n, Number(l || 1)]; }));
// 화음 → 류트가 뜯는 음 (근음, 3음, 5음)
const CHORD = { G: ['G2', 'B3', 'D4', 'G4'], C: ['C3', 'E4', 'G4', 'C5'], D: ['D3', 'F#4', 'A4', 'D5'], A: ['A2', 'C#4', 'E4', 'A4'], Em: ['E2', 'G3', 'B3', 'E4'], Bm: ['B2', 'D4', 'F#4', 'B4'] };

const TRACKS = {
  prep: { // 개점 준비: 따뜻하고 희망찬 주점 노래 (G장조)
    tempo: 72, lead: 'flute', drone: null, tamb: false,
    melody: bars(`D5:2 B4 G4:2 B4 | C5:2 E5 G5:2 E5 | D5:3 B4:2 G4 | A4:3 A4:2 D5 | B4:2 D5 G5:2 F#5 | E5:2 G5 B5:2 A5 | G5 F#5 E5 D5 E5 F#5 | G5:3 G5:2 -
      | B5:2 A5 G5:2 E5 | E5:2 G5 C6:2 B5 | B5:2 A5 G5:2 D5 | E5 F#5 G5 A5:3 | B5:2 G5 D5:2 G5 | E5:2 C5 G5:2 E5 | D5 E5 F#5 A5 G5 F#5 | G5:3 G5:3`),
    chords: ['G', 'C', 'G', 'D', 'G', 'Em', 'D', 'G', 'Em', 'C', 'G', 'D', 'G', 'C', 'D', 'G'],
  },
  biz: { // 영업 중: 신나는 모험 지그 (D장조)
    tempo: 104, lead: 'fiddle', drone: ['D3', 'A3'], tamb: true,
    melody: bars(`F#5 E5 D5 A4:2 D5 | F#5:2 A5 F#5 E5 D5 | G5:2 B5 A5:2 F#5 | E5 F#5 E5 D5 B4 A4 | F#5 E5 D5 A4:2 D5 | F#5:2 A5 B5 A5 F#5 | G5 F#5 E5 F#5 E5 C#5 | D5:3 D5:2 -
      | A5:2 A5 B5 A5 F#5 | A5:2 D6 A5 F#5 D5 | G5:2 G5 B5 G5 E5 | F#5 G5 A5 E5:2 A4 | A5:2 A5 B5 A5 F#5 | D6:2 C#6 B5 A5 G5 | F#5 A5 F#5 E5 D5 C#5 | D5:3 D5:3`),
    chords: ['D', 'D', 'G', 'A', 'D', 'D', 'A', 'D', 'D', 'D', 'G', 'A', 'D', 'G', 'A', 'D'],
  },
};

let bgmName = null;
let bgmTimer = null;
let bgmGain = null;
let nextAt = 0;
let step = 0;
let reverb = null;
let noiseBuf = null;
let droneNodes = [];

function makeReverb() {
  const len = ctx.sampleRate * 1.6, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  const conv = ctx.createConvolver(); conv.buffer = buf;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  conv.connect(wet).connect(master);
  return conv;
}
function noise() {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
}
// 소리 → 건조음 + 울림
function out(node, send = 0.5) {
  node.connect(bgmGain);
  if (reverb) { const g = ctx.createGain(); g.gain.value = send; node.connect(g).connect(reverb); }
}
function vibrato(osc, t, rate, cents) {
  const l = ctx.createOscillator(), g = ctx.createGain();
  l.frequency.value = rate; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cents, t + 0.25);
  l.connect(g).connect(osc.detune); l.start(t); return l;
}
// 류트: 뜯는 소리
function lute(freq, t, vol) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = freq; o2.type = 'triangle'; o2.frequency.value = freq * 2;
  f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.35); f.Q.value = 2;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
  const g2 = ctx.createGain(); g2.gain.value = 0.3; o2.connect(g2).connect(f);
  o.connect(f).connect(g); out(g, 0.45);
  o.start(t); o2.start(t); o.stop(t + 1); o2.stop(t + 1);
}
// 리코더(플루트): 부드러운 관악
function flute(freq, t, dur, vol) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = 'sine'; o.frequency.value = freq; o2.type = 'triangle'; o2.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.value = 3000;
  const l = vibrato(o, t, 5.2, 10); vibrato(o2, t, 5.2, 10);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.06, dur - 0.08)); g.gain.linearRampToValueAtTime(0, t + dur);
  const m = ctx.createGain(); m.gain.value = 0.5; o2.connect(m).connect(f); o.connect(f).connect(g); out(g, 0.6);
  // 숨소리
  const n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
  nf.type = 'bandpass'; nf.frequency.value = freq * 2; nf.Q.value = 3; ng.gain.setValueAtTime(vol * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
  n.connect(nf).connect(ng); out(ng, 0.2); n.start(t); n.stop(t + 0.1);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
}
// 피들: 활로 켜는 현악
function fiddle(freq, t, dur, vol) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = freq; o2.type = 'sawtooth'; o2.frequency.value = freq; o2.detune.value = 7;
  f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 1.5;
  vibrato(o, t, 6, 12); vibrato(o2, t, 6, 12);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.linearRampToValueAtTime(vol * 0.75, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(f); o2.connect(f); f.connect(g); out(g, 0.55);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
// 프레임 드럼(보드란)
function drum(t, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.14);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.32);
  o.connect(g); out(g, 0.3); o.start(t); o.stop(t + 0.35);
  const n = noise(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
  f.type = 'lowpass'; f.frequency.value = 900; ng.gain.setValueAtTime(vol * 0.35, t); ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.06);
  n.connect(f).connect(ng); out(ng, 0.2); n.start(t); n.stop(t + 0.08);
}
// 탬버린 방울
function tamb(t, vol) {
  const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'highpass'; f.frequency.value = 7000;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
  n.connect(f).connect(g); out(g, 0.25); n.start(t); n.stop(t + 0.12);
}
// 백파이프 같은 낮은 지속음 (영업 중)
function startDrone(notes) {
  stopDrone();
  if (!notes) return;
  const t = ctx.currentTime;
  for (const n of notes) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = mhz(midi(n)); f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 1.5);
    o.connect(f).connect(g); out(g, 0.4); o.start(t);
    droneNodes.push([o, g]);
  }
}
function stopDrone() {
  if (!ctx) return;
  for (const [o, g] of droneNodes) { g.gain.setTargetAtTime(0, ctx.currentTime, 0.2); o.stop(ctx.currentTime + 1.2); }
  droneNodes = [];
}

function schedule() {
  const tr = TRACKS[bgmName];
  if (!tr || !enabled || !bgmGain) return;
  const e8 = 60 / tr.tempo / 3;          // 8분음표 길이 (점4분음표 = tempo)
  const ahead = ctx.currentTime + 0.8;
  while (nextAt < ahead) {
    const bi = step % tr.melody.length, t0 = nextAt;
    // 멜로디
    let pos = 0;
    for (const [n, len] of tr.melody[bi]) {
      if (n !== '-') {
        const f = mhz(midi(n)), t = t0 + pos * e8, d = len * e8 * 0.92;
        if (tr.lead === 'fiddle') fiddle(f, t, d, 0.09); else flute(f, t, d, 0.11);
      }
      pos += len;
    }
    // 류트 반주: 쿵-짝-짝 쿵-짝-짝
    const c = CHORD[tr.chords[bi % tr.chords.length]].map((n) => mhz(midi(n)));
    const pat = [0, 1, 2, 0, 2, 3];
    pat.forEach((k, i) => lute(i === 3 ? c[0] * 1.5 : c[k], t0 + i * e8, i % 3 === 0 ? 0.11 : 0.07));
    // 타악기
    drum(t0, tr.tamb ? 0.5 : 0.32); drum(t0 + 3 * e8, tr.tamb ? 0.38 : 0.22);
    if (tr.tamb) { [1, 2, 4, 5].forEach((i) => tamb(t0 + i * e8, i === 2 || i === 5 ? 0.06 : 0.035)); if (bi % 2) drum(t0 + 5 * e8, 0.18); }
    nextAt = t0 + 6 * e8;
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
      bgmGain.gain.value = 0.55;
      bgmGain.connect(master);
      if (!reverb) reverb = makeReverb();
      startDrone(TRACKS[name]?.drone);
      nextAt = ctx.currentTime + 0.15;
      step = 0;
      schedule();
      bgmTimer = setInterval(schedule, 200);
    } catch (e) { /* 오디오 미지원 */ }
  },
  stopBgm() {
    clearInterval(bgmTimer); bgmTimer = null;
    stopDrone();
    if (bgmGain && ctx) { const old = bgmGain; old.gain.setTargetAtTime(0, ctx.currentTime, 0.15); setTimeout(() => old.disconnect(), 1000); bgmGain = null; }
  },
};
