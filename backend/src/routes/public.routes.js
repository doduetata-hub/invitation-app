const express = require('express');
const rateLimit = require('express-rate-limit');
const { getInvitationBySlug, submitRsvp } = require('../controllers/public.controller');

const router = express.Router();

const rsvpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/invitations/:slug', getInvitationBySlug);
router.post('/invitations/:slug/rsvp', rsvpLimiter, submitRsvp);

module.exports = router;
