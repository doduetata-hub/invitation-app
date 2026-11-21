// Import des photos — PARCOURS R2 : dépôt direct (presign) puis finalisation par le backend. Le stockage R2 est remplacé par un
// double en mémoire (aucun accès réseau) ; le reste (controller, services, traitement d'image) est le vrai code.
// Lancer avec : node --test test/mediaVariants.r2.test.js

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

process.env.STORAGE_DRIVER = 's3';
process.env.JWT_SECRET = 'test-secret-r2';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';

const SRC = path.join(__dirname, '..', 'src');
const { installFakePrisma, fakeRes } = require('../testing/fakePrisma');
const { db } = installFakePrisma(SRC);

// --- Double du stockage R2 : un « bucket » en mémoire, mêmes fonctions et mêmes conventions que s3Storage.js ---
const BASE = 'https://pub-test.r2.dev';
const bucket = new Map();
const fakeStorage = {
  publicUrl: (key) => `${BASE}/${key}`,
  save: async (buffer, filename) => { bucket.set(filename, buffer); return `${BASE}/${filename}`; },
  remove: async (url) => { if (url) bucket.delete(url.split('/').pop()); },
  getPresignedUploadUrl: async (key) => `https://upload.test/${key}?signature=x`,
  fetchByKey: async (key) => { if (!bucket.has(key)) throw new Error('Impossible de récupérer le fichier déposé (404)'); return bucket.get(key); },
};
const storagePath = require.resolve(path.join(SRC, 'services', 'storage', 'index.js'));
require.cache[storagePath] = { id: storagePath, filename: storagePath, loaded: true, exports: fakeStorage };

const imageService = require(path.join(SRC, 'services', 'image.service.js'));
const mediaCtl = require(path.join(SRC, 'controllers', 'media.controller.js'));

const PHOTOS_DIR = path.join(__dirname, '..', '..', 'frontend', 'e2e', 'fixtures', 'photos');
const HAS_PHOTOS = fs.existsSync(PHOTOS_DIR) && fs.readdirSync(PHOTOS_DIR).filter((f) => /\.jpe?g$/i.test(f)).length === 19;

const reset = () => { db.media = []; db.invitations = new Map([['inv1', { id: 'inv1' }]]); bucket.clear(); };
const synth = (w, h) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 90, g: 110, b: 130 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#a87"/><circle cx="${w / 2}" cy="${h / 3}" r="${w / 5}" fill="#fff"/></svg>`) }])
    .jpeg({ quality: 90 }).toBuffer();

// Parcours complet d'un téléverseur : 1) presign, 2) dépôt direct du fichier brut (simulé), 3) finalize
async function importViaR2({ type, buffer, mimeType = 'image/jpeg' }) {
  const p = fakeRes();
  await mediaCtl.presignMedia({ params: { id: 'inv1' }, body: { contentType: mimeType } }, p);
  assert.equal(p.body.supported, true);
  bucket.set(p.body.rawKey, buffer); // le navigateur dépose le fichier brut directement dans le bucket
  const f = fakeRes();
  await mediaCtl.finalizeMedia({ params: { id: 'inv1' }, body: { rawKey: p.body.rawKey, mimeType, type } }, f);
  return { rawKey: p.body.rawKey, res: f };
}
const keys = () => [...bucket.keys()].sort();

test('R2 : galerie finalisée avec dimensions + variante 800 px, URLs absolues cohérentes, dépôt brut supprimé', async () => {
  reset();
  const { rawKey, res } = await importViaR2({ type: 'gallery', buffer: await synth(3000, 4200) });
  assert.equal(res.code, 201);
  const m = res.body;
  assert.equal(m.width, 1200);
  assert.equal(m.height, 1680);
  assert.match(m.url, /^https:\/\/pub-test\.r2\.dev\/[0-9a-f-]{36}\.jpg$/);
  assert.match(m.thumbUrl, /^https:\/\/pub-test\.r2\.dev\/[0-9a-f-]{36}-w800\.jpg$/);
  assert.equal(m.thumbUrl.replace('-w800', ''), m.url);
  const t = await sharp(bucket.get(m.thumbUrl.split('/').pop())).metadata();
  assert.equal(t.width, 800);
  assert.ok(Math.abs(t.width / t.height - 1200 / 1680) < 0.002);
  assert.ok(!bucket.has(rawKey), 'le dépôt brut doit être supprimé après finalisation');
  assert.equal(keys().length, 2);
});

test('R2 : couverture finalisée avec dimensions, sans variante ; remplacement propre de l\'ancienne', async () => {
  reset();
  const a = await importViaR2({ type: 'cover', buffer: await synth(2400, 3000) });
  assert.equal(a.res.body.width, 1600);
  assert.equal(a.res.body.thumbUrl, null);
  const b = await importViaR2({ type: 'cover', buffer: await synth(1100, 1400) });
  assert.equal(db.media.filter((m) => m.type === 'cover').length, 1);
  assert.deepEqual(keys(), [b.res.body.url.split('/').pop()]);
});

test('R2 : un rawKey qui n\'a pas été émis par presign est REFUSÉ et ne supprime rien (protège les photos d\'autres invitations)', async () => {
  reset();
  const other = await importViaR2({ type: 'gallery', buffer: await synth(3000, 4000) });
  const victim = other.res.body.url.split('/').pop();
  const before = keys();
  const res = fakeRes();
  await mediaCtl.finalizeMedia({ params: { id: 'inv1' }, body: { rawKey: victim, mimeType: 'image/jpeg', type: 'gallery' } }, res);
  assert.equal(res.code, 400);
  assert.deepEqual(keys(), before);
});

test('R2 : échec de génération de la variante -> image principale conservée, dépôt brut supprimé, thumbUrl null', async () => {
  reset();
  const original = imageService.makeGalleryVariant;
  imageService.makeGalleryVariant = async () => { throw new Error('échec simulé'); };
  try {
    const { rawKey, res } = await importViaR2({ type: 'gallery', buffer: await synth(3000, 4000) });
    assert.equal(res.code, 201);
    assert.equal(res.body.thumbUrl, null);
    assert.ok(!bucket.has(rawKey));
    assert.deepEqual(keys(), [res.body.url.split('/').pop()]);
  } finally {
    imageService.makeGalleryVariant = original;
  }
});

test('R2 : image invalide -> refus, AUCUNE ligne, aucun fichier final ; le dépôt brut reste (réessai possible)', async () => {
  reset();
  const p = fakeRes();
  await mediaCtl.presignMedia({ params: { id: 'inv1' }, body: { contentType: 'image/jpeg' } }, p);
  bucket.set(p.body.rawKey, Buffer.from('pas une image'));
  await assert.rejects(mediaCtl.finalizeMedia({ params: { id: 'inv1' }, body: { rawKey: p.body.rawKey, mimeType: 'image/jpeg', type: 'gallery' } }, fakeRes()));
  assert.equal(db.media.length, 0);
  assert.deepEqual(keys(), [p.body.rawKey]);
});

test('R2 : interruption pendant le dépôt (le fichier brut n\'est jamais arrivé) -> erreur, rien d\'écrit', async () => {
  reset();
  const p = fakeRes();
  await mediaCtl.presignMedia({ params: { id: 'inv1' }, body: { contentType: 'image/jpeg' } }, p);
  await assert.rejects(mediaCtl.finalizeMedia({ params: { id: 'inv1' }, body: { rawKey: p.body.rawKey, mimeType: 'image/jpeg', type: 'gallery' } }, fakeRes()), /Impossible de récupérer/);
  assert.equal(db.media.length, 0);
  assert.deepEqual(keys(), []);
});

test('R2 : échec en base après écriture -> fichiers finaux retirés (aucun orphelin) ; dépôt brut conservé pour réessayer', async () => {
  reset();
  const p = fakeRes();
  await mediaCtl.presignMedia({ params: { id: 'inv1' }, body: { contentType: 'image/jpeg' } }, p);
  bucket.set(p.body.rawKey, await synth(3000, 4000));
  db.failNextMediaCreate = true;
  await assert.rejects(mediaCtl.finalizeMedia({ params: { id: 'inv1' }, body: { rawKey: p.body.rawKey, mimeType: 'image/jpeg', type: 'gallery' } }, fakeRes()), /base indisponible/);
  assert.deepEqual(keys(), [p.body.rawKey]);
  // Le réessai réussit avec le même dépôt brut
  const retry = fakeRes();
  await mediaCtl.finalizeMedia({ params: { id: 'inv1' }, body: { rawKey: p.body.rawKey, mimeType: 'image/jpeg', type: 'gallery' } }, retry);
  assert.equal(retry.code, 201);
  assert.ok(retry.body.thumbUrl);
});

test('R2 : suppression d\'un média -> image et variante retirées du bucket', async () => {
  reset();
  const { res } = await importViaR2({ type: 'gallery', buffer: await synth(3000, 4000) });
  assert.equal(keys().length, 2);
  const del = fakeRes();
  await mediaCtl.remove({ params: { id: res.body.id } }, del);
  assert.equal(del.code, 204);
  assert.deepEqual(keys(), []);
});

test('R2 : LES 19 PHOTOGRAPHIES RÉELLES par presign/finalize (ordre, dimensions, variantes, poids)', { skip: !HAS_PHOTOS && 'photographies absentes (non versionnées)' }, async () => {
  reset();
  const all = fs.readdirSync(PHOTOS_DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const cover = all.find((f) => /^couverture/i.test(f));
  const gallery = all.filter((f) => f !== cover);
  await importViaR2({ type: 'cover', buffer: fs.readFileSync(path.join(PHOTOS_DIR, cover)) });
  for (const f of gallery) await importViaR2({ type: 'gallery', buffer: fs.readFileSync(path.join(PHOTOS_DIR, f)) });
  assert.equal(db.media.length, 19);
  assert.equal(bucket.size, 1 + 18 * 2, 'aucun dépôt brut ni orphelin : 1 couverture + 18 images + 18 variantes');
  const g = db.media.filter((m) => m.type === 'gallery').sort((a, b) => a.order - b.order);
  assert.deepEqual(g.map((m) => m.order), Array.from({ length: 18 }, (_, i) => i));
  let main = 0;
  let thumbs = 0;
  for (const m of g) {
    const meta = await sharp(bucket.get(m.url.split('/').pop())).metadata();
    assert.equal(m.width, meta.width);
    assert.equal(m.height, meta.height);
    const t = await sharp(bucket.get(m.thumbUrl.split('/').pop())).metadata();
    assert.ok(Math.abs(t.width / t.height - m.width / m.height) < 0.003);
    main += bucket.get(m.url.split('/').pop()).length;
    thumbs += bucket.get(m.thumbUrl.split('/').pop()).length;
  }
  console.log(`# R2 simulé, 18 photos de galerie : ${Math.round(main / 1024)} Ko (1200 px) + ${Math.round(thumbs / 1024)} Ko (variantes 800 px)`);
});
