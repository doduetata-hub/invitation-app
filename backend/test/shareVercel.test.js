// Fonction Vercel dédiée au partage (api/share.js) + règle vercel.json. Base simulée, serveur HTTP local, aucun réseau externe.
// Lancer avec : node --test test/shareVercel.test.js
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.PUBLIC_BASE_URL = 'https://invit.example.org';
const SRC = path.join(__dirname, '..', 'src');
let row;
let lastWhere;
const p = require.resolve(path.join(SRC, 'db', 'prismaClient.js'));
require.cache[p] = { id: p, filename: p, loaded: true, exports: { invitation: { findUnique: async ({ where }) => { lastWhere = where; return row; } } } };
const { createShareApp } = require(path.join(SRC, 'vercel', 'shareHandler.js'));
const { truncateDescription } = require(path.join(SRC, 'controllers', 'share.controller.js'));
const vercel = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'vercel.json'), 'utf8'));

const base = { status: 'PUBLISHED', title: 'Mariage', namesLine: 'Awa & Paul', invitationText: 'Bienvenue', personalMessage: null };
const get = (server, url, ua = 'WhatsApp/2.23') => new Promise((resolve, reject) => {
  http.get({ port: server.address().port, path: url, headers: { 'user-agent': ua } }, (r) => {
    let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => resolve({ code: r.statusCode, headers: r.headers, body: b }));
  }).on('error', reject);
});
const withServer = async (fn, opts) => {
  const server = http.createServer(createShareApp(opts)).listen(0);
  try { await fn(server); } finally { server.close(); }
};

test('slug en query : publiée -> 200 HTML avec og:*; le slug est transmis à la base', async () => {
  row = { ...base, media: [{ url: 'https://pub-x.r2.dev/c.jpg', width: 1600, height: 2000 }] };
  await withServer(async (s) => {
    const r = await get(s, '/api/share?slug=awa-et-paul&guest=abc');
    assert.equal(r.code, 200);
    assert.match(r.headers['content-type'], /text\/html/);
    assert.match(r.body, /og:image" content="https:\/\/pub-x\.r2\.dev\/c\.jpg"/);
    assert.match(r.body, /og:url" content="https:\/\/invit\.example\.org\/i\/awa-et-paul"/);
    assert.equal(lastWhere.slug, 'awa-et-paul');
  });
});
test('image locale : URL publique + chemin', async () => {
  row = { ...base, media: [{ url: '/uploads/c.jpg', width: null, height: null }] };
  await withServer(async (s) => {
    const r = await get(s, '/api/share?slug=awa-et-paul');
    assert.match(r.body, /og:image" content="https:\/\/invit\.example\.org\/uploads\/c\.jpg"/);
  });
});
test('brouillon, slug inexistant, slug absent ou invalide : 404 sans interroger la base si invalide', async () => {
  await withServer(async (s) => {
    row = { ...base, status: 'DRAFT', media: [] };
    assert.equal((await get(s, '/api/share?slug=x')).code, 404);
    row = null;
    assert.equal((await get(s, '/api/share?slug=inconnu')).code, 404);
    lastWhere = undefined;
    for (const q of ['', '?slug=', '?slug=a/b', '?slug[]=a', `?slug=${'a'.repeat(121)}`, '?slug=%3Cscript%3E']) {
      assert.equal((await get(s, `/api/share${q}`)).code, 404, q);
    }
    assert.equal(lastWhere, undefined);
  });
});
test('autres chemins : 404 ; erreur de base : 500 sans détail', async () => {
  await withServer(async (s) => {
    assert.equal((await get(s, '/autre')).code, 404);
    row = { get status() { throw new Error('secret interne'); } };
    const r = await get(s, '/api/share?slug=x');
    assert.equal(r.code, 500);
    assert.doesNotMatch(r.body, /secret/);
  });
});
test('limiteur dédié : 429 au-delà de la limite', async () => {
  row = null;
  await withServer(async (s) => {
    assert.equal((await get(s, '/api/share?slug=a')).code, 404);
    assert.equal((await get(s, '/api/share?slug=a')).code, 404);
    assert.equal((await get(s, '/api/share?slug=a')).code, 429);
  }, { limit: 2 });
});
test('description tronquée proprement (mot entier, ellipse, courte inchangée)', () => {
  assert.equal(truncateDescription('Court'), 'Court');
  const t = truncateDescription('mot '.repeat(100));
  assert.ok(t.length <= 200 && t.endsWith('…') && !/ …$/.test(t));
  assert.equal(truncateDescription(null), '');
});

// --- vercel.json : syntaxe et ordre ---
const rule = vercel.rewrites[0];
test('vercel.json : règle robots AVANT la règle générique, syntaxe has/value documentée', () => {
  assert.equal(rule.source, '/i/:slug');
  assert.equal(rule.destination, '/api/share?slug=:slug');
  assert.deepEqual(Object.keys(rule.has[0]).sort(), ['key', 'type', 'value']);
  assert.equal(rule.has[0].type, 'header');
  assert.equal(rule.has[0].key, 'user-agent');
  const iGeneric = vercel.rewrites.findIndex((r) => r.destination === '/index.html');
  const iApi = vercel.rewrites.findIndex((r) => r.destination === '/api');
  assert.ok(0 < iApi && iApi < iGeneric);
  assert.deepEqual(vercel.rewrites[iApi], { source: '/api/:path*', destination: '/api' });
  assert.equal(vercel.rewrites[iGeneric].source, '/((?!api/).*)');
  assert.ok(vercel.functions['api/share.js'].includeFiles);
});
test('slug dupliqué/forgé (tableau, doublon) : 404 sans appel base ; guest ignoré dans les métadonnées', async () => {
  row = { ...base, media: [] };
  await withServer(async (s) => {
    lastWhere = undefined;
    assert.equal((await get(s, '/api/share?slug=a&slug=b')).code, 404);
    assert.equal((await get(s, '/api/share?slug[0]=a')).code, 404);
    assert.equal(lastWhere, undefined);
    const sans = await get(s, '/api/share?slug=awa-et-paul');
    const avec = await get(s, '/api/share?slug=awa-et-paul&guest=TOKEN-SECRET');
    assert.equal(avec.body, sans.body);
    assert.doesNotMatch(avec.body, /TOKEN-SECRET|guest/);
  });
});
test('vercel.json : `missing` query slug -> un ?slug= forgé dans /i/a?slug=b ne déclenche pas la réécriture', () => {
  assert.deepEqual(rule.missing, [{ type: 'query', key: 'slug' }]);
  assert.deepEqual(Object.keys(rule.missing[0]).sort(), ['key', 'type']);
});
test('vercel.json : robots ciblés, humains non ciblés (regex RE2-compatible, sans lookaround)', () => {
  const value = rule.has[0].value;
  assert.doesNotMatch(value, /\(\?[=!<]/); // RE2 : pas de lookahead/lookbehind
  const re = new RegExp(value.replace(/^\(\?i\)/, ''), 'i');
  for (const ua of ['WhatsApp/2.23.20.0 A', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Twitterbot/1.0', 'TelegramBot (like TwitterBot)', 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)', 'Facebot', 'Slackbot-LinkExpanding 1.0', 'LinkedInBot/1.0']) {
    assert.match(ua, re, ua);
  }
  for (const ua of ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', 'Googlebot/2.1', '']) {
    assert.doesNotMatch(ua, re, ua);
  }
});
