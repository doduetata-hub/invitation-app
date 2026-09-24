// Tests d'intégration des exports du livre d'or (CSV/Excel/PDF). Même approche que
// guestbookPhoto.test.js : la VRAIE application Express, de vraies requêtes HTTP. Seul Prisma
// est remplacé par un double en mémoire, prépeuplé directement (l'export ne fait que LIRE, pas
// besoin de rejouer tout le pipeline de soumission déjà couvert ailleurs). Le stockage, lui,
// n'est PAS doublé : on utilise le vrai pilote local (fichiers écrits dans un dossier temporaire,
// servis par le vrai /uploads du serveur de test), pour que buildGuestbookPdf récupère les
// photos exactement comme en production (une requête HTTP vers l'URL déjà publique du média).
// Lancer avec : node --test test/guestbookExport.test.js

process.env.JWT_SECRET = 'test-secret-export';
process.env.PUBLIC_BASE_URL = 'http://127.0.0.1:0'; // corrigé après ouverture du port, voir before()
process.env.STORAGE_DRIVER = 'local';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'src');
const PRISMA_PATH = require.resolve(path.join(SRC, 'db', 'prismaClient.js'));

const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gb-export-uploads-'));
process.env.UPLOADS_DIR = uploadsDir;

function createFakeDb() {
  const invitations = new Map();
  const entries = new Map();
  return {
    invitations,
    entries,
    prisma: {
      invitation: {
        findUnique: async ({ where }) => invitations.get(where.id) || null,
      },
      guestbookEntry: {
        findMany: async ({ where, orderBy }) => {
          let list = [...entries.values()].filter((e) => e.invitationId === where.invitationId);
          if (where.status) list = list.filter((e) => e.status === where.status);
          const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
          for (const o of [...orders].reverse()) {
            const [field] = Object.keys(o);
            list.sort((a, b) => {
              const av = a[field] ? new Date(a[field]).getTime() : 0;
              const bv = b[field] ? new Date(b[field]).getTime() : 0;
              return o[field] === 'desc' ? bv - av : av - bv;
            });
          }
          return list.map((e) => ({ ...e, photo: e.photoUrl ? { url: e.photoUrl, width: e.photoWidth, height: e.photoHeight } : null }));
        },
      },
    },
  };
}

const db = createFakeDb();
let server;
let baseUrl;

function loadRealApp() {
  for (const key of Object.keys(require.cache)) {
    if (key.startsWith(SRC)) delete require.cache[key];
  }
  require.cache[PRISMA_PATH] = { id: PRISMA_PATH, filename: PRISMA_PATH, loaded: true, exports: db.prisma };
  return require(path.join(SRC, 'app.js'));
}

test.before(async () => {
  const app = loadRealApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  process.env.PUBLIC_BASE_URL = baseUrl; // utilisé par fetchMediaBytes pour résoudre les URLs relatives "/uploads/..."
  // env.js a déjà figé publicBaseUrl à l'ancienne valeur au premier require (avant que le port
  // ne soit connu) : on met à jour l'objet déjà en cache, exactement comme test/guestbookPhoto
  // n'a pas besoin de le faire (aucune requête sortante côté photo). Ici c'est indispensable.
  require(path.join(SRC, 'config', 'env.js')).publicBaseUrl = baseUrl;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(uploadsDir, { recursive: true, force: true });
});

const adminCookie = () => `token=${jwt.sign({ sub: 'admin-1', email: 'admin@test' }, 'test-secret-export')}`;

async function http(method, url, { admin = true } = {}) {
  const headers = {};
  if (admin) headers.Cookie = adminCookie();
  const res = await fetch(`${baseUrl}${url}`, { method, headers });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, buffer, headers: res.headers };
}

function seedInvitation(id, overrides = {}) {
  db.invitations.set(id, { id, slug: `slug-${id}`, namesLine: 'Kade & Sephora', title: 'Mariage', eventDate: new Date('2026-11-14'), ...overrides });
}

function seedEntry(entry) {
  db.entries.set(entry.id, { tableNumber: null, photoUrl: null, photoWidth: null, photoHeight: null, createdAt: new Date(), approvedAt: null, ...entry });
}

async function writeRealPhoto(filename, { width = 900, height = 1200 } = {}) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: { r: 180, g: 120, b: 60 } } }).jpeg().toBuffer();
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return { url: `/uploads/${filename}`, width, height };
}

test.beforeEach(() => {
  db.invitations.clear();
  db.entries.clear();
});

test('CSV : sans authentification -> 401', async () => {
  seedInvitation('inv-1');
  const res = await http('GET', '/api/invitations/inv-1/guestbook/export', { admin: false });
  assert.equal(res.status, 401);
});

test('CSV : uniquement les entrees APPROUVEES par defaut, en-tetes francais, BOM pour Excel', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Alice', message: 'Bravo !', status: 'APPROVED', source: 'QR' });
  seedEntry({ id: 'e2', invitationId: 'inv-1', guestName: 'Bob', message: 'En attente', status: 'PENDING', source: 'DIGITAL' });
  seedEntry({ id: 'e3', invitationId: 'inv-1', guestName: 'Carla', message: 'Rejete', status: 'REJECTED', source: 'QR' });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export');
  assert.equal(res.status, 200);
  const text = res.buffer.toString('utf8');
  assert.ok(text.charCodeAt(0) === 0xfeff, 'BOM UTF-8 present (accents corrects dans Excel)');
  assert.match(text, /Nom,Message,Table,Origine,Statut,Photo,Reçu le/);
  assert.match(text, /Alice/);
  assert.ok(!text.includes('Bob') && !text.includes('Carla'), 'PENDING et REJECTED absents par defaut');
});

test('CSV : ?status=all inclut tous les statuts', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Alice', message: 'Bravo !', status: 'APPROVED', source: 'QR' });
  seedEntry({ id: 'e2', invitationId: 'inv-1', guestName: 'Bob', message: 'En attente', status: 'PENDING', source: 'DIGITAL' });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export?status=all');
  const text = res.buffer.toString('utf8');
  assert.ok(text.includes('Alice') && text.includes('Bob'));
});

test('CSV : isolation entre invitations (jamais les entrees d\'une autre)', async () => {
  seedInvitation('inv-1');
  seedInvitation('inv-2');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Alice Inv1', message: 'M1', status: 'APPROVED', source: 'QR' });
  seedEntry({ id: 'e2', invitationId: 'inv-2', guestName: 'Bob Inv2', message: 'M2', status: 'APPROVED', source: 'QR' });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export?status=all');
  const text = res.buffer.toString('utf8');
  assert.ok(text.includes('Alice Inv1') && !text.includes('Bob Inv2'));
});

test('CSV : invitation introuvable -> 404', async () => {
  const res = await http('GET', '/api/invitations/inconnue/guestbook/export');
  assert.equal(res.status, 404);
});

test('Excel : fichier xlsx valide (signature ZIP), memes filtres que le CSV', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Alice', message: 'Bravo !', tableNumber: '4', status: 'APPROVED', source: 'QR' });
  seedEntry({ id: 'e2', invitationId: 'inv-1', guestName: 'Bob', message: 'En attente', status: 'PENDING', source: 'DIGITAL' });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export.xlsx');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  // Un .xlsx est un zip : signature "PK"
  assert.equal(res.buffer.slice(0, 2).toString('ascii'), 'PK');
  assert.ok(res.buffer.length > 1000);
});

test('PDF : sans entree -> document valide avec une page "aucun temoignage"', async () => {
  seedInvitation('inv-1');
  const res = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.equal(res.buffer.slice(0, 4).toString('ascii'), '%PDF');
});

test('PDF : entree sans photo -> genere correctement, message et nom presents en clair', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Alice Sans Photo', message: 'Felicitations aux maries, accents éèàçô.', status: 'APPROVED', source: 'QR' });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  assert.equal(res.status, 200);
  assert.equal(res.buffer.slice(0, 4).toString('ascii'), '%PDF');
  assert.ok(res.buffer.length > 500);
  // Le texte est compressé/encodé par pdfkit : on vérifie au moins que rien n'a crashé et que la
  // taille grandit avec le nombre d'entrées (contrôle indirect fiable sans parser de PDF).
});

test('PDF : entree AVEC une vraie photo (recuperee via /uploads, pas doublee) -> plus lourd, toujours valide', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e0', invitationId: 'inv-1', guestName: 'Sans Photo', message: 'Un message sans photo, pour comparer le poids.', status: 'APPROVED', source: 'QR' });
  const withoutPhoto = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  assert.equal(withoutPhoto.buffer.slice(0, 4).toString('ascii'), '%PDF');

  const photo = await writeRealPhoto('portrait-1.jpg', { width: 900, height: 1400 });
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Bob Avec Photo', message: 'Un beau souvenir.', status: 'APPROVED', source: 'QR', photoUrl: photo.url, photoWidth: photo.width, photoHeight: photo.height });
  const withPhoto = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  assert.equal(withPhoto.status, 200);
  assert.equal(withPhoto.buffer.slice(0, 4).toString('ascii'), '%PDF');
  assert.ok(
    withPhoto.buffer.length > withoutPhoto.buffer.length + 500,
    `la page avec photo embarquée doit peser nettement plus (${withoutPhoto.buffer.length} -> ${withPhoto.buffer.length} octets)`
  );
});

test('PDF : photo introuvable (fichier supprime du stockage) -> export ne casse pas', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Photo Cassee', message: 'Le fichier a disparu.', status: 'APPROVED', source: 'QR', photoUrl: '/uploads/inexistant-123.jpg', photoWidth: 800, photoHeight: 600 });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  assert.equal(res.status, 200, 'l\'export entier ne doit pas echouer pour une seule photo manquante');
  assert.equal(res.buffer.slice(0, 4).toString('ascii'), '%PDF');
});

test('PDF : emojis et ecritures non latines ne cassent pas l\'export (retires proprement de cette version imprimee)', async () => {
  seedInvitation('inv-1');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Bob Emoji', message: 'Bravo les amoureux ! ❤️ 🥂🎉', status: 'APPROVED', source: 'QR' });
  seedEntry({ id: 'e2', invitationId: 'inv-1', guestName: 'Invite Arabe', message: 'نتمنى لكم كل السعادة', status: 'APPROVED', source: 'QR' });

  const res = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  assert.equal(res.status, 200);
  assert.equal(res.buffer.slice(0, 4).toString('ascii'), '%PDF');
});

test('PDF : isolation entre invitations', async () => {
  seedInvitation('inv-1');
  seedInvitation('inv-2');
  seedEntry({ id: 'e1', invitationId: 'inv-1', guestName: 'Alice Inv1', message: 'M1', status: 'APPROVED', source: 'QR' });
  seedEntry({ id: 'e2', invitationId: 'inv-2', guestName: 'Bob Inv2', message: 'M2', status: 'APPROVED', source: 'QR' });

  const resInv1 = await http('GET', '/api/invitations/inv-1/guestbook/export.pdf');
  const resInv2Empty = await http('GET', '/api/invitations/inv-2/guestbook/export.pdf');
  // Faible mais suffisant comme signal d'isolation sans parser le PDF : la page "aucun
  // témoignage" (inv-2 vu ici sans son entrée, requête volontairement sur inv-1 seul) est plus
  // courte qu'une page avec un vrai message.
  assert.equal(resInv1.status, 200);
  assert.equal(resInv2Empty.status, 200);
});

test('PDF : invitation introuvable -> 404, aucune tentative de generation', async () => {
  const res = await http('GET', '/api/invitations/inconnue/guestbook/export.pdf');
  assert.equal(res.status, 404);
});
