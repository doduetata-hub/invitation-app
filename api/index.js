// Point d'entrée serverless Vercel : réexporte l'app Express telle quelle (aucune
// duplication de logique). Contrairement à backend/src/server.js (app.listen), Vercel
// invoque directement le handler Express à chaque requête — pas de port à ouvrir ici.
const app = require('../backend/src/app');

module.exports = app;
