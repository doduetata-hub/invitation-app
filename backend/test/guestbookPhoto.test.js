// Tests d'intégration des photos du livre d'or. Comme guestbookHardening.test.js : test runner
// intégré de Node, aucune dépendance de test ajoutée. Différence assumée : ici on monte la VRAIE
// application Express (app.js — vrais routeurs, vrai multer, vrai middleware d'erreur, vrai
// sharp, vrai service temps réel) et on lui parle en HTTP avec fetch/FormData, parce que ce qui
// compte pour les photos (multipart, limites de taille, contrôle du format réel) se joue dans ce
// câblage et non dans les contrôleurs seuls. Seuls Prisma et le stockage (S3/disque) sont
// remplacés par des doubles en mémoire — fidèles sur ce que les contrôleurs utilisent : contraintes
// d'unicité (P2002), P2025, `include`/`select` de la relation photo, mise à null de photoId quand
// un Media est supprimé (ON DELETE SET NULL). Lancer avec : node --test test/guestbookPhoto.test.js
//
// Non couvert ici (voir rapport) : vraie base PostgreSQL et vrai stockage R2 — ils sont validés
// séparément par le test navigateur de bout en bout.

process.env.JWT_SECRET = 'test-secret';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'src');
const PRISMA_PATH = require.resolve(path.join(SRC, 'db', 'prismaClient.js'));
const STORAGE_PATH = require.resolve(path.join(SRC, 'services', 'storage', 'index.js'));

// ---------------------------------------------------------------------------------- doubles

function uniqueViolation(field) {
  const err = new Error(`Unique constraint failed on the fields: (\`${field}\`)`);
  err.code = 'P2002';
  err.meta = { target: [field] };
  return err;
}

function notFound() {
  const err = new Error('Record not found');
  err.code = 'P2025';
  return err;
}

const pick = (obj, select) => {
  const out = {};
  for (const [key, value] of Object.entries(select)) {
    if (!value) continue;
    if (key === 'photo') continue; // géré par l'appelant
    out[key] = obj[key];
  }
  return out;
};

function createFakeDb() {
  let counter = 1;
  const nextId = (prefix) => `${prefix}-${counter++}`;
  const state = {
    invitations: new Map(),
    tokens: [],
    guests: [],
    rsvps: new Map(),
    entries: new Map(),
    media: new Map(),
    failures: new Set(),
  };

  const takeFailure = (name) => {
    if (state.failures.has(name)) {
      state.failures.delete(name);
      throw new Error(`échec simulé : ${name}`);
    }
  };

  const withPhoto = (entry, opts = {}) => {
    if (!entry) return null;
    const photo = entry.photoId ? state.media.get(entry.photoId) || null : null;
    if (opts.select) {
      const out = pick(entry, opts.select);
      if (opts.select.photo) {
        out.photo = photo ? pick(photo, opts.select.photo.select || opts.select.photo) : null;
      }
      return out;
    }
    if (opts.include?.photo) return { ...entry, photo: photo ? { ...photo } : null };
    return { ...entry };
  };

  const findEntryBy = (where) => {
    if (where.id !== undefined) return state.entries.get(where.id) || null;
    const field = Object.keys(where)[0];
    return [...state.entries.values()].find((e) => e[field] === where[field]) || null;
  };

  const mediaMatches = (m, where = {}) => {
    if (where.invitationId && m.invitationId !== where.invitationId) return false;
    if (where.type) {
      if (typeof where.type === 'string' && m.type !== where.type) return false;
      if (where.type.in && !where.type.in.includes(m.type)) return false;
    }
    return true;
  };

  const prisma = {
    invitation: {
      findUnique: async ({ where, include }) => {
        const inv = [...state.invitations.values()].find((i) => (where.id ? i.id === where.id : i.slug === where.slug));
        if (!inv) return null;
        const out = { ...inv };
        if (include?.media) out.media = [...state.media.values()].filter((m) => m.invitationId === inv.id && mediaMatches(m, include.media.where));
        if (include?.template) out.template = { key: 'luxury-wedding-gold', name: 'Luxe' };
        if (include?.client) out.client = { phone: null, whatsapp: null };
        if (include?.events) out.events = [];
        return out;
      },
    },
    guestbookQrToken: {
      findUnique: async ({ where, include }) => {
        const t = state.tokens.find((x) => x.token === where.token || x.id === where.id);
        if (!t) return null;
        if (!include?.invitation) return t;
        const inv = await prisma.invitation.findUnique({ where: { id: t.invitationId }, include: include.invitation.include });
        return { ...t, invitation: inv };
      },
    },
    guest: {
      findFirst: async ({ where, include }) => {
        const g = state.guests.find((x) => x.invitationId === where.invitationId && x.guestCode === where.guestCode);
        if (!g) return null;
        return include?.rsvp ? { ...g, rsvp: [...state.rsvps.values()].find((r) => r.guestId === g.id) || null } : g;
      },
    },
    rsvp: {
      upsert: async ({ where, update, create }) => {
        takeFailure('rsvp.upsert');
        const existing = [...state.rsvps.values()].find((r) => r.guestId === where.guestId);
        if (existing) return Object.assign(existing, update);
        const row = { id: nextId('rsvp'), ...create };
        state.rsvps.set(row.id, row);
        return row;
      },
      create: async ({ data }) => {
        const row = { id: nextId('rsvp'), ...data };
        state.rsvps.set(row.id, row);
        return row;
      },
    },
    media: {
      create: async ({ data }) => {
        takeFailure('media.create');
        const row = { id: nextId('media'), createdAt: new Date(), ...data };
        state.media.set(row.id, row);
        return { ...row };
      },
      delete: async ({ where }) => {
        if (!state.media.has(where.id)) throw notFound();
        state.media.delete(where.id);
        // ON DELETE SET NULL sur guestbook_entries.photo_id
        for (const e of state.entries.values()) if (e.photoId === where.id) e.photoId = null;
        return {};
      },
      findMany: async ({ where }) => [...state.media.values()].filter((m) => mediaMatches(m, where)),
    },
    guestbookEntry: {
      findUnique: async ({ where, include, select }) => withPhoto(findEntryBy(where), { include, select }),
      findMany: async ({ where = {}, include, select }) => {
        let list = [...state.entries.values()];
        if (where.invitationId) list = list.filter((e) => e.invitationId === where.invitationId);
        if (where.status) list = list.filter((e) => e.status === where.status);
        if (where.id?.in) list = list.filter((e) => where.id.in.includes(e.id));
        list.sort((a, b) => (a.approvedAt?.getTime?.() ?? 0) - (b.approvedAt?.getTime?.() ?? 0));
        return list.map((e) => withPhoto(e, { include, select }));
      },
      create: async ({ data, include }) => {
        takeFailure('guestbookEntry.create');
        if (data.submissionKey && findEntryBy({ submissionKey: data.submissionKey })) throw uniqueViolation('submission_key');
        if (data.editToken && findEntryBy({ editToken: data.editToken })) throw uniqueViolation('edit_token');
        const row = { id: nextId('entry'), createdAt: new Date(), updatedAt: new Date(), tableNumber: null, qrTokenId: null, rsvpId: null, photoId: null, approvedAt: null, submissionKey: null, editToken: null, ...data };
        state.entries.set(row.id, row);
        return withPhoto(row, { include });
      },
      update: async ({ where, data, include }) => {
        const row = state.entries.get(where.id);
        if (!row) throw notFound();
        Object.assign(row, data);
        return withPhoto(row, { include });
      },
      updateMany: async ({ where, data }) => {
        const ids = where?.id?.in || [];
        for (const id of ids) if (state.entries.has(id)) Object.assign(state.entries.get(id), data);
        return { count: ids.length };
      },
      upsert: async ({ where, update, create, include }) => {
        const existing = findEntryBy(where);
        if (existing) {
          Object.assign(existing, update);
          return withPhoto(existing, { include });
        }
        const row = { id: nextId('entry'), createdAt: new Date(), updatedAt: new Date(), tableNumber: null, qrTokenId: null, photoId: null, approvedAt: null, submissionKey: null, editToken: null, ...create };
        state.entries.set(row.id, row);
        return withPhoto(row, { include });
      },
      delete: async ({ where }) => {
        const row = state.entries.get(where.id);
        if (!row) throw notFound();
        state.entries.delete(where.id);
        return row;
      },
    },
  };

  const reset = () => {
    state.invitations.clear();
    state.tokens.length = 0;
    state.guests.length = 0;
    state.rsvps.clear();
    state.entries.clear();
    state.media.clear();
    state.failures.clear();
    counter = 1;
    const inv = { id: 'inv-1', slug: 'kade-sephora', status: 'PUBLISHED', title: 'Kade & Sephora', namesLine: 'Kade & Sephora', guestbookAutoApprove: false, rsvpEditLocked: false, dressCode: null, musicUrl: null, eventType: 'WEDDING' };
    state.invitations.set(inv.id, inv);
    state.tokens.push({ id: 'qr-1', token: 'tok-active', active: true, invitationId: 'inv-1', tableNumber: '5', label: null });
    state.guests.push({ id: 'guest-1', invitationId: 'inv-1', guestCode: 'ABC123', name: 'Marie', maxPersons: 2, tableNumber: '3' });
    // Une photo de galerie et une de couverture "normales" : ne doivent jamais être touchées.
    state.media.set('media-cover', { id: 'media-cover', invitationId: 'inv-1', type: 'cover', url: '/uploads/cover.jpg', thumbUrl: null, order: 0 });
  };

  return { prisma, state, reset };
}

function createFakeStorage() {
  const files = new Map();
  return {
    files,
    save: async (buffer, filename) => {
      files.set(filename, buffer);
      return `/uploads/${filename}`;
    },
    remove: async (url) => {
      if (url) files.delete(url.replace('/uploads/', ''));
    },
  };
}

// ---------------------------------------------------------------------------------- serveur

const db = createFakeDb();
const storage = createFakeStorage();
let server;
let baseUrl;
let ipCounter = 1;

function loadRealApp() {
  // Repart d'un cache propre pour que tout le code de src/ voie les doubles ci-dessous.
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC)) delete require.cache[key];
  }
  require.cache[PRISMA_PATH] = { id: PRISMA_PATH, filename: PRISMA_PATH, loaded: true, exports: db.prisma };
  require.cache[STORAGE_PATH] = { id: STORAGE_PATH, filename: STORAGE_PATH, loaded: true, exports: storage };
  return require(path.join(SRC, 'app.js'));
}

test.before(async () => {
  const app = loadRealApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
  db.reset();
  storage.files.clear();
});

const adminCookie = () => `token=${jwt.sign({ sub: 'admin-1', email: 'admin@test' }, 'test-secret')}`;

// Chaque requête simule une IP différente (X-Forwarded-For, l'app fait confiance à 1 proxy comme
// en production) : sans cela les limiteurs de débit réels (8 dépôts/15 min) bloqueraient la suite.
async function http(method, url, { json, form, admin = false } = {}) {
  const headers = { 'X-Forwarded-For': `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}` };
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  if (admin) headers.Cookie = adminCookie();
  const res = await fetch(`${baseUrl}${url}`, { method, headers, body });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, raw: text };
}

async function jpeg(width, height, { exif = false, orientation } = {}) {
  let img = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 60 } } }).jpeg();
  if (exif) {
    img = img.withExif({
      IFD0: { Make: 'TestCam' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '48/1 51/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '2/1 21/1 0/1' },
    });
  }
  if (orientation) img = img.withMetadata({ orientation });
  return img.toBuffer();
}

function photoForm(fields, buffer, { filename = 'photo.jpg', type = 'image/jpeg' } = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (buffer) form.append('photo', new Blob([buffer], { type }), filename);
  return form;
}

const qrFields = (key, extra = {}) => ({ guestName: 'Amelie', message: 'Felicitations aux maries !', submissionKey: key, ...extra });
const rsvpFields = (extra = {}) => ({ guestCode: 'ABC123', name: 'Marie', answer: 'YES', numberOfPersons: '1', message: 'Tous nos voeux !', ...extra });
const mediaOfType = (type) => [...db.state.media.values()].filter((m) => m.type === type);
const storedNames = () => [...storage.files.keys()];

// ---------------------------------------------------------------------------------- A à D

test('A. QR sans photo (JSON, contrat inchange) -> 201, aucun media ni fichier', async () => {
  const res = await http('POST', '/api/guestbook/tok-active', { json: qrFields('key-A') });
  assert.equal(res.status, 201);
  assert.equal(res.body.hasPhoto, false);
  assert.equal(mediaOfType('guestbook').length, 0);
  assert.equal(storage.files.size, 0);
  assert.equal(db.state.entries.size, 1);
});

test('B. QR avec photo -> 201, media + miniature stockes, entree rattachee', async () => {
  const buffer = await jpeg(3000, 2000, { exif: true });
  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-B'), buffer) });
  assert.equal(res.status, 201, res.raw);
  assert.equal(res.body.hasPhoto, true);

  const [media] = mediaOfType('guestbook');
  assert.ok(media, 'ligne Media de type guestbook');
  assert.equal(media.invitationId, 'inv-1');
  assert.ok(media.thumbUrl && media.url !== media.thumbUrl);
  assert.equal(db.state.entries.get(res.body.id).photoId, media.id);

  // Deux fichiers seulement (affichage + miniature), noms aléatoires "guestbook-<uuid>".
  assert.equal(storage.files.size, 2);
  for (const name of storedNames()) assert.match(name, /^guestbook-[0-9a-f-]{36}(-thumb)?\.jpg$/);

  // Dimensions : 3000x2000 réduit à 2000 de large maximum, ratio conservé ; miniature <= 480.
  assert.equal(media.width, 2000);
  assert.equal(media.height, 1333);
  const thumb = await sharp(storage.files.get(media.thumbUrl.replace('/uploads/', ''))).metadata();
  assert.ok(Math.max(thumb.width, thumb.height) <= 480);
});

test('B2. la photo enregistree ne contient plus ni EXIF ni GPS, et l\'orientation est appliquee', async () => {
  // 400x200 marqué "à pivoter de 90°" (orientation 6) : affichée, c'est une photo en PORTRAIT.
  const buffer = await jpeg(400, 200, { exif: true, orientation: 6 });
  const input = await sharp(buffer).metadata();
  assert.ok(input.exif, 'le fichier de test contient bien de l\'EXIF (sinon le test ne prouve rien)');
  assert.ok(buffer.includes(Buffer.from('TestCam')));

  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-B2'), buffer) });
  assert.equal(res.status, 201, res.raw);

  const [media] = mediaOfType('guestbook');
  for (const name of storedNames()) {
    const stored = storage.files.get(name);
    const meta = await sharp(stored).metadata();
    assert.equal(meta.exif, undefined, `${name} : EXIF (GPS compris) supprimé`);
    assert.ok(!stored.includes(Buffer.from('TestCam')), `${name} : aucune trace de l'appareil`);
    assert.ok(!stored.includes(Buffer.from('GPS')), `${name} : aucune trace de GPS`);
  }
  assert.equal(media.width, 200, 'orientation appliquée : la largeur devient l\'ancienne hauteur');
  assert.equal(media.height, 400);
});

test('C. invitation numerique sans photo (JSON) -> 201, entree DIGITAL sans photo, comme avant', async () => {
  const res = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { json: rsvpFields() });
  assert.equal(res.status, 201, res.raw);
  assert.ok(res.body.guestbookEntryId);
  assert.equal(res.body.guestbookHasPhoto, false);
  const entry = db.state.entries.get(res.body.guestbookEntryId);
  assert.equal(entry.source, 'DIGITAL');
  assert.equal(entry.status, 'PENDING');
  assert.equal(entry.photoId, null);
  assert.equal(storage.files.size, 0);
});

test('D. invitation numerique avec photo (multipart) -> 201, photo rattachee a l\'entree', async () => {
  const buffer = await jpeg(1600, 1200);
  const res = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), buffer) });
  assert.equal(res.status, 201, res.raw);
  assert.equal(res.body.guestbookHasPhoto, true);
  const entry = db.state.entries.get(res.body.guestbookEntryId);
  assert.ok(entry.photoId);
  assert.equal(mediaOfType('guestbook').length, 1);
  assert.equal(storage.files.size, 2);
});

test('D2. photo sans message (invitation numerique) -> 400, rien n\'est ecrit', async () => {
  const buffer = await jpeg(800, 600);
  const res = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields({ message: '' }), buffer) });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /message/i);
  assert.equal(db.state.rsvps.size, 0, 'aucune réponse RSVP partielle');
  assert.equal(storage.files.size, 0);
});

// ---------------------------------------------------------------------------------- E à G, N

test('E. photo trop volumineuse (> 10 Mo) -> 400 propre, aucune entree, aucun fichier', async () => {
  const huge = Buffer.alloc(11 * 1024 * 1024, 1);
  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-E'), huge) });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Fichier trop volumineux (10 Mo maximum)');
  assert.equal(db.state.entries.size, 0, 'aucune soumission partielle');
  assert.equal(storage.files.size, 0);
  assert.equal(mediaOfType('guestbook').length, 0);
});

test('F. fichier non image -> 400 (type declare refuse, ou contenu illisible)', async () => {
  const text = Buffer.from('ceci est un document texte, pas une image');
  const declaredPdf = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-F1'), text, { filename: 'doc.pdf', type: 'application/pdf' }) });
  assert.equal(declaredPdf.status, 400);
  assert.match(declaredPdf.body.error, /Format de photo non supporté/);

  const declaredJpeg = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-F2'), text, { filename: 'photo.jpg', type: 'image/jpeg' }) });
  assert.equal(declaredJpeg.status, 400);
  assert.match(declaredJpeg.body.error, /pas une image valide/);

  assert.equal(db.state.entries.size, 0);
  assert.equal(storage.files.size, 0);
});

test('G. extension trompeuse : SVG, GIF ou script renommes en .jpg -> refuses', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script><rect width="10" height="10"/></svg>');
  const gif = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#f00' } }).gif().toBuffer();
  const html = Buffer.from('<html><script>alert(document.cookie)</script></html>');

  let n = 0;
  for (const [label, buffer] of [['svg', svg], ['gif', gif], ['html', html]]) {
    const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields(`key-G${n++}`), buffer, { filename: 'vacances.jpg', type: 'image/jpeg' }) });
    assert.equal(res.status, 400, `${label} déguisé en jpg doit être refusé`);
    assert.match(res.body.error, /pas une image valide/);
  }
  assert.equal(db.state.entries.size, 0);
  assert.equal(storage.files.size, 0);

  // Le vrai format est celui du contenu : un PNG valide déclaré ".jpg" est, lui, accepté et ré-encodé en JPEG.
  const png = await sharp({ create: { width: 300, height: 200, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 0.5 } } }).png().toBuffer();
  const ok = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-G-png'), png, { filename: 'photo.jpg', type: 'image/jpeg' }) });
  assert.equal(ok.status, 201, ok.raw);
  const meta = await sharp(storage.files.get(storedNames().find((n) => !n.includes('thumb')))).metadata();
  assert.equal(meta.format, 'jpeg', 'toujours ré-encodé, jamais servi tel quel');
});

test('N. nom de fichier malveillant -> jamais stocke, jamais renvoye, aucun HTML/script', async () => {
  const evil = '"><img src=x onerror=alert(1)>.jpg';
  const buffer = await jpeg(500, 400);
  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-N'), buffer, { filename: evil }) });
  assert.equal(res.status, 201, res.raw);

  assert.ok(!res.raw.includes('onerror') && !res.raw.includes('<img'), 'la réponse ne contient pas le nom d\'origine');
  for (const name of storedNames()) assert.ok(!name.includes('onerror') && !name.includes('<'), 'le fichier stocké porte un nom aléatoire');
  const [media] = mediaOfType('guestbook');
  assert.ok(!JSON.stringify(media).includes('onerror'));

  // Un nom de champ texte malveillant reste du texte inerte (rendu par React, jamais en HTML).
  const named = await http('POST', '/api/guestbook/tok-active', { json: { guestName: '<script>alert(1)</script>', message: 'Message valide', submissionKey: 'key-N2' } });
  assert.equal(named.status, 201);
});

// ---------------------------------------------------------------------------------- H à J : modération

async function submitQrWithPhoto(key) {
  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields(key), await jpeg(1200, 800)) });
  assert.equal(res.status, 201, res.raw);
  return res.body;
}
const display = async () => (await http('GET', '/api/guestbook/display/kade-sephora')).body;

test('H. photo PENDING -> absente du mode ecran', async () => {
  await submitQrWithPhoto('key-H');
  const data = await display();
  assert.equal(data.entries.length, 0);
  assert.ok(!JSON.stringify(data).includes('guestbook-'), 'aucune URL de photo PENDING dans la réponse publique');
});

test('I. photo APPROVED -> visible au mode ecran, avec uniquement les champs publics', async () => {
  const created = await submitQrWithPhoto('key-I');
  const patch = await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'APPROVED' }, admin: true });
  assert.equal(patch.status, 200, patch.raw);

  const data = await display();
  assert.equal(data.entries.length, 1);
  const [entry] = data.entries;
  assert.match(entry.photo.url, /^\/uploads\/guestbook-[0-9a-f-]{36}\.jpg$/);
  assert.equal(entry.photo.width, 1200);
  assert.equal(entry.photo.height, 800);
  assert.deepEqual(Object.keys(entry.photo).sort(), ['height', 'url', 'width']);
  assert.deepEqual(Object.keys(entry).sort(), ['approvedAt', 'guestName', 'id', 'message', 'photo', 'source', 'tableNumber']);
  // Ni miniature (réservée à l'admin), ni id de média, ni secrets.
  const json = JSON.stringify(data);
  for (const forbidden of ['thumb', 'editToken', 'submissionKey', 'photoId', 'media-']) assert.ok(!json.includes(forbidden), `"${forbidden}" ne doit pas fuiter`);
});

test('J. photo REJECTED (apres approbation) -> retiree du mode ecran', async () => {
  const created = await submitQrWithPhoto('key-J');
  await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'APPROVED' }, admin: true });
  assert.equal((await display()).entries.length, 1);
  await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'REJECTED' }, admin: true });
  assert.equal((await display()).entries.length, 0);
  // La photo n'est pas perdue pour autant : l'admin peut ré-approuver.
  assert.equal(mediaOfType('guestbook').length, 1);
});

test('la charge publique de l\'invitation et le QR n\'exposent JAMAIS les photos du livre d\'or', async () => {
  const created = await submitQrWithPhoto('key-public');
  await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'APPROVED' }, admin: true });
  const [media] = mediaOfType('guestbook');

  const inv = await http('GET', '/api/public/invitations/kade-sephora');
  assert.equal(inv.status, 200);
  assert.ok(!inv.raw.includes(media.url) && !inv.raw.includes('guestbook-'), 'payload public de l\'invitation sans photo du livre d\'or');
  assert.ok(inv.body.media.every((m) => m.type === 'cover' || m.type === 'gallery'));
  assert.ok(inv.body.media.some((m) => m.type === 'cover'), 'la couverture reste servie');

  const qr = await http('GET', '/api/guestbook/tok-active');
  assert.ok(!qr.raw.includes('guestbook-'));
});

// ---------------------------------------------------------------------------------- K, L : suppression / remplacement

test('K. suppression de l\'entree -> ligne Media et les deux fichiers supprimes', async () => {
  const created = await submitQrWithPhoto('key-K');
  assert.equal(storage.files.size, 2);
  const del = await http('DELETE', `/api/guestbook-entries/${created.id}`, { admin: true });
  assert.equal(del.status, 204);
  assert.equal(db.state.entries.size, 0);
  assert.equal(mediaOfType('guestbook').length, 0);
  assert.equal(storage.files.size, 0, 'aucun fichier orphelin');
  assert.equal(db.state.media.has('media-cover'), true, 'les autres médias ne sont pas touchés');
});

test('K2. l\'admin retire UNIQUEMENT la photo : le message et son statut restent', async () => {
  const created = await submitQrWithPhoto('key-K2');
  await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'APPROVED' }, admin: true });

  const del = await http('DELETE', `/api/guestbook-entries/${created.id}/photo`, { admin: true });
  assert.equal(del.status, 204);
  const entry = db.state.entries.get(created.id);
  assert.ok(entry, 'le message existe toujours');
  assert.equal(entry.status, 'APPROVED');
  assert.equal(entry.photoId, null);
  assert.equal(mediaOfType('guestbook').length, 0);
  assert.equal(storage.files.size, 0);

  const data = await display();
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].photo, null, 'le message reste à l\'écran, sans photo');

  // Idempotent : retirer une photo déjà retirée n'est pas une erreur.
  assert.equal((await http('DELETE', `/api/guestbook-entries/${created.id}/photo`, { admin: true })).status, 204);
  assert.equal((await http('DELETE', '/api/guestbook-entries/inconnu/photo', { admin: true })).status, 404);
});

test('les routes d\'administration des photos exigent une session admin', async () => {
  const created = await submitQrWithPhoto('key-auth');
  assert.equal((await http('DELETE', `/api/guestbook-entries/${created.id}/photo`)).status, 401);
  assert.equal((await http('DELETE', `/api/guestbook-entries/${created.id}`)).status, 401);
  assert.equal(mediaOfType('guestbook').length, 1);
});

test('L. remplacement de la photo (QR, PATCH) -> ancienne supprimee, nouvelle en place', async () => {
  const created = await submitQrWithPhoto('key-L');
  const oldNames = new Set(storedNames());
  const [oldMedia] = mediaOfType('guestbook');

  const res = await http('PATCH', `/api/guestbook/tok-active/${created.id}`, {
    form: photoForm({ guestName: 'Amelie', message: 'Message corrige', editToken: created.editToken }, await jpeg(900, 1200)),
  });
  assert.equal(res.status, 200, res.raw);
  assert.equal(res.body.hasPhoto, true);

  const media = mediaOfType('guestbook');
  assert.equal(media.length, 1, 'une seule photo au final');
  assert.notEqual(media[0].id, oldMedia.id);
  assert.equal(storage.files.size, 2, 'ancienne paire supprimée, nouvelle paire présente');
  for (const name of storedNames()) assert.ok(!oldNames.has(name), 'aucun fichier de l\'ancienne photo ne subsiste');
  assert.equal(db.state.entries.get(created.id).photoId, media[0].id);
});

test('L2. retrait de la photo par l\'invite (removePhoto), puis un simple correctif de texte la conserve', async () => {
  const created = await submitQrWithPhoto('key-L2');

  // Correctif de texte seul (JSON) : la photo existante n'est pas perdue.
  const textOnly = await http('PATCH', `/api/guestbook/tok-active/${created.id}`, { json: { guestName: 'Amelie', message: 'Texte corrige', editToken: created.editToken } });
  assert.equal(textOnly.status, 200);
  assert.equal(textOnly.body.hasPhoto, true);
  assert.equal(mediaOfType('guestbook').length, 1);

  const removed = await http('PATCH', `/api/guestbook/tok-active/${created.id}`, {
    form: photoForm({ guestName: 'Amelie', message: 'Texte corrige', editToken: created.editToken, removePhoto: 'true' }, null),
  });
  assert.equal(removed.status, 200, removed.raw);
  assert.equal(removed.body.hasPhoto, false);
  assert.equal(mediaOfType('guestbook').length, 0);
  assert.equal(storage.files.size, 0);
});

test('L3. sans le bon editToken on ne peut ni remplacer ni retirer la photo d\'un autre (403, rien ne change)', async () => {
  const created = await submitQrWithPhoto('key-L3');
  const before = storedNames().sort();
  const res = await http('PATCH', `/api/guestbook/tok-active/${created.id}`, {
    form: photoForm({ guestName: 'Pirate', message: 'Message pirate', editToken: 'faux', removePhoto: 'true' }, await jpeg(300, 300)),
  });
  assert.equal(res.status, 403);
  assert.deepEqual(storedNames().sort(), before, 'la photo du pirate n\'a même pas été stockée');
  assert.equal(mediaOfType('guestbook').length, 1);
});

test('photo figee une fois le message approuve : un PATCH ne peut plus la changer (QR)', async () => {
  const created = await submitQrWithPhoto('key-frozen');
  await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'APPROVED' }, admin: true });
  const before = storedNames().sort();
  const res = await http('PATCH', `/api/guestbook/tok-active/${created.id}`, {
    form: photoForm({ guestName: 'Amelie', message: 'Trop tard', editToken: created.editToken }, await jpeg(300, 300)),
  });
  assert.equal(res.status, 403);
  assert.deepEqual(storedNames().sort(), before);
});

test('invitation numerique : remplacer puis retirer la photo tant que le message n\'est pas approuve', async () => {
  const first = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), await jpeg(1000, 700)) });
  assert.equal(first.status, 201, first.raw);
  const oldNames = new Set(storedNames());

  // Même texte, nouvelle photo : la modification de la seule photo est prise en compte.
  const second = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), await jpeg(700, 1000)) });
  assert.equal(second.status, 201, second.raw);
  assert.equal(mediaOfType('guestbook').length, 1);
  for (const name of storedNames()) assert.ok(!oldNames.has(name), 'ancienne photo supprimée');

  const removed = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields({ removePhoto: 'true' }), null) });
  assert.equal(removed.status, 201, removed.raw);
  assert.equal(removed.body.guestbookHasPhoto, false);
  assert.equal(mediaOfType('guestbook').length, 0);
  assert.equal(storage.files.size, 0);
});

test('invitation numerique : message vide -> l\'entree disparait avec sa photo', async () => {
  const first = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), await jpeg(800, 600)) });
  assert.equal(first.status, 201);
  const cleared = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { json: rsvpFields({ message: '' }) });
  assert.equal(cleared.status, 201);
  assert.equal(db.state.entries.size, 0);
  assert.equal(mediaOfType('guestbook').length, 0);
  assert.equal(storage.files.size, 0);
});

test('invitation numerique : une fois approuve, la nouvelle photo est ecartee et supprimee (pas d\'orphelin)', async () => {
  const first = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), await jpeg(800, 600)) });
  await http('PATCH', `/api/guestbook-entries/${first.body.guestbookEntryId}`, { json: { status: 'APPROVED' }, admin: true });
  const before = storedNames().sort();

  const again = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields({ message: 'Autre texte' }), await jpeg(500, 500)) });
  assert.equal(again.status, 201);
  assert.deepEqual(storedNames().sort(), before, 'ni nouvelle photo conservée, ni ancienne perdue');
  assert.equal(db.state.entries.get(first.body.guestbookEntryId).message, 'Tous nos voeux !', 'entrée figée');
});

test('le lien personnel de l\'invite expose le statut et la miniature de SA photo (pas les autres)', async () => {
  const first = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), await jpeg(800, 600)) });
  assert.equal(first.status, 201);
  const info = await http('GET', '/api/public/invitations/kade-sephora?guest=ABC123');
  assert.equal(info.status, 200, info.raw);
  assert.equal(info.body.guest.guestbook.status, 'PENDING');
  assert.match(info.body.guest.guestbook.photoUrl, /-thumb\.jpg$/);
});

// ---------------------------------------------------------------------------------- nettoyage sur échec

test('idempotence : un renvoi de la meme soumission avec photo ne stocke pas de deuxieme copie', async () => {
  const buffer = await jpeg(1000, 800);
  const first = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-idem'), buffer) });
  assert.equal(first.status, 201);
  const namesAfterFirst = storedNames().sort();

  const replay = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-idem'), buffer) });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.id, first.body.id);
  assert.equal(replay.body.editToken, first.body.editToken);
  assert.equal(mediaOfType('guestbook').length, 1);
  assert.deepEqual(storedNames().sort(), namesAfterFirst, 'aucun fichier supplémentaire');
});

test('upload reussi mais creation en base echouee -> les fichiers et le Media sont nettoyes', async () => {
  db.state.failures.add('guestbookEntry.create');
  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-fail1'), await jpeg(900, 600)) });
  assert.equal(res.status, 500);
  assert.equal(db.state.entries.size, 0);
  assert.equal(mediaOfType('guestbook').length, 0, 'aucune ligne Media orpheline');
  assert.equal(storage.files.size, 0, 'aucun fichier orphelin');
});

test('ecriture du Media echouee apres stockage des fichiers -> fichiers supprimes', async () => {
  db.state.failures.add('media.create');
  const res = await http('POST', '/api/guestbook/tok-active', { form: photoForm(qrFields('key-fail2'), await jpeg(900, 600)) });
  assert.equal(res.status, 500);
  assert.equal(storage.files.size, 0);
  assert.equal(db.state.entries.size, 0);
});

test('invitation numerique : ecriture du RSVP echouee apres l\'upload -> photo nettoyee', async () => {
  db.state.failures.add('rsvp.upsert');
  const res = await http('POST', '/api/public/invitations/kade-sephora/rsvp', { form: photoForm(rsvpFields(), await jpeg(900, 600)) });
  assert.equal(res.status, 500);
  assert.equal(storage.files.size, 0);
  assert.equal(mediaOfType('guestbook').length, 0);
});

// ---------------------------------------------------------------------------------- M : temps réel

test('M. SSE : approuver une entree avec photo emet le message + la photo publique, AUCUN secret', async () => {
  const created = await submitQrWithPhoto('key-M');
  const { subscribe } = require(path.join(SRC, 'services', 'guestbookRealtime.service.js'));
  const chunks = [];
  subscribe('inv-1', { write: (chunk) => chunks.push(chunk), on: () => {} });

  const patch = await http('PATCH', `/api/guestbook-entries/${created.id}`, { json: { status: 'APPROVED' }, admin: true });
  assert.equal(patch.status, 200);

  assert.equal(chunks.length, 1);
  const payload = JSON.parse(chunks[0].split('data: ')[1]);
  assert.match(payload.photo.url, /^\/uploads\/guestbook-/);
  assert.deepEqual(Object.keys(payload).sort(), ['approvedAt', 'guestName', 'id', 'message', 'photo', 'source', 'tableNumber']);
  const raw = chunks[0];
  for (const forbidden of ['editToken', 'submissionKey', 'photoId', 'qrTokenId', 'rsvpId', 'thumbUrl', 'invitationId', created.editToken]) {
    assert.ok(!raw.includes(forbidden), `le flux temps réel ne doit pas contenir ${forbidden}`);
  }
});

// ---------------------------------------------------------------------------------- admin

test('admin : la liste expose la photo (url + miniature + dimensions) et la suppression du message reste distincte', async () => {
  const created = await submitQrWithPhoto('key-admin');
  const list = await http('GET', '/api/invitations/inv-1/guestbook', { admin: true });
  assert.equal(list.status, 200, list.raw);
  const entry = list.body.entries.find((e) => e.id === created.id);
  assert.ok(entry.photo.url && entry.photo.thumbUrl);
  assert.equal(entry.photo.width, 1200);
});

test('les anciennes entrees sans photo restent valides (aucune regression)', async () => {
  db.state.entries.set('legacy', {
    id: 'legacy', invitationId: 'inv-1', source: 'QR', guestName: 'Ancien', message: 'Message d\'avant les photos',
    tableNumber: null, status: 'APPROVED', approvedAt: new Date(), photoId: null, createdAt: new Date(),
  });
  const data = await display();
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].photo, null);
  const list = await http('GET', '/api/invitations/inv-1/guestbook', { admin: true });
  assert.equal(list.body.entries[0].photo, null);
});
