const express = require('express');
const rateLimit = require('express-rate-limit');
const { getByToken, submitEntry, updateEntry, getEntryStatus, getDisplayData, streamDisplay } = require('../controllers/guestbookAccess.controller');

const router = express.Router();

// Plus stricte que rsvpLimiter (20/15min) : un texte libre anonyme est une cible plus
// attractive pour du spam automatisé qu'un simple oui/non de présence.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/display/:slug', getDisplayData);
router.get('/display/:slug/stream', streamDisplay);
router.get('/:token', getByToken);
router.post('/:token', submitLimiter, submitEntry);
router.get('/:token/entry/:entryId', getEntryStatus);
router.patch('/:token/:entryId', submitLimiter, updateEntry);

module.exports = router;
