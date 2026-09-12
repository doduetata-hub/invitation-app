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

module.exports = { upload, uploadAudio, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES };
