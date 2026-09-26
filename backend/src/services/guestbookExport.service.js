// Exports du livre d'or : CSV/Excel (données structurées, même logique que guests.controller.js)
// et PDF (véritable souvenir imprimable, thème "Smoking & Doré"). Réutilise le driver de
// stockage déjà en place — jamais de second système de fichiers — via une simple lecture HTTP
// de l'URL déjà publique du média (identique à ce que fait déjà s3Storage.fetchByKey en interne).
const PDFDocument = require('pdfkit');
const env = require('../config/env');

// Limite connue et assumée, propre à ce PDF : les polices standard embarquées par pdfkit
// (Times, Helvetica — les 14 polices PDF de base) n'encodent que le jeu WinAnsi (latin de base +
// Europe de l'Ouest, accents français inclus) — au-delà (emojis, arabe, CJK, cyrillique...),
// elles produisent des glyphes aléatoires plutôt qu'une erreur (vérifié : aucune exception levée,
// juste du charabia à l'écran). Embarquer une police Unicode/couleur complète pour ce cas —
// jamais demandé ailleurs dans l'appli — serait disproportionné pour un simple export imprimable.
// On retire donc, UNIQUEMENT dans cette version imprimée, les caractères hors de ce répertoire :
// jamais dans la donnée elle-même, qui reste intacte partout ailleurs (base, administration,
// mode écran, où le navigateur affiche nativement emojis et toute écriture).
const WINANSI_SAFE_CHAR = /^[\u0000-~ -ÿ–—‘-‚“-„…€]$/u;

function textForPrint(text, fallback = '(message avec des caractères non imprimables — consultez le livre d\'or numérique)') {
  // Itère par point de code Unicode (pas par unité UTF-16) : un emoji composé de deux unités
  // "surrogate pairs" ne doit pas être coupé en deux caractères invalides au milieu.
  const kept = [...String(text || '')].filter((ch) => WINANSI_SAFE_CHAR.test(ch)).join('');
  const cleaned = kept.replace(/[ \t]{2,}/g, ' ').trim();
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

// Une URL de média est soit relative ("/uploads/...", stockage local) soit déjà absolue
// (stockage S3/R2) — dans les deux cas, une simple requête HTTP suffit à en récupérer le
// contenu, sans avoir à connaître le pilote de stockage réellement configuré ici.
async function fetchMediaBytes(url) {
  const fullUrl = /^https?:\/\//i.test(url) ? url : `${env.publicBaseUrl}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) throw new Error(`Impossible de récupérer le média (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

// "Livre d'or de mariage" imprimable : thème Smoking & Doré (fond noir profond, accents
// dorés, typographie serif éditoriale) — un souvenir à conserver, pas un export administratif.
// Format écran 16:9 façon diaporama (proportions PowerPoint modernes), pas une feuille A4 : une
// page par témoignage, photo (si disponible) en médaillon à gauche et texte à droite — une pile
// verticale centrée ne laisserait que du vide de chaque côté sur un format aussi large. Les
// polices intégrées de pdfkit (Times) suffisent à l'effet éditorial recherché, sans avoir à
// embarquer une police tierce dans le dépôt.
const PAGE = { width: 960, height: 540 }; // 13,33 x 7,5 po à 72 pt/po (16:9)
const GOLD = '#B8873F';
const GOLD_LIGHT = '#D6B56D';
const IVORY = '#F7F1E5';
const INK = '#0A0908';

// Toujours appelé avec une largeur explicite (jamais celle, implicite, déduite de la position
// x courante du curseur pdfkit) : c'est justement l'absence de largeur explicite qui décentrait
// le titre de la page de couverture dans une version antérieure de ce fichier.
function drawGoldRule(doc, x, y, width) {
  doc.save().strokeColor(GOLD).lineWidth(0.75).moveTo(x, y).lineTo(x + width, y).stroke().restore();
}

function drawCoverPage(doc, invitation) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(INK);

  const outerMargin = 90;
  const fullWidth = PAGE.width;
  const titleWidth = PAGE.width - outerMargin * 2; // les noms des mariés peuvent être longs
  const title = invitation.namesLine || invitation.title;
  const hasDate = Boolean(invitation.eventDate);
  const dateText = hasDate
    ? new Date(invitation.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Mesure d'abord (heightOfString), dessine ensuite : seul moyen de centrer verticalement tout
  // le bloc sur une page courte, quelle que soit la longueur des noms/de la date.
  doc.font('Times-Italic').fontSize(13);
  const eyebrowH = doc.heightOfString('SOUVENIRS DE MARIAGE', { width: fullWidth, align: 'center', characterSpacing: 4 });
  doc.font('Times-Bold').fontSize(38);
  const titleH = doc.heightOfString(title, { width: titleWidth, align: 'center' });
  doc.font('Times-Italic').fontSize(15);
  const subtitleH = doc.heightOfString("Livre d'or", { width: fullWidth, align: 'center' });
  let dateH = 0;
  if (hasDate) {
    doc.font('Times-Roman').fontSize(11);
    dateH = doc.heightOfString(dateText, { width: fullWidth, align: 'center' });
  }

  const GAP_EYEBROW_TITLE = 22;
  const GAP_TITLE_RULE = 24;
  const GAP_RULE_SUBTITLE = 20;
  const GAP_SUBTITLE_DATE = 22;

  let totalHeight = eyebrowH + GAP_EYEBROW_TITLE + titleH + GAP_TITLE_RULE + GAP_RULE_SUBTITLE + subtitleH;
  if (hasDate) totalHeight += GAP_SUBTITLE_DATE + dateH;

  let y = (PAGE.height - totalHeight) / 2;

  doc.fillColor(GOLD).font('Times-Italic').fontSize(13)
    .text('SOUVENIRS DE MARIAGE', 0, y, { width: fullWidth, align: 'center', characterSpacing: 4 });
  y += eyebrowH + GAP_EYEBROW_TITLE;

  doc.fillColor(IVORY).font('Times-Bold').fontSize(38)
    .text(title, outerMargin, y, { width: titleWidth, align: 'center' });
  y += titleH + GAP_TITLE_RULE;

  drawGoldRule(doc, (PAGE.width - 140) / 2, y, 140);
  y += GAP_RULE_SUBTITLE;

  doc.fillColor(GOLD_LIGHT).font('Times-Italic').fontSize(15)
    .text("Livre d'or", 0, y, { width: fullWidth, align: 'center' });
  y += subtitleH;

  if (hasDate) {
    y += GAP_SUBTITLE_DATE;
    doc.fillColor(IVORY).opacity(0.75).font('Times-Roman').fontSize(11)
      .text(dateText, 0, y, { width: fullWidth, align: 'center' });
    doc.opacity(1);
  }
}

// Empile message / filet doré / signature / table, centré verticalement sur la hauteur de la
// page (mesuré via heightOfString avant de rien dessiner, pour s'adapter à un message court ou
// long). Sans photo : bloc centré horizontalement aussi, précédé d'un guillemet décoratif. Avec
// photo : bloc aligné à gauche dans sa colonne, à côté du médaillon plutôt qu'en dessous.
function drawEntryText(doc, { message, guestLine, tableLine, x, width, quote }) {
  const align = quote ? 'center' : 'left';

  let quoteH = 0;
  if (quote) {
    doc.font('Times-Roman').fontSize(28);
    quoteH = doc.heightOfString('"', { width, align });
  }
  doc.font('Times-Roman').fontSize(15);
  const messageH = doc.heightOfString(message, { width, align, lineGap: 5 });
  doc.font('Times-Bold').fontSize(12);
  const guestH = doc.heightOfString(guestLine, { width, align, characterSpacing: 1 });
  let tableH = 0;
  if (tableLine) {
    doc.font('Times-Italic').fontSize(9);
    tableH = doc.heightOfString(tableLine, { width, align });
  }

  const GAP_QUOTE_MESSAGE = 18;
  const GAP_MESSAGE_RULE = 28;
  const GAP_RULE_GUEST = 16;
  const GAP_GUEST_TABLE = 6;

  let totalHeight = messageH + GAP_MESSAGE_RULE + GAP_RULE_GUEST + guestH;
  if (quote) totalHeight += quoteH + GAP_QUOTE_MESSAGE;
  if (tableLine) totalHeight += GAP_GUEST_TABLE + tableH;

  let y = (PAGE.height - totalHeight) / 2;

  if (quote) {
    doc.fillColor(GOLD).font('Times-Roman').fontSize(28).text('"', x, y, { width, align });
    y += quoteH + GAP_QUOTE_MESSAGE;
  }

  doc.fillColor(IVORY).font('Times-Roman').fontSize(15).text(message, x, y, { width, align, lineGap: 5 });
  y += messageH + GAP_MESSAGE_RULE;

  const ruleWidth = Math.min(60, width);
  const ruleX = align === 'center' ? x + (width - ruleWidth) / 2 : x;
  drawGoldRule(doc, ruleX, y, ruleWidth);
  y += GAP_RULE_GUEST;

  doc.fillColor(GOLD_LIGHT).font('Times-Bold').fontSize(12).text(guestLine, x, y, { width, align, characterSpacing: 1 });
  y += guestH;

  if (tableLine) {
    y += GAP_GUEST_TABLE;
    doc.fillColor(IVORY).opacity(0.6).font('Times-Italic').fontSize(9).text(tableLine, x, y, { width, align });
    doc.opacity(1);
  }
}

function drawEntryPage(doc, entry, photoBytes) {
  doc.addPage();
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(INK);

  const margin = 64;
  doc.fillColor(GOLD).font('Times-Italic').fontSize(9).text("LIVRE D'OR", margin, 36, { width: PAGE.width - margin * 2, characterSpacing: 3 });

  const message = textForPrint(entry.message);
  const guestLine = `— ${textForPrint(entry.guestName, 'Un invité')}`;
  const tableLine = entry.tableNumber ? `Table ${entry.tableNumber}` : null;

  if (photoBytes) {
    // Médaillon photo : cadre doré fin, coins légèrement arrondis, contenu recadré (cover) sans
    // jamais déformer le ratio d'origine — même logique de recadrage que le mode écran.
    const frameW = 260;
    const frameH = 320;
    const frameX = margin;
    const frameY = (PAGE.height - frameH) / 2;
    doc.save();
    doc.roundedRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8, 6).lineWidth(1.2).strokeColor(GOLD).stroke();
    doc.save();
    doc.roundedRect(frameX, frameY, frameW, frameH, 4).clip();
    try {
      doc.image(photoBytes, frameX, frameY, { cover: [frameW, frameH], align: 'center', valign: 'center' });
    } catch {
      // Photo illisible par pdfkit (format inattendu) : le témoignage reste publié sans image
      // plutôt que de faire échouer tout l'export.
    }
    doc.restore();
    doc.restore();

    const textX = frameX + frameW + 56;
    const textWidth = PAGE.width - margin - textX;
    drawEntryText(doc, { message, guestLine, tableLine, x: textX, width: textWidth, quote: false });
  } else {
    drawEntryText(doc, { message, guestLine, tableLine, x: margin, width: PAGE.width - margin * 2, quote: true });
  }
}

async function buildGuestbookPdf(invitation, entries) {
  const doc = new PDFDocument({ size: [PAGE.width, PAGE.height], margin: 0, autoFirstPage: false, info: { Title: `Livre d'or — ${invitation.namesLine || invitation.title}` } });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  doc.addPage();
  drawCoverPage(doc, invitation);

  for (const entry of entries) {
    let photoBytes = null;
    if (entry.photo?.url) {
      try {
        photoBytes = await fetchMediaBytes(entry.photo.url);
      } catch {
        photoBytes = null; // une photo inaccessible ne doit jamais interrompre l'export
      }
    }
    drawEntryPage(doc, entry, photoBytes);
  }

  if (entries.length === 0) {
    doc.addPage();
    doc.rect(0, 0, PAGE.width, PAGE.height).fill(INK);
    doc.fillColor(IVORY).opacity(0.7).font('Times-Italic').fontSize(14).text('Aucun témoignage à ce jour.', 0, PAGE.height / 2 - 10, { width: PAGE.width, align: 'center' });
  }

  doc.end();
  return done;
}

module.exports = { buildGuestbookCsv, buildGuestbookXlsx, buildGuestbookPdf, EXPORT_HEADERS };
