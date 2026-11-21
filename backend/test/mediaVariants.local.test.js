// Import des photos — STOCKAGE LOCAL : dimensions enregistrées, variante de 800 px dans thumbUrl, échecs sans perte, suppression,
// nettoyages. Le vrai code (media.controller, mediaFiles.service, image.service, stockage local) tourne ; seule la base est simulée.
// Lancer avec : node --test test/mediaVariants.local.test.js

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-variants-'));
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOADS_DIR = UPLOADS;
process.env.JWT_SECRET = 'test-secret-variants';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';

const SRC = path.join(__dirname, '..', 'src');
const { installFakePrisma, fakeRes } = require('../testing/fakePrisma');
const { db } = installFakePrisma(SRC);
const imageService = require(path.join(SRC, 'services', 'image.service.js'));
const mediaCtl = require(path.join(SRC, 'controllers', 'media.controller.js'));
const invitationsCtl = require(path.join(SRC, 'controllers', 'invitations.controller.js'));
const storage = require(path.join(SRC, 'services', 'storage', 'index.js'));

const PHOTOS_DIR = path.join(__dirname, '..', '..', 'frontend', 'e2e', 'fixtures', 'photos');
const HAS_PHOTOS = fs.existsSync(PHOTOS_DIR) && fs.readdirSync(PHOTOS_DIR).filter((f) => /\.jpe?g$/i.test(f)).length === 19;

const files = () => fs.readdirSync(UPLOADS).sort();
const reset = (id = 'inv1') => {
  db.media = [];
  db.invitations = new Map([[id, { id, slug: id, status: 'PUBLISHED' }]]);
  for (const f of files()) fs.unlinkSync(path.join(UPLOADS, f));
};
// Image synthétique (dégradé + bruit léger) : portrait w x h
const synth = (w, h, extra = {}) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 90, b: 70 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#335"/><stop offset="1" stop-color="#cba"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w / 2}" cy="${h / 3}" r="${w / 6}" fill="#fff"/></svg>`) }])
    .jpeg({ quality: 90 })
    .withMetadata(extra)
    .toBuffer();

async function upload({ id = 'inv1', type, buffer, mimetype = 'image/jpeg' }) {
  const res = fakeRes();
  await mediaCtl.upload({ params: { id }, body: { type }, file: { buffer, mimetype } }, res);
  return res;
}
const fileOf = (url) => path.join(UPLOADS, url.replace('/uploads/', ''));

test('galerie : dimensions finales enregistrées + variante de 800 px dans thumbUrl, mêmes proportions', async () => {
  reset();
  const res = await upload({ type: 'gallery', buffer: await synth(3000, 4200) });
  assert.equal(res.code, 201);
  const m = res.body;
  assert.equal(m.width, 1200);
  assert.equal(m.height, 1680);
  assert.match(m.url, /^\/uploads\/[0-9a-f-]{36}\.jpg$/);
  assert.match(m.thumbUrl, /^\/uploads\/[0-9a-f-]{36}-w800\.jpg$/);
  assert.equal(m.thumbUrl.replace('-w800', ''), m.url); // même UUID : la variante suit son image
  const main = await sharp(fileOf(m.url)).metadata();
  const thumb = await sharp(fileOf(m.thumbUrl)).metadata();
  assert.equal(main.width, 1200);
  assert.equal(thumb.width, 800);
  // Aucune déformation : le format de la variante égale celui de l'image (à un pixel près)
  assert.ok(Math.abs(thumb.width / thumb.height - main.width / main.height) < 0.002, `${thumb.width}x${thumb.height} vs ${main.width}x${main.height}`);
  assert.ok(fs.statSync(fileOf(m.thumbUrl)).size < fs.statSync(fileOf(m.url)).size);
  assert.deepEqual(files().length, 2);
});

test('couverture : dimensions enregistrées, pas de variante ; l\'ancienne couverture est remplacée proprement', async () => {
  reset();
  const first = await upload({ type: 'cover', buffer: await synth(2400, 3200) });
  assert.equal(first.body.width, 1600);
  assert.equal(first.body.height, Math.round(1600 * 3200 / 2400));
  assert.equal(first.body.thumbUrl, null);
  const second = await upload({ type: 'cover', buffer: await synth(1100, 1400) });
  assert.equal(second.body.width, 1100); // jamais agrandie
  assert.equal(db.media.filter((m) => m.type === 'cover').length, 1);
  assert.equal(files().length, 1); // l'ancienne couverture et ses fichiers ont disparu, la nouvelle est là
  assert.ok(fs.existsSync(fileOf(second.body.url)));
});

test('photo étroite (<= 800 px) : dimensions enregistrées, aucune variante inutile', async () => {
  reset();
  const res = await upload({ type: 'gallery', buffer: await synth(700, 1000) });
  assert.equal(res.body.width, 700);
  assert.equal(res.body.thumbUrl, null);
  assert.equal(files().length, 1);
});

test('orientation EXIF : les dimensions enregistrées sont celles de l\'image AFFICHÉE', async () => {
  reset();
  // Paysage 3000x2000 portant l'orientation 6 (rotation 90°) -> affichée en portrait 2000x3000
  const buffer = await sharp(await synth(3000, 2000)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const res = await upload({ type: 'gallery', buffer });
  assert.ok(res.body.height > res.body.width, `${res.body.width}x${res.body.height}`);
  const real = await sharp(fileOf(res.body.url)).metadata();
  assert.equal(res.body.width, real.width);
  assert.equal(res.body.height, real.height);
});

test('vidéo : stockée telle quelle, sans dimensions ni variante', async () => {
  reset();
  const res = await upload({ type: 'gallery', buffer: Buffer.from('fake-video'), mimetype: 'video/mp4' });
  assert.equal(res.code, 201);
  assert.equal(res.body.width, null);
  assert.equal(res.body.thumbUrl, null);
  assert.match(res.body.url, /\.mp4$/);
});

test('échec de GÉNÉRATION de la variante : l\'image principale est conservée, thumbUrl reste null, aucun orphelin', async () => {
  reset();
  const original = imageService.makeGalleryVariant;
  imageService.makeGalleryVariant = async () => { throw new Error('échec simulé de la variante'); };
  try {
    const res = await upload({ type: 'gallery', buffer: await synth(3000, 4000) });
    assert.equal(res.code, 201);
    assert.equal(res.body.thumbUrl, null);
    assert.equal(res.body.width, 1200);
    assert.deepEqual(files(), [path.basename(res.body.url)]);
  } finally {
    imageService.makeGalleryVariant = original;
  }
});

test('échec d\'ÉCRITURE de la variante : l\'image principale est conservée, aucun orphelin', async () => {
  reset();
  const original = storage.save;
  storage.save = async (buffer, filename) => {
    if (filename.includes('-w800')) throw new Error('disque plein (simulation)');
    return original(buffer, filename);
  };
  try {
    const res = await upload({ type: 'gallery', buffer: await synth(3000, 4000) });
    assert.equal(res.code, 201);
    assert.equal(res.body.thumbUrl, null);
    assert.equal(files().length, 1);
    assert.ok(fs.existsSync(fileOf(res.body.url)));
  } finally {
    storage.save = original;
  }
});

test('échec d\'écriture en BASE : les fichiers écrits par cet appel sont retirés (aucun orphelin)', async () => {
  reset();
  db.failNextMediaCreate = true;
  await assert.rejects(upload({ type: 'gallery', buffer: await synth(3000, 4000) }), /base indisponible/);
  assert.deepEqual(files(), []);
  assert.equal(db.media.length, 0);
});

test('image invalide : refusée (400) sans rien écrire', async () => {
  reset();
  await assert.rejects(upload({ type: 'gallery', buffer: Buffer.from('ce nest pas une image') }), (err) => err.status === 400 || /invalide|Input/i.test(err.message));
  assert.deepEqual(files(), []);
  assert.equal(db.media.length, 0);
});

test('suppression d\'un média : image ET variante supprimées ensemble', async () => {
  reset();
  const { body: m } = await upload({ type: 'gallery', buffer: await synth(3000, 4000) });
  assert.equal(files().length, 2);
  const res = fakeRes();
  await mediaCtl.remove({ params: { id: m.id } }, res);
  assert.equal(res.code, 204);
  assert.deepEqual(files(), []);
  assert.equal(db.media.length, 0);
});

test('suppression : un fichier encore référencé par une AUTRE ligne n\'est jamais supprimé', async () => {
  reset();
  const { body: a } = await upload({ type: 'gallery', buffer: await synth(3000, 4000) });
  // Une autre ligne réutilise la même variante (cas pathologique / ancienne duplication)
  db.media.push({ id: 'dup', invitationId: 'inv1', type: 'gallery', url: '/uploads/autre.jpg', thumbUrl: a.thumbUrl, mimeType: 'image/jpeg', order: 9, width: null, height: null });
  const res = fakeRes();
  await mediaCtl.remove({ params: { id: a.id } }, res);
  assert.ok(!fs.existsSync(fileOf(a.url)), 'l\'image principale (non partagée) est supprimée');
  assert.ok(fs.existsSync(fileOf(a.thumbUrl)), 'la variante partagée est conservée');
});

test('suppression : fichiers déjà absents tolérés ; média inconnu -> 404', async () => {
  reset();
  const { body: m } = await upload({ type: 'gallery', buffer: await synth(3000, 4000) });
  fs.unlinkSync(fileOf(m.thumbUrl));
  const res = fakeRes();
  await mediaCtl.remove({ params: { id: m.id } }, res);
  assert.equal(res.code, 204);
  const res2 = fakeRes();
  await mediaCtl.remove({ params: { id: 'inconnu' } }, res2);
  assert.equal(res2.code, 404);
});

test('suppression d\'une invitation : toutes les images ET variantes sont nettoyées', async () => {
  reset();
  await upload({ type: 'cover', buffer: await synth(2000, 2600) });
  for (let i = 0; i < 3; i++) await upload({ type: 'gallery', buffer: await synth(3000, 4000 + i * 100) });
  assert.equal(files().length, 1 + 3 * 2);
  const res = fakeRes();
  await invitationsCtl.remove({ params: { id: 'inv1' } }, res);
  assert.equal(res.code, 204);
  assert.deepEqual(files(), []);
});

test('ordre de la galerie conservé (order = rang d\'import) et dimensions présentes pour chaque photo', async () => {
  reset();
  for (let i = 0; i < 4; i++) await upload({ type: 'gallery', buffer: await synth(2600 + i * 100, 3600) });
  const rows = db.media.filter((m) => m.type === 'gallery').sort((a, b) => a.order - b.order);
  assert.deepEqual(rows.map((r) => r.order), [0, 1, 2, 3]);
  assert.ok(rows.every((r) => r.width === 1200 && r.height > 0 && r.thumbUrl));
});

test('LES 19 PHOTOGRAPHIES RÉELLES : dimensions, variantes, URLs, proportions, poids (originaux jamais modifiés)', { skip: !HAS_PHOTOS && 'photographies absentes (non versionnées)' }, async () => {
  reset();
  const all = fs.readdirSync(PHOTOS_DIR).filter((f) => /\.jpe?g$/i.test(f)).sort();
  const cover = all.find((f) => /^couverture/i.test(f));
  const gallery = all.filter((f) => f !== cover);
  assert.equal(gallery.length, 18);
  const sizeBefore = Object.fromEntries(all.map((f) => [f, fs.statSync(path.join(PHOTOS_DIR, f)).size]));

  await upload({ type: 'cover', buffer: fs.readFileSync(path.join(PHOTOS_DIR, cover)) });
  for (const f of gallery) await upload({ type: 'gallery', buffer: fs.readFileSync(path.join(PHOTOS_DIR, f)) });

  const rows = db.media.slice().sort((a, b) => (a.type === b.type ? a.order - b.order : a.type === 'cover' ? -1 : 1));
  assert.equal(rows.length, 19);
  let mainBytes = 0;
  let thumbBytes = 0;
  const report = [];
  for (const m of rows) {
    const main = await sharp(fileOf(m.url)).metadata();
    assert.equal(m.width, main.width, `${m.url} largeur`);
    assert.equal(m.height, main.height, `${m.url} hauteur`);
    mainBytes += fs.statSync(fileOf(m.url)).size;
    if (m.type === 'gallery') {
      assert.ok(m.thumbUrl, `variante absente pour ${m.url}`);
      const t = await sharp(fileOf(m.thumbUrl)).metadata();
      assert.equal(t.width, Math.min(800, main.width));
      assert.ok(Math.abs(t.width / t.height - main.width / main.height) < 0.003, `proportions ${m.url}`);
      assert.equal(m.thumbUrl.replace('-w800', ''), m.url);
      thumbBytes += fs.statSync(fileOf(m.thumbUrl)).size;
    } else {
      assert.equal(m.thumbUrl, null);
    }
    report.push(`${m.type.padEnd(7)} ${String(m.order).padStart(2)} ${m.width}x${m.height}${m.thumbUrl ? ' + 800 px' : ''}`);
  }
  // Originaux inchangés
  for (const f of all) assert.equal(fs.statSync(path.join(PHOTOS_DIR, f)).size, sizeBefore[f]);
  console.log(`# 19 photos : ${(mainBytes / 1024).toFixed(0)} Ko d'images principales + ${(thumbBytes / 1024).toFixed(0)} Ko de variantes 800 px`);
  console.log(`# ${report.join(' | ')}`);
});
