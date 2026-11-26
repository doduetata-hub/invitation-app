// Petits sons synthétisés (Web Audio, aucun fichier), joués UNIQUEMENT après un geste de l'invité : doigt sur la vitre, gouttes, oiseaux
// du matin, bruissement des feuilles. Discrets, et sans effet si le navigateur ou l'appareil ne les permet pas.
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

function tone(a, t, from, to, gain, dur) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.015, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Une goutte d'eau. */
export function playDrop() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const f = 620 + Math.random() * 520;
  tone(a, t, f, f * 2.1, 0.05, 0.11);
}

/** Chants d'oiseaux du matin, lorsque la serre apparaît. */
export function playBirds() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + 0.1;
  [[0, 2600, 3900], [0.14, 3100, 4300], [0.28, 2800, 3500], [0.9, 3600, 2500], [1.02, 3900, 2900], [1.7, 2400, 3700], [1.81, 2900, 4100], [1.92, 3300, 4500]]
    .forEach(([d, f0, f1]) => tone(a, t + d, f0, f1, 0.028, 0.1));
}

/** Les feuilles s'écartent : un souffle doux. */
export function playLeaves() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const dur = 1.5;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i / 900));
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  const g = a.createGain();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(1400, t);
  f.frequency.linearRampToValueAtTime(3400, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}
