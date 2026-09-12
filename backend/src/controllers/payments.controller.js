const prisma = require('../db/prismaClient');

async function listForInvitation(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const payments = await prisma.payment.findMany({
    where: { invitationId: req.params.id },
    orderBy: { paidAt: 'desc' },
  });

  res.json(payments);
}

async function create(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) {
    return res.status(404).json({ error: 'Invitation introuvable' });
  }

  const { amount, method, paidAt, notes } = req.body || {};
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Montant invalide' });
  }

  const payment = await prisma.payment.create({
    data: {
      invitationId: req.params.id,
      amount: parsedAmount,
      method: method?.trim() || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      notes: notes?.trim() || null,
    },
  });

  res.status(201).json(payment);
}

async function remove(req, res) {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Paiement introuvable' });
    }
    throw err;
  }
}

module.exports = { listForInvitation, create, remove };
