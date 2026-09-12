const prisma = require('../db/prismaClient');

function toClientInput(body) {
  const { firstName, lastName, phone, whatsapp, email, address, notes } = body || {};
  return {
    firstName: firstName?.trim(),
    lastName: lastName?.trim(),
    phone: phone?.trim() || null,
    whatsapp: whatsapp?.trim() || null,
    email: email?.trim() || null,
    address: address?.trim() || null,
    notes: notes?.trim() || null,
  };
}

async function list(req, res) {
  const { q } = req.query;

  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { invitations: true } } },
  });

  res.json(clients);
}

async function getById(req, res) {
  const client = await prisma.client.findUnique({
    where: { id: req.params.id },
    include: {
      invitations: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true, status: true, eventDate: true },
      },
    },
  });

  if (!client) {
    return res.status(404).json({ error: 'Client introuvable' });
  }

  res.json(client);
}

async function create(req, res) {
  const input = toClientInput(req.body);

  if (!input.firstName || !input.lastName) {
    return res.status(400).json({ error: 'Prénom et nom sont requis' });
  }

  const client = await prisma.client.create({ data: input });
  res.status(201).json(client);
}

async function update(req, res) {
  const input = toClientInput(req.body);

  if (!input.firstName || !input.lastName) {
    return res.status(400).json({ error: 'Prénom et nom sont requis' });
  }

  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: input,
    });
    res.json(client);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Client introuvable' });
    }
    throw err;
  }
}

async function remove(req, res) {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Client introuvable' });
    }
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: 'Impossible de supprimer ce client : des invitations lui sont associées',
      });
    }
    throw err;
  }
}

module.exports = { list, getById, create, update, remove };
