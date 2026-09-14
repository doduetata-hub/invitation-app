const ExcelJS = require('exceljs');

const IMPORT_HEADERS = ['Nom', 'Téléphone', 'Max personnes', 'Table'];
const MAX_IMPORT_ROWS = 500;

function cellText(cell) {
  const v = cell?.value;
  if (v == null) return '';
  if (typeof v === 'object' && 'text' in v) return String(v.text).trim(); // rich text / hyperlink
  if (typeof v === 'object' && v.result != null) return String(v.result).trim(); // formule
  return String(v).trim();
}

function toRow(name, phone, maxPersonsRaw, tableNumberRaw) {
  if (!name && !phone && !maxPersonsRaw && !tableNumberRaw) return null; // ligne vide
  const maxPersonsNum = maxPersonsRaw ? Number(maxPersonsRaw) : null;
  return {
    name: name || null,
    phone: phone || null,
    maxPersons: Number.isFinite(maxPersonsNum) && maxPersonsNum > 0 ? Math.trunc(maxPersonsNum) : null,
    tableNumber: tableNumberRaw || null,
  };
}

// Parseur CSV manuel (pas ExcelJS) : ExcelJS infère les types de cellule sur un CSV comme sur
// un vrai classeur, donc un téléphone tel que "+243900000000" perdait son "+" (interprété comme
// un nombre positif). En gardant tout en texte brut, aucune valeur n'est jamais réinterprétée.
function parseCsvRows(text) {
  const rows = [];
  const lines = text.replace(/^﻿/, '').split(/\r\n|\n/);
  for (const line of lines) {
    if (line === '') continue;
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

// Format attendu = celui du modèle téléchargeable : colonnes fixes (Nom, Téléphone, Max
// personnes), une ligne d'en-tête ignorée, une ligne d'invité par ligne. Volontairement
// positionnel plutôt qu'à base d'en-têtes reconnus par nom : plus simple, prévisible, et le
// modèle fourni garantit que les colonnes sont toujours dans le bon ordre.
async function parseGuestsSpreadsheet(buffer, originalName = '') {
  const isCsv = /\.csv$/i.test(originalName);
  const rows = [];

  if (isCsv) {
    const lines = parseCsvRows(buffer.toString('utf8'));
    lines.slice(1).forEach(([name, phone, maxPersonsRaw, tableNumberRaw]) => {
      const row = toRow(name, phone, maxPersonsRaw, tableNumberRaw);
      if (row) rows.push(row);
    });
  } else {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    if (sheet) {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // en-tête
        const parsed = toRow(
          cellText(row.getCell(1)),
          cellText(row.getCell(2)),
          cellText(row.getCell(3)),
          cellText(row.getCell(4))
        );
        if (parsed) rows.push(parsed);
      });
    }
  }

  return rows.slice(0, MAX_IMPORT_ROWS);
}

async function buildImportTemplateBuffer() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Invitations';
  const sheet = workbook.addWorksheet('Invités');

  sheet.columns = IMPORT_HEADERS.map((header) => ({ header, key: header, width: 24 }));
  sheet.getRow(1).font = { bold: true };
  sheet.addRow(['Jean Dupont', '+243 900 000 000', 2, 'Table 5']);

  return workbook.xlsx.writeBuffer();
}

module.exports = { parseGuestsSpreadsheet, buildImportTemplateBuffer, IMPORT_HEADERS, MAX_IMPORT_ROWS };
