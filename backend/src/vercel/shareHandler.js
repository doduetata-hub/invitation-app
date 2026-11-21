// Fonction serverless dédiée à l'aperçu de partage (robots WhatsApp, Facebook, etc.) sur Vercel.
// Le code vit ici (et non dans api/share.js) pour que les `require` se résolvent depuis
// backend/node_modules, comme pour api/index.js. Réutilise getSharePage tel quel.
//
// Appelée via la réécriture vercel.json « /i/:slug » (robots seulement) -> « /api/share?slug=:slug ».
// L'ancienne route Express « /api/share/:slug » reste inchangée (Nginx/Docker et Vercel).
const express = require('express');
const rateLimit = require('express-rate-limit');
const { getSharePage } = require('../controllers/share.controller');

// LIMITEUR — ce qu'il protège réellement : un compteur EN MÉMOIRE, propre à chaque instance serverless
// (par IP). Il freine une rafale venant d'une IP vers une même instance ; il est remis à zéro à chaque
// démarrage à froid et multiplié par le nombre d'instances simultanées. Ce n'est PAS une protection
// globale de la base : un plafond global exigerait un stockage partagé (service externe, hors périmètre).
// 600/15 min : les robots de Meta/WhatsApp partagent peu d'IP pour de très nombreux liens, donc plus large
// que la limite générale de l'API (300), pour ne pas refuser inutilement un robot légitime.
//
// SLUG — source de vérité unique : la capture de chemin « /i/:slug » faite par vercel.json. La règle porte
// `missing: query slug` : une requête d'origine qui contient déjà `?slug=` ne déclenche PAS la réécriture,
// donc un `?slug=b` forgé ne peut jamais remplacer le slug du chemin. En défense en profondeur, la fonction
// refuse tout `slug` non unique (`?slug=a&slug=b` -> tableau) ou au format invalide. `guest` est ignoré.
const SHARE_LIMIT = 600;
const WINDOW_MS = 15 * 60 * 1000;
const SLUG_RE = /^[A-Za-z0-9._~-]{1,120}$/;

function createShareApp({ limit = SHARE_LIMIT } = {}) {
  const app = express();
  app.set('trust proxy', 1); // un seul saut : l'edge Vercel (comme backend/src/app.js)
  app.disable('x-powered-by');
  app.use(rateLimit({ windowMs: WINDOW_MS, limit, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/share', async (req, res) => {
    const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
    if (!SLUG_RE.test(slug)) {
      res.status(404).type('html').send('<!doctype html><html><head><meta charset="utf-8"><title>Invitation introuvable</title></head><body>Invitation introuvable.</body></html>');
      return;
    }
    req.params = { slug };
    try {
      await getSharePage(req, res);
    } catch (err) {
      console.error('[share] erreur', err && err.message);
      if (!res.headersSent) res.status(500).type('text').send('Erreur temporaire');
    }
  });

  // Tout le reste (autre chemin, autre méthode) : 404 sans détail.
  app.use((req, res) => res.status(404).type('text').send('Not found'));
  return app;
}

module.exports = { createShareApp, SLUG_RE, SHARE_LIMIT };
