const QRCode = require('qrcode');
const prisma = require('../db/prismaClient');
const env = require('../config/env');
const { broadcast } = require('../services/guestbookRealtime.service');
const { PUBLIC_MEDIA_TYPES, storeGuestbookPhoto, deleteGuestbookPhoto } = require('../services/guestbookPhoto.service');

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.publicMessage = message;
  throw err;
}

// Connecte le RSVP existant au livre d'or SANS créer de deuxième système de messages : une
// entrée "DIGITAL" est un simple reflet du message déjà écrit dans Rsvp.message, liée par
// rsvpId (contrainte unique), jamais saisie indépendamment.
//
// Une fois approuvée (donc déjà passée au diaporama), l'entrée est figée : ni son texte ni son
// statut ne bougent plus ici, même si l'invité modifie encore son message depuis son lien —
// il reste libre de changer sa présence/le nombre de personnes à tout moment (ça, c'est le
// RSVP lui-même, jamais restreint), juste plus son mot du livre d'or une fois diffusé. Tant
// qu'elle n'est pas encore approuvée, l'entrée suit le message normalement ; une simple
// resoumission identique (l'invité rouvre son lien et reclique Confirmer sans rien changer) ne
// déclenche aucune mise à jour inutile. Si l'invité vide son message avant approbation,
// l'entrée disparaît — après, elle reste (voir plus haut, figée).
// Valeur de retour utilisée par submitRsvp() pour permettre au frontend de reconnaître ce même
// message si l'invité scanne ensuite un QR papier du livre d'or depuis le même appareil (voir
// GuestbookQrPage.jsx) — jamais pour l'éditer depuis là, seulement pour éviter d'en recréer un
// second par mégarde.
//
// Photo facultative (photoOp = { newPhoto, removePhoto }) : elle suit exactement le même cycle
// que le texte — figée une fois approuvée, remplacée/retirée tant que l'entrée ne l'est pas,
// supprimée avec l'entrée si l'invité vide son message. `newPhoto` est une ligne Media déjà
// créée par l'appelant : cette fonction la rattache, ou la supprime si elle ne peut pas l'être
// (entrée figée, message vidé, écriture en base échouée) — jamais de fichier laissé orphelin.
async function syncGuestbookEntry(rsvp, autoApprove, { newPhoto = null, removePhoto = false } = {}) {
  const message = rsvp.message?.trim();
  const existing = await prisma.guestbookEntry.findUnique({ where: { rsvpId: rsvp.id }, include: { photo: true } });

  if (existing?.status === 'APPROVED') {
    await deleteGuestbookPhoto(newPhoto);
    return existing;
  }

  if (!message) {
    if (existing) {
      await prisma.guestbookEntry.delete({ where: { id: existing.id } });
      await deleteGuestbookPhoto(existing.photo);
    }
    await deleteGuestbookPhoto(newPhoto);
    return null;
  }

  const photoChanged = Boolean(newPhoto) || (removePhoto && Boolean(existing?.photo));
  const changed = !existing || existing.guestName !== rsvp.name || existing.message !== message || photoChanged;
  if (!changed) return existing;

  const status = autoApprove ? 'APPROVED' : 'PENDING';
  const approvedAt = status === 'APPROVED' ? new Date() : null;

  // Sans nouvelle photo ni demande de retrait, la photo actuelle est conservée telle quelle.
  let photoId = existing?.photoId ?? null;
  if (newPhoto) photoId = newPhoto.id;
  else if (removePhoto) photoId = null;

  let entry;
  try {
    entry = await prisma.guestbookEntry.upsert({
      where: { rsvpId: rsvp.id },
      update: { guestName: rsvp.name, message, status, approvedAt, photoId },
      create: {
        invitationId: rsvp.invitationId,
        rsvpId: rsvp.id,
        source: 'DIGITAL',
        guestName: rsvp.name,
        message,
        status,
        approvedAt,
        photoId,
      },
      include: { photo: true },
    });
  } catch (err) {
    await deleteGuestbookPhoto(newPhoto).catch(() => {});
    throw err;
  }

  if (existing?.photo && existing.photoId !== entry.photoId) await deleteGuestbookPhoto(existing.photo);
  if (status === 'APPROVED') broadcast(entry.invitationId, 'entry', entry);
  return entry;
}

async function getInvitationBySlug(req, res) {
  const invitation = await prisma.invitation.findUnique({
    where: { slug: req.params.slug },
    include: {
      client: { select: { phone: true, whatsapp: true } },
      template: { select: { key: true, name: true } },
      events: { orderBy: { order: 'asc' } },
      // Jamais les photos du livre d'or (type "guestbook") : elles suivent la modération du message
      // et ne doivent pas fuiter par la charge utile publique de l'invitation.
      media: { where: { type: { in: PUBLIC_MEDIA_TYPES } }, orderBy: { order: 'asc' } },
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
    // Un lien personnalisé pointant vers un invité supprimé (ou un code invalide) doit se
    // comporter comme un lien mort, pas retomber silencieusement sur l'invitation générale
    // sans le nom — submitRsvp() rejette déjà ce cas, on aligne l'affichage dessus.
    if (!guest) {
      return res.status(404).json({ error: "Ce lien personnalisé n'est plus valide" });
    }
    // État de SON mot du livre d'or (statut + miniature de sa propre photo), pour que le formulaire
    // de modification affiche la photo déjà jointe et la verrouille une fois diffusée. Lié à son
    // lien personnel (guestCode), jamais exposé à quelqu'un d'autre.
    const guestbookEntry = guest.rsvp
      ? await prisma.guestbookEntry.findUnique({ where: { rsvpId: guest.rsvp.id }, include: { photo: true } })
      : null;
    guestInfo = {
      code: guest.guestCode,
      name: guest.name,
      maxPersons: guest.maxPersons,
      tableNumber: guest.tableNumber,
      alreadyAnswered: Boolean(guest.rsvp),
      rsvp: guest.rsvp,
      guestbook: guestbookEntry ? { status: guestbookEntry.status, photoUrl: guestbookEntry.photo?.thumbUrl ?? null } : null,
    };
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
    dressCode: invitation.dressCode,
    musicUrl: invitation.musicUrl,
    theme: invitation.theme,
    template: invitation.template,
    events: invitation.events,
    media: invitation.media,
    contactPhone: invitation.client.phone,
    contactWhatsapp: invitation.client.whatsapp,
    rsvpEditLocked: invitation.rsvpEditLocked,
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

  // Photo facultative (envoi multipart, voir uploadGuestbookPhoto) : elle illustre le MOT du
  // livre d'or, elle n'a donc pas de sens sans message. removePhoto arrive en texte ("true")
  // quand la requête est multipart.
  const removePhoto = String((req.body || {}).removePhoto) === 'true';
  if (req.file && !message?.trim()) badRequest('Ajoutez un message pour accompagner votre photo.');

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
      include: { rsvp: true },
    });
    if (!guest) badRequest('Lien invité invalide');
    // Le verrou ne bloque qu'une modification d'une réponse déjà donnée, jamais la toute
    // première confirmation d'un invité qui n'a pas encore répondu.
    if (guest.rsvp && invitation.rsvpEditLocked) {
      const err = new Error('Les modifications ne sont plus autorisées, contactez l\'organisateur.');
      err.status = 403;
      err.publicMessage = err.message;
      throw err;
    }
    if (guest.maxPersons != null && persons > guest.maxPersons) {
      badRequest(`Le nombre de personnes dépasse le maximum autorisé (${guest.maxPersons})`);
    }

    // Le nom d'un lien personnalisé est fixé par l'admin/client à la création : on l'impose ici
    // côté serveur (pas seulement en désactivant le champ côté client, contournable) pour que
    // l'invité ne puisse jamais répondre sous une autre identité que celle qui lui a été assignée.
    if (guest.name) {
      rsvpData.name = guest.name;
    }

    // La photo n'est traitée/stockée qu'ici, une fois TOUS les contrôles passés (lien valide,
    // verrou, maximum de personnes) : une requête refusée n'écrit aucun fichier. Si l'écriture
    // du RSVP échoue ensuite, la photo déjà stockée est supprimée avant de remonter l'erreur ;
    // une fois passée à syncGuestbookEntry, c'est elle qui en répond.
    const newPhoto = req.file ? await storeGuestbookPhoto(req.file, invitation.id) : null;
    let rsvp;
    try {
      rsvp = await prisma.rsvp.upsert({
        where: { guestId: guest.id },
        update: rsvpData,
        create: { ...rsvpData, guestId: guest.id, invitationId: invitation.id },
      });
    } catch (err) {
      await deleteGuestbookPhoto(newPhoto).catch(() => {});
      throw err;
    }
    const guestbookEntry = await syncGuestbookEntry(rsvp, invitation.guestbookAutoApprove, { newPhoto, removePhoto });
    return res.status(201).json({ ...rsvp, guestbookEntryId: guestbookEntry?.id ?? null, guestbookHasPhoto: Boolean(guestbookEntry?.photoId) });
  }

  const newPhoto = req.file ? await storeGuestbookPhoto(req.file, invitation.id) : null;
  let rsvp;
  try {
    rsvp = await prisma.rsvp.create({
      data: { ...rsvpData, invitationId: invitation.id },
    });
  } catch (err) {
    await deleteGuestbookPhoto(newPhoto).catch(() => {});
    throw err;
  }
  const guestbookEntry = await syncGuestbookEntry(rsvp, invitation.guestbookAutoApprove, { newPhoto, removePhoto });
  res.status(201).json({ ...rsvp, guestbookEntryId: guestbookEntry?.id ?? null, guestbookHasPhoto: Boolean(guestbookEntry?.photoId) });
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
