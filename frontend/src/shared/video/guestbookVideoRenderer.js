import { findActiveScene, VIDEO_TYPING_WPS, ENTRY_LEAD_S } from './guestbookVideoTimeline';
import { getTyping } from '../utils/guestbookTyping';

// Le rendu image par image de la vidéo souvenir reprend la mise en page de l'écran de la salle
// (GuestbookDisplayPage) : titre en écriture manuscrite, cœur entre deux filets, avatar rond à anneau
// doré, message qui s'écrit mot à mot, photo des mariés fondue à droite, branches dorées, lumières
// floues, pied de page « Merci d'être ici », puis la page de clôture « Merci » — les mêmes que le PDF.
// Toutes les mesures sont des multiples de l'« unité » u = 1 % de la largeur de l'image (comme l'écran :
// --u), donc la composition est identique quelle que soit la résolution.
export const COLORS = { GOLD: '#B8873F', GOLD_LIGHT: '#D6B56D', GOLD_BRIGHT: '#F2D28C', RING: '#D9AE62', IVORY: '#F7F1E5', INK: '#0A0908' };

const SCRIPT = 'Great Vibes';
const SERIF = 'Libre Baskerville';
const CORMORANT = 'Cormorant Garamond';

// Charge les polices utilisées par le dessin AVANT le premier rendu : une police web n'est téléchargée que
// lorsqu'un texte la demande, et un canvas ne l'attend pas (il dessinerait la police de repli).
export async function ensureVideoFonts() {
  const specs = [`400 40px "${SCRIPT}"`, `400 20px "${SERIF}"`, `700 20px "${SERIF}"`, `italic 400 20px "${SERIF}"`, `600 20px "${CORMORANT}"`, `italic 500 20px "${CORMORANT}"`];
  await Promise.all(specs.map((spec) => document.fonts.load(spec, 'Livre d’Or Aé').catch(() => {})));
  await document.fonts.ready;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - clamp01(t)) ** 3;
// Progression 0 -> 1 d'une animation qui démarre à `delayS` et dure `durationS`.
const progress = (localTime, delayS, durationS = 0.8) => clamp01((localTime - delayS) / durationS);

function font(ctx, { style = '', weight = 400, size, family }) {
  ctx.font = `${style} ${weight} ${Math.round(size)}px "${family}"`.trim();
}

// `ctx.letterSpacing` (Chrome/Edge récents) n'est pas garanti partout : simple confort visuel, jamais
// bloquant si absent.
function letterSpacing(ctx, px) {
  try {
    ctx.letterSpacing = `${px}px`;
  } catch {
    // ignoré
  }
}

function textDirection(ctx, rtl) {
  try {
    ctx.direction = rtl ? 'rtl' : 'ltr';
  } catch {
    // ignoré
  }
}

// Texte écrit de droite à gauche d'après sa première lettre (même règle que l'écran, voir isRtlText).
const RTL_FIRST_LETTER = /^[^\p{L}]*[֐-ࣿיִ-﷿ﹰ-﻿]/u;
const isRtl = (text) => RTL_FIRST_LETTER.test(text || '');

function mixColor(a, b, t) {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

// ---------------------------------------------------------------- décor
const HEART = new Path2D('M12 21s-7.5-4.6-9.5-9.2C1 8 3.2 5 6.2 5c1.9 0 3.4 1 5.8 3.3C14.4 6 15.9 5 17.8 5c3 0 5.2 3 3.7 6.8C19.5 16.4 12 21 12 21z');

function drawHeart(ctx, cx, cy, size) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.shadowColor = 'rgba(226,172,84,0.55)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#E9C26C';
  ctx.fill(HEART);
  ctx.restore();
}

// Filet doré qui s'estompe vers l'extérieur, cœur au centre.
function drawDivider(ctx, cx, y, lineW, heartSize) {
  const gap = heartSize * 0.9;
  const left = ctx.createLinearGradient(cx - gap - lineW, 0, cx - gap, 0);
  left.addColorStop(0, 'rgba(217,174,98,0)');
  left.addColorStop(1, 'rgba(217,174,98,1)');
  const right = ctx.createLinearGradient(cx + gap, 0, cx + gap + lineW, 0);
  right.addColorStop(0, 'rgba(217,174,98,1)');
  right.addColorStop(1, 'rgba(217,174,98,0)');
  ctx.save();
  ctx.lineWidth = Math.max(1, heartSize * 0.07);
  ctx.strokeStyle = left;
  ctx.beginPath();
  ctx.moveTo(cx - gap - lineW, y);
  ctx.lineTo(cx - gap, y);
  ctx.stroke();
  ctx.strokeStyle = right;
  ctx.beginPath();
  ctx.moveTo(cx + gap, y);
  ctx.lineTo(cx + gap + lineW, y);
  ctx.stroke();
  ctx.restore();
  drawHeart(ctx, cx, y, heartSize);
}

// Branche dorée : tige courbe et feuilles en amande alternées, de plus en plus petites vers la pointe (même
// dessin que GoldBranch à l'écran, boîte de 120 x 160).
const BRANCH_STEM = { p0: [30, 158], p1: [38, 110], p2: [52, 70], p3: [84, 12] };
function bezierPoint(t) {
  const { p0, p1, p2, p3 } = BRANCH_STEM;
  const mt = 1 - t;
  const at = (k) => mt ** 3 * p0[k] + 3 * mt * mt * t * p1[k] + 3 * mt * t * t * p2[k] + t ** 3 * p3[k];
  const d = (k) => 3 * mt * mt * (p1[k] - p0[k]) + 6 * mt * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]);
  return { x: at(0), y: at(1), angle: Math.atan2(d(1), d(0)) };
}
const BRANCH_LEAVES = Array.from({ length: 9 }, (_, i) => {
  const t = 0.1 + (i / 8) * 0.9;
  const { x, y, angle } = bezierPoint(t);
  return { x, y, rotate: angle + (i % 2 === 0 ? -1 : 1) * 52 * (Math.PI / 180), scale: 1.05 - t * 0.5 };
});
const LEAF = new Path2D('M0 0 C 8 -13 24 -13 33 0 C 24 13 8 13 0 0 Z');
const STEM = new Path2D('M30 158 C 38 110, 52 70, 84 12');

function drawBranch(ctx, { cx, cy, width, rotateDeg = 0, flip = false, opacity = 1 }) {
  const k = width / 120;
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(cx, cy);
  if (flip) ctx.scale(-1, 1);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(k, k);
  ctx.translate(-60, -80);
  ctx.shadowColor = 'rgba(226,172,84,0.4)';
  ctx.shadowBlur = 8;
  const gold = ctx.createLinearGradient(0, 0, 120, 160);
  gold.addColorStop(0, '#FBE5A6');
  gold.addColorStop(0.55, '#D9A94F');
  gold.addColorStop(1, '#A87423');
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.stroke(STEM);
  ctx.fillStyle = gold;
  for (const leaf of BRANCH_LEAVES) {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rotate);
    ctx.scale(leaf.scale, leaf.scale);
    ctx.fill(LEAF);
    ctx.restore();
  }
  ctx.restore();
}

function drawCornerBranches(ctx, u, mirror, W) {
  const list = [
    { cx: 3.6 * u, cy: 4.9 * u, width: 8.4 * u, rotateDeg: -24 },
    { cx: 4.1 * u, cy: 50.9 * u, width: 13 * u, rotateDeg: 18, opacity: 0.6 },
    { cx: 95.9 * u, cy: 48.8 * u, width: 11 * u, rotateDeg: -62, flip: true },
  ];
  for (const b of list) drawBranch(ctx, mirror ? { ...b, cx: W - b.cx, flip: !b.flip } : b);
}

const BOKEH = [
  { l: 6, t: 6, s: 7.2 }, { l: 12, t: 14, s: 3.2 }, { l: 1, t: 30, s: 8.4 }, { l: 8, t: 46, s: 3.5 },
  { l: 2, t: 63, s: 6 }, { l: 13, t: 72, s: 2.6 }, { l: 5, t: 86, s: 7.8 }, { l: 18, t: 91, s: 3 },
  { l: 46, t: 3, s: 2.4 }, { l: 66, t: 90, s: 3.2 },
];
function drawBokeh(ctx, W, H, u, time) {
  ctx.save();
  BOKEH.forEach((spot, i) => {
    const r = (spot.s * u) / 2;
    const cx = (spot.l / 100) * W + r;
    const cy = (spot.t / 100) * H + r;
    const breathe = 0.5 + 0.5 * Math.sin(time / 4.5 + i * 1.1);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(240,196,110,${(0.36 + 0.3 * breathe).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(240,196,110,${(0.12 + 0.12 * breathe).toFixed(3)})`);
    g.addColorStop(0.75, 'rgba(240,196,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawParticles(ctx, width, height, time, particles) {
  if (!particles) return;
  ctx.save();
  ctx.fillStyle = COLORS.GOLD_LIGHT;
  for (const p of particles) {
    const t = (((time - p.delay) % p.duration) + p.duration) % p.duration;
    const frac = t / p.duration;
    let opacity;
    if (frac < 0.1) opacity = 0.7 * (frac / 0.1);
    else if (frac < 0.9) opacity = 0.7 - 0.3 * ((frac - 0.1) / 0.8);
    else opacity = 0.4 * (1 - (frac - 0.9) / 0.1);
    ctx.globalAlpha = Math.max(0, opacity);
    ctx.beginPath();
    ctx.arc(p.leftFrac * width, height - frac * height * 0.9, Math.max(1.5, width / 420), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBackground(ctx, { width, height, time, particles }, u) {
  const cx = width / 2;
  const bg = ctx.createRadialGradient(cx, height * 0.2, 0, cx, height * 0.2, Math.max(width, height) * 0.9);
  bg.addColorStop(0, '#201a10');
  bg.addColorStop(0.55, '#111111');
  bg.addColorStop(1, COLORS.INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Halo doré qui respire, comme .gb-glow à l'écran.
  const pulse = 0.7 + 0.3 * ((Math.sin((time / 9) * Math.PI * 2) + 1) / 2);
  const glow = ctx.createRadialGradient(width * 0.32, height * 0.34, 0, width * 0.32, height * 0.34, width * 0.5);
  glow.addColorStop(0, `rgba(216,181,109,${(0.13 * pulse).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(216,181,109,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  drawBokeh(ctx, width, height, u, time);
  drawParticles(ctx, width, height, time, particles);
}

// ---------------------------------------------------------------- photo des mariés (fondue sur un côté)
// Calculée UNE fois (hors image) puis simplement recopiée à chaque image : la photo, assombrie et fondue
// vers le fond par un masque en dégradé, ne change pas pendant la vidéo.
function getSidePhoto(images, coverUrl, side, W, H) {
  const cover = coverUrl && images.get(coverUrl);
  if (!cover) return null;
  const cache = (images.__sideCache ||= new Map());
  const key = `${side}:${W}x${H}`;
  if (cache.has(key)) return cache.get(key);

  const pw = Math.round(W * (side === 'left' ? 0.42 : 0.4));
  const canvas = document.createElement('canvas');
  canvas.width = pw;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const iw = cover.naturalWidth || cover.width;
  const ih = cover.naturalHeight || cover.height;
  const scale = Math.max(pw / iw, H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  try {
    c.filter = 'sepia(0.28) saturate(1.1) brightness(0.86)';
  } catch {
    // filtre canvas non supporté : la photo reste un peu plus vive
  }
  c.drawImage(cover, (pw - dw) * 0.55, (H - dh) * 0.14, dw, dh);
  c.filter = 'none';
  // Masque : la photo s'efface vers le fond sombre sur son bord intérieur (gauche si elle est à droite,
  // droite si elle est à gauche), comme le masque CSS de l'écran.
  c.globalCompositeOperation = 'destination-in';
  const mask = c.createLinearGradient(0, 0, pw, 0);
  if (side === 'left') {
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.5, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    mask.addColorStop(0, 'rgba(0,0,0,0)');
    mask.addColorStop(0.5, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,1)');
  }
  c.fillStyle = mask;
  c.fillRect(0, 0, pw, H);
  cache.set(key, canvas);
  return canvas;
}

function drawSidePhoto(ctx, images, coverUrl, side, W, H, alpha) {
  const canvas = getSidePhoto(images, coverUrl, side, W, H);
  if (!canvas) return false;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(canvas, side === 'left' ? 0 : W - canvas.width, 0);
  ctx.restore();
  return true;
}

// ---------------------------------------------------------------- avatar rond
function avatarSource(img, photo) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const side = Math.min(iw, ih);
  let sx = (iw - side) / 2;
  let sy = (ih - side) / 2;
  if (Number.isFinite(photo?.focusX) && Number.isFinite(photo?.focusY)) {
    sx = Math.min(iw - side, Math.max(0, (photo.focusX / 100) * iw - side / 2));
    sy = Math.min(ih - side, Math.max(0, (photo.focusY / 100) * ih - side / 2));
  } else if (ih > iw) {
    sy = (ih - side) * (iw / ih < 0.85 ? 0.12 : 0.32);
  } else if (iw > ih) {
    sx = (iw - side) / 2;
  }
  return { sx, sy, side };
}

function drawAvatar(ctx, img, photo, cx, cy, r, alpha, scale) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // halo doré, puis disque sombre sous la photo
  ctx.shadowColor = 'rgba(228,182,94,0.55)';
  ctx.shadowBlur = r * 0.45;
  ctx.fillStyle = '#14110c';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  const { sx, sy, side } = avatarSource(img, photo);
  ctx.drawImage(img, sx, sy, side, side, -r, -r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = COLORS.RING;
  ctx.lineWidth = Math.max(2, r * 0.095);
  ctx.beginPath();
  ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(8,7,6,0.9)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, r - r * 0.1 - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- texte écrit mot à mot
// Place chaque « unité » (mot + ce qui le suit, voir splitIntoUnits) l'une après l'autre ; retour à la
// ligne sur la largeur, sauts de ligne de l'invité respectés (comme white-space: pre-line). Pour un texte de
// droite à gauche, les positions se comptent depuis la droite.
function layoutUnits(ctx, units, maxWidth) {
  const spaceW = ctx.measureText(' ').width;
  const placed = [];
  let line = 0;
  let x = 0;
  let lineHasUnit = false;
  units.forEach((unit, index) => {
    const core = unit.replace(/\s+$/, '');
    const trail = unit.slice(core.length);
    const w = core ? ctx.measureText(core).width : 0;
    if (core && lineHasUnit && x + w > maxWidth) {
      line += 1;
      x = 0;
      lineHasUnit = false;
    }
    if (core) {
      placed.push({ text: core, x, line, index });
      x += w;
      lineHasUnit = true;
    }
    const breaks = (trail.match(/\n/g) || []).length;
    if (breaks) {
      line += breaks;
      x = 0;
      lineHasUnit = false;
    } else if (trail) {
      x += spaceW;
    }
  });
  return { placed, lineCount: placed.length ? placed[placed.length - 1].line + 1 : 1 };
}

// Plus grande taille (en descendant par petits pas) pour laquelle le texte tient dans la hauteur voulue.
function fitUnits(ctx, units, maxWidth, maxHeight, maxSize, minSize, rtl) {
  for (let size = maxSize; size >= minSize; size -= maxSize * 0.04) {
    font(ctx, { size, family: SERIF });
    textDirection(ctx, rtl);
    const lineH = size * (rtl ? 1.6 : 1.42);
    const layout = layoutUnits(ctx, units, maxWidth);
    if (layout.lineCount * lineH <= maxHeight || size - maxSize * 0.04 < minSize) return { size, lineH, ...layout };
  }
  return { size: minSize, lineH: minSize * 1.42, ...layoutUnits(ctx, units, maxWidth) };
}

// ---------------------------------------------------------------- compositions
function drawCoverComposition(ctx, opts, u, alpha, localTime) {
  const { width: W, height: H, images, coverUrl } = opts;
  ctx.save();
  const hasPhoto = drawSidePhoto(ctx, images, coverUrl, 'right', W, H, alpha);
  drawCornerBranches(ctx, u, false, W);
  ctx.globalAlpha = alpha;
  const cx = hasPhoto ? W * 0.29 : W / 2;
  const scene = opts.scene;
  const rise = (1 - easeOut(progress(localTime, 0, 1))) * 2 * u;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  textDirection(ctx, false);
  const baseY = H * 0.5;

  font(ctx, { style: 'italic', size: 1.4 * u, family: SERIF });
  letterSpacing(ctx, 0.3 * u);
  ctx.fillStyle = COLORS.GOLD;
  ctx.fillText('SOUVENIRS DE MARIAGE', cx, baseY - 17 * u + rise);
  letterSpacing(ctx, 0);

  font(ctx, { size: 11.5 * u, family: SCRIPT });
  const grad = ctx.createLinearGradient(0, baseY - 20 * u, 0, baseY - 3 * u);
  grad.addColorStop(0, '#FFF1C6');
  grad.addColorStop(0.46, '#F2CB78');
  grad.addColorStop(1, '#C98F3A');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(226,170,80,0.38)';
  ctx.shadowBlur = 14;
  ctx.fillText('Livre d’Or', cx, baseY - 3.5 * u + rise);
  ctx.shadowBlur = 0;

  drawDivider(ctx, cx, baseY + 3 * u, 11 * u, 1.5 * u);

  font(ctx, { weight: 700, size: 2.4 * u, family: SERIF });
  letterSpacing(ctx, 0.08 * u);
  ctx.fillStyle = COLORS.GOLD_BRIGHT;
  ctx.fillText(scene.namesLine || scene.title || '', cx, baseY + 9 * u);
  letterSpacing(ctx, 0);

  if (scene.eventDate) {
    font(ctx, { size: 1.3 * u, family: SERIF });
    letterSpacing(ctx, 0.1 * u);
    ctx.globalAlpha = alpha * 0.78;
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText(new Date(scene.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), cx, baseY + 12.4 * u);
    letterSpacing(ctx, 0);
  }
  ctx.restore();
}

function drawIntroScene(ctx, opts, u, scene, localTime) {
  const { width: W, height: H } = opts;
  const textEnd = scene.introStepS * scene.textSteps;
  if (localTime >= textEnd) {
    // Couverture : fondu d'entrée, puis fondu de sortie sur la dernière seconde
    const into = localTime - textEnd;
    const outAlpha = scene.duration - localTime < 0.8 ? clamp01((scene.duration - localTime) / 0.8) : 1;
    drawCoverComposition(ctx, { ...opts, scene }, u, easeOut(progress(into, 0, 1.1)) * outAlpha, into);
    return;
  }
  const step = Math.min(scene.textSteps - 1, Math.floor(localTime / scene.introStepS));
  const stepLocal = localTime - step * scene.introStepS;
  const fadeIn = progress(stepLocal, 0, 0.7);
  const fadeOut = scene.introStepS - stepLocal < 0.5 ? clamp01((scene.introStepS - stepLocal) / 0.5) : 1;
  const alpha = easeOut(fadeIn) * fadeOut;
  const rise = (1 - easeOut(fadeIn)) * 1.4 * u;

  drawCornerBranches(ctx, u, false, W);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  textDirection(ctx, false);
  const cy = H / 2 + rise;
  if (step === 0) {
    font(ctx, { style: 'italic', size: 2.8 * u, family: SERIF });
    letterSpacing(ctx, 0.12 * u);
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText('Une surprise pour vous…', W / 2, cy);
  } else if (step === 1) {
    font(ctx, { size: 9 * u, family: SCRIPT });
    const grad = ctx.createLinearGradient(0, cy - 8 * u, 0, cy + 2 * u);
    grad.addColorStop(0, '#FFF1C6');
    grad.addColorStop(0.5, '#F2CB78');
    grad.addColorStop(1, '#C98F3A');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(226,170,80,0.38)';
    ctx.shadowBlur = 16;
    ctx.fillText(scene.namesLine || scene.title || '', W / 2, cy);
  } else {
    font(ctx, { style: 'italic', size: 2.7 * u, family: SERIF });
    letterSpacing(ctx, 0.04 * u);
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText('Les mots de ceux qui partagent votre bonheur', W / 2, cy);
  }
  ctx.restore();
}

function drawClosing(ctx, opts, u, scene, localTime) {
  const { width: W, height: H, images, coverUrl } = opts;
  const photoAlpha = easeOut(progress(localTime, 0, 1.4));
  ctx.save();
  const hasPhoto = drawSidePhoto(ctx, images, coverUrl, 'left', W, H, photoAlpha);
  drawCornerBranches(ctx, u, hasPhoto, W);
  const cx = hasPhoto ? W * 0.42 + (W * 0.58 - 4 * u) / 2 : W / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  textDirection(ctx, false);
  const baseY = H * 0.5;
  const step = (delay, drawFn) => {
    const p = easeOut(progress(localTime, delay, 1.1));
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(0, (1 - p) * 1.4 * u);
    drawFn();
    ctx.restore();
  };

  step(0.5, () => {
    font(ctx, { style: 'italic', size: 1.5 * u, family: SERIF });
    letterSpacing(ctx, 0.3 * u);
    ctx.fillStyle = COLORS.GOLD;
    ctx.fillText('AVEC TOUT NOTRE AMOUR', cx, baseY - 18 * u);
    letterSpacing(ctx, 0);
  });
  step(0.9, () => {
    font(ctx, { size: 14.5 * u, family: SCRIPT });
    const grad = ctx.createLinearGradient(0, baseY - 22 * u, 0, baseY - 4 * u);
    grad.addColorStop(0, '#FFF1C6');
    grad.addColorStop(0.46, '#F2CB78');
    grad.addColorStop(1, '#C98F3A');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(226,170,80,0.4)';
    ctx.shadowBlur = 16;
    ctx.fillText('Merci', cx, baseY - 3 * u);
  });
  step(1.5, () => drawDivider(ctx, cx, baseY + 2.8 * u, 12 * u, 1.6 * u));
  step(1.9, () => {
    font(ctx, { style: 'italic', size: 2.5 * u, family: SERIF });
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText('d’avoir partagé notre bonheur', cx, baseY + 8.6 * u);
  });
  step(2.3, () => {
    font(ctx, { weight: 700, size: 3 * u, family: SERIF });
    letterSpacing(ctx, 0.05 * u);
    ctx.fillStyle = COLORS.GOLD_BRIGHT;
    ctx.fillText(scene.namesLine || scene.title || '', cx, baseY + 13 * u);
    letterSpacing(ctx, 0);
  });
  step(2.7, () => {
    const dateText = scene.eventDate ? new Date(scene.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
    font(ctx, { size: 1.4 * u, family: SERIF });
    letterSpacing(ctx, 0.08 * u);
    ctx.globalAlpha *= 0.8;
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText(`${scene.count} mot${scene.count > 1 ? 's' : ''} d’amour réunis${dateText ? ` · ${dateText}` : ''}`, cx, baseY + 16.6 * u);
    letterSpacing(ctx, 0);
  });
  ctx.restore();
}

// En-tête et pied de page des scènes « témoignage » (mêmes éléments que l'écran de la salle).
function drawChrome(ctx, opts, u, scene) {
  const { width: W, height: H } = opts;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  textDirection(ctx, false);

  // Titre
  font(ctx, { size: 6.3 * u, family: SCRIPT });
  const grad = ctx.createLinearGradient(0, 0, 0, 7 * u);
  grad.addColorStop(0, '#FFF1C6');
  grad.addColorStop(0.46, '#F2CB78');
  grad.addColorStop(1, '#C98F3A');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(226,170,80,0.35)';
  ctx.shadowBlur = 10;
  ctx.fillText('Livre d’Or', W / 2, 6.3 * u);
  ctx.shadowBlur = 0;
  drawDivider(ctx, W / 2, 7.9 * u, 17 * u, 1.6 * u);
  font(ctx, { weight: 600, size: 1 * u, family: CORMORANT });
  letterSpacing(ctx, 0.18 * u);
  ctx.fillStyle = '#EBCF93';
  ctx.fillText('VOS MOTS D’AMOUR POUR LES MARIÉS', W / 2, 9.6 * u);
  letterSpacing(ctx, 0);

  // Pied de page
  drawDivider(ctx, W / 2, H - 4.5 * u, 12.5 * u, 1.5 * u);
  font(ctx, { size: 2.4 * u, family: SCRIPT });
  ctx.fillStyle = '#E9C47A';
  ctx.shadowColor = 'rgba(226,172,84,0.35)';
  ctx.shadowBlur = 8;
  ctx.fillText('Merci d’être ici', W / 2, H - 1.5 * u);
  ctx.shadowBlur = 0;

  // Compteur « n / total » et points de progression
  const total = scene.entryTotal;
  const n = scene.entryIndex + 1;
  const active = Math.max(1, Math.round((6 * n) / total));
  ctx.textAlign = 'right';
  font(ctx, { size: 1.25 * u, family: SERIF });
  ctx.fillStyle = '#D9B66F';
  const dotsW = 6 * 1.4 * u;
  ctx.fillText(`${n} / ${total}`, W - 3.6 * u - dotsW - 1.2 * u, H - 2 * u);
  for (let i = 0; i < 6; i += 1) {
    const x = W - 3.6 * u - dotsW + i * 1.4 * u + 0.5 * u;
    ctx.fillStyle = i < active ? '#F3D58C' : 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(x, H - 2.5 * u, (i < active ? 0.4 : 0.31) * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEntryScene(ctx, opts, u, scene, localTime) {
  const { width: W, height: H, images } = opts;
  const EXIT_S = 0.8;
  const exit = scene.duration - localTime < EXIT_S ? clamp01((scene.duration - localTime) / EXIT_S) : 1;

  drawSidePhoto(ctx, images, opts.coverUrl, 'right', W, H, 1);
  drawCornerBranches(ctx, u, false, W);
  drawChrome(ctx, opts, u, scene);

  const entry = scene.entry;
  const message = entry.message || '';
  const rtl = isRtl(message);
  const name = (entry.guestName || '').trim() || 'Un invité';
  const nameRtl = isRtl(name);
  const photoImg = entry.photo?.url ? images.get(entry.photo.url) : null;
  const hasPhoto = Boolean(photoImg);

  // Géométrie de la liste (mêmes valeurs que l'écran) : colonne à 7u du bord, avatar de 8,4u, texte de 44u à
  // côté de l'avatar (54,6u sans photo).
  const left = 7 * u;
  const avatarD = 8.4 * u;
  const textX = hasPhoto ? left + avatarD + 2.2 * u : left;
  const textW = (hasPhoto ? 44 : 54.6) * u;

  const typing = getTyping(message, VIDEO_TYPING_WPS);
  const headH = 4.3 * u;
  const areaTop = 11.1 * u;
  const areaH = H - 6.1 * u - areaTop;
  const fit = fitUnits(ctx, typing.units, textW, areaH - headH - 0.7 * u, 2.05 * u * (rtl ? 1.27 : 1), 1.25 * u, rtl);
  const blockH = headH + 0.7 * u + fit.lineCount * fit.lineH;
  const top = areaTop + Math.max(0, (areaH - blockH) / 2);

  ctx.save();
  ctx.globalAlpha = exit;

  // Avatar
  if (hasPhoto) {
    const p = easeOut(progress(localTime, 0.15, 0.8));
    drawAvatar(ctx, photoImg, entry.photo, left + avatarD / 2, top + avatarD / 2, avatarD / 2, p, 0.86 + 0.14 * p);
  }

  // Nom et table
  const nameP = easeOut(progress(localTime, 0.35, 0.7));
  ctx.save();
  ctx.globalAlpha *= nameP;
  ctx.translate(0, (1 - nameP) * 0.6 * u);
  ctx.textBaseline = 'alphabetic';
  textDirection(ctx, nameRtl);
  ctx.textAlign = nameRtl ? 'right' : 'left';
  const nameX = nameRtl ? textX + textW : textX;
  font(ctx, { weight: 700, size: (nameRtl ? 2.4 : 2.1) * u, family: SERIF });
  ctx.fillStyle = COLORS.GOLD_BRIGHT;
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText(name, nameX, top + 2.3 * u);
  if (entry.tableNumber) {
    font(ctx, { style: 'italic', size: 1.3 * u, family: SERIF });
    ctx.fillStyle = COLORS.IVORY;
    ctx.globalAlpha *= 0.88;
    ctx.fillText(`Table ${entry.tableNumber}`, nameX, top + 4.1 * u);
  }
  ctx.restore();

  // Message écrit mot à mot
  textDirection(ctx, rtl);
  ctx.textAlign = rtl ? 'right' : 'left';
  ctx.textBaseline = 'alphabetic';
  font(ctx, { size: fit.size, family: SERIF });
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 8;
  const textTop = top + headH + 0.7 * u;
  const originX = rtl ? textX + textW : textX;
  const writing = localTime - ENTRY_LEAD_S;
  let lastRevealed = null;
  for (const unit of fit.placed) {
    const t0 = typing.times[unit.index] / 1000;
    const reveal = clamp01((writing - t0) / 0.26);
    if (reveal <= 0) continue;
    const tone = clamp01((writing - t0) / 0.9);
    ctx.globalAlpha = exit * reveal;
    ctx.fillStyle = mixColor('#EACB86', '#F7F1E5', tone);
    const x = rtl ? originX - unit.x : originX + unit.x;
    const y = textTop + unit.line * fit.lineH + fit.size * 1.02;
    ctx.fillText(unit.text, x, y);
    lastRevealed = { unit, x, y };
  }

  // Curseur doré : clignote tant que le texte s'écrit (et un instant après le dernier mot)
  if (lastRevealed && writing < typing.total / 1000 + 0.3 && Math.floor(writing * 0.95 * 2) % 2 === 0) {
    const { unit, x, y } = lastRevealed;
    const w = ctx.measureText(unit.text).width;
    ctx.globalAlpha = exit;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(227,184,102,0.7)';
    ctx.fillStyle = '#E3B866';
    const caretX = rtl ? x - w - 0.4 * u : x + w + 0.3 * u;
    ctx.fillRect(caretX, y - fit.size * 0.86, Math.max(2, 0.14 * u), fit.size * 0.98);
  }
  ctx.restore();
}

// Point d'entrée du moteur de rendu : une fonction sans effet de bord autre que dessiner sur `ctx` —
// appelée une fois par image par l'encodeur (voir guestbookVideoEncoder.js), jamais en boucle temps réel.
export function renderFrame(ctx, opts) {
  const { width, timeline, time } = opts;
  const u = width / 100;
  ctx.clearRect(0, 0, width, opts.height);
  textDirection(ctx, false);
  drawBackground(ctx, opts, u);

  const active = findActiveScene(timeline.scenes, time);
  if (!active) return;
  const { scene, localTime } = active;

  if (scene.type === 'intro') drawIntroScene(ctx, opts, u, scene, localTime);
  else if (scene.type === 'entry') drawEntryScene(ctx, opts, u, scene, localTime);
  else if (scene.type === 'outro') drawClosing(ctx, opts, u, scene, localTime);
}
