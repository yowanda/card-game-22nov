// sound.js — tiny synthesized effects with WebAudio. No audio files, no network.
let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function audio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, when = 0) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  deal() {
    tone(520, 0.08, "triangle", 0.12);
    tone(780, 0.06, "triangle", 0.08, 0.06);
  },
  play() {
    tone(330, 0.1, "sine", 0.14);
    tone(495, 0.12, "sine", 0.1, 0.07);
  },
  hit() {
    tone(160, 0.14, "sawtooth", 0.12);
    tone(90, 0.18, "square", 0.08, 0.03);
  },
  heal() {
    tone(660, 0.12, "sine", 0.1);
    tone(880, 0.16, "sine", 0.09, 0.09);
  },
  turn() {
    tone(440, 0.09, "triangle", 0.1);
    tone(587, 0.09, "triangle", 0.1, 0.08);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.13, i * 0.13));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "sine", 0.11, i * 0.16));
  },
  click() {
    tone(700, 0.04, "triangle", 0.06);
  },
};
