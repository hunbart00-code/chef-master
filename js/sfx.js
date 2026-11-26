// 아주 작은 WebAudio 효과음 (파일 없이 합성)
let ctx = null;
let enabled = true;

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

export const sfx = {
  setEnabled(v) { enabled = v; },
  get enabled() { return enabled; },
  play(name) {
    if (!enabled) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      let t = ctx.currentTime;
      for (const [freq, dur, type = 'triangle'] of SOUNDS[name] || []) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + dur);
        t += dur * 0.9;
      }
    } catch (e) { /* 오디오 미지원 */ }
  },
};
