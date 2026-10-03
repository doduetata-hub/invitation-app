// Tests des limites de requêtes (voir src/middleware/rateLimits.js). Lancer avec :
//   node --test test/rateLimits.test.js
// Les VRAIS limiteurs sont montés sur une petite application Express réelle, interrogée en HTTP :
// seules les routes (qui répondent 200) sont factices.

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { apiLimiter, displayLimiter, API_LIMIT, DISPLAY_LIMIT } = require('../src/middleware/rateLimits');

function createApp() {
  const app = express();
  app.use('/api', apiLimiter);
  app.get('/api/guestbook/display/:slug', displayLimiter, (req, res) => res.json({ ok: true }));
  app.get('/api/guestbook/display/:slug/stream', (req, res) => res.json({ stream: true }));
  app.get('/api/auth/me', (req, res) => res.json({ me: true }));
  return app;
}

async function withServer(fn) {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function hit(base, path, times) {
  const statuses = [];
  for (let i = 0; i < times; i += 1) {
    const res = await fetch(`${base}${path}`);
    statuses.push(res.status);
    await res.arrayBuffer();
  }
  return statuses;
}

test("un écran du livre d'or (450 requêtes en 15 min) n'est plus bloqué par la limite générale", async () => {
  await withServer(async (base) => {
    const statuses = await hit(base, '/api/guestbook/display/mon-mariage', 450);
    assert.equal(statuses.filter((s) => s === 429).length, 0, 'aucune erreur 429 sur la route de l\'écran');
  });
});

test("l'écran ne consomme pas le quota des autres routes (connexion admin sur le même réseau)", async () => {
  await withServer(async (base) => {
    await hit(base, '/api/guestbook/display/mon-mariage', 450);
    const statuses = await hit(base, '/api/auth/me', 5);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200]);
  });
});

test('les autres routes restent limitées à la limite générale', async () => {
  await withServer(async (base) => {
    const statuses = await hit(base, '/api/auth/me', API_LIMIT + 1);
    assert.equal(statuses.slice(0, API_LIMIT).every((s) => s === 200), true);
    assert.equal(statuses[API_LIMIT], 429, 'la requête suivante est refusée');
  });
});

test('le flux /stream reste sous la limite générale', async () => {
  await withServer(async (base) => {
    const statuses = await hit(base, '/api/guestbook/display/mon-mariage/stream', API_LIMIT + 1);
    assert.equal(statuses[API_LIMIT], 429);
  });
});

test("la route de l'écran a sa propre limite finie (protection contre une interrogation en boucle)", async () => {
  await withServer(async (base) => {
    const statuses = await hit(base, '/api/guestbook/display/mon-mariage', DISPLAY_LIMIT + 1);
    assert.equal(statuses.slice(0, DISPLAY_LIMIT).every((s) => s === 200), true);
    assert.equal(statuses[DISPLAY_LIMIT], 429);
  });
});
