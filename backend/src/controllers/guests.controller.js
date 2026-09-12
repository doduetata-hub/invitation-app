const ExcelJS = require('exceljs');
const prisma = require('../db/prismaClient');
const { generateUniqueGuestCode } = require('../services/guestCode.service');

const EXPORT_HEADERS = [
  'Nom',
  'Téléphone',
  'Lien personnalisé',
  'Présence',
  'Nombre de personnes',
  'Repas',
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
      g.rsvp?.meal || '',
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
      r.meal || '',
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

  sheet.getColumn(9).numFmt = 'yyyy-mm-dd hh:mm';

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="invites-${data.invitation.slug}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { listForInvitation, create, remove, exportCsv, exportXlsx };
