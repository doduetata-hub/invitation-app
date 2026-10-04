const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  requireGuestListOpen,
  getByToken,
  createGuest,
  importGuests,
  downloadImportTemplate,
  updateGuest,
  removeGuest,
  getGuestQrCode,
  lookupGuestByCode,
  checkInGuest,
  undoCheckInGuest,
} = require('../controllers/clientAccess.controller');
const { uploadSpreadsheet } = require('../middleware/upload');

const router = express.Router();

// Route publique (pas de requireAuth) : le token lui-même tient lieu d'authentification.
// Rate-limit dédié, plus strict que le quota API général, pour freiner un éventuel
// brute-force de token malgré son espace de 256 bits.
const clientAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(clientAccessLimiter);

router.get('/:token', getByToken);
router.post('/:token/guests', requireGuestListOpen, createGuest);
router.get('/:token/guests/import-template', downloadImportTemplate);
router.post('/:token/guests/import', requireGuestListOpen, uploadSpreadsheet.single('file'), importGuests);
router.patch('/:token/guests/:guestId', requireGuestListOpen, updateGuest);
router.delete('/:token/guests/:guestId', requireGuestListOpen, removeGuest);
router.get('/:token/guests/:guestId/qrcode', getGuestQrCode);

router.get('/:token/checkin/lookup', lookupGuestByCode);
router.post('/:token/guests/:guestId/checkin', checkInGuest);
router.delete('/:token/guests/:guestId/checkin', undoCheckInGuest);

module.exports = router;
