const express = require('express');
const { remove } = require('../controllers/guests.controller');
const { getGuestQrCode } = require('../controllers/qrcode.controller');
const { checkInGuest, undoCheckInGuest } = require('../controllers/checkin.controller');

const router = express.Router();

router.delete('/:id', remove);
router.get('/:id/qrcode', getGuestQrCode);
router.post('/:id/checkin', checkInGuest);
router.delete('/:id/checkin', undoCheckInGuest);

module.exports = router;
