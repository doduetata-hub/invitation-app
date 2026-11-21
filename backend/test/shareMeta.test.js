// Page de partage (aperçu WhatsApp/Facebook) : URL de l'image absolue en stockage local ET en R2. Base simulée, aucun réseau.
// Lancer avec : node --test test/shareMeta.test.js
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.PUBLIC_BASE_URL = 'https://invit.example.org/';
const SRC = path.join(__dirname, '..', 'src');
let row;
const p = require.resolve(path.join(SRC, 'db', 'prismaClient.js'));
require.cache[p] = { id: p, filename: p, loaded: true, exports: { invitation: { findUnique: async () => row } } };
const { getSharePage, absoluteUrl } = require(path.join(SRC, 'controllers', 'share.controller.js'));

const render = async (inv) => {
  row = inv;
  const r = { code: 200, html: '', status(c) { r.code = c; return r; }, type() { return r; }, send(h) { r.html = h; return r; } };
  await getSharePage({ params: { slug: 'awa-et-paul' } }, r);
  return r;
};
const base = { status: 'PUBLISHED', title: 'Mariage', namesLine: 'Awa & Paul', invitationText: 'Nous nous marions "bientôt" <3', personalMessage: null };

test('absoluteUrl : chemin local préfixé, URL absolue (R2) intacte, sans double barre', () => {
  assert.equal(absoluteUrl('https://h.org/', '/uploads/a.jpg'), 'https://h.org/uploads/a.jpg');
  assert.equal(absoluteUrl('https://h.org', '/uploads/a.jpg'), 'https://h.org/uploads/a.jpg');
  assert.equal(absoluteUrl('https://h.org', 'https://pub.r2.dev/a.jpg'), 'https://pub.r2.dev/a.jpg');
  assert.equal(absoluteUrl('https://h.org', null), null);
});
test('stockage local : og:image = URL publique + chemin', async () => {
  const r = await render({ ...base, media: [{ url: '/uploads/c.jpg', width: 1600, height: 2000 }] });
  assert.match(r.html, /og:image" content="https:\/\/invit\.example\.org\/uploads\/c\.jpg"/);
  assert.match(r.html, /og:image:width" content="1600"/);
  assert.match(r.html, /og:url" content="https:\/\/invit\.example\.org\/i\/awa-et-paul"/);
});
test('R2 : og:image = URL absolue du bucket, jamais préfixée', async () => {
  const r = await render({ ...base, media: [{ url: 'https://pub-x.r2.dev/c.jpg', width: null, height: null }] });
  assert.match(r.html, /og:image" content="https:\/\/pub-x\.r2\.dev\/c\.jpg"/);
  assert.doesNotMatch(r.html, /example\.orghttps|og:image:width/);
});
test('titre, description échappée, sans couverture : summary et pas d\'og:image', async () => {
  const r = await render({ ...base, media: [] });
  assert.match(r.html, /og:title" content="Awa &amp; Paul — Mariage"/);
  assert.match(r.html, /og:description" content="Nous nous marions &quot;bientôt&quot; &lt;3"/);
  assert.match(r.html, /twitter:card" content="summary"/);
  assert.doesNotMatch(r.html, /og:image"/);
});
test('invitation non publiée : 404', async () => {
  assert.equal((await render({ ...base, status: 'DRAFT', media: [] })).code, 404);
  assert.equal((await render(null)).code, 404);
});
