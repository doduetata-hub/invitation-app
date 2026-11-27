// Aperçu d'une vraie invitation dans WhatsApp, Messenger… : page lue par les robots (/i/<slug>) et règle Vercel qui les y mène.
// Base simulée, aucun réseau. Lancer avec : node --test test/sharePreview.test.js
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.PUBLIC_BASE_URL = 'https://site.test';

let row = null;
const prismaPath = require.resolve(path.join(__dirname, '..', 'src', 'db', 'prismaClient.js'));
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { invitation: { findUnique: async () => row } },
};

const app = require('../src/app');

const invitation = (over = {}) => ({
  status: 'PUBLISHED',
  title: 'Mariage',
  namesLine: 'Awa & Koffi',
  invitationText: 'Venez "nombreux"',
  media: [],
  ...over,
});

async function get(url) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${url}`);
    return { status: res.status, html: await res.text() };
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
}

const og = (html, name) => html.match(new RegExp(`property="og:${name}" content="([^"]*)"`))?.[1];

test('/i/<slug> et /api/share/<slug> : noms, texte et couverture', async () => {
  row = invitation({ media: [{ type: 'cover', url: 'https://cdn.test/couverture.jpg', mimeType: 'image/jpeg' }] });
  for (const url of ['/i/awa-koffi', '/api/share/awa-koffi']) {
    const { status, html } = await get(url);
    assert.equal(status, 200, url);
    assert.equal(og(html, 'title'), 'Awa &amp; Koffi — Mariage');
    assert.equal(og(html, 'description'), 'Venez &quot;nombreux&quot;');
    assert.equal(og(html, 'url'), 'https://site.test/i/awa-koffi');
    // Adresse déjà complète (R2/S3) : reprise telle quelle.
    assert.equal(og(html, 'image'), 'https://cdn.test/couverture.jpg');
  }
});

test('photo stockée en local : adresse complétée avec le domaine', async () => {
  row = invitation({ media: [{ type: 'cover', url: '/uploads/c.jpg', mimeType: 'image/jpeg' }] });
  assert.equal(og((await get('/i/a')).html, 'image'), 'https://site.test/uploads/c.jpg');
});

test('sans couverture photo : première photo de la galerie, jamais une vidéo', async () => {
  row = invitation({
    media: [
      { type: 'cover', url: '/uploads/film.mp4', mimeType: 'video/mp4' },
      { type: 'gallery', url: '/uploads/clip.mp4', mimeType: 'video/mp4' },
      { type: 'gallery', url: '/uploads/g.jpg', mimeType: null },
    ],
  });
  assert.equal(og((await get('/i/a')).html, 'image'), 'https://site.test/uploads/g.jpg');
});

test('aucune photo : aperçu sans image', async () => {
  row = invitation();
  const { html } = await get('/i/a');
  assert.equal(og(html, 'image'), undefined);
});

test('une personne est renvoyée vers son lien personnalisé, sans boucle', async () => {
  row = invitation();
  const { html } = await get('/i/awa-koffi?guest=AB12');
  assert.match(html, /http-equiv="refresh" content="0; url=\/i\/awa-koffi\?app=1&amp;guest=AB12"/);
});

test('code invité piégé : neutralisé', async () => {
  row = invitation();
  const { html } = await get(`/i/a?guest=${encodeURIComponent('"><script>x</script>')}`);
  assert.ok(!html.includes('<script>'));
});

test('invitation absente ou non publiée : 404, rien ne fuite', async () => {
  for (const value of [null, invitation({ status: 'DRAFT' })]) {
    row = value;
    const { status, html } = await get('/i/a');
    assert.equal(status, 404);
    assert.ok(!html.includes('Awa'));
  }
});

test('vercel.json : les robots vont à la page de partage, les personnes à l’application', () => {
  const { rewrites } = require('../../vercel.json');
  const index = rewrites.findIndex((r) => r.source === '/i/:slug');
  assert.ok(index >= 0 && index < rewrites.findIndex((r) => r.destination === '/index.html'), 'la règle précède la règle générale');
  const rule = rewrites[index];
  assert.deepEqual(rule.missing, [{ type: 'query', key: 'app' }]);
  const robot = new RegExp(`^${rule.has[0].value}$`);
  for (const ua of [
    'WhatsApp/2.23.20.0 A',
    'WhatsApp/2.2412.54 W',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'TelegramBot (like TwitterBot)',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  ]) assert.match(ua, robot);
  for (const ua of [
    'Mozilla/5.0 (Linux; Android 14; TECNO KL4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0]',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 [Pinterest/iOS]',
  ]) assert.doesNotMatch(ua, robot);
});
