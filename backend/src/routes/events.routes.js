const express = require('express');
const { update, remove } = require('../controllers/events.controller');

const router = express.Router();

router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
