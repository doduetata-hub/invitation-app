const prisma = require('../db/prismaClient');

async function listForInvitation(req, res) {
  const events = await prisma.event.findMany({
    where: { invitationId: req.params.id },
    orderBy: { order: 'asc' },
  });
  res.json(events);
}

async function create(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { title, time, location, description, order } = req.body || {};
  if (!title?.trim()) {
    return res.status(400).json({ error: 'Le titre est requis' });
  }

  const event = await prisma.event.create({
    data: {
      invitationId: req.params.id,
      title: title.trim(),
      time: time?.trim() || null,
      location: location?.trim() || null,
      description: description?.trim() || null,
      order: Number.isInteger(order) ? order : 0,
    },
  });

  res.status(201).json(event);
}

async function update(req, res) {
  const { title, time, location, description, order } = req.body || {};
  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ error: 'Le titre est requis' });
  }

  const data = {};
  if (title !== undefined) data.title = title.trim();
  if (time !== undefined) data.time = time?.trim() || null;
  if (location !== undefined) data.location = location?.trim() || null;
  if (description !== undefined) data.description = description?.trim() || null;
  if (order !== undefined) data.order = Number(order);

  try {
    const event = await prisma.event.update({ where: { id: req.params.id }, data });
    res.json(event);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Événement introuvable' });
    }
    throw err;
  }
}

async function remove(req, res) {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Événement introuvable' });
    }
    throw err;
  }
}

module.exports = { listForInvitation, create, update, remove };
