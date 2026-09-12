const express = require('express');
const { list, getById, create, update, remove } = require('../controllers/clients.controller');

const router = express.Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', getById);
router.patch('/:id', update);
router.delete('/:id', remove);

module.exports = router;
