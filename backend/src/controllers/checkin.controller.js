const prisma = require('../db/prismaClient');

async function lookupByCode(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'Code requis' });
  }

  const guest = await prisma.guest.findFirst({
    where: { invitationId: req.params.id, guestCode: String(code).toUpperCase() },
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
  const guest = await prisma.guest.findUnique({ where: { id: req.params.id } });
  if (!guest) {
    return res.status(404).json({ error: 'Invité introuvable' });
  }

  if (guest.checkedInAt) {
    return res.json({ id: guest.id, checkedInAt: guest.checkedInAt, alreadyCheckedIn: true });
  }

  const updated = await prisma.guest.update({
    where: { id: req.params.id },
    data: { checkedInAt: new Date() },
  });

  res.json({ id: updated.id, checkedInAt: updated.checkedInAt, alreadyCheckedIn: false });
}

async function undoCheckInGuest(req, res) {
  try {
    const updated = await prisma.guest.update({
      where: { id: req.params.id },
      data: { checkedInAt: null },
    });
    res.json({ id: updated.id, checkedInAt: updated.checkedInAt });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Invité introuvable' });
    }
    throw err;
  }
}

async function checkInRsvp(req, res) {
  const rsvp = await prisma.rsvp.findUnique({ where: { id: req.params.id } });
  if (!rsvp) {
    return res.status(404).json({ error: 'Réponse introuvable' });
  }

  if (rsvp.checkedInAt) {
    return res.json({ id: rsvp.id, checkedInAt: rsvp.checkedInAt, alreadyCheckedIn: true });
  }

  const updated = await prisma.rsvp.update({
    where: { id: req.params.id },
    data: { checkedInAt: new Date() },
  });

  res.json({ id: updated.id, checkedInAt: updated.checkedInAt, alreadyCheckedIn: false });
}

async function undoCheckInRsvp(req, res) {
  try {
    const updated = await prisma.rsvp.update({
      where: { id: req.params.id },
      data: { checkedInAt: null },
    });
    res.json({ id: updated.id, checkedInAt: updated.checkedInAt });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Réponse introuvable' });
    }
    throw err;
  }
}

module.exports = { lookupByCode, checkInGuest, undoCheckInGuest, checkInRsvp, undoCheckInRsvp };
