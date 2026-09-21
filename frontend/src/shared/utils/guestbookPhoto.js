// Préparation côté navigateur d'une photo du livre d'or avant envoi.
//
// Pourquoi ne pas envoyer le fichier tel quel : une photo de smartphone pèse 3 à 10 Mo, or le
// backend tourne en fonction serverless (Vercel) qui refuse toute requête au-dessus de ~4,5 Mo.
// On réduit donc la photo ici (côté long <= 2000 px, JPEG) avant l'envoi : elle passe quelle que
// soit sa taille d'origine, et l'upload reste rapide en 4G dans une salle mal couverte. Le
// serveur ne s'y fie pas pour autant : il revalide le vrai format et ré-encode de son côté
// (voir processGuestbookPhoto). Le ré-encodage par canvas retire aussi l'EXIF/GPS et applique
// l'orientation avant même l'envoi.

export const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024; // 10 Mo, la limite annoncée à l'invité
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // sous la limite de ~4,5 Mo de la plateforme
const MAX_SIDE = 2000;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

export const PHOTO_ACCEPT = ACCEPTED_TYPES.join(',');

function fail(message) {
  const err = new Error(message);
  err.userMessage = message;
  return err;
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// Renvoie { file, previewUrl } : `file` est ce qu'il faut envoyer, `previewUrl` (URL d'objet,
// à révoquer avec URL.revokeObjectURL quand on n'en a plus besoin) sert à l'aperçu — null quand
// le navigateur ne sait pas afficher le format (HEIC hors Safari), l'envoi reste alors possible.
export async function prepareGuestbookPhoto(file) {
  const typeOk = ACCEPTED_TYPES.includes(file.type) || (!file.type && ACCEPTED_EXTENSIONS.test(file.name));
  if (!typeOk) throw fail('Format de photo non supporté (JPEG, PNG ou WebP uniquement).');
  if (file.size > MAX_ORIGINAL_BYTES) throw fail('Cette photo est trop lourde (10 Mo maximum). Choisissez-en une autre.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Format que ce navigateur ne sait pas décoder (typiquement HEIC hors Safari) : on envoie
    // l'original tel quel si la plateforme l'accepte, le serveur sait convertir le HEIC.
    if (file.size <= MAX_UPLOAD_BYTES) return { file, previewUrl: null };
    throw fail("Cette photo n'a pas pu être préparée par votre navigateur. Essayez une photo au format JPEG.");
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    // Fond blanc : un PNG transparent deviendrait noir une fois passé en JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let blob = await canvasToBlob(canvas, quality);
    while (blob && blob.size > MAX_UPLOAD_BYTES && quality > 0.5) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, quality);
    }
    if (!blob || blob.size > MAX_UPLOAD_BYTES) {
      throw fail("Cette photo n'a pas pu être préparée. Essayez-en une autre.");
    }

    const prepared = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    return { file: prepared, previewUrl: URL.createObjectURL(prepared) };
  } finally {
    bitmap.close?.();
  }
}
