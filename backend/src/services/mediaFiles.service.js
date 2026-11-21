const crypto = require('crypto');
const prisma = require('../db/prismaClient');
// Chemin explicite : voir le commentaire équivalent dans invitations.controller.js.
const storage = require('./storage/index.js');
// Référence au MODULE (et non fonctions déstructurées) : les tests peuvent simuler un échec de génération de variante.
const imageService = require('./image.service');

// Suffixe du fichier de variante de galerie : « <uuid>.jpg » (image affichée) et « <uuid>-w800.jpg » (variante enregistrée dans thumbUrl).
const VARIANT_SUFFIX = '-w800';

// Traite une image reçue (couverture ou galerie) : ré-encodage + dimensions finales, et, pour la galerie, variante de 800 px.
// La variante est un BONUS : si sa génération échoue, l'image principale est quand même traitée et conservée (variantError le signale).
async function prepareImage(buffer, { type, mimetype }) {
  const processed = await imageService.processImage(buffer, { maxWidth: type === 'cover' ? 1600 : 1200, mimetype });
  let variant = null;
  let variantError = null;
  if (type === 'gallery') {
    try {
      variant = await imageService.makeGalleryVariant(processed.buffer);
    } catch (err) {
      variantError = err;
      console.warn(`[media] variante de galerie non générée (l'image principale est conservée) : ${err.message}`);
    }
  }
  return { ...processed, variant, variantError };
}

// Écrit l'image (et sa variante) dans le stockage puis crée la ligne Media. Tout est déjà calculé en mémoire avant la première
// écriture ; si la suite échoue (stockage de la variante exclu, voir ci-dessous, ou base de données), ce qui a été écrit par CET appel
// est supprimé : jamais de fichier sans ligne Media, jamais de suppression d'un fichier qui n'a pas été écrit ici.
async function storeImageMedia({ invitationId, type, order, prepared }) {
  const base = crypto.randomUUID();
  const written = [];
  try {
    const url = await storage.save(prepared.buffer, `${base}.${prepared.ext}`);
    written.push(url);

    let thumbUrl = null;
    if (prepared.variant) {
      try {
        thumbUrl = await storage.save(prepared.variant.buffer, `${base}${VARIANT_SUFFIX}.${prepared.variant.ext}`);
        written.push(thumbUrl);
      } catch (err) {
        // Échec d'écriture de la variante : on garde l'image principale sans variante (thumbUrl reste null).
        console.warn(`[media] variante non enregistrée (l'image principale est conservée) : ${err.message}`);
        thumbUrl = null;
      }
    }

    return await prisma.media.create({
      data: {
        invitationId,
        type,
        url,
        thumbUrl,
        mimeType: prepared.contentType,
        width: prepared.width,
        height: prepared.height,
        order,
      },
    });
  } catch (err) {
    await Promise.all(written.map((u) => storage.remove(u)));
    throw err;
  }
}

// Supprime les fichiers d'une ligne Media (image principale ET variante), sauf ceux qu'une AUTRE ligne référence encore.
// À appeler APRÈS la suppression de la ligne : une défaillance ici laisse au pire un fichier orphelin, jamais une ligne cassée.
async function deleteMediaFiles(media) {
  const urls = [...new Set([media.url, media.thumbUrl].filter(Boolean))];
  for (const url of urls) {
    const others = await prisma.media.count({
      where: { id: { not: media.id }, OR: [{ url }, { thumbUrl: url }] },
    });
    if (others === 0) await storage.remove(url);
  }
}

module.exports = { prepareImage, storeImageMedia, deleteMediaFiles, VARIANT_SUFFIX };
