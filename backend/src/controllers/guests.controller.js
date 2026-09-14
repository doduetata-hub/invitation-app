const ExcelJS = require('exceljs');
const prisma = require('../db/prismaClient');
const { generateUniqueGuestCode } = require('../services/guestCode.service');
const { parseGuestsSpreadsheet, buildImportTemplateBuffer, MAX_IMPORT_ROWS } = require('../services/guestImport.service');

const EXPORT_HEADERS = [
  'Nom',
  'Téléphone',
  'Lien personnalisé',
  'Présence',
  'Nombre de personnes',
  'Boisson',
  'Message',
  'Date de réponse',
];

function computeStats(guests, walkInRsvps) {
  const guestRsvps = guests.map((g) => g.rsvp).filter(Boolean);
  const allRsvps = [...guestRsvps, ...walkInRsvps];

  const confirmed = allRsvps.filter((r) => r.answer === 'YES').length;
  const declined = allRsvps.filter((r) => r.answer === 'NO').length;
  const pending = guests.filter((g) => !g.rsvp).length;
  const totalPersons = allRsvps
    .filter((r) => r.answer === 'YES')
    .reduce((sum, r) => sum + r.numberOfPersons, 0);
  const arrived =
    guests.filter((g) => g.checkedInAt).length + walkInRsvps.filter((r) => r.checkedInAt).length;

  return {
    totalGuests: guests.length,
    confirmed,
    declined,
    pending,
    totalPersons,
    arrived,
  };
}

async function listForInvitation(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const [guests, walkInRsvps] = await Promise.all([
    prisma.guest.findMany({
      where: { invitationId: req.params.id },
      include: { rsvp: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rsvp.findMany({
      where: { invitationId: req.params.id, guestId: null },
      orderBy: { respondedAt: 'desc' },
    }),
  ]);

  res.json({ guests, walkInRsvps, stats: computeStats(guests, walkInRsvps) });
}

async function create(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { name, phone, maxPersons } = req.body || {};
  const guestCode = await generateUniqueGuestCode();

  const guest = await prisma.guest.create({
    data: {
      invitationId: req.params.id,
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      maxPersons: maxPersons === '' || maxPersons == null ? null : Number(maxPersons),
      guestCode,
    },
  });

  res.status(201).json(guest);
}

// Import en masse depuis un fichier Excel/CSV : épargne au client la saisie manuelle d'une
// longue liste d'invités. Chaque ligne devient un invité avec son propre lien/QR, exactement
// comme s'il avait été créé un par un via "+ Générer un lien".
async function importXlsx(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Fichier requis' });
  }

  let rows;
  try {
    rows = await parseGuestsSpreadsheet(req.file.buffer, req.file.originalname);
  } catch {
    return res.status(400).json({ error: 'Fichier illisible : vérifiez qu\'il s\'agit bien d\'un export Excel ou CSV valide' });
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Aucun invité trouvé dans ce fichier' });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return res.status(400).json({ error: `Ce fichier dépasse la limite de ${MAX_IMPORT_ROWS} invités par import` });
  }

  const created = [];
  for (const row of rows) {
    const guestCode = await generateUniqueGuestCode();
    const guest = await prisma.guest.create({
      data: { invitationId: req.params.id, name: row.name, phone: row.phone, maxPersons: row.maxPersons, guestCode },
    });
    created.push(guest);
  }

  res.status(201).json({ imported: created.length });
}

async function downloadImportTemplate(req, res) {
  const buffer = await buildImportTemplateBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="modele-import-invites.xlsx"');
  res.send(buffer);
}

// Ne touche jamais guestCode : un lien déjà envoyé à l'invité reste valide après correction.
async function update(req, res) {
  const { name, phone, maxPersons } = req.body || {};
  try {
    const guest = await prisma.guest.update({
      where: { id: req.params.id },
      data: {
        name: name?.trim() || null,
        phone: phone?.trim() || null,
        maxPersons: maxPersons === '' || maxPersons == null ? null : Number(maxPersons),
      },
    });
    res.json(guest);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Invité introuvable' });
    }
    throw err;
  }
}

async function remove(req, res) {
  try {
    await prisma.guest.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Invité introuvable' });
    }
    throw err;
  }
}

async function fetchExportData(invitationId) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) return null;

  const [guests, walkInRsvps] = await Promise.all([
    prisma.guest.findMany({ where: { invitationId }, include: { rsvp: true } }),
    prisma.rsvp.findMany({ where: { invitationId, guestId: null } }),
  ]);

  const rows = [];

  for (const g of guests) {
    rows.push([
      g.rsvp?.name || g.name || '',
      g.phone || '',
      g.guestCode,
      g.rsvp ? (g.rsvp.answer === 'YES' ? 'Présent' : 'Absent') : 'En attente',
      g.rsvp?.numberOfPersons ?? '',
      g.rsvp?.drink || '',
      g.rsvp?.message || '',
      g.rsvp?.respondedAt ? new Date(g.rsvp.respondedAt) : '',
    ]);
  }

  for (const r of walkInRsvps) {
    rows.push([
      r.name,
      '',
      '',
      r.answer === 'YES' ? 'Présent' : 'Absent',
      r.numberOfPersons,
      r.drink || '',
      r.message || '',
      new Date(r.respondedAt),
    ]);
  }

  return { invitation, rows };
}

function csvEscape(value) {
  const str = value == null ? '' : String(value instanceof Date ? value.toISOString() : value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportCsv(req, res) {
  const data = await fetchExportData(req.params.id);
  if (!data) return res.status(404).json({ error: 'Invitation introuvable' });

  const csv = [EXPORT_HEADERS, ...data.rows].map((row) => row.map(csvEscape).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="invites-${data.invitation.slug}.csv"`);
  res.send('﻿' + csv);
}

async function exportXlsx(req, res) {
  const data = await fetchExportData(req.params.id);
  if (!data) return res.status(404).json({ error: 'Invitation introuvable' });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Invitations';
  const sheet = workbook.addWorksheet('Invités');

  sheet.columns = EXPORT_HEADERS.map((header) => ({ header, key: header, width: 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of data.rows) {
    sheet.addRow(row);
  }

  sheet.getColumn(8).numFmt = 'yyyy-mm-dd hh:mm';

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="invites-${data.invitation.slug}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { listForInvitation, create, update, remove, exportCsv, exportXlsx, importXlsx, downloadImportTemplate };
