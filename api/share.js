// Point d'entrée serverless Vercel dédié à l'aperçu de partage des robots (WhatsApp, Facebook...).
// Atteint uniquement par la réécriture « /i/:slug » -> « /api/share?slug=... » de vercel.json,
// réservée aux user-agents de robots. Toute la logique est dans backend/src.
const { createShareApp } = require('../backend/src/vercel/shareHandler');

module.exports = createShareApp();
