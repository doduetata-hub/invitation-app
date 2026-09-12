const sharp = require('sharp');
const heicConvert = require('heic-convert');

const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];

async function processImage(buffer, { maxWidth = 1600, quality = 82, mimetype } = {}) {
  let sourceBuffer = buffer;

  if (HEIC_MIME_TYPES.includes(mimetype)) {
    // sharp/libvips n'embarque pas le décodeur HEVC (restriction de licence) : on convertit
    // d'abord le HEIC en JPEG via une bibliothèque WASM dédiée, puis on redonne la main à sharp
    // pour le redimensionnement/la compression habituels.
    try {
      sourceBuffer = await heicConvert({ buffer, format: 'JPEG', quality: 0.92 });
    } catch {
      const err = new Error('Fichier HEIC illisible ou corrompu');
      err.status = 400;
      err.publicMessage = err.message;
      throw err;
    }
  }

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

module.exports = { processImage };
