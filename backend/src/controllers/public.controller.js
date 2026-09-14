const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.publicMessage = message;
  throw err;
}

async function getInvitationBySlug(req, res) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: req.params.slug },
    include: {
      client: { select: { phone: true, whatsapp: true } },
      template: { select: { key: true, name: true } },
      events: { orderBy: { order: 'asc' } },
      media: { orderBy: { order: 'asc' } },
    },
  });

  if (!invitation || invitation.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  let guestInfo = null;
  const guestCode = req.query.guest;
  if (guestCode) {
    const guest = await prisma.guest.findFirst({
      where: { invitationId: invitation.id, guestCode: String(guestCode).toUpperCase() },
      include: { rsvp: true },
    });
    if (guest) {
      guestInfo = {
        code: guest.guestCode,
        name: guest.name,
        maxPersons: guest.maxPersons,
        alreadyAnswered: Boolean(guest.rsvp),
        rsvp: guest.rsvp,
      };
    }
  }

  res.json({
    title: invitation.title,
    namesLine: invitation.namesLine,
    eventType: invitation.eventType,
    eventDate: invitation.eventDate,
    eventTime: invitation.eventTime,
    venueName: invitation.venueName,
    address: invitation.address,
    latitude: invitation.latitude,
    longitude: invitation.longitude,
    invitationText: invitation.invitationText,
    personalMessage: invitation.personalMessage,
    musicUrl: invitation.musicUrl,
    theme: invitation.theme,
    template: invitation.template,
    events: invitation.events,
    media: invitation.media,
    contactPhone: invitation.client.phone,
    contactWhatsapp: invitation.client.whatsapp,
    guest: guestInfo,
  });
}

async function submitRsvp(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { slug: req.params.slug } });
  if (!invitation || invitation.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { guestCode, name, answer, numberOfPersons, drink, message } = req.body || {};

  if (!name?.trim()) badRequest('Le nom est requis');
  if (!['YES', 'NO'].includes(answer)) badRequest('Réponse invalide');

  const persons = Number.isFinite(Number(numberOfPersons)) ? Math.max(1, Math.trunc(Number(numberOfPersons))) : 1;

  const rsvpData = {
    name: name.trim(),
    answer,
    numberOfPersons: persons,
    drink: drink?.trim() || null,
    message: message?.trim() || null,
    respondedAt: new Date(),
  };

  if (guestCode) {
    const guest = await prisma.guest.findFirst({
      where: { invitationId: invitation.id, guestCode: String(guestCode).toUpperCase() },
    });
    if (!guest) badRequest('Lien invité invalide');
    if (guest.maxPersons != null && persons > guest.maxPersons) {
      badRequest(`Le nombre de personnes dépasse le maximum autorisé (${guest.maxPersons})`);
    }

    const rsvp = await prisma.rsvp.upsert({
      where: { guestId: guest.id },
      update: rsvpData,
      create: { ...rsvpData, guestId: guest.id, invitationId: invitation.id },
    });
    return res.status(201).json(rsvp);
  }

  const rsvp = await prisma.rsvp.create({
    data: { ...rsvpData, invitationId: invitation.id },
  });
  res.status(201).json(rsvp);
}

// QR code du lien personnalisé de l'invité, servi depuis sa propre page d'invitation
// (pas besoin que le client le génère/l'envoie à part : l'invité l'a directement en ouvrant
// son lien). Scopé slug+guestCode, sans authentification, comme le reste de l'API publique.
async function getGuestQrCode(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { slug: req.params.slug } });
  if (!invitation || invitation.status !== 'PUBLISHED') {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const guestCode = req.query.guest;
  if (!guestCode) {
    return res.status(404).json({ error: 'Code invité requis' });
  }

  const guest = await prisma.guest.findFirst({
    where: { invitationId: invitation.id, guestCode: String(guestCode).toUpperCase() },
  });
  if (!guest) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }

  const url = `${env.publicBaseUrl}/i/${invitation.slug}?guest=${guest.guestCode}`;
  const buffer = await QRCode.toBuffer(url, { width: 512, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="qrcode-${guest.guestCode}.png"`);
  res.send(buffer);
}

module.exports = { getInvitationBySlug, submitRsvp, getGuestQrCode };
