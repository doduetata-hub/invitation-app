// Tests des limites de requêtes (voir src/middleware/rateLimits.js). Lancer avec :
//   node --test test/rateLimits.test.js
// Les VRAIS limiteurs sont montés sur une petite application Express réelle, interrogée en HTTP :
// seules les routes (qui répondent 200) sont factices. Chaque test crée des limiteurs NEUFS (leurs
// compteurs sont en mémoire : sans cela, les requêtes d'un test compteraient dans le suivant).

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createApiLimiter, createDisplayLimiter, API_LIMIT, DISPLAY_LIMIT } = require('../src/middleware/rateLimits');

function createApp() {
  const app = express();
  app.use('/api', createApiLimiter());
  app.get('/api/guestbook/display/:slug', createDisplayLimiter(), (req, res) => res.json({ ok: true }));
  app.get('/api/guestbook/display/:slug/stream', (req, res) => res.json({ stream: true }));
  app.get('/api/auth/me', (req, res) => res.json({ me: true }));
  return app;
}

async function withServer(fn) {
  const server = await new Promise((resolve) => {
    const s = createApp().listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

// Envoie `times` requêtes par lots (plus rapide) et renvoie le décompte des codes de réponse.
async function hit(base, path, times) {
  const counts = {};
  const batch = 50;
  for (let sent = 0; sent < times; sent += batch) {
    const size = Math.min(batch, times - sent);
    const statuses = await Promise.all(
      Array.from({ length: size }, async () => {
        const res = await fetch(`${base}${path}`);
        await res.arrayBuffer();
        return res.status;
      })
    );
    statuses.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    });
  }
  return counts;
}

test("un écran du livre d'or (450 requêtes en 15 min) n'est plus bloqué par la limite générale", async () => {
  await withServer(async (base) => {
    assert.deepEqual(await hit(base, '/api/guestbook/display/mon-mariage', 450), { 200: 450 });
  });
});

test("l'écran ne consomme pas le quota des autres routes (connexion admin sur le même réseau)", async () => {
  await withServer(async (base) => {
    await hit(base, '/api/guestbook/display/mon-mariage', 450);
    assert.deepEqual(await hit(base, '/api/auth/me', API_LIMIT), { 200: API_LIMIT }, 'tout le quota général reste disponible');
  });
});

test('les autres routes restent limitées à la limite générale', async () => {
  await withServer(async (base) => {
    assert.deepEqual(await hit(base, '/api/auth/me', API_LIMIT + 5), { 200: API_LIMIT, 429: 5 });
  });
});

test('le flux /stream reste sous la limite générale', async () => {
  await withServer(async (base) => {
    assert.deepEqual(await hit(base, '/api/guestbook/display/mon-mariage/stream', API_LIMIT + 5), { 200: API_LIMIT, 429: 5 });
  });
});

test("la route de l'écran a sa propre limite finie (protection contre une interrogation en boucle)", async () => {
  await withServer(async (base) => {
    assert.deepEqual(await hit(base, '/api/guestbook/display/mon-mariage', DISPLAY_LIMIT + 5), { 200: DISPLAY_LIMIT, 429: 5 });
  });
});
