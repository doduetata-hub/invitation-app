const express = require('express');
const rateLimit = require('express-rate-limit');
const { getSouvenir, downloadSouvenirPdf } = require('../controllers/souvenir.controller');

const router = express.Router();

// Routes publiques (le token de l'URL tient lieu d'authentification, espace de 256 bits). Deux
// limiteurs : un général pour la page, et un plus strict pour le PDF, dont la génération coûte
// plusieurs secondes de calcul et de lecture des photos.
const pageLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const pdfLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });

router.get('/:token', pageLimiter, getSouvenir);
router.get('/:token/pdf', pdfLimiter, downloadSouvenirPdf);

module.exports = router;
