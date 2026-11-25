// Petits sons synthétisés (Web Audio, aucun fichier) joués UNIQUEMENT après un geste de l'invité : verrou, gonds, froissement du papier, carillon.
// Discrets, et sans effet si le navigateur ou l'appareil ne les permet pas.
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

function noise(a, dur) {
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  return src;
}

function thump(a, t, f0, f1, gain, dur) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Trois coups frappés à la porte. */
export function playKnock() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  [0, 0.2, 0.42].forEach((d) => thump(a, t + d, 190, 70, 0.5, 0.16));
}

/** Verrou qui cède puis gonds qui grincent doucement. */
export function playDoor() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  thump(a, t, 160, 50, 0.45, 0.2);
  thump(a, t + 0.06, 2400, 900, 0.06, 0.05);
  const o = a.createOscillator();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(70, t + 0.25);
  o.frequency.linearRampToValueAtTime(118, t + 1.5);
  o.frequency.linearRampToValueAtTime(96, t + 2.2);
  f.type = 'bandpass';
  f.frequency.value = 520;
  f.Q.value = 6;
  g.gain.setValueAtTime(0.0001, t + 0.25);
  g.gain.linearRampToValueAtTime(0.05, t + 0.9);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t + 0.25);
  o.stop(t + 2.4);
}

/** Cachet qui se brise, papier qui se déplie, puis un carillon clair. */
export function playSeal() {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  thump(a, t, 900, 300, 0.12, 0.08);
  const n = noise(a, 0.7);
  const hp = a.createBiquadFilter();
  const g = a.createGain();
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  g.gain.setValueAtTime(0.0001, t + 0.15);
  g.gain.linearRampToValueAtTime(0.07, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  n.connect(hp).connect(g).connect(a.destination);
  n.start(t + 0.15);
  [[784, 0.5], [1175, 0.62], [1568, 0.74]].forEach(([f, d]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    og.gain.setValueAtTime(0.0001, t + d);
    og.gain.linearRampToValueAtTime(0.07, t + d + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.6);
    o.connect(og).connect(a.destination);
    o.start(t + d);
    o.stop(t + d + 1.7);
  });
}

/** Sonnette d'entrée « ding-dong » (deux notes, harmoniques de cloche). Renvoie true si le son part tout de suite ; sinon (navigateur qui
 *  bloque le son avant un premier geste) il partira dès que l'appareil le permet, sans bloquer quoi que ce soit. */
export function playBell() {
  const a = ac();
  if (!a) return false;
  const ring = () => {
    const t = a.currentTime + 0.02;
    [[659.25, 0], [523.25, 0.85]].forEach(([f, d]) => {
      [[1, 0.2], [2.01, 0.07], [2.76, 0.06], [5.4, 0.025]].forEach(([m, v]) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'sine';
        o.frequency.value = f * m;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(v, t + d + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + (m === 1 ? 2.3 : 1.2));
        o.connect(g).connect(a.destination);
        o.start(t + d);
        o.stop(t + d + 2.4);
      });
    });
  };
  if (a.state === 'running') { ring(); return true; }
  a.resume().then(() => { if (a.state === 'running') ring(); }).catch(() => {});
  return false;
}
