const express = require('express');
const { remove } = require('../controllers/payments.controller');

const router = express.Router();

router.delete('/:id', remove);

module.exports = router;
