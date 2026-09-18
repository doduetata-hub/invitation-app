const express = require('express');
const { setQrTokenActive, removeQrToken, getQrTokenPng } = require('../controllers/guestbook.controller');

const router = express.Router();

router.patch('/:id', setQrTokenActive);
router.delete('/:id', removeQrToken);
router.get('/:id/qrcode', getQrTokenPng);

module.exports = router;
