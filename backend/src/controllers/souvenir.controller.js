const prisma = require('../db/prismaClient');
const { toPublicPhoto } = require('../services/guestbookPhoto.service');
const { buildGuestbookPdf } = require('../services/guestbookExport.service');
const { fetchEntriesForExport } = require('./guestbook.controller');

// Page « Souvenir » des mariés : revoir le livre d'or en version web, le télécharger en vidéo puis en
// PDF. Le token de l'URL tient lieu d'authentification (même principe que clientAccess) et ne donne
// accès qu'à la LECTURE de cette invitation : jamais d'écriture, jamais les messages en attente ou
// rejetés, jamais les secrets des entrées (submissionKey / editToken).
async function findInvitationBySouvenirToken(token) {
  if (!token) return null;
  return prisma.invitation.findUnique({
    where: { souvenirToken: token },
    include: { media: { where: { type: 'cover' } } },
  });
}

const MOSAIC_MAX = 14;

// Ce que la page affiche : identité de la fête, état du livre d'or (ouvert ou clos), quelques chiffres
// et une mosaïque de photos pour l'accroche. Le contenu des messages, lui, ne passe pas par ici (la
// version web les lit via l'écran, le PDF et la vidéo via leurs propres routes).
async function getSouvenir(req, res) {
  const invitation = await findInvitationBySouvenirToken(req.params.token);
  if (!invitation) return res.status(404).json({ error: 'Lien invalide ou expiré' });

  const entries = await prisma.guestbookEntry.findMany({
    where: { invitationId: invitation.id, status: 'APPROVED' },
    orderBy: { approvedAt: 'asc' },
    select: {
      guestName: true,
      tableNumber: true,
      photo: { select: { url: true, width: true, height: true, focusX: true, focusY: true } },
    },
  });
  const withPhoto = entries.filter((e) => e.photo);
  const tables = new Set(entries.map((e) => e.tableNumber).filter(Boolean));

  res.json({
    namesLine: invitation.namesLine,
    title: invitation.title,
    eventDate: invitation.eventDate ?? null,
    slug: invitation.slug,
    status: invitation.status,
    coverUrl: invitation.media.find((m) => m.type === 'cover')?.url || null,
    hasMusic: Boolean(invitation.musicUrl),
    closed: Boolean(invitation.guestbookClosedAt),
    closedAt: invitation.guestbookClosedAt ?? null,
    stats: { messages: entries.length, photos: withPhoto.length, tables: tables.size },
    mosaic: withPhoto.slice(-MOSAIC_MAX).map((e) => toPublicPhoto(e.photo)),
  });
}

// PDF : seulement une fois le livre d'or clos, pour qu'il soit complet (voir closeGuestbook). Même
// document que celui de l'admin (guestbookExport.service), messages approuvés uniquement.
async function downloadSouvenirPdf(req, res) {
  const invitation = await findInvitationBySouvenirToken(req.params.token);
  if (!invitation) return res.status(404).json({ error: 'Lien invalide ou expiré' });
  if (!invitation.guestbookClosedAt) {
    return res.status(403).json({ error: "Le livre d'or n'est pas encore clos : le PDF sera disponible à ce moment-là.", code: 'GUESTBOOK_OPEN' });
  }

  const data = await fetchEntriesForExport(invitation.id);
  if (!data) return res.status(404).json({ error: 'Lien invalide ou expiré' });

  const buffer = await buildGuestbookPdf(data.invitation, data.entries);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="livre-or-${invitation.slug}.pdf"`);
  res.send(buffer);
}

module.exports = { getSouvenir, downloadSouvenirPdf };
