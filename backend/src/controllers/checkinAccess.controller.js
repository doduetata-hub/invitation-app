const prisma = require('../db/prismaClient');

// Homologue de clientAccess.controller.js mais volontairement beaucoup plus restreint :
// ce token est fait pour être délégué à la personne qui filtre l'entrée le jour J, qui ne
// doit JAMAIS pouvoir créer, modifier ou supprimer un invité — seulement consulter la liste,
// rechercher/scanner par code, et pointer une arrivée.
async function findInvitationByToken(token) {
  if (!token) return null;
  return prisma.invitation.findUnique({ where: { checkinAccessToken: token } });
}

function computeStats(guests) {
  const rsvps = guests.map((g) => g.rsvp).filter(Boolean);
  const confirmed = rsvps.filter((r) => r.answer === 'YES').length;
  const arrived = guests.filter((g) => g.checkedInAt).length;

  return { totalGuests: guests.length, confirmed, arrived };
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
    invitation: { title: invitation.title, namesLine: invitation.namesLine },
    guests,
    stats: computeStats(guests),
  });
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
    name: guest.rsvp?.name || guest.name,
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

module.exports = { getByToken, lookupGuestByCode, checkInGuest, undoCheckInGuest };
