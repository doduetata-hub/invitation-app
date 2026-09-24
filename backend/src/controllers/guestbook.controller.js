const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');
const { generateUniqueGuestbookToken } = require('../services/guestbookToken.service');
const { broadcast } = require('../services/guestbookRealtime.service');
const { deleteGuestbookPhoto } = require('../services/guestbookPhoto.service');
const { buildGuestbookCsv, buildGuestbookXlsx, buildGuestbookPdf } = require('../services/guestbookExport.service');

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

  // photo : url + miniature + dimensions pour la modération (page admin authentifiée).
  // pendingPhoto : changement de photo demandé après approbation du message, à trancher à part
  // (voir resolvePendingPhoto) — jamais mêlé au statut/à la photo déjà diffusée ci-dessus.
  const mediaSelect = { id: true, url: true, thumbUrl: true, width: true, height: true };
  const entries = await prisma.guestbookEntry.findMany({
    where: { invitationId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { photo: { select: mediaSelect }, pendingPhoto: { select: mediaSelect } },
  });

  res.json({ entries, stats: computeStats(entries) });
}

// Réservé aux exports (voir plus bas) : un vrai souvenir de mariage (CSV/Excel/PDF) ne reprend
// par défaut que les témoignages APPROUVÉS — ceux réellement retenus par les mariés — jamais les
// messages encore en attente ou rejetés. `?status=all` reste disponible pour l'admin qui aurait
// besoin d'une extraction complète à des fins de vérification, hors du cadre "souvenir".
async function fetchEntriesForExport(invitationId, statusFilter) {
  const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
  if (!invitation) return null;

  const where = { invitationId };
  if (statusFilter !== 'all') where.status = 'APPROVED';

  const entries = await prisma.guestbookEntry.findMany({
    where,
    orderBy: [{ approvedAt: 'asc' }, { createdAt: 'asc' }],
    include: { photo: { select: { url: true, width: true, height: true } } },
  });

  return { invitation, entries };
}

async function exportGuestbookCsv(req, res) {
  const data = await fetchEntriesForExport(req.params.id, req.query.status);
  if (!data) return res.status(404).json({ error: 'Invitation introuvable' });

  const csv = buildGuestbookCsv(data.entries);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="livre-or-${data.invitation.slug}.csv"`);
  res.send(csv);
}

async function exportGuestbookXlsx(req, res) {
  const data = await fetchEntriesForExport(req.params.id, req.query.status);
  if (!data) return res.status(404).json({ error: 'Invitation introuvable' });

  const buffer = await buildGuestbookXlsx(data.entries);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="livre-or-${data.invitation.slug}.xlsx"`);
  res.send(buffer);
}

// "Livre d'or de mariage" imprimable — voir guestbookExport.service.js pour le thème Smoking &
// Doré et les limites assumées (emojis/écritures non latines retirés de cette seule version
// imprimée, jamais de la donnée). Peut prendre plusieurs secondes si de nombreuses photos sont
// à récupérer depuis le stockage : pas de limite de débit dédiée, réservé à l'admin authentifié,
// à l'usage occasionnel (souvenir de fin d'événement), comme les autres exports du back-office.
async function exportGuestbookPdf(req, res) {
  const data = await fetchEntriesForExport(req.params.id, req.query.status);
  if (!data) return res.status(404).json({ error: 'Invitation introuvable' });

  const buffer = await buildGuestbookPdf(data.invitation, data.entries);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="livre-or-${data.invitation.slug}.pdf"`);
  res.send(buffer);
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
    // include photo : la diffusion temps réel (broadcast) émet l'URL de la photo avec le message.
    entry = await prisma.guestbookEntry.update({ where: { id: req.params.id }, data, include: { photo: true } });
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

  const entries = await prisma.guestbookEntry.findMany({ where: { id: { in: ids } }, include: { photo: true } });
  await prisma.guestbookEntry.updateMany({
    where: { id: { in: ids } },
    data: { status: 'APPROVED', approvedAt: new Date() },
  });

  for (const e of entries) {
    broadcast(e.invitationId, 'entry', { ...e, status: 'APPROVED', approvedAt: new Date() });
  }

  res.json({ updated: entries.length });
}

// Supprimer un message supprime AUSSI sa photo (ligne Media + fichiers de stockage) : la base ne
// peut pas le faire seule (la clé étrangère est en SetNull, voir schema.prisma, précisément pour
// que retirer une photo ne supprime jamais le message). Le message est supprimé en premier : si
// le nettoyage de la photo échouait ensuite, on aurait au pire un fichier orphelin, jamais un
// message public qui pointe vers une photo disparue.
async function remove(req, res) {
  const existing = await prisma.guestbookEntry.findUnique({ where: { id: req.params.id }, include: { photo: true } });
  if (!existing) return res.status(404).json({ error: 'Message introuvable' });

  try {
    await prisma.guestbookEntry.delete({ where: { id: req.params.id } });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Message introuvable' });
    throw err;
  }
  await deleteGuestbookPhoto(existing.photo);
  res.status(204).send();
}

// Retire UNIQUEMENT la photo d'un message (le message, son statut et sa place au diaporama ne
// bougent pas). Route distincte de la suppression du message, volontairement : "retirer la
// photo" ne peut jamais être confondu avec "supprimer le message".
async function removePhoto(req, res) {
  const existing = await prisma.guestbookEntry.findUnique({ where: { id: req.params.id }, include: { photo: true } });
  if (!existing) return res.status(404).json({ error: 'Message introuvable' });
  if (!existing.photo) return res.status(204).send();

  await prisma.guestbookEntry.update({ where: { id: existing.id }, data: { photoId: null } });
  await deleteGuestbookPhoto(existing.photo);
  res.status(204).send();
}

// Tranche un changement de photo demandé par l'invité APRÈS l'approbation de son message (voir
// syncApprovedEntryPhoto côté public.controller.js) : le message et son statut restent tels
// quels, seule la photo diffusée change. `accept: true` fait passer la nouvelle photo en place
// (ou retire l'ancienne, si l'invité en avait demandé le retrait) et diffuse la mise à jour au
// mode écran ; `accept: false` rejette la demande et n'y touche pas. Jamais de fichier orphelin :
// la photo écartée (ancienne remplacée, ou nouvelle rejetée) est supprimée du stockage.
async function resolvePendingPhoto(req, res) {
  const { accept } = req.body || {};
  if (typeof accept !== 'boolean') {
    return res.status(400).json({ error: 'Paramètre "accept" invalide' });
  }

  const existing = await prisma.guestbookEntry.findUnique({
    where: { id: req.params.id },
    include: { photo: true, pendingPhoto: true },
  });
  if (!existing) return res.status(404).json({ error: 'Message introuvable' });
  if (!existing.pendingPhotoId && !existing.pendingPhotoRemoved) {
    return res.status(404).json({ error: 'Aucune photo en attente' });
  }

  const clearPending = { pendingPhotoId: null, pendingPhotoRemoved: false };

  if (!accept) {
    await deleteGuestbookPhoto(existing.pendingPhoto);
    const entry = await prisma.guestbookEntry.update({ where: { id: existing.id }, data: clearPending, include: { photo: true } });
    return res.json(entry);
  }

  const photoId = existing.pendingPhotoId ?? null;
  const entry = await prisma.guestbookEntry.update({
    where: { id: existing.id },
    data: { ...clearPending, photoId },
    include: { photo: true },
  });
  if (existing.photo && existing.photoId !== entry.photoId) await deleteGuestbookPhoto(existing.photo);
  broadcast(entry.invitationId, 'entry', entry);
  res.json(entry);
}

async function updateSettings(req, res) {
  try {
    const invitation = await prisma.invitation.update({
      where: { id: req.params.id },
      data: { guestbookAutoApprove: Boolean((req.body || {}).autoApprove) },
    });
    res.json({ guestbookAutoApprove: invitation.guestbookAutoApprove });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Invitation introuvable' });
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
  exportGuestbookCsv,
  exportGuestbookXlsx,
  exportGuestbookPdf,
  updateStatus,
  bulkApprove,
  remove,
  removePhoto,
  resolvePendingPhoto,
  updateSettings,
  listQrTokens,
  createQrToken,
  setQrTokenActive,
  removeQrToken,
  getQrTokenPng,
};
