import { findActiveScene } from './guestbookVideoTimeline';

// Même palette "Smoking & Doré" que le PDF (guestbookExport.service.js) : un même souvenir, un
// même thème visuel, quel que soit le format d'export.
export const COLORS = { GOLD: '#B8873F', GOLD_LIGHT: '#D6B56D', IVORY: '#F7F1E5', INK: '#0A0908' };

const REF_WIDTH = 1280; // les tailles ci-dessous sont pensées pour ce format ; px() les adapte si jamais on change la résolution
const px = (basePx, width) => Math.round((basePx * width) / REF_WIDTH);

function setFont(ctx, family, weight, sizePx) {
  ctx.font = `${weight} ${sizePx}px "${family}"`;
}

// `ctx.letterSpacing` (Chrome/Edge récents) n'est pas garanti partout : simple confort visuel,
// jamais bloquant si absent (le texte reste lisible, juste un peu moins aéré).
function setLetterSpacing(ctx, px2) {
  try {
    ctx.letterSpacing = `${px2}px`;
  } catch {
    // ignoré : navigateur sans support, pas de quoi interrompre le rendu
  }
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Ajuste une image en mode "cover" (recadrée, jamais déformée) dans un rectangle donné, avec un
// point d'ancrage (posX/posY, 0..1) — équivalent canvas de object-fit: cover + object-position.
function drawImageCoverInRect(ctx, img, x, y, w, h, posX = 0.5, posY = 0.5) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(w / iw, h / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  const dx = x + (w - drawW) * posX;
  const dy = y + (h - drawH) * posY;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function photoOrientation(img) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return 'landscape';
  const ratio = iw / ih;
  if (ratio >= 1.2) return 'landscape';
  if (ratio <= 0.85) return 'portrait';
  return 'square';
}

function orientationPosY(img) {
  const o = photoOrientation(img);
  if (o === 'portrait') return 0.22;
  if (o === 'square') return 0.32;
  return 0.38;
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Un message peut contenir des sauts de ligne explicites (l'invité a tapé Entrée deux fois) : on
// les respecte, comme le mode écran (white-space: pre-line), plutôt que de tout fondre en un seul
// paragraphe.
function wrapParagraphs(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split(/\n+/);
  const lines = [];
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    lines.push(...wrapText(ctx, para, maxWidth));
  }
  return lines.length ? lines : [''];
}

function drawCenteredLines(ctx, lines, x, centerY, lineHeight, align = 'center') {
  const totalH = lines.length * lineHeight;
  let y = centerY - totalH / 2 + lineHeight * 0.78;
  ctx.textAlign = align;
  for (const line of lines) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
}

// Recherche la plus grande taille de police (en descendant par pas de 2px depuis un plafond) qui
// tient dans la hauteur disponible, dans le même esprit que fitMessageFont côté mode écran — sans
// sa recherche dichotomique précise (inutile ici : la police descend par petits paliers, un
// résultat visuellement identique suffit pour une vidéo).
function fitWrappedText(ctx, text, family, weight, maxWidth, maxHeight, maxPx, minPx) {
  for (let sizePx = maxPx; sizePx >= minPx; sizePx -= 2) {
    setFont(ctx, family, weight, sizePx);
    const lineHeight = sizePx * 1.32;
    const lines = wrapParagraphs(ctx, text, maxWidth);
    if (lines.length * lineHeight <= maxHeight || sizePx === minPx) {
      return { lines, sizePx, lineHeight };
    }
  }
  return { lines: [text], sizePx: minPx, lineHeight: minPx * 1.32 };
}

function drawGlow(ctx, cx, cy, radius, rgbaColor, time, periodS, direction) {
  const phase = (Math.sin((time / periodS) * Math.PI * 2 * direction) + 1) / 2;
  const opacity = 0.6 + 0.4 * phase;
  const transparent = rgbaColor.replace(/[\d.]+\)$/, '0)');
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, rgbaColor);
  grad.addColorStop(0.7, transparent);
  grad.addColorStop(1, transparent);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
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
    const y = height - frac * height * 0.9;
    ctx.globalAlpha = Math.max(0, opacity);
    ctx.beginPath();
    ctx.arc(p.leftFrac * width, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Dessine le fond commun à TOUTE la vidéo (dégradé, photo de couverture assombrie en dérive
// lente, halos, particules) — appelé à chaque image, avant le contenu de la scène active, pour
// une continuité visuelle sur toute la durée (voir GuestbookDisplayPage.jsx pour l'inspiration
// CSS d'origine, réinterprétée ici en dessin canvas).
function drawBackground(ctx, { width, height, time, images, coverUrl, particles }) {
  const cx = width / 2;
  const cy0 = height * 0.2;
  const bg = ctx.createRadialGradient(cx, cy0, 0, cx, cy0, Math.max(width, height) * 0.9);
  bg.addColorStop(0, '#201a10');
  bg.addColorStop(0.55, '#111111');
  bg.addColorStop(1, COLORS.INK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const coverImg = coverUrl && images.get(coverUrl);
  if (coverImg) {
    const driftT = (Math.sin((time / 48) * Math.PI) + 1) / 2;
    const zoom = 1.02 + 0.04 * driftT;
    const tx = -0.006 * driftT * width;
    const ty = -0.004 * driftT * height;
    ctx.save();
    ctx.globalAlpha = 0.22;
    try {
      ctx.filter = 'saturate(0.7) brightness(0.75)';
    } catch {
      // filtre canvas non supporté : la photo reste un peu plus vive, sans rien casser
    }
    ctx.translate(width / 2 + tx, height / 2 + ty);
    ctx.scale(zoom, zoom);
    ctx.translate(-width / 2, -height / 2);
    drawImageCoverInRect(ctx, coverImg, 0, 0, width, height, 0.5, 0.22);
    ctx.restore();
  }

  const overlay = ctx.createLinearGradient(0, 0, 0, height);
  overlay.addColorStop(0, 'rgba(10,9,8,0.55)');
  overlay.addColorStop(0.6, 'rgba(10,9,8,0.75)');
  overlay.addColorStop(1, 'rgba(10,9,8,0.92)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  const mistOpacity = 0.7 + 0.3 * ((Math.sin((time / 22) * Math.PI * 2) + 1) / 2);
  const mist = ctx.createRadialGradient(cx, height * 0.38, 0, cx, height * 0.38, width * 0.55);
  mist.addColorStop(0, `rgba(216,181,109,${(0.1 * mistOpacity).toFixed(3)})`);
  mist.addColorStop(0.38, `rgba(216,181,109,${(0.04 * mistOpacity).toFixed(3)})`);
  mist.addColorStop(1, 'rgba(216,181,109,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, 0, width, height);

  // Dérive lente en plus du pouls rapide existant (périodes de quelques minutes plutôt que
  // quelques secondes) : sur une vidéo longue (beaucoup de témoignages), le fond pulsait déjà
  // mais restait, à grande échelle, toujours identique à lui-même — cette seconde couche, à
  // peine perceptible d'un instant à l'autre, change réellement l'ambiance au fil du temps.
  const slowA = Math.sin((time / 210) * Math.PI * 2);
  const slowB = Math.cos((time / 260) * Math.PI * 2);
  drawGlow(ctx, width * (0.5 + 0.08 * slowA), height * (-0.05 + 0.04 * slowA), width * (0.46 + 0.05 * slowB), 'rgba(216,181,109,0.28)', time, 9, 1);
  drawGlow(ctx, width * (1.02 - 0.06 * slowB), height * (1.05 - 0.05 * slowB), width * (0.32 + 0.04 * slowA), 'rgba(184,138,50,0.22)', time, 11, -1);

  drawParticles(ctx, width, height, time, particles);
}

// Fondu+glissement d'entrée (même esprit que gbEnterRise/gbFadeRise en CSS) : 0 -> 1 sur
// `durationS`, décalé de `delayS`. Ne redescend jamais tout seul (l'appelant gère la sortie via
// exitFade, voir drawEntryScene) : ce fondu ne joue qu'à l'entrée.
function enterProgress(localTime, delayS, durationS = 0.9) {
  return Math.max(0, Math.min(1, (localTime - delayS) / durationS));
}

// Fait varier l'animation d'ENTRÉE d'un témoignage à l'autre (en alternance, selon l'index de
// l'entrée dans la timeline) : sur une vidéo qui peut compter des dizaines de témoignages, la
// même transition répétée à l'identique à chaque fois devenait vite monotone. La sortie reste
// volontairement un simple fondu dans tous les cas (voir exitFade plus bas) — varier l'entrée
// suffit à casser la monotonie sans multiplier les combinaisons à vérifier visuellement.
const ENTRY_TRANSITIONS = ['rise', 'slide-left', 'slide-right', 'zoom'];

function applyEntryTransitionTransform(ctx, width, height, style, progress) {
  const eased = 1 - (1 - progress) * (1 - progress); // ease-out : un peu plus vif qu'un simple linéaire
  if (style === 'slide-left') {
    ctx.translate((1 - eased) * -px(90, width), 0);
  } else if (style === 'slide-right') {
    ctx.translate((1 - eased) * px(90, width), 0);
  } else if (style === 'zoom') {
    const scale = 0.94 + 0.06 * eased;
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
  } else {
    ctx.translate(0, (1 - eased) * px(26, width));
  }
}

function drawIntroScene(ctx, { width, height }, scene, localTime) {
  const step = Math.min(3, Math.floor(localTime / scene.introStepS));
  const stepLocal = localTime - step * scene.introStepS;
  const fade = Math.min(1, stepLocal / 0.6);
  const rise = (1 - fade) * px(16, width);
  const cy = height / 2 + rise;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';

  if (step === 0) {
    setFont(ctx, 'Inter', 600, px(30, width));
    setLetterSpacing(ctx, 3);
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText('UNE SURPRISE POUR VOUS...', width / 2, cy);
  } else if (step === 1) {
    setFont(ctx, 'Playfair Display', 700, px(104, width));
    setLetterSpacing(ctx, 0);
    ctx.fillStyle = COLORS.GOLD_LIGHT;
    ctx.fillText(scene.namesLine || scene.title, width / 2, cy);
  } else if (step === 2) {
    setFont(ctx, 'Inter', 600, px(28, width));
    setLetterSpacing(ctx, 2);
    ctx.fillStyle = COLORS.IVORY;
    const lines = wrapText(ctx, 'LES MOTS DE CEUX QUI PARTAGENT VOTRE BONHEUR', width * 0.72);
    drawCenteredLines(ctx, lines, width / 2, cy, px(28, width) * 1.5);
  } else {
    setFont(ctx, 'Playfair Display', 700, px(80, width));
    setLetterSpacing(ctx, 8);
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText("LIVRE D'OR", width / 2, cy);
  }
  ctx.restore();
}

function drawOutroScene(ctx, { width, height }, scene, localTime) {
  const fade = Math.min(1, localTime / 1);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';

  setFont(ctx, 'Playfair Display', 600, px(38, width));
  ctx.fillStyle = COLORS.GOLD_LIGHT;
  ctx.fillText('Merci d’avoir partagé ce moment avec eux', width / 2, height / 2 - px(20, width));

  setFont(ctx, 'Cormorant Garamond', 500, px(30, width));
  ctx.fillStyle = COLORS.IVORY;
  ctx.fillText(scene.namesLine || scene.title, width / 2, height / 2 + px(36, width));
  ctx.restore();
}

function computeEntryLayout(ctx, scene, width, height, hasPhoto) {
  const margin = px(72, width);
  const message = scene.entry.message || '';
  const guestLine = `— ${(scene.entry.guestName || '').trim() || 'Un invité'}`;
  const tableLine = scene.entry.tableNumber ? `Table ${scene.entry.tableNumber}` : null;

  let textX = margin;
  let textWidth = width - margin * 2;
  if (hasPhoto) {
    const frameW = px(300, width);
    textX = margin + frameW + px(64, width);
    textWidth = width - margin - textX;
  }

  setFont(ctx, 'Times', 400, px(16, width)); // mesure neutre, remplacée juste après par fitWrappedText
  const availableTextHeight = height - px(160, width);
  const fit = fitWrappedText(ctx, message, 'Cormorant Garamond', 500, textWidth, availableTextHeight * 0.62, px(46, width), px(20, width));

  return { margin, textX, textWidth, message, guestLine, tableLine, hasPhoto, ...fit };
}

function drawEntryScene(ctx, { width, height, images }, scene, localTime) {
  const EXIT_S = 0.6;
  const exitFade = scene.duration - localTime < EXIT_S ? Math.max(0, (scene.duration - localTime) / EXIT_S) : 1;

  const photo = scene.entry.photo?.url ? images.get(scene.entry.photo.url) : null;
  const hasPhoto = Boolean(photo);
  scene._layout ||= computeEntryLayout(ctx, scene, width, height, hasPhoto);
  const layout = scene._layout;

  const transitionStyle = ENTRY_TRANSITIONS[(scene.entryIndex ?? 0) % ENTRY_TRANSITIONS.length];
  const overallProgress = enterProgress(localTime, 0, 0.9);
  ctx.save();
  applyEntryTransitionTransform(ctx, width, height, transitionStyle, overallProgress);

  if (hasPhoto) {
    const frameW = px(300, width);
    const frameH = px(360, width);
    const frameX = layout.margin;
    const frameY = (height - frameH) / 2;
    const photoFade = enterProgress(localTime, 0) * exitFade;
    ctx.save();
    ctx.globalAlpha = photoFade;
    const zoom = 1 + 0.08 * Math.min(1, localTime / scene.duration);
    ctx.save();
    roundRectPath(ctx, frameX, frameY, frameW, frameH, 10);
    ctx.clip();
    ctx.translate(frameX + frameW / 2, frameY + frameH / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-(frameX + frameW / 2), -(frameY + frameH / 2));
    drawImageCoverInRect(ctx, photo, frameX, frameY, frameW, frameH, 0.5, orientationPosY(photo));
    ctx.restore();
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 2;
    roundRectPath(ctx, frameX - 4, frameY - 4, frameW + 8, frameH + 8, 12);
    ctx.stroke();
    ctx.restore();
  }

  const align = hasPhoto ? 'left' : 'center';
  const centerX = hasPhoto ? layout.textX : width / 2;
  let cursorY = height / 2 - (layout.lines.length * layout.lineHeight) / 2;
  if (!hasPhoto) cursorY -= px(30, width); // laisse la place au guillemet au-dessus

  ctx.textAlign = align;

  if (!hasPhoto) {
    const quoteFade = enterProgress(localTime, 0.12) * exitFade;
    ctx.save();
    ctx.globalAlpha = quoteFade;
    setFont(ctx, 'Playfair Display', 400, px(56, width));
    ctx.fillStyle = COLORS.GOLD;
    ctx.fillText('“', centerX, cursorY - px(10, width));
    ctx.restore();
  }

  const messageFade = enterProgress(localTime, 0.26) * exitFade;
  ctx.save();
  ctx.globalAlpha = messageFade;
  setFont(ctx, 'Cormorant Garamond', 500, layout.sizePx);
  ctx.fillStyle = '#FFFDF8';
  let y = cursorY;
  for (const line of layout.lines) {
    ctx.fillText(line, centerX, y);
    y += layout.lineHeight;
  }
  ctx.restore();
  cursorY = y + px(14, width);

  const nameFade = enterProgress(localTime, 0.48) * exitFade;
  ctx.save();
  ctx.globalAlpha = nameFade;
  setFont(ctx, 'Inter', 600, px(24, width));
  setLetterSpacing(ctx, 1);
  ctx.fillStyle = COLORS.GOLD_LIGHT;
  ctx.fillText(layout.guestLine, centerX, cursorY);
  ctx.restore();
  cursorY += px(34, width);

  if (layout.tableLine) {
    const tableFade = enterProgress(localTime, 0.62) * exitFade;
    ctx.save();
    ctx.globalAlpha = tableFade * 0.6;
    setFont(ctx, 'Inter', 500, px(16, width));
    setLetterSpacing(ctx, 2);
    ctx.fillStyle = COLORS.IVORY;
    ctx.fillText(layout.tableLine.toUpperCase(), centerX, cursorY);
    ctx.restore();
  }

  ctx.restore();
}

// Point d'entrée du moteur de rendu : une fonction pure, sans effet de bord autre que dessiner
// sur `ctx` — appelée une fois par image par l'encodeur (voir guestbookVideoEncoder.js), jamais
// en boucle temps réel.
export function renderFrame(ctx, opts) {
  const { width, height, time, timeline } = opts;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, opts);

  const active = findActiveScene(timeline.scenes, time);
  if (!active) return;
  const { scene, localTime } = active;

  if (scene.type === 'intro') drawIntroScene(ctx, opts, scene, localTime);
  else if (scene.type === 'entry') drawEntryScene(ctx, opts, scene, localTime);
  else if (scene.type === 'outro') drawOutroScene(ctx, opts, scene, localTime);
}
