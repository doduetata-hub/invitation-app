// Petits sons synthétisés (Web Audio, aucun fichier), joués UNIQUEMENT après un geste de l'invité : cran du volet, signal de cabine,
// billet qui se pose, poussée au décollage. Discrets, et sans effet si le navigateur ou l'appareil ne les permet pas.
let ctx = null;

function ac() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(a, t, freq, gain, dur) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(a, t, dur, type, from, to, gain, peak = 0.3) {
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + dur * peak);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

/** Un cran du volet qui coulisse. */
export function playNotch() {
  const a = ac();
  if (!a) return;
  noise(a, a.currentTime, 0.05, 'bandpass', 2600, 1800, 0.05, 0.1);
}

/** Signal de cabine « ding… dong ». */
export function playChime() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + 0.12;
  [[880, 0], [698.46, 0.55]].forEach(([f, d]) => {
    tone(a, t + d, f, 0.13, 1.5);
    tone(a, t + d, f * 2.01, 0.025, 0.8);
  });
}

/** La carte d'embarquement se pose. */
export function playPaper() {
  const a = ac();
  if (!a) return;
  noise(a, a.currentTime + 0.75, 0.35, 'highpass', 2400, 4200, 0.05, 0.25);
}

/** Poussée des réacteurs. */
export function playTakeoff() {
  const a = ac();
  if (!a) return;
  noise(a, a.currentTime, 2.4, 'lowpass', 180, 1400, 0.16, 0.6);
}
