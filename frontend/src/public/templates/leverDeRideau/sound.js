// Petits sons synthétisés (Web Audio, aucun fichier), joués UNIQUEMENT après un geste de l'invité : les coups frappés sur les planches,
// la corde, le rideau qui monte et les applaudissements. Discrets, et sans effet si le navigateur ou l'appareil ne les permet pas.
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

function tone(a, t, freq, gain, dur, attack = 0.02, type = 'sine', end = freq) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (end !== freq) o.frequency.exponentialRampToValueAtTime(end, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
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

/** Un coup de brigadier sur les planches (le troisième résonne davantage). */
export function playKnock(n = 1) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const last = n >= 3;
  tone(a, t, 130, last ? 0.5 : 0.36, last ? 0.9 : 0.4, 0.004, 'sine', 52);
  tone(a, t, 245, 0.12, 0.16, 0.003, 'triangle', 150);
  noise(a, t, 0.09, 'lowpass', 1400, 300, 0.22, 0.05);
  noise(a, t + 0.11, 0.35, 'lowpass', 420, 160, last ? 0.07 : 0.04, 0.1);
}

/** La corde qui file dans sa poulie. */
export function playCord() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  noise(a, t, 0.5, 'bandpass', 700, 1500, 0.07, 0.3);
  tone(a, t + 0.05, 310, 0.025, 0.4, 0.05, 'sawtooth', 190);
}

/** Le rideau monte : souffle d'étoffe, roulement et accord. */
export function playRise() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  noise(a, t, 3.2, 'lowpass', 260, 1100, 0.14, 0.4);
  for (let i = 0; i < 16; i += 1) tone(a, t + i * 0.085, 74, 0.03 + i * 0.006, 0.2, 0.004, 'sine', 60);
  [[261.6, 0], [329.6, 0.12], [392, 0.24], [523.3, 0.36]].forEach(([f, d]) => tone(a, t + 1.45 + d, f, 0.06, 2.4, 0.08, 'triangle'));
}

/** Les applaudissements, quand les noms apparaissent. */
export function playApplause() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  for (let i = 0; i < 150; i += 1) {
    const at = Math.random() * 2.8;
    const swell = Math.sin(Math.PI * Math.min(1, (at + 0.25) / 3.1));
    noise(a, t + at, 0.035 + Math.random() * 0.03, 'bandpass', 900 + Math.random() * 1900, 900, 0.012 + 0.045 * swell * Math.random(), 0.1);
  }
}
