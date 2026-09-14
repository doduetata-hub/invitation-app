const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  list,
  getById,
  create,
  update,
  updateStatus,
  remove,
  regenerateClientAccessToken,
  revokeClientAccessToken,
  regenerateCheckinAccessToken,
  revokeCheckinAccessToken,
} = require('../controllers/invitations.controller');
const { listForInvitation, create: createEvent } = require('../controllers/events.controller');
const {
  listForInvitation: listGuests,
  create: createGuest,
  exportCsv,
  exportXlsx,
  importXlsx,
  downloadImportTemplate,
} = require('../controllers/guests.controller');
const {
  upload: uploadMedia,
  uploadMusic,
  removeMusic,
  presignMedia,
  finalizeMedia,
  presignMusic,
  finalizeMusic,
} = require('../controllers/media.controller');
const { getQrCode } = require('../controllers/qrcode.controller');
const {
  listForInvitation: listPayments,
  create: createPayment,
} = require('../controllers/payments.controller');
const { lookupByCode } = require('../controllers/checkin.controller');
const { upload, uploadAudio, uploadSpreadsheet } = require('../middleware/upload');

const router = express.Router();

// Traitement sharp coûteux en CPU par fichier : limite dédiée, plus stricte que le quota API général.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', list);
router.post('/', create);
router.get('/:id', getById);
router.patch('/:id', update);
router.patch('/:id/status', updateStatus);
router.delete('/:id', remove);

router.get('/:id/events', listForInvitation);
router.post('/:id/events', createEvent);

router.get('/:id/guests', listGuests);
router.post('/:id/guests', createGuest);
router.get('/:id/guests/export', exportCsv);
router.get('/:id/guests/export.xlsx', exportXlsx);
router.get('/:id/guests/import-template', downloadImportTemplate);
router.post('/:id/guests/import', uploadLimiter, uploadSpreadsheet.single('file'), importXlsx);

router.post('/:id/media', uploadLimiter, upload.single('file'), uploadMedia);
router.post('/:id/music', uploadLimiter, uploadAudio.single('file'), uploadMusic);
router.delete('/:id/music', removeMusic);

// Upload direct navigateur → R2 (contourne la limite de 4,5 Mo des fonctions serverless
// Vercel) : "presign" retourne une URL de dépôt signée, "finalize" traite/enregistre après
// coup. Répond { supported: false } si STORAGE_DRIVER=local (le formulaire d'upload classique
// reste alors utilisé, inchangé).
router.post('/:id/media/presign', uploadLimiter, presignMedia);
router.post('/:id/media/finalize', uploadLimiter, finalizeMedia);
router.post('/:id/music/presign', uploadLimiter, presignMusic);
router.post('/:id/music/finalize', uploadLimiter, finalizeMusic);
router.get('/:id/qrcode', getQrCode);

router.get('/:id/payments', listPayments);
router.post('/:id/payments', createPayment);

router.get('/:id/checkin/lookup', lookupByCode);

router.post('/:id/client-access-token', regenerateClientAccessToken);
router.delete('/:id/client-access-token', revokeClientAccessToken);

router.post('/:id/checkin-access-token', regenerateCheckinAccessToken);
router.delete('/:id/checkin-access-token', revokeCheckinAccessToken);

module.exports = router;
