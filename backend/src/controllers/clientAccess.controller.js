const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');
const { generateUniqueGuestCode } = require('../services/guestCode.service');

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

  const { name, phone, maxPersons } = req.body || {};
  const guestCode = await generateUniqueGuestCode();

  const guest = await prisma.guest.create({
    data: {
      invitationId: invitation.id,
      name: name?.trim() || null,
      phone: phone?.trim() || null,
      maxPersons: maxPersons === '' || maxPersons == null ? null : Number(maxPersons),
      guestCode,
    },
  });

  res.status(201).json(guest);
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

module.exports = { getByToken, createGuest, removeGuest, getGuestQrCode };
