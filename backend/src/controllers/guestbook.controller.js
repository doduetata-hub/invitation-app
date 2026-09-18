const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');
const { generateUniqueGuestbookToken } = require('../services/guestbookToken.service');
const { broadcast } = require('../services/guestbookRealtime.service');

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function computeStats(entries) {
  const bySource = { DIGITAL: 0, QR: 0 };
  const byTable = {};
  let pending = 0;
  let approved = 0;
  let rejected = 0;

  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    if (e.tableNumber) byTable[e.tableNumber] = (byTable[e.tableNumber] || 0) + 1;
    if (e.status === 'PENDING') pending += 1;
    else if (e.status === 'APPROVED') approved += 1;
    else if (e.status === 'REJECTED') rejected += 1;
  }

  return { total: entries.length, pending, approved, rejected, bySource, byTable };
}

async function listForInvitation(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' });

  const entries = await prisma.guestbookEntry.findMany({
    where: { invitationId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ entries, stats: computeStats(entries) });
}

// Une entrée numérique change de statut à chaque nouvelle soumission de RSVP avec message
// (voir la synchro dans public.controller.js) : ADMIN peut donc revoir un message déjà
// approuvé si l'invité l'a modifié depuis — mais seule cette fonction-ci fait passer une
// entrée à APPROVED, jamais la synchro RSVP elle-même.
async function updateStatus(req, res) {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  const data = { status };
  if (status === 'APPROVED') data.approvedAt = new Date();

  let entry;
  try {
    entry = await prisma.guestbookEntry.update({ where: { id: req.params.id }, data });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Message introuvable' });
    throw err;
  }

  if (status === 'APPROVED') {
    broadcast(entry.invitationId, 'entry', entry);
  }

  res.json(entry);
}

async function bulkApprove(req, res) {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Aucune sélection' });
  }

  const entries = await prisma.guestbookEntry.findMany({ where: { id: { in: ids } } });
  await prisma.guestbookEntry.updateMany({
    where: { id: { in: ids } },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });

  for (const e of entries) {
    broadcast(e.invitationId, 'entry', { ...e, status: 'APPROVED', approvedAt: new Date() });
  }

  res.json({ updated: entries.length });
}

async function remove(req, res) {
  try {
    await prisma.guestbookEntry.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Message introuvable' });
    throw err;
  }
}

async function listQrTokens(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' });

  const tokens = await prisma.guestbookQrToken.findMany({
    where: { invitationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { entries: true } } },
  });

  res.json(tokens);
}

async function createQrToken(req, res) {
  const invitation = await prisma.invitation.findUnique({ where: { id: req.params.id } });
  if (!invitation) return res.status(404).json({ error: 'Invitation introuvable' });

  const { label, tableNumber } = req.body || {};
  const token = await generateUniqueGuestbookToken();

  const created = await prisma.guestbookQrToken.create({
    data: {
      invitationId: req.params.id,
      token,
      label: label?.trim() || null,
      tableNumber: tableNumber?.trim() || null,
    },
  });

  res.status(201).json(created);
}

// Désactiver (plutôt que supprimer) garde l'historique des messages déjà déposés via ce QR —
// utile si une table est renumérotée en cours de soirée : le QR imprimé cesse de fonctionner
// sans perdre les messages déjà reçus depuis cette table.
async function setQrTokenActive(req, res) {
  const { active } = req.body || {};
  try {
    const token = await prisma.guestbookQrToken.update({
      where: { id: req.params.id },
      data: { active: Boolean(active) },
    });
    res.json(token);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'QR code introuvable' });
    throw err;
  }
}

async function removeQrToken(req, res) {
  try {
    await prisma.guestbookQrToken.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'QR code introuvable' });
    throw err;
  }
}

async function getQrTokenPng(req, res) {
  const token = await prisma.guestbookQrToken.findUnique({ where: { id: req.params.id } });
  if (!token) return res.status(404).json({ error: 'QR code introuvable' });

  const url = `${env.publicBaseUrl}/guestbook/${token.token}`;
  const buffer = await QRCode.toBuffer(url, { width: 640, margin: 2 });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="livre-or-${token.label || token.id}.png"`);
  res.send(buffer);
}

module.exports = {
  listForInvitation,
  updateStatus,
  bulkApprove,
  remove,
  listQrTokens,
  createQrToken,
  setQrTokenActive,
  removeQrToken,
  getQrTokenPng,
};
