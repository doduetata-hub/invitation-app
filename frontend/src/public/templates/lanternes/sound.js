// Petits sons synthétisés (Web Audio, aucun fichier), joués UNIQUEMENT après un geste de l'invité : la flamme qui prend, la lanterne qui
// s'élève, les carillons du ciel. Discrets, et sans effet si le navigateur ou l'appareil ne les permet pas.
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

function tone(a, t, freq, gain, dur, attack = 0.02) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(a, t, dur, type, from, to, gain, peak = 0.3, crackle = false) {
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (crackle && Math.random() > 0.985 ? 3 : crackle ? 0.35 : 1);
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

/** Frottement de l'allumette, tant que l'invité maintient son doigt (appelé au début de l'appui). */
export function playStrike() {
  const a = ac();
  if (!a) return;
  noise(a, a.currentTime, 0.25, 'bandpass', 3200, 1800, 0.05, 0.15, true);
}

/** La flamme prend. */
export function playIgnite() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  noise(a, t, 1.1, 'lowpass', 500, 1600, 0.16, 0.18);
  noise(a, t + 0.1, 1.4, 'highpass', 2500, 3500, 0.035, 0.2, true);
  tone(a, t + 0.05, 392, 0.05, 1.4, 0.3);
}

/** La lanterne s'élève : accord qui monte. */
export function playRise() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  noise(a, t, 2.2, 'bandpass', 400, 1500, 0.05, 0.5);
  [[392, 0], [494, 0.35], [587, 0.7], [784, 1.1]].forEach(([f, d]) => tone(a, t + d, f, 0.06, 2.2, 0.25));
}

/** Carillons du ciel, quand les noms apparaissent. */
export function playChimes() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  [[1568, 0], [1976, 0.18], [2349, 0.42], [1760, 0.75], [2637, 1.05]].forEach(([f, d]) => tone(a, t + d, f, 0.035, 1.8, 0.01));
}
