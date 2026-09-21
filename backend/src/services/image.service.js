const sharp = require('sharp');
const heicConvert = require('heic-convert');

const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];

function invalidImage(message) {
  const err = new Error(message);
  err.status = 400;
  err.publicMessage = message;
  return err;
}

// Partagé par processImage (couverture/galerie) et processGuestbookPhoto : un seul endroit
// connaît la particularité HEIC, jamais dupliquée. sharp/libvips n'embarque pas le décodeur HEVC
// (restriction de licence) : on convertit d'abord le HEIC en JPEG via une bibliothèque WASM
// dédiée, puis on redonne la main à sharp pour le redimensionnement/la compression habituels.
async function decodeHeicIfNeeded(buffer, mimetype) {
  if (!HEIC_MIME_TYPES.includes(mimetype)) return buffer;
  try {
    return await heicConvert({ buffer, format: 'JPEG', quality: 0.92 });
  } catch {
    throw invalidImage('Fichier HEIC illisible ou corrompu');
  }
}

async function processImage(buffer, { maxWidth = 1600, quality = 82, mimetype } = {}) {
  const sourceBuffer = await decodeHeicIfNeeded(buffer, mimetype);

  let image = sharp(sourceBuffer, { failOn: 'error' });
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    const err = new Error('Fichier image invalide');
    err.status = 400;
    err.publicMessage = err.message;
    throw err;
  }

  if (metadata.width > maxWidth) {
    image = image.resize({ width: maxWidth });
  }

  const outputBuffer = await image.rotate().jpeg({ quality, mozjpeg: true }).toBuffer();
  return { buffer: outputBuffer, ext: 'jpg', contentType: 'image/jpeg' };
}

// Photos du livre d'or, envoyées par des invités anonymes : contrairement à processImage (réservé
// à l'admin authentifié), on ne se fie PAS au type déclaré par le navigateur. Le format réel est
// lu par sharp dans le contenu du fichier, et seuls JPEG/PNG/WebP sont acceptés : un SVG (qui
// pourrait embarquer du script), un GIF, un TIFF ou n'importe quel autre fichier renommé en
// .jpg sont refusés. Le fichier d'origine n'est jamais conservé ni servi : on produit toujours
// une image ré-encodée (donc sans EXIF/GPS, orientation appliquée) et une miniature.
const GUESTBOOK_PHOTO_FORMATS = ['jpeg', 'png', 'webp'];
const GUESTBOOK_PHOTO_MAX_PIXELS = 64 * 1024 * 1024; // borne mémoire : refuse les "bombes" de décompression
const GUESTBOOK_DISPLAY_SIZE = 2000; // plus grand côté : net en Full HD comme en 4K, sans être lourd
const GUESTBOOK_THUMB_SIZE = 480;

async function processGuestbookPhoto(buffer, { mimetype } = {}) {
  const sourceBuffer = await decodeHeicIfNeeded(buffer, mimetype);
  const open = () => sharp(sourceBuffer, { failOn: 'error', limitInputPixels: GUESTBOOK_PHOTO_MAX_PIXELS });

  let metadata;
  try {
    metadata = await open().metadata();
  } catch {
    throw invalidImage("Ce fichier n'est pas une image valide (JPEG, PNG ou WebP).");
  }
  // Après conversion HEIC le contenu est un JPEG : le format réel à vérifier est celui de
  // sourceBuffer, pas celui déclaré à l'upload.
  if (!GUESTBOOK_PHOTO_FORMATS.includes(metadata.format) || !metadata.width || !metadata.height) {
    throw invalidImage("Ce fichier n'est pas une image valide (JPEG, PNG ou WebP).");
  }

  const render = async (size, quality) => {
    const { data, info } = await open()
      .rotate() // applique l'orientation EXIF avant de la supprimer
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }) // PNG/WebP transparents : JPEG n'a pas d'alpha
      .jpeg({ quality, mozjpeg: true }) // sharp ne conserve aucune métadonnée par défaut (EXIF/GPS/ICC exclus)
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height };
  };

  let display;
  let thumb;
  try {
    display = await render(GUESTBOOK_DISPLAY_SIZE, 84);
    thumb = await render(GUESTBOOK_THUMB_SIZE, 78);
  } catch {
    throw invalidImage("Cette image n'a pas pu être traitée. Essayez une autre photo.");
  }

  return { display, thumb, contentType: 'image/jpeg', ext: 'jpg' };
}

module.exports = { processImage, processGuestbookPhoto };
