const express = require('express');
const rateLimit = require('express-rate-limit');
const { getInvitationBySlug, submitRsvp, getGuestQrCode } = require('../controllers/public.controller');
const { uploadGuestbookPhoto } = require('../middleware/upload');

const router = express.Router();

const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/invitations/:slug', getInvitationBySlug);
// uploadGuestbookPhoto : photo facultative du mot du livre d'or (multipart) ; JSON sans photo inchangé.
router.post('/invitations/:slug/rsvp', rsvpLimiter, uploadGuestbookPhoto, submitRsvp);
router.get('/invitations/:slug/qrcode', getGuestQrCode);

module.exports = router;
