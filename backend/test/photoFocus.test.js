// Tests du cadrage des avatars sur le visage : réglage manuel depuis l'admin, retour à la détection
// automatique, analyse par lots des anciennes photos. Même approche que guestbookExport.test.js : la
// VRAIE application Express, de vraies requêtes HTTP ; Prisma est un double en mémoire, et le détecteur
// de visages (TensorFlow en WebAssembly) ainsi que la lecture des octets d'une photo sont remplacés par
// des doubles : on teste ici le câblage et les règles, pas le modèle de détection (vérifié à part sur
// de vraies photos).
// Lancer avec : node --test test/photoFocus.test.js

process.env.JWT_SECRET = 'test-secret-focus';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';
process.env.FACE_FOCUS = 'off';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const SRC = path.join(__dirname, '..', 'src');
const PRISMA_PATH = require.resolve(path.join(SRC, 'db', 'prismaClient.js'));
const FACE_PATH = require.resolve(path.join(SRC, 'services', 'faceFocus.service.js'));
const BYTES_PATH = require.resolve(path.join(SRC, 'services', 'mediaBytes.service.js'));

const db = { invitations: new Map(), entries: new Map(), media: new Map() };
const calls = { detect: 0 };
let detectResult = { focusX: 41.5, focusY: 30 };
let bytesFail = false;

const fakePrisma = {
  invitation: {
    findUnique: async ({ where }) => db.invitations.get(where.id) || null,
  },
  guestbookEntry: {
    findUnique: async ({ where }) => {
      const entry = db.entries.get(where.id);
      if (!entry) return null;
      return { ...entry, photo: entry.photoId ? { ...db.media.get(entry.photoId) } : null };
    },
  },
  media: {
    update: async ({ where, data }) => {
      const media = db.media.get(where.id);
      if (!media) {
        const err = new Error('introuvable');
        err.code = 'P2025';
        throw err;
      }
      Object.assign(media, data);
      return { ...media };
    },
    findMany: async ({ where, take }) =>
      [...db.media.values()]
        .filter((m) => m.invitationId === where.invitationId && m.type === where.type && m.focusSource === where.focusSource)
        .slice(0, take),
    count: async ({ where }) =>
      [...db.media.values()].filter((m) => m.invitationId === where.invitationId && m.type === where.type && m.focusSource === where.focusSource).length,
  },
};

let server;
let baseUrl;

test.before(async () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC)) delete require.cache[key];
  }
  require.cache[PRISMA_PATH] = { id: PRISMA_PATH, filename: PRISMA_PATH, loaded: true, exports: fakePrisma };
  require.cache[FACE_PATH] = {
    id: FACE_PATH,
    filename: FACE_PATH,
    loaded: true,
    exports: {
      detectFaceFocus: async () => {
        calls.detect += 1;
        return detectResult;
      },
      squareCropAroundFocus: async (buffer) => buffer,
    },
  };
  require.cache[BYTES_PATH] = {
    id: BYTES_PATH,
    filename: BYTES_PATH,
    loaded: true,
    exports: {
      fetchMediaBytes: async () => {
        if (bytesFail) throw new Error('photo introuvable');
        return Buffer.from('octets');
      },
    },
  };
  const app = require(path.join(SRC, 'app.js'));
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
  db.invitations.clear();
  db.entries.clear();
  db.media.clear();
  calls.detect = 0;
  detectResult = { focusX: 41.5, focusY: 30 };
  bytesFail = false;
  db.invitations.set('inv-1', { id: 'inv-1', slug: 'noces' });
});

const cookie = () => `token=${jwt.sign({ sub: 'admin-1', email: 'admin@test' }, 'test-secret-focus')}`;

async function call(method, url, { body, admin = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers.Cookie = cookie();
  const res = await fetch(`${baseUrl}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

function seedPhoto(id, overrides = {}) {
  db.media.set(id, { id, invitationId: 'inv-1', type: 'guestbook', url: `/uploads/${id}.jpg`, width: 800, height: 1200, focusX: null, focusY: null, focusSource: null, ...overrides });
}
function seedEntry(id, photoId) {
  db.entries.set(id, { id, invitationId: 'inv-1', guestName: 'Alice', message: 'Bravo', photoId: photoId || null });
}

test('réglage manuel : enregistre le point, source "manual"', async () => {
  seedPhoto('m1');
  seedEntry('e1', 'm1');
  const res = await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body: { focusX: 62.5, focusY: 18 } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { focusX: 62.5, focusY: 18, focusSource: 'manual' });
  assert.equal(db.media.get('m1').focusSource, 'manual');
  assert.equal(calls.detect, 0, 'aucune détection pour un réglage manuel');
});

test('réglage manuel : valeurs invalides -> 400, rien d\'écrit', async () => {
  seedPhoto('m1');
  seedEntry('e1', 'm1');
  for (const body of [{ focusX: 150, focusY: 10 }, { focusX: -1, focusY: 10 }, { focusX: '40', focusY: 10 }, { focusX: 40 }, {}, { focusX: null, focusY: null }]) {
    const res = await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body });
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(db.media.get('m1').focusSource, null);
});

test('réglage manuel : sans authentification -> 401 ; message inconnu ou sans photo -> 404', async () => {
  seedPhoto('m1');
  seedEntry('e1', 'm1');
  seedEntry('e2', null);
  assert.equal((await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body: { focusX: 1, focusY: 1 }, admin: false })).status, 401);
  assert.equal((await call('PATCH', '/api/guestbook-entries/inconnu/photo-focus', { body: { focusX: 1, focusY: 1 } })).status, 404);
  assert.equal((await call('PATCH', '/api/guestbook-entries/e2/photo-focus', { body: { focusX: 1, focusY: 1 } })).status, 404);
});

test('reset : relance la détection et remplace un réglage manuel', async () => {
  seedPhoto('m1', { focusX: 5, focusY: 5, focusSource: 'manual' });
  seedEntry('e1', 'm1');
  const res = await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body: { reset: true } });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { focusX: 41.5, focusY: 30, focusSource: 'auto' });
  assert.equal(calls.detect, 1);
});

test('reset : aucun visage trouvé -> source "none", point vide', async () => {
  seedPhoto('m1', { focusX: 5, focusY: 5, focusSource: 'manual' });
  seedEntry('e1', 'm1');
  detectResult = null;
  const res = await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body: { reset: true } });
  assert.deepEqual(res.json, { focusX: null, focusY: null, focusSource: 'none' });
});

test('reset : détecteur indisponible ou photo introuvable -> 503, le réglage existant est conservé', async () => {
  seedPhoto('m1', { focusX: 5, focusY: 5, focusSource: 'manual' });
  seedEntry('e1', 'm1');
  detectResult = false;
  let res = await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body: { reset: true } });
  assert.equal(res.status, 503);
  detectResult = { focusX: 1, focusY: 1 };
  bytesFail = true;
  res = await call('PATCH', '/api/guestbook-entries/e1/photo-focus', { body: { reset: true } });
  assert.equal(res.status, 503);
  assert.deepEqual([db.media.get('m1').focusX, db.media.get('m1').focusSource], [5, 'manual']);
});

test('analyse par lots : traite au plus 6 photos, annonce ce qui reste, ne retouche pas le manuel', async () => {
  for (let i = 1; i <= 8; i += 1) seedPhoto(`a${i}`);
  seedPhoto('manuel', { focusX: 70, focusY: 20, focusSource: 'manual' });
  seedPhoto('deja', { focusX: 10, focusY: 10, focusSource: 'auto' });
  seedPhoto('autre-invitation', { invitationId: 'inv-2' });

  let res = await call('POST', '/api/invitations/inv-1/guestbook/photo-focus/detect');
  assert.equal(res.status, 200);
  assert.deepEqual(res.json, { processed: 6, failed: 0, remaining: 2 });
  assert.equal(calls.detect, 6);

  res = await call('POST', '/api/invitations/inv-1/guestbook/photo-focus/detect');
  assert.deepEqual(res.json, { processed: 2, failed: 0, remaining: 0 });

  assert.equal(db.media.get('manuel').focusX, 70, 'un réglage manuel n\'est jamais écrasé');
  assert.equal(db.media.get('deja').focusX, 10);
  assert.equal(db.media.get('autre-invitation').focusSource, null, 'jamais les photos d\'une autre invitation');
  assert.equal(db.media.get('a1').focusSource, 'auto');
});

test('analyse par lots : une photo sans visage est marquée "none" et n\'est pas réanalysée', async () => {
  seedPhoto('a1');
  detectResult = null;
  let res = await call('POST', '/api/invitations/inv-1/guestbook/photo-focus/detect');
  assert.deepEqual(res.json, { processed: 1, failed: 0, remaining: 0 });
  assert.equal(db.media.get('a1').focusSource, 'none');
  res = await call('POST', '/api/invitations/inv-1/guestbook/photo-focus/detect');
  assert.deepEqual(res.json, { processed: 0, failed: 0, remaining: 0 });
});

test('analyse par lots : détecteur indisponible -> la photo reste à faire (jamais marquée "none")', async () => {
  seedPhoto('a1');
  detectResult = false;
  const res = await call('POST', '/api/invitations/inv-1/guestbook/photo-focus/detect');
  assert.deepEqual(res.json, { processed: 0, failed: 1, remaining: 1 });
  assert.equal(db.media.get('a1').focusSource, null);
});

test('analyse par lots : invitation inconnue -> 404, sans authentification -> 401', async () => {
  assert.equal((await call('POST', '/api/invitations/inconnue/guestbook/photo-focus/detect')).status, 404);
  assert.equal((await call('POST', '/api/invitations/inv-1/guestbook/photo-focus/detect', { admin: false })).status, 401);
});
