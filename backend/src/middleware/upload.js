const multer = require('multer');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a'];

const MAX_MEDIA_SIZE = 60 * 1024 * 1024; // 60 Mo — couvre photos (avant compression) et courtes vidéos
const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15 Mo — largement suffisant pour une musique de fond

function fileFilterFor(allowedTypes, message) {
  return (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      const err = new Error(message);
      err.status = 400;
      err.publicMessage = message;
      return cb(err);
    }
    cb(null, true);
  };
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MEDIA_SIZE },
  fileFilter: fileFilterFor(
    [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES],
    'Type de fichier non supporté (JPEG, PNG, WEBP, HEIC, MP4, WEBM ou MOV uniquement)'
  ),
});

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE },
  fileFilter: fileFilterFor(
    ALLOWED_AUDIO_TYPES,
    'Type de fichier non supporté (MP3, OGG, WAV, M4A ou AAC uniquement)'
  ),
});

const ALLOWED_SPREADSHEET_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls (souvent envoyé avec ce type par les navigateurs)
  'text/csv',
  'application/csv',
];
const MAX_SPREADSHEET_SIZE = 5 * 1024 * 1024; // 5 Mo — largement suffisant pour une liste d'invités

const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SPREADSHEET_SIZE },
  fileFilter: fileFilterFor(
    ALLOWED_SPREADSHEET_TYPES,
    'Type de fichier non supporté (Excel .xlsx ou CSV uniquement)'
  ),
});

// Photo facultative jointe à un message du livre d'or (invités anonymes, sans compte). Ce
// filtre ne vérifie que le type DÉCLARÉ par le navigateur (premier tri rapide) : le vrai format
// est contrôlé sur le contenu du fichier par processGuestbookPhoto (image.service.js), qui est
// la seule barrière fiable — un fichier renommé en .jpg passe ici mais pas là-bas. multer ne
// traite que les requêtes multipart : un envoi JSON classique (sans photo) traverse ce
// middleware sans effet, donc les routes existantes gardent leur contrat d'origine.
// SVG volontairement absent : il peut embarquer du script.
const ALLOWED_GUESTBOOK_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_GUESTBOOK_PHOTO_SIZE = 10 * 1024 * 1024; // 10 Mo avant traitement

const uploadGuestbookPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_GUESTBOOK_PHOTO_SIZE, files: 1, fields: 20, parts: 25 },
  fileFilter: fileFilterFor(
    ALLOWED_GUESTBOOK_PHOTO_TYPES,
    'Format de photo non supporté (JPEG, PNG ou WebP uniquement)'
  ),
}).single('photo');

module.exports = { upload, uploadAudio, uploadSpreadsheet, uploadGuestbookPhoto, MAX_GUESTBOOK_PHOTO_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES };
