const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');
const { generateUniqueGuestCode } = require('../services/guestCode.service');
const { parseGuestsSpreadsheet, buildImportTemplateBuffer, MAX_IMPORT_ROWS } = require('../services/guestImport.service');

// Toutes les fonctions ci-dessous résolvent l'invitation UNIQUEMENT via le token de l'URL
// (jamais via un id transmis par le client) : un token ne peut donc jamais agir sur une
// invitation autre que la sienne, même si un id d'une autre invitation était deviné/forgé.
async function findInvitationByToken(token) {
  if (!token) return null;
  return prisma.invitation.findUnique({ where: { clientAccessToken: token } });
}

function computeStats(guests) {
  const rsvps = guests.map((g) => g.rsvp).filter(Boolean);
  const confirmed = rsvps.filter((r) => r.answer === 'YES').length;
  const declined = rsvps.filter((r) => r.answer === 'NO').length;
  const pending = guests.filter((g) => !g.rsvp).length;
  const totalPersons = rsvps.filter((r) => r.answer === 'YES').reduce((sum, r) => sum + r.numberOfPersons, 0);

  return { totalGuests: guests.length, confirmed, declined, pending, totalPersons };
}

async function getByToken(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const guests = await prisma.guest.findMany({
    where: { invitationId: invitation.id },
    include: { rsvp: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    invitation: { title: invitation.title, namesLine: invitation.namesLine, slug: invitation.slug },
    guests,
    stats: computeStats(guests),
  });
}

async function createGuest(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const { name, phone, maxPersons, tableNumber } = req.body || {};
  const guestCode = await generateUniqueGuestCode();

  const guest = await prisma.guest.create({
    data: {
      invitationId: invitation.id,
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      maxPersons: maxPersons === '' || maxPersons == null ? null : Number(maxPersons),
      tableNumber: tableNumber?.trim() || null,
      guestCode,
    },
  });

  res.status(201).json(guest);
}

// Import en masse depuis un fichier Excel/CSV : épargne au client la saisie manuelle d'une
// longue liste d'invités. Chaque ligne devient un invité avec son propre lien/QR, exactement
// comme s'il avait été créé un par un via "+ Générer un lien".
async function importGuests(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
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
      data: {
        invitationId: invitation.id,
        name: row.name,
        phone: row.phone,
        maxPersons: row.maxPersons,
        tableNumber: row.tableNumber,
        guestCode,
      },
    });
    created.push(guest);
  }

  res.status(201).json({ imported: created.length });
}

async function downloadImportTemplate(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const buffer = await buildImportTemplateBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="modele-import-invites.xlsx"');
  res.send(buffer);
}

// Ne touche jamais guestCode : un lien déjà envoyé à l'invité reste valide après correction.
async function updateGuest(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const existing = await prisma.guest.findFirst({
    where: { id: req.params.guestId, invitationId: invitation.id },
  });
  if (!existing) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }

  const { name, phone, maxPersons, tableNumber } = req.body || {};
  const guest = await prisma.guest.update({
    where: { id: existing.id },
    data: {
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      maxPersons: maxPersons === '' || maxPersons == null ? null : Number(maxPersons),
      tableNumber: tableNumber?.trim() || null,
    },
  });

  res.json(guest);
}

async function removeGuest(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  // deleteMany plutôt que delete : la condition invitationId fait qu'un guestId n'appartenant
  // pas à cette invitation ne supprime simplement rien, sans jamais toucher un autre invité.
  const result = await prisma.guest.deleteMany({
    where: { id: req.params.guestId, invitationId: invitation.id },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }
  res.status(204).send();
}

async function getGuestQrCode(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const guest = await prisma.guest.findFirst({
    where: { id: req.params.guestId, invitationId: invitation.id },
  });
  if (!guest || !guest.guestCode) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }

  const url = `${env.publicBaseUrl}/i/${invitation.slug}?guest=${guest.guestCode}`;
  const buffer = await QRCode.toBuffer(url, { width: 512, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="qrcode-${guest.guestCode}.png"`);
  res.send(buffer);
}

async function lookupGuestByCode(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'Code requis' });
  }

  const guest = await prisma.guest.findFirst({
    where: { invitationId: invitation.id, guestCode: String(code).toUpperCase() },
    include: { rsvp: true },
  });

  if (!guest) {
    return res.status(404).json({ error: "Aucun invité ne correspond à ce code pour cette invitation" });
  }

  res.json({
    id: guest.id,
    name: guest.name || guest.rsvp?.name,
    phone: guest.phone,
    maxPersons: guest.maxPersons,
    checkedInAt: guest.checkedInAt,
    rsvp: guest.rsvp
      ? { answer: guest.rsvp.answer, numberOfPersons: guest.rsvp.numberOfPersons }
      : null,
  });
}

async function checkInGuest(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const guest = await prisma.guest.findFirst({
    where: { id: req.params.guestId, invitationId: invitation.id },
  });
  if (!guest) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }

  if (guest.checkedInAt) {
    return res.json({ id: guest.id, checkedInAt: guest.checkedInAt, alreadyCheckedIn: true });
  }

  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: { checkedInAt: new Date() },
  });

  res.json({ id: updated.id, checkedInAt: updated.checkedInAt, alreadyCheckedIn: false });
}

async function undoCheckInGuest(req, res) {
  const invitation = await findInvitationByToken(req.params.token);
  if (!invitation) {
    return res.status(404).json({ error: 'Lien invalide ou expiré' });
  }

  const result = await prisma.guest.updateMany({
    where: { id: req.params.guestId, invitationId: invitation.id },
    data: { checkedInAt: null },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }
  res.json({ id: req.params.guestId, checkedInAt: null });
}

module.exports = {
  getByToken,
  createGuest,
  importGuests,
  downloadImportTemplate,
  updateGuest,
  removeGuest,
  getGuestQrCode,
  lookupGuestByCode,
  checkInGuest,
  undoCheckInGuest,
};
