const express = require('express');
const { updateStatus, bulkApprove, remove, removePhoto } = require('../controllers/guestbook.controller');

const router = express.Router();

router.post('/bulk-approve', bulkApprove);
router.patch('/:id', updateStatus);
router.delete('/:id/photo', removePhoto);
router.delete('/:id', remove);

module.exports = router;
