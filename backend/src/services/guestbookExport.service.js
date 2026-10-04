// Exports du livre d'or : CSV/Excel (données structurées, même logique que guests.controller.js)
// et PDF (véritable souvenir imprimable, thème "Smoking & Doré"). Réutilise le driver de
// stockage déjà en place — jamais de second système de fichiers — via une simple lecture HTTP
// de l'URL déjà publique du média (identique à ce que fait déjà s3Storage.fetchByKey en interne).
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { fetchMediaBytes } = require('./mediaBytes.service');
const { squareCropAroundFocus } = require('./faceFocus.service');

// Limite connue et assumée, propre à ce PDF : les polices standard embarquées par pdfkit
// (Times, Helvetica — les 14 polices PDF de base) n'encodent que le jeu WinAnsi (latin de base +
// Europe de l'Ouest, accents français inclus) — au-delà (emojis, arabe, CJK, cyrillique...),
// elles produisent des glyphes aléatoires plutôt qu'une erreur (vérifié : aucune exception levée,
// juste du charabia à l'écran). Seules exceptions : les polices embarquées depuis
// src/assets/fonts (Libre Baskerville couvre ce répertoire, Noto Naskh Arabic ajoute l'arabe).
// Emojis, CJK, cyrillique... ne sont pas pris en charge : on retire donc, UNIQUEMENT dans cette
// version imprimée, les caractères hors de ce répertoire :
// jamais dans la donnée elle-même, qui reste intacte partout ailleurs (base, administration,
// mode écran, où le navigateur affiche nativement emojis et toute écriture).
// Caractères de contrôle (U+0000-U+001F : retour chariot, tabulation...) exclus, ainsi que le trait
// d'union conditionnel U+00AD : ces polices n'ont pas de glyphe pour eux, ils sortiraient en petit
// rectangle vertical (le « \r » des fins de ligne Windows en est la cause la plus courante). Les sauts
// de ligne sont traités à part, voir textForPrint.
const WINANSI_SAFE_CHAR = /^[\u0020-\u007E\u00A0-\u00AC\u00AE-\u00FF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]$/u;

// Écriture arabe : conservée seulement quand la police arabe est embarquée (voir registerFonts,
// option arabic de textForPrint) — fontkit assure alors la liaison des lettres. La ponctuation
// arabe (U+060C, U+061B, U+061F) en fait partie ; les marques directionnelles invisibles sont retirées.
const ARABIC_CHAR = /^[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]$/u;
// Texte dont la première lettre est arabe : écrit de droite à gauche (comme l'écran, voir isRtlText).
const ARABIC_FIRST_LETTER = /^[^\p{L}]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u;
const isArabicText = (text) => ARABIC_FIRST_LETTER.test(text || '');

function textForPrint(text, fallback = '(message avec des caractères non imprimables — consultez le livre d\'or numérique)', { arabic = false } = {}) {
  // Fins de ligne Windows (\r\n) ou anciennes (\r), séparateurs Unicode de ligne et de paragraphe :
  // un seul saut de ligne ; tabulations : une espace.
  const normalized = String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029\u0085]/g, '\n')
    .replace(/[\t\u000B\u000C]/g, ' ');
  // Itère par point de code Unicode (pas par unité UTF-16) : un emoji composé de deux unités
  // "surrogate pairs" ne doit pas être coupé en deux caractères invalides au milieu.
  const kept = [...normalized]
    .filter((ch) => ch === '\n' || WINANSI_SAFE_CHAR.test(ch) || (arabic && ARABIC_CHAR.test(ch)))
    .join('');
  // Espaces autour des sauts de ligne retirés (une ligne ne commence pas par une espace), pas plus d'une
  // ligne vide d'affilée.
  const cleaned = kept
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return cleaned || fallback;
}

const EXPORT_HEADERS = ['Nom', 'Message', 'Table', 'Origine', 'Statut', 'Photo', 'Reçu le'];

const SOURCE_LABELS = { DIGITAL: 'Invitation numérique', QR: 'QR code' };
const STATUS_LABELS = { PENDING: 'En attente', APPROVED: 'Approuvé', REJECTED: 'Rejeté' };

function entryToRow(entry) {
  return [
    entry.guestName,
    entry.message,
    entry.tableNumber || '',
    SOURCE_LABELS[entry.source] || entry.source,
    STATUS_LABELS[entry.status] || entry.status,
    entry.photo?.url || '',
    new Date(entry.createdAt),
  ];
}

function csvEscape(value) {
  const str = value == null ? '' : String(value instanceof Date ? value.toISOString() : value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function buildGuestbookCsv(entries) {
  const rows = entries.map(entryToRow);
  return '﻿' + [EXPORT_HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

async function buildGuestbookXlsx(entries) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Invitations';
  const sheet = workbook.addWorksheet("Livre d'or");

  sheet.columns = EXPORT_HEADERS.map((header) => ({ header, key: header, width: header === 'Message' ? 60 : header === 'Photo' ? 40 : 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const entry of entries) sheet.addRow(entryToRow(entry));

  sheet.getColumn(EXPORT_HEADERS.indexOf('Reçu le') + 1).numFmt = 'yyyy-mm-dd hh:mm';

  return workbook.xlsx.writeBuffer();
}

// "Livre d'or de mariage" imprimable : même identité visuelle que l'écran de la salle (voir
// GuestbookDisplayPage.jsx) — fond noir profond, or, titre en écriture manuscrite, cœur entre deux
// filets, branches dorées, avatars ronds à anneau doré — adaptée au papier : une page par
// témoignage (une conversation qui défile n'a pas de sens imprimée). Format écran 16:9 façon
// diaporama (13,33 x 7,5 po à 72 pt/po), pas une feuille A4 : la photo à gauche et le texte à droite
// remplissent mieux une page aussi large qu'une pile verticale centrée.
// Polices : Libre Baskerville et Great Vibes (celles de l'écran) si leurs fichiers sont présents
// dans src/assets/fonts (voir registerFonts) ; sinon, repli sur les polices Times intégrées de
// pdfkit, sans rien casser.
const PAGE = { width: 960, height: 540 };
const U = PAGE.width / 100; // l'"unité d'écran" de la page web : 1 u = 1 % de la largeur
const GOLD = '#B8873F';
const GOLD_LIGHT = '#D6B56D';
const GOLD_BRIGHT = '#F2D28C';
const IVORY = '#F7F1E5';
const INK = '#0A0908';

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_FILES = {
  Serif: 'LibreBaskerville-Regular.ttf',
  SerifBold: 'LibreBaskerville-Bold.ttf',
  SerifItalic: 'LibreBaskerville-Italic.ttf',
  Script: 'GreatVibes-Regular.ttf',
  Arabic: 'NotoNaskhArabic-Medium.ttf',
};
// Arabic : pas de repli (les polices Times ne contiennent pas l'écriture arabe) ; sans ce fichier, les
// caractères arabes restent retirés de la version imprimée, comme avant (voir textForPrint).
const FONT_FALLBACK = { Serif: 'Times-Roman', SerifBold: 'Times-Bold', SerifItalic: 'Times-Italic', Script: 'Times-BoldItalic', Arabic: null };

// Enregistre chaque police dont le fichier existe ; pour les autres, la police Times de repli.
// Un fichier de police corrompu ne doit pas empêcher d'imprimer : on retombe aussi sur le repli.
function registerFonts(doc) {
  const fonts = {};
  for (const [role, file] of Object.entries(FONT_FILES)) {
    const full = path.join(FONT_DIR, file);
    fonts[role] = FONT_FALLBACK[role];
    if (!fs.existsSync(full)) continue;
    try {
      doc.registerFont(role, full);
      doc.font(role); // charge le fichier maintenant : une erreur éventuelle est attrapée ici
      fonts[role] = role;
    } catch {
      fonts[role] = FONT_FALLBACK[role];
    }
  }
  fonts.hasScript = fonts.Script === 'Script';
  fonts.hasArabic = fonts.Arabic === 'Arabic';
  return fonts;
}

// Tout texte centré est dessiné avec une largeur explicite (jamais celle, implicite, déduite de la
// position x courante du curseur pdfkit) : c'est l'absence de largeur explicite qui décentrait le
// titre de la page de couverture dans une version antérieure de ce fichier.
function drawBackground(doc) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(INK);
  const g = doc.radialGradient(PAGE.width * 0.5, PAGE.height * 0.2, 0, PAGE.width * 0.5, PAGE.height * 0.2, PAGE.width * 0.72);
  g.stop(0, '#241D11').stop(0.55, '#111111').stop(1, INK);
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(g);
}

// Lumières floues dorées sur le bord gauche, comme sur l'écran (position en % de la page, taille en u).
const BOKEH = [
  { l: 6, t: 6, s: 7.2 }, { l: 12, t: 14, s: 3.2 }, { l: 1, t: 30, s: 8.4 }, { l: 8, t: 46, s: 3.5 },
  { l: 2, t: 63, s: 6 }, { l: 13, t: 72, s: 2.6 }, { l: 5, t: 86, s: 7.8 }, { l: 18, t: 91, s: 3 },
];
function drawBokeh(doc) {
  for (const spot of BOKEH) {
    const r = (spot.s * U) / 2;
    const cx = (spot.l / 100) * PAGE.width + r;
    const cy = (spot.t / 100) * PAGE.height + r;
    const g = doc.radialGradient(cx, cy, 0, cx, cy, r);
    g.stop(0, '#F0C46E', 0.34).stop(0.5, '#F0C46E', 0.12).stop(0.78, '#F0C46E', 0);
    doc.save().circle(cx, cy, r).fill(g).restore();
  }
}

// Branche dorée : tige courbe et feuilles en amande alternées de part et d'autre, de plus en plus
// petites vers la pointe (même dessin que GoldBranch dans la page de l'écran, boîte de 120 x 160).
const BRANCH_STEM = { p0: [30, 158], p1: [38, 110], p2: [52, 70], p3: [84, 12] };
function bezierPoint(t) {
  const { p0, p1, p2, p3 } = BRANCH_STEM;
  const mt = 1 - t;
  const at = (k) => mt ** 3 * p0[k] + 3 * mt * mt * t * p1[k] + 3 * mt * t * t * p2[k] + t ** 3 * p3[k];
  const d = (k) => 3 * mt * mt * (p1[k] - p0[k]) + 6 * mt * t * (p2[k] - p1[k]) + 3 * t * t * (p3[k] - p2[k]);
  return { x: at(0), y: at(1), angle: (Math.atan2(d(1), d(0)) * 180) / Math.PI };
}
const BRANCH_LEAVES = Array.from({ length: 9 }, (_, i) => {
  const t = 0.1 + (i / 8) * 0.9;
  const { x, y, angle } = bezierPoint(t);
  return { x, y, rotate: angle + (i % 2 === 0 ? -1 : 1) * 52, scale: 1.05 - t * 0.5 };
});
const LEAF_PATH = 'M0 0 C 8 -13 24 -13 33 0 C 24 13 8 13 0 0 Z';

// (cx, cy) : centre de la branche sur la page ; width : sa largeur ; rotate en degrés ; flip : miroir.
function drawBranch(doc, { cx, cy, width, rotate = 0, flip = false, opacity = 1 }) {
  const k = width / 120;
  doc.save();
  doc.opacity(opacity);
  doc.translate(cx, cy);
  if (flip) doc.scale(-1, 1);
  doc.rotate(rotate);
  doc.scale(k);
  doc.translate(-60, -80);
  doc.path('M30 158 C 38 110, 52 70, 84 12').lineWidth(1.8).lineCap('round').strokeColor('#D9A94F').stroke();
  BRANCH_LEAVES.forEach((leaf, i) => {
    doc.save();
    doc.translate(leaf.x, leaf.y).rotate(leaf.rotate).scale(leaf.scale);
    doc.path(LEAF_PATH).fill(i % 2 === 0 ? '#E7BE68' : '#D4A24A');
    doc.restore();
  });
  doc.restore();
}

// mirror : la page de clôture a sa photo à gauche, les branches passent donc de l'autre côté.
function drawCornerBranches(doc, mirror = false) {
  const branches = [
    { cx: 3.6 * U, cy: 4.9 * U, width: 8.4 * U, rotate: -24 },
    { cx: 4.1 * U, cy: 50.9 * U, width: 13 * U, rotate: 18, opacity: 0.6 },
    { cx: 95.9 * U, cy: 48.8 * U, width: 11 * U, rotate: -62, flip: true },
  ];
  for (const b of branches) {
    drawBranch(doc, mirror ? { ...b, cx: PAGE.width - b.cx, flip: !b.flip } : b);
  }
}

const HEART_PATH = 'M12 21s-7.5-4.6-9.5-9.2C1 8 3.2 5 6.2 5c1.9 0 3.4 1 5.8 3.3C14.4 6 15.9 5 17.8 5c3 0 5.2 3 3.7 6.8C19.5 16.4 12 21 12 21z';
function drawHeart(doc, cx, cy, size) {
  doc.save().translate(cx - size / 2, cy - size / 2).scale(size / 24).path(HEART_PATH).fill('#E9C26C').restore();
}

// Filet doré qui s'estompe vers l'extérieur, cœur au centre.
function drawDivider(doc, cx, y, lineWidth, heartSize) {
  const gap = heartSize * 0.9;
  const left = doc.linearGradient(cx - gap - lineWidth, y, cx - gap, y);
  left.stop(0, '#D9AE62', 0).stop(1, '#D9AE62', 1);
  const right = doc.linearGradient(cx + gap, y, cx + gap + lineWidth, y);
  right.stop(0, '#D9AE62', 1).stop(1, '#D9AE62', 0);
  doc.save().lineWidth(0.8);
  doc.moveTo(cx - gap - lineWidth, y).lineTo(cx - gap, y).stroke(left);
  doc.moveTo(cx + gap, y).lineTo(cx + gap + lineWidth, y).stroke(right);
  doc.restore();
  drawHeart(doc, cx, y, heartSize);
}

// Photo des mariés (celle de la couverture de l'invitation) : lue une seule fois pour la couverture et
// la page de clôture. Absente ou illisible : null, et ces deux pages restent simplement centrées.
async function loadCoverPhoto(invitation) {
  const coverUrl = Array.isArray(invitation.media) ? invitation.media.find((m) => m.type === 'cover')?.url : null;
  if (!coverUrl) return null;
  try {
    return await fetchMediaBytes(coverUrl);
  } catch {
    return null;
  }
}

// Photo pleine hauteur sur 42 % de la largeur, d'un côté, fondue vers le fond sombre comme sur l'écran.
// Renvoie false (rien de dessiné) si le fichier n'est pas une image lisible par pdfkit.
function drawSidePhoto(doc, bytes, side) {
  const photoW = PAGE.width * 0.42;
  const photoX = side === 'right' ? PAGE.width - photoW : 0;
  try {
    doc.save();
    doc.rect(photoX, 0, photoW, PAGE.height).clip();
    doc.image(bytes, photoX, 0, { cover: [photoW, PAGE.height], align: 'center', valign: 'top' });
    doc.restore();
  } catch {
    doc.restore();
    return false;
  }
  doc.save().opacity(0.28).rect(photoX, 0, photoW, PAGE.height).fill(INK).restore();
  const fadeW = photoW * 0.58;
  const fade = side === 'right' ? doc.linearGradient(photoX, 0, photoX + fadeW, 0) : doc.linearGradient(photoW, 0, photoW - fadeW, 0);
  fade.stop(0, '#111111', 1).stop(1, '#111111', 0);
  doc.rect(side === 'right' ? photoX - 1 : photoW - fadeW, 0, fadeW + 1, PAGE.height).fill(fade);
  return true;
}

function drawCoverPage(doc, invitation, fonts, coverBytes) {
  drawBackground(doc);

  const hasPhoto = coverBytes ? drawSidePhoto(doc, coverBytes, 'right') : false;

  drawBokeh(doc);
  drawCornerBranches(doc);

  const zoneX = hasPhoto ? 40 : 0;
  const zoneW = hasPhoto ? PAGE.width * 0.58 - 40 : PAGE.width;
  const zoneCx = zoneX + zoneW / 2;
  const textW = zoneW - 90;
  const textX = zoneCx - textW / 2;
  const title = textForPrint(invitation.namesLine || invitation.title, 'Livre d\'or');
  const dateText = invitation.eventDate
    ? new Date(invitation.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Mesure d'abord (heightOfString), dessine ensuite : seul moyen de centrer verticalement tout le
  // bloc, quelle que soit la longueur des noms ou de la date.
  const bigSize = fonts.hasScript ? 78 : 48;
  doc.font(fonts.SerifItalic).fontSize(12);
  const eyebrowH = doc.heightOfString('SOUVENIRS DE MARIAGE', { width: textW, align: 'center', characterSpacing: 4 });
  doc.font(fonts.Script).fontSize(bigSize);
  const bigH = doc.heightOfString("Livre d'Or", { width: textW, align: 'center' });
  doc.font(fonts.SerifBold).fontSize(21);
  const namesH = doc.heightOfString(title, { width: textW, align: 'center', characterSpacing: 1 });
  let dateH = 0;
  if (dateText) {
    doc.font(fonts.Serif).fontSize(11);
    dateH = doc.heightOfString(dateText, { width: textW, align: 'center', characterSpacing: 1 });
  }
  const GAP_EYEBROW = 14;
  const GAP_DIVIDER = 22;
  const GAP_NAMES = 20;
  const GAP_DATE = 16;
  const total = eyebrowH + GAP_EYEBROW + bigH + GAP_DIVIDER + 12 + GAP_NAMES + namesH + (dateText ? GAP_DATE + dateH : 0);
  let y = (PAGE.height - total) / 2;

  doc.fillColor(GOLD).font(fonts.SerifItalic).fontSize(12)
    .text('SOUVENIRS DE MARIAGE', textX, y, { width: textW, align: 'center', characterSpacing: 4 });
  y += eyebrowH + GAP_EYEBROW;

  doc.fillColor('#F6D98E').font(fonts.Script).fontSize(bigSize).text("Livre d'Or", textX, y, { width: textW, align: 'center' });
  y += bigH + GAP_DIVIDER;

  drawDivider(doc, zoneCx, y, Math.min(120, textW / 3), 12);
  y += 12 + GAP_NAMES;

  doc.fillColor(GOLD_BRIGHT).font(fonts.SerifBold).fontSize(21).text(title, textX, y, { width: textW, align: 'center', characterSpacing: 1 });
  y += namesH;

  if (dateText) {
    y += GAP_DATE;
    doc.fillColor(IVORY).opacity(0.78).font(fonts.Serif).fontSize(11).text(dateText, textX, y, { width: textW, align: 'center', characterSpacing: 1 });
    doc.opacity(1);
  }
}

// Dernière page : un remerciement, avec la photo des mariés cette fois à gauche (la couverture en miroir).
function drawClosingPage(doc, invitation, fonts, coverBytes, count) {
  doc.addPage();
  drawBackground(doc);
  drawBokeh(doc);
  const hasPhoto = coverBytes ? drawSidePhoto(doc, coverBytes, 'left') : false;
  drawCornerBranches(doc, hasPhoto);

  const zoneX = hasPhoto ? PAGE.width * 0.42 : 0;
  const zoneW = hasPhoto ? PAGE.width * 0.58 - 40 : PAGE.width;
  const zoneCx = zoneX + zoneW / 2;
  const textW = zoneW - 90;
  const textX = zoneCx - textW / 2;
  const title = textForPrint(invitation.namesLine || invitation.title, "Livre d'or");
  const dateText = invitation.eventDate
    ? new Date(invitation.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const lines = [
    { text: 'AVEC TOUT NOTRE AMOUR', font: fonts.SerifItalic, size: 12, color: GOLD, gap: 14, spacing: 4 },
    { text: 'Merci', font: fonts.Script, size: fonts.hasScript ? 92 : 56, color: '#F6D98E', gap: 18 },
    { divider: true, gap: 22 },
    { text: "d'avoir partagé notre bonheur", font: fonts.SerifItalic, size: 17, color: IVORY, gap: 20 },
    { text: title, font: fonts.SerifBold, size: 21, color: GOLD_BRIGHT, gap: 16, spacing: 1 },
    {
      text: `${count} mot${count > 1 ? 's' : ''} d'amour réunis${dateText ? ` · ${dateText}` : ''}`,
      font: fonts.Serif,
      size: 10.5,
      color: IVORY,
      opacity: 0.72,
      spacing: 1,
    },
  ];
  const heights = lines.map((line) => {
    if (line.divider) return 12;
    doc.font(line.font).fontSize(line.size);
    return doc.heightOfString(line.text, { width: textW, align: 'center', characterSpacing: line.spacing || 0 });
  });
  const total = heights.reduce((sum, h) => sum + h, 0) + lines.slice(0, -1).reduce((sum, line) => sum + line.gap, 0);
  let y = (PAGE.height - total) / 2;
  lines.forEach((line, i) => {
    if (line.divider) {
      drawDivider(doc, zoneCx, y + 6, Math.min(120, textW / 3), 12);
    } else {
      doc.fillColor(line.color).opacity(line.opacity ?? 1).font(line.font).fontSize(line.size)
        .text(line.text, textX, y, { width: textW, align: 'center', characterSpacing: line.spacing || 0 });
      doc.opacity(1);
    }
    y += heights[i] + (line.gap || 0);
  });
}

// ----- Blocs de texte : latin (mise en page de pdfkit) ou arabe (droite à gauche) -----
// pdfkit ne gère pas le sens de lecture : un texte arabe ressort avec la ponctuation du mauvais côté
// et, dès qu'il contient un mot latin ou un chiffre, avec les mots dans le désordre. Pour les textes
// en arabe, on découpe donc nous-mêmes les lignes (retour à la ligne sur les espaces), on ordonne
// chaque ligne à la façon d'un paragraphe de droite à gauche, puis on pose chaque morceau l'un après
// l'autre (voir drawRtlLine). Le texte latin garde la mise en page habituelle de pdfkit.
const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;
const STRONG_OTHER = /[\p{L}\p{N}]/u;
const RTL_PUNCTUATION = '.,;:!?\u060C\u061B\u061F\u2026';
const RTL_TOKEN = new RegExp('^([' + RTL_PUNCTUATION + ']*)(.*?)([' + RTL_PUNCTUATION + ']*)$', 'su');

// Découpe une ligne en morceaux de même nature (arabe / latin et chiffres), dans l'ORDRE VISUEL d'un
// paragraphe de droite à gauche : le premier morceau logique est à droite. Les espaces et la
// ponctuation prennent la nature de leurs voisins s'ils sont identiques, sinon celle de l'arabe.
function visualRuns(line) {
  const chars = [...line];
  const kind = chars.map((ch) => (ARABIC_LETTER.test(ch) ? 'ar' : STRONG_OTHER.test(ch) ? 'lat' : null));
  for (let i = 0; i < chars.length; i += 1) {
    if (kind[i] !== null) continue;
    let j = i;
    while (j < chars.length && kind[j] === null) j += 1;
    const left = i > 0 ? kind[i - 1] : null;
    const right = j < chars.length ? kind[j] : null;
    const resolved = left && left === right ? left : 'ar';
    for (let k = i; k < j; k += 1) kind[k] = resolved;
    i = j - 1;
  }
  const runs = [];
  chars.forEach((ch, i) => {
    const last = runs[runs.length - 1];
    if (last && last.kind === kind[i]) last.text += ch;
    else runs.push({ kind: kind[i], text: ch });
  });
  return runs.reverse();
}

// Dans un morceau arabe, la ponctuation collée à un mot (« ! », « . », « ، ») est posée de l'autre
// côté du mot : le moteur de pdfkit la remet alors du bon côté à l'affichage (vérifié à l'œil).
function mirrorPunctuation(text) {
  return text
    .split(/(\s+)/)
    .map((token) => {
      const m = token.match(RTL_TOKEN);
      return m && m[2] ? m[3] + m[2] + m[1] : token;
    })
    .join('');
}

// Retours à la ligne sur les espaces, d'après la largeur réelle des mots (police et taille déjà
// choisies sur doc). Les sauts de ligne de l'invité sont conservés.
function wrapLogicalLines(doc, text, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      if (doc.widthOfString(current + ' ' + word) <= width) current += ' ' + word;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

// Pose une ligne arabe alignée à droite sur x = right : chaque morceau est dessiné à la suite du
// précédent (du plus à gauche au plus à droite), avec sa propre largeur mesurée.
function drawRtlLine(doc, line, right, y) {
  // Espace final ajouté à chaque morceau arabe : le moteur de pdfkit fait disparaître le DERNIER espace
  // d'un morceau arabe composé (vérifié : deux mots collés sans lui) ; ainsi, c'est celui-là qui saute.
  const runs = visualRuns(line.trim()).map((run) => ({ ...run, text: run.kind === 'ar' ? `${mirrorPunctuation(run.text)} ` : run.text }));
  const widths = runs.map((run) => doc.widthOfString(run.text));
  let x = right - widths.reduce((sum, w) => sum + w, 0);
  runs.forEach((run, i) => {
    doc.text(run.text, x, y, { lineBreak: false });
    x += widths[i];
  });
}

const MESSAGE_SIZES = [20, 18, 16, 14, 12.5, 11];
// L'arabe (Naskh) a des lettres plus petites et des signes qui dépassent : taille et interligne plus
// généreux, comme .gb-rtl à l'écran.
const ARABIC_MESSAGE_SIZES = [25, 22, 19.5, 17, 15, 13];
const ARABIC_LINE_STEP = 1.65;

// spec : { font, size, text, width, lineGap, rtl }. Retourne la hauteur occupée (et les lignes si arabe).
function measureTextBlock(doc, spec) {
  doc.font(spec.font).fontSize(spec.size);
  if (spec.rtl) {
    const lines = wrapLogicalLines(doc, spec.text, spec.width);
    const step = spec.size * ARABIC_LINE_STEP;
    return { height: lines.length * step, lines, step };
  }
  return { height: doc.heightOfString(spec.text, { width: spec.width, lineGap: spec.lineGap }) };
}

function drawTextBlock(doc, spec, layout, x, y, { color, opacity = 1 }) {
  doc.fillColor(color).opacity(opacity).font(spec.font).fontSize(spec.size);
  if (spec.rtl) layout.lines.forEach((line, i) => drawRtlLine(doc, line, x + spec.width, y + i * layout.step));
  else doc.text(spec.text, x, y, { width: spec.width, lineGap: spec.lineGap });
  doc.opacity(1);
}

// Plus grande taille de texte (parmi quelques paliers) pour laquelle le message tient dans la
// hauteur disponible : jamais de texte tronqué, jamais de page supplémentaire.
function fitTextBlock(doc, base, sizes, maxHeight) {
  let spec = null;
  let layout = null;
  for (const size of sizes) {
    spec = { ...base, size, lineGap: size * 0.38 };
    layout = measureTextBlock(doc, spec);
    if (layout.height <= maxHeight) break;
  }
  return { spec, layout };
}

// Avatar rond : photo recadrée (cover) dans un cercle, anneau doré, filet sombre intérieur et halo.
// Les portraits gardent le haut de la photo (là où se trouve le visage), comme à l'écran.
function drawAvatar(doc, photoBytes, cx, cy, radius, portrait) {
  for (let i = 3; i >= 1; i -= 1) {
    doc.save().opacity(0.07 * i).circle(cx, cy, radius + i * 4).fill('#E4B65E').restore();
  }
  doc.save();
  doc.circle(cx, cy, radius).clip();
  doc.rect(cx - radius, cy - radius, radius * 2, radius * 2).fill('#14110C');
  try {
    doc.image(photoBytes, cx - radius, cy - radius, { cover: [radius * 2, radius * 2], align: 'center', valign: portrait ? 'top' : 'center' });
  } catch {
    // Photo illisible par pdfkit (format inattendu) : le témoignage reste publié sans image
    // plutôt que de faire échouer tout l'export.
  }
  doc.restore();
  doc.save().lineWidth(2.6).strokeColor('#D9AE62').circle(cx, cy, radius - 1.3).stroke().restore();
  doc.save().lineWidth(1.2).strokeColor('#0A0908').opacity(0.85).circle(cx, cy, radius - 3.4).stroke().restore();
}

function drawEntryPage(doc, entry, photoBytes, fonts, pageIndex, pageCount) {
  doc.addPage();
  drawBackground(doc);
  drawBokeh(doc);
  drawCornerBranches(doc);

  // En-tête : titre en script, cœur entre deux filets.
  doc.fillColor('#F6D98E').font(fonts.Script).fontSize(fonts.hasScript ? 38 : 26)
    .text("Livre d'Or", 0, fonts.hasScript ? 14 : 20, { width: PAGE.width, align: 'center' });
  drawDivider(doc, PAGE.width / 2, 70, 150, 13);

  // Pied de page : "Merci d'être ici" et compteur, comme à l'écran.
  drawDivider(doc, PAGE.width / 2, 488, 110, 11);
  doc.fillColor('#E9C47A').font(fonts.Script).fontSize(fonts.hasScript ? 22 : 15)
    .text("Merci d'être ici", 0, fonts.hasScript ? 496 : 498, { width: PAGE.width, align: 'center' });
  doc.fillColor('#D9B66F').font(fonts.Serif).fontSize(9)
    .text(`${pageIndex + 1} / ${pageCount}`, PAGE.width - 270, 507, { width: 130, align: 'right', characterSpacing: 1 });

  const printOptions = { arabic: fonts.hasArabic };
  const message = textForPrint(entry.message, undefined, printOptions);
  const name = textForPrint(entry.guestName, 'Un invité', printOptions);
  const tableLine = entry.tableNumber ? `Table ${textForPrint(String(entry.tableNumber), '')}`.trim() : '';
  // Message ou nom en arabe : police arabe et sens de lecture de droite à gauche, le reste de la
  // page ne change pas.
  const messageRtl = fonts.hasArabic && isArabicText(message);
  const nameRtl = fonts.hasArabic && isArabicText(name);

  const BODY_TOP = 104;
  const BODY_BOTTOM = 462;
  const bodyHeight = BODY_BOTTOM - BODY_TOP;
  const photoDiameter = 150;
  const hasPhoto = Boolean(photoBytes);
  const margin = 86;
  const textX = hasPhoto ? margin + photoDiameter + 42 : (PAGE.width - 740) / 2;
  const textW = hasPhoto ? PAGE.width - 70 - textX : 740;

  const nameSpec = { font: nameRtl ? fonts.Arabic : fonts.SerifBold, size: nameRtl ? 26 : 22, text: name, width: textW, lineGap: 0, rtl: nameRtl };
  const nameLayout = measureTextBlock(doc, nameSpec);
  let tableH = 0;
  if (tableLine) {
    doc.font(fonts.SerifItalic).fontSize(11);
    tableH = doc.heightOfString(tableLine, { width: textW, align: nameRtl ? 'right' : 'left' });
  }
  const GAP_TABLE = 3;
  const GAP_MESSAGE = 16;
  const headH = nameLayout.height + (tableLine ? GAP_TABLE + tableH : 0);
  const { spec: messageSpec, layout: messageLayout } = fitTextBlock(
    doc,
    { font: messageRtl ? fonts.Arabic : fonts.Serif, text: message, width: textW, rtl: messageRtl },
    messageRtl ? ARABIC_MESSAGE_SIZES : MESSAGE_SIZES,
    bodyHeight - headH - GAP_MESSAGE
  );
  const textBlockH = headH + GAP_MESSAGE + messageLayout.height;
  const groupH = Math.max(textBlockH, hasPhoto ? photoDiameter : 0);
  let y = BODY_TOP + (bodyHeight - groupH) / 2;

  if (hasPhoto) {
    const portrait = entry.photo?.width && entry.photo?.height && entry.photo.width / entry.photo.height < 0.85;
    drawAvatar(doc, photoBytes, margin + photoDiameter / 2, y + photoDiameter / 2, photoDiameter / 2, portrait);
  }

  drawTextBlock(doc, nameSpec, nameLayout, textX, y, { color: GOLD_BRIGHT });
  y += nameLayout.height;
  if (tableLine) {
    y += GAP_TABLE;
    doc.fillColor(IVORY).opacity(0.75).font(fonts.SerifItalic).fontSize(11).text(tableLine, textX, y, { width: textW, align: nameRtl ? 'right' : 'left' });
    doc.opacity(1);
    y += tableH;
  }
  y += GAP_MESSAGE;
  drawTextBlock(doc, messageSpec, messageLayout, textX, y, { color: IVORY });
}

async function buildGuestbookPdf(invitation, entries) {
  const doc = new PDFDocument({ size: [PAGE.width, PAGE.height], margin: 0, autoFirstPage: false, info: { Title: `Livre d'or — ${invitation.namesLine || invitation.title}` } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  const fonts = registerFonts(doc);

  const coverBytes = await loadCoverPhoto(invitation);
  doc.addPage();
  drawCoverPage(doc, invitation, fonts, coverBytes);
  doc.outline.addItem(invitation.namesLine || invitation.title, { pageNumber: 0 });

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    let photoBytes = null;
    if (entry.photo?.url) {
      try {
        photoBytes = await fetchMediaBytes(entry.photo.url);
      } catch {
        photoBytes = null; // une photo inaccessible ne doit jamais interrompre l'export
      }
      // Avatar centré sur le visage détecté (ou placé à la main) ; sans visage connu, cadrage par défaut.
      if (photoBytes && Number.isFinite(entry.photo.focusX) && Number.isFinite(entry.photo.focusY)) {
        try {
          photoBytes = await squareCropAroundFocus(photoBytes, { focusX: entry.photo.focusX, focusY: entry.photo.focusY });
        } catch {
          // recadrage impossible : l'image d'origine est utilisée telle quelle
        }
      }
    }
    drawEntryPage(doc, entry, photoBytes, fonts, i, entries.length);
  }

  if (entries.length === 0) {
    doc.addPage();
    drawBackground(doc);
    doc.fillColor(IVORY).opacity(0.7).font(fonts.SerifItalic).fontSize(14).text('Aucun témoignage à ce jour.', 0, PAGE.height / 2 - 10, { width: PAGE.width, align: 'center' });
  } else {
    // Signets : un dossier "Invités (A → Z)" avec un signet par témoignage, triés par ordre
    // alphabétique du nom — indépendant de l'ordre RÉEL des pages, resté chronologique (inchangé) :
    // un signet n'est qu'un raccourci de navigation, rien n'oblige son ordre dans le panneau à
    // suivre celui des pages, et l'alphabétique sert bien mieux une recherche ponctuelle par nom
    // qu'une liste dans l'ordre d'arrivée des messages. Le titre reprend le nom TEL QUEL (pas la
    // version nettoyée pour l'impression, voir textForPrint) : un signet est affiché par le
    // lecteur PDF avec sa propre police système, jamais dessiné avec les polices embarquées
    // — il échappe donc à la limite WinAnsi qui s'applique au texte imprimé, et peut afficher un
    // nom complet même avec des caractères non latins.
    drawClosingPage(doc, invitation, fonts, coverBytes, entries.length);
    doc.outline.addItem('Merci', { pageNumber: entries.length + 1 });
    const guestsFolder = doc.outline.addItem('Invités (A → Z)', { expanded: true });
    const bySortedName = entries
      .map((entry, i) => ({ entry, pageNumber: i + 1 }))
      .sort((a, b) => (a.entry.guestName || '').localeCompare(b.entry.guestName || '', 'fr', { sensitivity: 'base' }));
    for (const { entry, pageNumber } of bySortedName) {
      const name = (entry.guestName || '').trim() || 'Un invité';
      const label = entry.tableNumber ? `${name} (Table ${entry.tableNumber})` : name;
      guestsFolder.addItem(label, { pageNumber });
    }
  }

  doc.end();
  return done;
}

module.exports = { buildGuestbookCsv, buildGuestbookXlsx, buildGuestbookPdf, EXPORT_HEADERS };
