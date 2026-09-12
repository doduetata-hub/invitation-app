const express = require('express');
const { getSummary } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/', getSummary);

module.exports = router;
