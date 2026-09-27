const express = require('express');
const { proxyMedia } = require('../controllers/mediaProxy.controller');

const router = express.Router();

router.get('/', proxyMedia);

module.exports = router;
