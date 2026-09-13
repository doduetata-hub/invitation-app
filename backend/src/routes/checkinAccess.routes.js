const express = require('express');
const rateLimit = require('express-rate-limit');
const { getByToken, lookupGuestByCode, checkInGuest, undoCheckInGuest } = require('../controllers/checkinAccess.controller');

const router = express.Router();

// Route publique (pas de requireAuth) : le token lui-même tient lieu d'authentification.
const checkinAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(checkinAccessLimiter);

router.get('/:token', getByToken);
router.get('/:token/lookup', lookupGuestByCode);
router.post('/:token/guests/:guestId/checkin', checkInGuest);
router.delete('/:token/guests/:guestId/checkin', undoCheckInGuest);

module.exports = router;
