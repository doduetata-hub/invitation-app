const express = require('express');
const { updateQrToken, removeQrToken, getQrTokenPng } = require('../controllers/guestbook.controller');

const router = express.Router();

router.patch('/:id', updateQrToken);
router.delete('/:id', removeQrToken);
router.get('/:id/qrcode', getQrTokenPng);

module.exports = router;
