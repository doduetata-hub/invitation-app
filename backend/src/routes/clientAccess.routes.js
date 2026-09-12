const express = require('express');
const rateLimit = require('express-rate-limit');
const { getByToken, createGuest, removeGuest, getGuestQrCode } = require('../controllers/clientAccess.controller');

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
router.post('/:token/guests', createGuest);
router.delete('/:token/guests/:guestId', removeGuest);
router.get('/:token/guests/:guestId/qrcode', getGuestQrCode);

module.exports = router;
