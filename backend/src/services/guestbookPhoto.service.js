const crypto = require('crypto');
const prisma = require('../db/prismaClient');
// Chemin explicite : voir le commentaire équivalent dans invitations.controller.js.
const storage = require('./storage/index.js');
const { processGuestbookPhoto } = require('./image.service');

// Les photos du livre d'or sont stockées comme n'importe quel média (table Media, mêmes pilotes
// de stockage local/S3) mais sous ce type distinct : il permet de ne JAMAIS les mélanger à la
// couverture/galerie de l'invitation, qui sont, elles, servies publiquement telles quelles.
const GUESTBOOK_MEDIA_TYPE = 'guestbook';
const PUBLIC_MEDIA_TYPES = ['cover', 'gallery'];

// Enregistre une photo déjà reçue (multer, en mémoire) : contrôle du vrai format, ré-encodage,
// miniature, stockage, ligne Media. Rien n'est écrit tant que l'image n'est pas jugée valide
// (une erreur 400 arrive avant tout stockage) ; en cas d'échec pendant le stockage ou l'écriture
// en base, les fichiers déjà déposés sont supprimés — jamais de fichier sans ligne Media.
// Noms de fichiers : UUID aléatoire, jamais le nom d'origine ni un identifiant séquentiel (les
// clés S3 ne peuvent pas contenir de sous-dossier avec le pilote de stockage actuel, voir
// s3Storage.remove — d'où le préfixe "guestbook-" plutôt qu'une arborescence).
async function storeGuestbookPhoto(file, invitationId) {
  const processed = await processGuestbookPhoto(file.buffer, { mimetype: file.mimetype });
  const base = `guestbook-${crypto.randomUUID()}`;

  let url;
  let thumbUrl;
  try {
    url = await storage.save(processed.display.buffer, `${base}.${processed.ext}`);
    thumbUrl = await storage.save(processed.thumb.buffer, `${base}-thumb.${processed.ext}`);
    return await prisma.media.create({
      data: {
        invitationId,
        type: GUESTBOOK_MEDIA_TYPE,
        url,
        thumbUrl,
        mimeType: processed.contentType,
        width: processed.display.width,
        height: processed.display.height,
        order: 0,
      },
    });
  } catch (err) {
    await Promise.all([url && storage.remove(url), thumbUrl && storage.remove(thumbUrl)]);
    throw err;
  }
}

// Supprime la ligne Media PUIS ses fichiers. Tolère une photo déjà supprimée (P2025) pour que
// deux nettoyages concurrents ne fassent pas échouer la requête qui les déclenche.
async function deleteGuestbookPhoto(media) {
  if (!media) return;
  try {
    await prisma.media.delete({ where: { id: media.id } });
  } catch (err) {
    if (err.code !== 'P2025') throw err;
  }
  await Promise.all([storage.remove(media.url), media.thumbUrl ? storage.remove(media.thumbUrl) : null]);
}

// Ce que le public (grand écran, SSE) a le droit de voir d'une photo : l'URL d'affichage et les
// dimensions — jamais l'id de la ligne Media, l'invitation, ni la miniature (réservée à l'admin).
function toPublicPhoto(media) {
  if (!media) return null;
  return { url: media.url, width: media.width, height: media.height };
}

// Liste blanche (et non liste noire) de ce qu'une entrée expose publiquement : un champ ajouté
// plus tard à GuestbookEntry (ou un secret comme submissionKey/editToken) ne fuit donc jamais
// tant qu'il n'est pas ajouté ici volontairement.
function toPublicEntry(entry) {
  return {
    id: entry.id,
    guestName: entry.guestName,
    message: entry.message,
    tableNumber: entry.tableNumber ?? null,
    source: entry.source,
    approvedAt: entry.approvedAt ?? null,
    photo: toPublicPhoto(entry.photo),
  };
}

module.exports = {
  GUESTBOOK_MEDIA_TYPE,
  PUBLIC_MEDIA_TYPES,
  storeGuestbookPhoto,
  deleteGuestbookPhoto,
  toPublicPhoto,
  toPublicEntry,
};
