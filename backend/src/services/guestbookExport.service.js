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
// Une page par témoignage : photo (si disponible) en médaillon encadré d'un filet doré, message
// en grand, nom en signature dorée. Les polices intégrées de pdfkit (Times) suffisent à l'effet
// éditorial recherché, sans avoir à embarquer une police tierce dans le dépôt.
const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, en points
const GOLD = '#B8873F';
const GOLD_LIGHT = '#D6B56D';
const IVORY = '#F7F1E5';
const INK = '#0A0908';

function drawGoldRule(doc, y, width = 140) {
  const x = (PAGE.width - width) / 2;
  doc.save().strokeColor(GOLD).lineWidth(0.75).moveTo(x, y).lineTo(x + width, y).stroke().restore();
}

function drawCoverPage(doc, invitation) {
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(INK);
  doc.fillColor(GOLD).font('Times-Italic').fontSize(13).text('SOUVENIRS DE MARIAGE', 0, 260, { align: 'center', characterSpacing: 4 });
  doc.fillColor(IVORY).font('Times-Bold').fontSize(38).text(invitation.namesLine || invitation.title, 60, 300, { align: 'center' });
  drawGoldRule(doc, 372);
  doc.fillColor(GOLD_LIGHT).font('Times-Italic').fontSize(15).text("Livre d'or", 0, 392, { align: 'center' });
  if (invitation.eventDate) {
    const date = new Date(invitation.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.fillColor(IVORY).opacity(0.75).font('Times-Roman').fontSize(11).text(date, 0, 430, { align: 'center' });
    doc.opacity(1);
  }
}

function drawEntryPage(doc, entry, photoBytes) {
  doc.addPage();
  doc.rect(0, 0, PAGE.width, PAGE.height).fill(INK);

  const margin = 64;
  let cursorY = 90;

  doc.fillColor(GOLD).font('Times-Italic').fontSize(9).text("LIVRE D'OR", margin, 50, { characterSpacing: 3 });

  if (photoBytes) {
    // Médaillon photo : cadre doré fin, coins légèrement arrondis, contenu recadré (cover) sans
    // jamais déformer le ratio d'origine — même logique de recadrage que le mode écran.
    const frameW = 220;
    const frameH = 260;
    const frameX = (PAGE.width - frameW) / 2;
    doc.save();
    doc.roundedRect(frameX - 4, cursorY - 4, frameW + 8, frameH + 8, 6).lineWidth(1.2).strokeColor(GOLD).stroke();
    doc.save();
    doc.roundedRect(frameX, cursorY, frameW, frameH, 4).clip();
    try {
      doc.image(photoBytes, frameX, cursorY, { cover: [frameW, frameH], align: 'center', valign: 'center' });
    } catch {
      // Photo illisible par pdfkit (format inattendu) : le témoignage reste publié sans image
      // plutôt que de faire échouer tout l'export.
    }
    doc.restore();
    doc.restore();
    cursorY += frameH + 40;
  } else {
    doc.fillColor(GOLD).font('Times-Roman').fontSize(28).text('"', margin, cursorY, { width: PAGE.width - margin * 2, align: 'center' });
    cursorY += 46;
  }

  doc.fillColor(IVORY).font('Times-Roman').fontSize(15).text(textForPrint(entry.message), margin, cursorY, {
    width: PAGE.width - margin * 2,
    align: 'center',
    lineGap: 5,
  });
  cursorY = doc.y + 28;

  drawGoldRule(doc, cursorY, 60);
  cursorY += 16;

  doc.fillColor(GOLD_LIGHT).font('Times-Bold').fontSize(12).text(`— ${textForPrint(entry.guestName, 'Un invité')}`, margin, cursorY, { width: PAGE.width - margin * 2, align: 'center', characterSpacing: 1 });
  if (entry.tableNumber) {
    doc.fillColor(IVORY).opacity(0.6).font('Times-Italic').fontSize(9).text(`Table ${entry.tableNumber}`, margin, doc.y + 4, { width: PAGE.width - margin * 2, align: 'center' });
    doc.opacity(1);
  }
}

async function buildGuestbookPdf(invitation, entries) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false, info: { Title: `Livre d'or — ${invitation.namesLine || invitation.title}` } });
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
    doc.fillColor(IVORY).opacity(0.7).font('Times-Italic').fontSize(14).text('Aucun témoignage à ce jour.', 0, PAGE.height / 2 - 10, { align: 'center' });
  }

  doc.end();
  return done;
}

module.exports = { buildGuestbookCsv, buildGuestbookXlsx, buildGuestbookPdf, EXPORT_HEADERS };
