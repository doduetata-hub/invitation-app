const express = require('express');
const { remove, update } = require('../controllers/media.controller');

const router = express.Router();

router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
