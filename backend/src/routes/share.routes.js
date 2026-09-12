const express = require('express');
const { getSharePage } = require('../controllers/share.controller');

const router = express.Router();

router.get('/:slug', getSharePage);

module.exports = router;
