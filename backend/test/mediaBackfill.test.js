// Script de rattrapage (scripts/backfill-media-variants.js) : simulation par défaut, exécution réelle explicite, aucune suppression.
// Base simulée en mémoire, stockage local dans un dossier temporaire : AUCUNE base ni fichier réel n'est touché.
// Lancer avec : node --test test/mediaBackfill.test.js

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-backfill-'));
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOADS_DIR = UPLOADS;
process.env.JWT_SECRET = 'test-secret-backfill';

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const { installFakePrisma } = require('../testing/fakePrisma');
const { db, prisma } = installFakePrisma(SRC);
const storage = require(path.join(SRC, 'services', 'storage', 'index.js'));
const imageService = require(path.join(SRC, 'services', 'image.service.js'));
const script = require(path.join(ROOT, 'scripts', 'backfill-media-variants.js'));

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const fileOf = (url) => path.join(UPLOADS, url.replace('/uploads/', ''));
const files = () => fs.readdirSync(UPLOADS).sort();
const silent = () => {};

async function oldStyleImage(w, h) {
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: 140, g: 100, b: 90 } } })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#865"/><circle cx="${w / 2}" cy="${h / 3}" r="${w / 5}" fill="#fff"/></svg>`) }])
    .jpeg({ quality: 82 }).toBuffer();
}

// Média enregistré AVANT la nouveauté : fichier écrit, ligne sans dimensions ni variante
async function legacyRow({ id, type = 'gallery', w = 1200, h = 1700, order = 0, invitationId = 'inv1', mimeType = 'image/jpeg', write = true }) {
  const url = `/uploads/${crypto.randomUUID()}.jpg`;
  if (write) fs.writeFileSync(fileOf(url), await oldStyleImage(w, h));
  const row = { id, invitationId, type, url, mimeType, order, width: null, height: null, thumbUrl: null, createdAt: new Date() };
  db.media.push(row);
  return row;
}
const reset = () => { db.media = []; db.invitations = new Map([['inv1', {}], ['inv2', {}]]); for (const f of files()) fs.unlinkSync(path.join(UPLOADS, f)); };
const deps = (extra = {}) => ({ prisma, storage, imageService, sharp, readOriginal: script.defaultReadOriginal, uploadsDir: UPLOADS, log: silent, ...extra });

test('SIMULATION par défaut : liste les opérations et ne modifie ni la base ni les fichiers', async () => {
  reset();
  await legacyRow({ id: 'a', type: 'cover', w: 1600, h: 2000 });
  await legacyRow({ id: 'b', order: 0 });
  await legacyRow({ id: 'c', order: 1 });
  const snapshotDb = JSON.stringify(db.media);
  const snapshotFiles = files().map((f) => [f, sha(path.join(UPLOADS, f))]);
  const lines = [];
  const report = await script.backfill(deps({ log: (l) => lines.push(l), opts: {} }));
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.selected, 3);
  assert.equal(report.updated, 0);
  assert.equal(JSON.stringify(db.media), snapshotDb);
  assert.deepEqual(files().map((f) => [f, sha(path.join(UPLOADS, f))]), snapshotFiles);
  const text = lines.join('\n');
  assert.match(text, /SIMULATION/);
  assert.match(text, /mesurer width\/height/);
  assert.match(text, /-w800\.jpg/);
  assert.match(text, /--apply --confirm=JE-CONFIRME-LA-MODIFICATION/);
});

test('l\'exécution réelle est REFUSÉE sans --confirm (le CLI s\'arrête avant toute connexion)', () => {
  const run = (args) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'backfill-media-variants.js'), ...args], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'postgresql://x:y@127.0.0.1:1/none' } });
  const a = run(['--apply']);
  assert.equal(a.status, 2);
  assert.match(a.stderr, /Refus/);
  const b = run(['--apply', '--confirm=oui']);
  assert.equal(b.status, 2);
  assert.match(b.stderr, /Refus/);
  const args = script.parseArgs(['--apply', '--confirm=' + script.CONFIRM_PHRASE, '--limit=5', '--invitation=inv1']);
  assert.deepEqual([args.apply, args.confirm, args.limit, args.invitation], [true, script.CONFIRM_PHRASE, 5, 'inv1']);
  assert.equal(script.parseArgs([]).apply, false);
});

test('EXÉCUTION : dimensions + variante de 800 px, originaux intacts, aucune suppression, puis idempotent', async () => {
  reset();
  const cover = await legacyRow({ id: 'a', type: 'cover', w: 1600, h: 2000 });
  const g1 = await legacyRow({ id: 'b', w: 1200, h: 1700, order: 0 });
  const g2 = await legacyRow({ id: 'c', w: 1040, h: 1500, order: 1 });
  const narrow = await legacyRow({ id: 'd', w: 700, h: 900, order: 2 });
  const video = await legacyRow({ id: 'v', mimeType: 'video/mp4', order: 3 });
  const guest = await legacyRow({ id: 'g', type: 'guestbook' });
  const before = Object.fromEntries([cover, g1, g2, narrow].map((r) => [r.id, sha(fileOf(r.url))]));
  const removed = [];
  const spyStorage = { ...storage, save: storage.save, remove: async (u) => { removed.push(u); } };

  const report = await script.backfill(deps({ storage: spyStorage, opts: { apply: true } }));
  assert.equal(report.mode, 'apply');
  assert.deepEqual(report.failures, []);
  assert.equal(report.selected, 4); // couverture + 3 photos (vidéo et photo de livre d'or ignorées)
  assert.deepEqual(removed, [], 'le script ne supprime jamais rien');

  const row = (id) => db.media.find((m) => m.id === id);
  assert.deepEqual([row('a').width, row('a').height, row('a').thumbUrl], [1600, 2000, null]);
  assert.deepEqual([row('b').width, row('b').height], [1200, 1700]);
  assert.match(row('b').thumbUrl, /^\/uploads\/[0-9a-f-]{36}-w800\.jpg$/);
  assert.equal(row('b').thumbUrl.replace('-w800', ''), row('b').url);
  const t = await sharp(fileOf(row('b').thumbUrl)).metadata();
  assert.equal(t.width, 800);
  assert.ok(Math.abs(t.width / t.height - 1200 / 1700) < 0.003);
  assert.deepEqual([row('d').width, row('d').height, row('d').thumbUrl], [700, 900, null]); // étroite : pas de variante
  assert.deepEqual([row('v').width, row('v').thumbUrl], [null, null]);
  assert.deepEqual([row('g').width, row('g').thumbUrl], [null, null]);
  for (const r of [cover, g1, g2, narrow]) assert.equal(sha(fileOf(r.url)), before[r.id], `original ${r.id} intact`);

  const filesAfter = files();
  const second = await script.backfill(deps({ opts: { apply: true } }));
  assert.equal(second.selected, 0);
  assert.equal(second.updated, 0);
  assert.deepEqual(files(), filesAfter);
});

test('fichier d\'origine introuvable : échec signalé pour CE média seulement, les autres sont traités, rien n\'est supprimé', async () => {
  reset();
  await legacyRow({ id: 'x', write: false, order: 0 });
  await legacyRow({ id: 'y', order: 1 });
  const removed = [];
  const report = await script.backfill(deps({ storage: { ...storage, remove: async (u) => { removed.push(u); } }, opts: { apply: true } }));
  assert.equal(report.failures.length, 1);
  assert.equal(report.failures[0].id, 'x');
  assert.equal(db.media.find((m) => m.id === 'x').width, null);
  assert.equal(db.media.find((m) => m.id === 'y').width, 1200);
  assert.deepEqual(removed, []);
});

test('échec de la VARIANTE : dimensions enregistrées, original intact, thumbUrl reste vide', async () => {
  reset();
  const r = await legacyRow({ id: 'a' });
  const h = sha(fileOf(r.url));
  const report = await script.backfill(deps({ imageService: { ...imageService, makeGalleryVariant: async () => { throw new Error('échec simulé'); } }, opts: { apply: true } }));
  const m = db.media[0];
  assert.deepEqual([m.width, m.height, m.thumbUrl], [1200, 1700, null]);
  assert.equal(sha(fileOf(r.url)), h);
  assert.match(report.rows[0].variantError, /échec simulé/);
  assert.equal(files().length, 1);
});

test('échec d\'écriture en BASE : seul le fichier de variante que le script vient d\'écrire est retiré ; l\'original reste', async () => {
  reset();
  const r = await legacyRow({ id: 'a' });
  const h = sha(fileOf(r.url));
  db.failNextMediaUpdate = true;
  const removed = [];
  const spy = { ...storage, remove: async (u) => { removed.push(u); return storage.remove(u); } };
  const report = await script.backfill(deps({ storage: spy, opts: { apply: true } }));
  assert.equal(report.failures.length, 1);
  assert.equal(removed.length, 1);
  assert.match(removed[0], /-w800\.jpg$/);
  assert.deepEqual(files(), [path.basename(r.url)]);
  assert.equal(sha(fileOf(r.url)), h);
  assert.equal(db.media[0].width, null);
});

test('options --invitation et --limit', async () => {
  reset();
  await legacyRow({ id: 'a', invitationId: 'inv1', order: 0 });
  await legacyRow({ id: 'b', invitationId: 'inv2', order: 0 });
  await legacyRow({ id: 'c', invitationId: 'inv2', order: 1 });
  const only = await script.backfill(deps({ opts: { invitation: 'inv2' } }));
  assert.equal(only.selected, 2);
  const limited = await script.backfill(deps({ opts: { limit: 1 } }));
  assert.equal(limited.selected, 1);
});
