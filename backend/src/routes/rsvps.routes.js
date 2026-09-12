const express = require('express');
const { checkInRsvp, undoCheckInRsvp } = require('../controllers/checkin.controller');

const router = express.Router();

router.post('/:id/checkin', checkInRsvp);
router.delete('/:id/checkin', undoCheckInRsvp);

module.exports = router;
