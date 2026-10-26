// Square-wave blips made on the spot with Web Audio; nothing to download.
// Sound starts off and only plays after the visitor turns it on.

let ctx = null;
let on = false;
try {
  on = localStorage.getItem('sfx') === 'on';
} catch {
  // Storage can be blocked; sound just stays off.
}

const NOTES = {
  click: [[660, 0.05]],
  coin: [[988, 0.07], [1319, 0.22]],
  jump: [[330, 0.05], [440, 0.05], [587, 0.08]],
  bump: [[196, 0.06], [262, 0.08]],
  warp: [[523, 0.05], [659, 0.05], [784, 0.05], [1047, 0.1]],
  win: [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.3], [784, 0.1], [1047, 0.4]],
};

export function sfxOn() {
  return on;
}

export function setSfx(next) {
  on = next;
  try {
    localStorage.setItem('sfx', next ? 'on' : 'off');
  } catch {
    // Not remembered, which is fine.
  }
  if (on) play('coin');
}

export function play(name) {
  if (!on) return;
  ctx ??= new AudioContext();
  let t = ctx.currentTime;
  for (const [freq, dur] of NOTES[name]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.setValueAtTime(0, t + dur * 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  }
}
