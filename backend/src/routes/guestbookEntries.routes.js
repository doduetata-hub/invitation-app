const express = require('express');
const { updateStatus, bulkApprove, remove, removePhoto, resolvePendingPhoto, setPhotoFocus } = require('../controllers/guestbook.controller');

const router = express.Router();

router.post('/bulk-approve', bulkApprove);
router.patch('/:id', updateStatus);
router.patch('/:id/pending-photo', resolvePendingPhoto);
router.patch('/:id/photo-focus', setPhotoFocus);
router.delete('/:id/photo', removePhoto);
router.delete('/:id', remove);

module.exports = router;
