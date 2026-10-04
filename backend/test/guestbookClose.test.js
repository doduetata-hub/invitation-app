// Tests de la fin du livre d'or et du lien « Souvenir » des mariés : clôture / réouverture (admin),
// refus des nouveaux messages, liste d'invités figée, page Souvenir et PDF. La VRAIE application
// Express, de vraies requêtes HTTP ; Prisma est un double en mémoire (seul ce que ces routes utilisent).
// Lancer avec : node --test test/guestbookClose.test.js

process.env.JWT_SECRET = 'test-secret-close';
process.env.PUBLIC_BASE_URL = 'http://localhost:8080';
process.env.FACE_FOCUS = 'off';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

const SRC = path.join(__dirname, '..', 'src');
const PRISMA_PATH = require.resolve(path.join(SRC, 'db', 'prismaClient.js'));

const db = { invitations: new Map(), entries: [], qrTokens: [], guests: [], created: { entries: 0, guests: 0 } };

const findInvitation = (where) => {
  const list = [...db.invitations.values()];
  if (where.id) return list.find((i) => i.id === where.id) || null;
  if (where.slug) return list.find((i) => i.slug === where.slug) || null;
  const field = Object.keys(where)[0];
  return list.find((i) => i[field] === where[field]) || null;
};

const withMedia = (inv, include) => (inv && include?.media ? { ...inv, media: inv.media || [], template: { key: 'luxury-wedding-gold' } } : inv ? { ...inv } : null);

const fakePrisma = {
  invitation: {
    findUnique: async ({ where, include }) => withMedia(findInvitation(where), include),
    update: async ({ where, data }) => {
      const inv = findInvitation(where);
      if (!inv) {
        const err = new Error('introuvable');
        err.code = 'P2025';
        throw err;
      }
      Object.assign(inv, data);
      return { ...inv };
    },
  },
  guestbookQrToken: {
    findUnique: async ({ where, include }) => {
      const t = db.qrTokens.find((x) => x.token === where.token);
      if (!t) return null;
      return include?.invitation ? { ...t, invitation: withMedia(findInvitation({ id: t.invitationId }), include.invitation.include) } : t;
    },
  },
  guestbookEntry: {
    findMany: async ({ where }) => db.entries.filter((e) => e.invitationId === where.invitationId && (!where.status || e.status === where.status)).map((e) => ({ ...e, photo: null })),
    findUnique: async () => null,
    create: async ({ data }) => {
      db.created.entries += 1;
      return { id: 'new', ...data, photo: null };
    },
  },
  guest: {
    findMany: async ({ where }) => db.guests.filter((g) => g.invitationId === where.invitationId).map((g) => ({ ...g, rsvp: null })),
    findUnique: async () => null,
    create: async ({ data }) => {
      db.created.guests += 1;
      return { id: 'g-new', ...data };
    },
  },
};

let server;
let baseUrl;

test.before(async () => {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC)) delete require.cache[key];
  }
  require.cache[PRISMA_PATH] = { id: PRISMA_PATH, filename: PRISMA_PATH, loaded: true, exports: fakePrisma };
  const app = require(path.join(SRC, 'app.js'));
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  require(path.join(SRC, 'config', 'env.js')).publicBaseUrl = baseUrl;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test.beforeEach(() => {
  db.invitations.clear();
  db.entries = [];
  db.qrTokens = [];
  db.guests = [];
  db.created = { entries: 0, guests: 0 };
  db.invitations.set('inv-1', {
    id: 'inv-1',
    slug: 'noces',
    title: 'Mariage',
    namesLine: 'Kade & Sephora',
    status: 'PUBLISHED',
    eventDate: new Date('2026-10-03'),
    guestbookAutoApprove: false,
    guestbookClosedAt: null,
    clientAccessToken: 'client-tok',
    souvenirToken: 'souv-tok',
    musicUrl: null,
    media: [],
  });
  db.qrTokens.push({ id: 'q1', token: 'qr-tok', invitationId: 'inv-1', active: true, tableNumber: '4', label: null });
});

const cookie = () => `token=${jwt.sign({ sub: 'admin-1', email: 'admin@test' }, 'test-secret-close')}`;

async function call(method, url, { body, admin = false, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) headers.Cookie = cookie();
  const res = await fetch(`${baseUrl}${url}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (raw) return { status: res.status, headers: res.headers, buffer: Buffer.from(await res.arrayBuffer()) };
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

const close = () => call('POST', '/api/invitations/inv-1/guestbook/close', { admin: true });

test('clôture : réservée à l\'admin, 404 si inconnue, pose la date, idempotente ; réouverture la retire', async () => {
  assert.equal((await call('POST', '/api/invitations/inv-1/guestbook/close')).status, 401);
  assert.equal((await call('POST', '/api/invitations/inconnue/guestbook/close', { admin: true })).status, 404);

  const first = await close();
  assert.equal(first.status, 200);
  assert.ok(first.json.guestbookClosedAt);
  const second = await close();
  assert.equal(second.json.guestbookClosedAt, first.json.guestbookClosedAt, 'clore deux fois garde la date d\'origine');

  assert.equal((await call('POST', '/api/invitations/inv-1/guestbook/reopen')).status, 401);
  const reopened = await call('POST', '/api/invitations/inv-1/guestbook/reopen', { admin: true });
  assert.deepEqual(reopened.json, { guestbookClosedAt: null });
  assert.equal(db.invitations.get('inv-1').guestbookClosedAt, null);
});

test('écran : le drapeau « closed » suit l\'état du livre d\'or', async () => {
  assert.equal((await call('GET', '/api/guestbook/display/noces')).json.closed, false);
  await close();
  assert.equal((await call('GET', '/api/guestbook/display/noces')).json.closed, true);
});

test('QR : la page annonce « closed », et un nouveau message est refusé (403) sans rien écrire', async () => {
  assert.equal((await call('GET', '/api/guestbook/qr-tok')).json.closed, false);
  await close();
  assert.equal((await call('GET', '/api/guestbook/qr-tok')).json.closed, true);

  const res = await call('POST', '/api/guestbook/qr-tok', { body: { submissionKey: 'k1', guestName: 'Alice', message: 'Bravo les mariés' } });
  assert.equal(res.status, 403);
  assert.equal(res.json.code, 'GUESTBOOK_CLOSED');
  assert.equal(db.created.entries, 0, 'aucune entrée créée');

  const edit = await call('PATCH', '/api/guestbook/qr-tok/e1', { body: { editToken: 'x', guestName: 'Alice', message: 'Bravo' } });
  assert.equal(edit.status, 403);
  assert.equal(edit.json.code, 'GUESTBOOK_CLOSED');
});

test('lien client : consultation possible, création d\'invité refusée une fois clos, acceptée avant', async () => {
  db.guests.push({ id: 'g1', invitationId: 'inv-1', name: 'Marie' });

  let res = await call('GET', '/api/client-access/client-tok');
  assert.equal(res.status, 200);
  assert.equal(res.json.invitation.guestbookClosedAt, null);

  res = await call('POST', '/api/client-access/client-tok/guests', { body: { name: 'Paul' } });
  assert.equal(res.status, 201);
  assert.equal(db.created.guests, 1);

  await close();
  res = await call('GET', '/api/client-access/client-tok');
  assert.equal(res.status, 200, 'la liste reste consultable');
  assert.ok(res.json.invitation.guestbookClosedAt);
  assert.equal(res.json.guests.length, 1);

  for (const [method, url] of [
    ['POST', '/api/client-access/client-tok/guests'],
    ['PATCH', '/api/client-access/client-tok/guests/g1'],
    ['DELETE', '/api/client-access/client-tok/guests/g1'],
  ]) {
    res = await call(method, url, { body: { name: 'Paul' } });
    assert.equal(res.status, 403, `${method} ${url}`);
    assert.equal(res.json.code, 'GUESTBOOK_CLOSED');
  }
  assert.equal(db.created.guests, 1, 'aucun invité créé après la clôture');
});

test('Souvenir : token inconnu -> 404 ; page = identité, état, chiffres, sans le contenu des messages', async () => {
  assert.equal((await call('GET', '/api/souvenir/inconnu')).status, 404);

  db.entries.push(
    { id: 'e1', invitationId: 'inv-1', status: 'APPROVED', guestName: 'Alice', message: 'Texte secret A', tableNumber: '2', editToken: 'zzz', submissionKey: 'kkk' },
    { id: 'e2', invitationId: 'inv-1', status: 'APPROVED', guestName: 'Bob', message: 'Texte secret B', tableNumber: '2' },
    { id: 'e3', invitationId: 'inv-1', status: 'PENDING', guestName: 'Carla', message: 'En attente', tableNumber: '9' }
  );
  const res = await call('GET', '/api/souvenir/souv-tok');
  assert.equal(res.status, 200);
  assert.equal(res.json.namesLine, 'Kade & Sephora');
  assert.equal(res.json.slug, 'noces');
  assert.equal(res.json.closed, false);
  assert.deepEqual(res.json.stats, { messages: 2, photos: 0, tables: 1 }, 'seulement les messages approuvés');
  const text = JSON.stringify(res.json);
  for (const forbidden of ['Texte secret', 'zzz', 'kkk', 'En attente', 'Carla']) assert.ok(!text.includes(forbidden), `« ${forbidden} » ne doit pas fuiter`);

  await close();
  assert.equal((await call('GET', '/api/souvenir/souv-tok')).json.closed, true);
});

test('Souvenir : le PDF n\'est disponible qu\'une fois le livre d\'or clos', async () => {
  db.entries.push({ id: 'e1', invitationId: 'inv-1', status: 'APPROVED', guestName: 'Alice', message: 'Bravo aux mariés', tableNumber: '2', approvedAt: new Date() });

  assert.equal((await call('GET', '/api/souvenir/inconnu/pdf')).status, 404);
  const open = await call('GET', '/api/souvenir/souv-tok/pdf');
  assert.equal(open.status, 403);
  assert.equal(open.json.code, 'GUESTBOOK_OPEN');

  await close();
  const pdf = await call('GET', '/api/souvenir/souv-tok/pdf', { raw: true });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(pdf.buffer.slice(0, 4).toString('ascii'), '%PDF');
});

test('lien Souvenir : (re)génération et révocation par l\'admin ; l\'ancien lien cesse de marcher', async () => {
  assert.equal((await call('POST', '/api/invitations/inv-1/souvenir-token')).status, 401);
  assert.equal((await call('POST', '/api/invitations/inconnue/souvenir-token', { admin: true })).status, 404);

  const res = await call('POST', '/api/invitations/inv-1/souvenir-token', { admin: true });
  assert.equal(res.status, 200);
  assert.match(res.json.souvenirToken, /^[A-Za-z0-9_-]{40,}$/);
  assert.notEqual(res.json.souvenirToken, 'souv-tok');
  assert.equal((await call('GET', '/api/souvenir/souv-tok')).status, 404, 'l\'ancien lien est invalidé');
  assert.equal((await call('GET', `/api/souvenir/${res.json.souvenirToken}`)).status, 200);

  assert.equal((await call('DELETE', '/api/invitations/inv-1/souvenir-token', { admin: true })).status, 204);
  assert.equal((await call('GET', `/api/souvenir/${res.json.souvenirToken}`)).status, 404);
});
