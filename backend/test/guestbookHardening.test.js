// Tests d'intégration pour le hardening Phase 3.1 (idempotence + isolation des droits
// d'édition du livre d'or QR). Aucun framework de test n'existait dans ce projet avant cette
// phase — on utilise donc le test runner intégré de Node (`node:test`), sans dépendance
// supplémentaire. Lancer avec : node --test test/guestbookHardening.test.js
//
// Ces tests exécutent le VRAI code des contrôleurs (guestbookAccess.controller.js,
// guestbook.controller.js), pas une réécriture de sa logique : seul le client Prisma et le
// service de diffusion SSE sont remplacés par de fausses implémentations en mémoire, fidèles
// au comportement réel de Postgres/Prisma (en particulier l'erreur P2002 sur violation de
// contrainte unique). Aucune vraie base PostgreSQL n'est disponible dans cet environnement de
// développement (voir rapport Phase 3) ; à valider une fois de plus après déploiement contre la
// vraie base, notamment le comportement exact de la contrainte unique sous concurrence réelle.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PRISMA_PATH = require.resolve(path.join(__dirname, '..', 'src', 'db', 'prismaClient.js'));
const REALTIME_PATH = require.resolve(path.join(__dirname, '..', 'src', 'services', 'guestbookRealtime.service.js'));

function uniqueViolation(field) {
  const err = new Error(`Unique constraint failed on the fields: (\`${field}\`)`);
  err.code = 'P2002';
  err.meta = { target: [field] };
  return err;
}

// Base Prisma factice en mémoire : seules les méthodes réellement appelées par les contrôleurs
// testés sont implémentées, avec la même sémantique que Postgres/Prisma pour ce qui compte ici
// (unicité de submissionKey/editToken, P2025 sur update/delete d'une ligne absente).
function createFakeDb({ qrTokens = [] } = {}) {
  const entries = new Map();
  let autoId = 1;

  const byUnique = (field, value) => [...entries.values()].find((e) => e[field] === value) || null;

  return {
    entries,
    prisma: {
      guestbookQrToken: {
        findUnique: async ({ where }) => qrTokens.find((t) => t.token === where.token || t.id === where.id) || null,
      },
      guestbookEntry: {
        findUnique: async ({ where }) => {
          if (where.id !== undefined) return entries.get(where.id) || null;
          if (where.submissionKey !== undefined) return byUnique('submissionKey', where.submissionKey);
          return null;
        },
        findMany: async ({ where }) => {
          let list = [...entries.values()];
          if (where?.id?.in) list = list.filter((e) => where.id.in.includes(e.id));
          if (where?.invitationId) list = list.filter((e) => e.invitationId === where.invitationId);
          return list;
        },
        create: async ({ data }) => {
          if (data.submissionKey && byUnique('submissionKey', data.submissionKey)) throw uniqueViolation('submission_key');
          if (data.editToken && byUnique('editToken', data.editToken)) throw uniqueViolation('edit_token');
          const id = `entry-${autoId++}`;
          const entry = { id, createdAt: new Date(), updatedAt: new Date(), tableNumber: null, qrTokenId: null, rsvpId: null, ...data };
          entries.set(id, entry);
          return entry;
        },
        update: async ({ where, data }) => {
          const entry = entries.get(where.id);
          if (!entry) { const e = new Error('not found'); e.code = 'P2025'; throw e; }
          Object.assign(entry, data);
          return entry;
        },
        updateMany: async ({ where, data }) => {
          const ids = where?.id?.in || [];
          for (const id of ids) { const e = entries.get(id); if (e) Object.assign(e, data); }
          return { count: ids.length };
        },
        delete: async ({ where }) => {
          if (!entries.has(where.id)) { const e = new Error('not found'); e.code = 'P2025'; throw e; }
          const entry = entries.get(where.id);
          entries.delete(where.id);
          return entry;
        },
      },
    },
  };
}

// Fausse réponse HTTP SSE : capture tout ce qui est réellement écrit sur le flux, en passant
// par le VRAI guestbookRealtime.service.js (pas une réimplémentation) — c'est justement lui qui
// porte la sanitisation anti-fuite, donc le contourner rendrait ce test aveugle à une régression.
function fakeSubscriberResponse() {
  const chunks = [];
  return {
    chunks,
    write: (chunk) => chunks.push(chunk),
    on: () => {},
  };
}

// Recharge les contrôleurs à chaque test avec une base neuve, en vidant le cache require pour
// forcer une ré-exécution propre du module Prisma injecté. Le service temps réel reste le vrai.
function loadControllers({ qrTokens }) {
  const db = createFakeDb({ qrTokens });

  delete require.cache[PRISMA_PATH];
  require.cache[PRISMA_PATH] = { id: PRISMA_PATH, filename: PRISMA_PATH, loaded: true, exports: db.prisma };

  const guestbookAccessPath = require.resolve(path.join(__dirname, '..', 'src', 'controllers', 'guestbookAccess.controller.js'));
  const guestbookAdminPath = require.resolve(path.join(__dirname, '..', 'src', 'controllers', 'guestbook.controller.js'));
  delete require.cache[guestbookAccessPath];
  delete require.cache[guestbookAdminPath];
  delete require.cache[REALTIME_PATH];

  return {
    db,
    realtime: require(REALTIME_PATH),
    access: require(guestbookAccessPath),
    admin: require(guestbookAdminPath),
  };
}

function mockRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.send = (body) => { if (body !== undefined) res.body = body; return res; };
  return res;
}

const ACTIVE_QR_TOKEN = {
  id: 'qrtoken-1',
  token: 'tok-active',
  active: true,
  invitationId: 'inv-1',
  tableNumber: '5',
  label: null,
  invitation: { id: 'inv-1', status: 'PUBLISHED', guestbookAutoApprove: false },
};

test('A. meme idempotency key envoyee deux fois -> une seule entree, meme reponse', async () => {
  const { access, db } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });

  const body = { guestName: 'Amelie', message: 'Felicitations aux maries !', submissionKey: 'key-AAA' };
  const res1 = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body }, res1);
  assert.equal(res1.statusCode, 201);

  const res2 = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body }, res2);
  assert.equal(res2.statusCode, 200, 'la resoumission ne doit pas etre traitee comme une creation');
  assert.equal(res2.body.id, res1.body.id, 'meme entree renvoyee, pas une nouvelle');
  assert.equal(res2.body.editToken, res1.body.editToken, 'le meme editToken doit etre recupere sur rejeu');

  const allEntries = [...db.entries.values()].filter((e) => e.submissionKey === 'key-AAA');
  assert.equal(allEntries.length, 1, 'une seule ligne en base pour cette cle');
});

test('B. deux idempotency keys differentes -> deux entrees legitimes', async () => {
  const { access, db } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });

  const res1 = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body: { guestName: 'Amelie', message: 'Message un', submissionKey: 'key-1' } }, res1);
  const res2 = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body: { guestName: 'Karim', message: 'Message deux', submissionKey: 'key-2' } }, res2);

  assert.equal(res1.statusCode, 201);
  assert.equal(res2.statusCode, 201);
  assert.notEqual(res1.body.id, res2.body.id);
  assert.equal(db.entries.size, 2);
});

test("C. deux invites, meme nom et meme message, cles differentes -> deux entrees legitimes (pas des doublons)", async () => {
  const { access, db } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });

  const identicalBody = (key) => ({ guestName: 'Sarah', message: 'Bravo aux maries, quel beau jour !', submissionKey: key });
  const res1 = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body: identicalBody('key-guest-1') }, res1);
  const res2 = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body: identicalBody('key-guest-2') }, res2);

  assert.equal(res1.statusCode, 201);
  assert.equal(res2.statusCode, 201);
  assert.notEqual(res1.body.id, res2.body.id, 'deux invites differents ne doivent jamais fusionner en une entree');
  assert.equal(db.entries.size, 2);
});

test('submitEntry rejette une soumission sans submissionKey (400)', async () => {
  const { access } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });
  await assert.rejects(
    () => access.submitEntry({ params: { token: 'tok-active' }, body: { guestName: 'X', message: 'Un message valide' } }, mockRes()),
    (err) => err.status === 400
  );
});

test("D. PATCH sans le bon editToken -> 403, et l'entree n'est pas modifiee", async () => {
  const { access, db } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });

  const created = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body: { guestName: 'Amelie', message: 'Message original', submissionKey: 'key-D' } }, created);
  const entryId = created.body.id;

  // Ni editToken absent, ni un editToken invente (visant a simuler un id devine par un autre
  // invite tenant le meme QR token actif) ne doivent autoriser la modification.
  const resNoToken = mockRes();
  await access.updateEntry({ params: { token: 'tok-active', entryId }, body: { guestName: 'Attaquant', message: 'Message modifie sans autorisation' } }, resNoToken);
  assert.equal(resNoToken.statusCode, 403);

  const resWrongToken = mockRes();
  await access.updateEntry({ params: { token: 'tok-active', entryId }, body: { guestName: 'Attaquant', message: 'Message modifie sans autorisation', editToken: 'un-token-invente' } }, resWrongToken);
  assert.equal(resWrongToken.statusCode, 403);

  assert.equal(db.entries.get(entryId).message, 'Message original', "l'entree ne doit pas avoir change");

  // Le bon editToken, lui, doit fonctionner.
  const resOk = mockRes();
  await access.updateEntry({ params: { token: 'tok-active', entryId }, body: { guestName: 'Amelie', message: 'Message corrige par son auteur', editToken: created.body.editToken } }, resOk);
  assert.equal(resOk.statusCode, 200);
  assert.equal(db.entries.get(entryId).message, 'Message corrige par son auteur');
});

test('E. moderation admin (approbation) toujours fonctionnelle et ne fuite pas les secrets en diffusion SSE', async () => {
  const { access, admin, realtime } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });

  const created = mockRes();
  await access.submitEntry({ params: { token: 'tok-active' }, body: { guestName: 'Amelie', message: 'A moderer', submissionKey: 'key-E' } }, created);
  const entryId = created.body.id;

  const subscriber = fakeSubscriberResponse();
  realtime.subscribe('inv-1', subscriber);

  const resApprove = mockRes();
  await admin.updateStatus({ params: { id: entryId }, body: { status: 'APPROVED' } }, resApprove);
  assert.equal(resApprove.statusCode, 200);
  assert.equal(resApprove.body.status, 'APPROVED');

  assert.equal(subscriber.chunks.length, 1, 'un evenement SSE doit avoir ete diffuse au grand ecran');
  const broadcastPayload = subscriber.chunks[0];
  assert.ok(!broadcastPayload.includes('key-E'), 'submissionKey ne doit jamais transiter sur le flux public');
  assert.ok(!broadcastPayload.includes(created.body.editToken), 'editToken ne doit jamais transiter sur le flux public');
  const broadcastData = JSON.parse(broadcastPayload.split('data: ')[1]);
  assert.equal(broadcastData.submissionKey, undefined);
  assert.equal(broadcastData.editToken, undefined);

  // Suppression admin toujours possible aussi (moderation complete).
  const resDelete = mockRes();
  await admin.remove({ params: { id: entryId } }, resDelete);
  assert.equal(resDelete.statusCode, 204);
});

test("F. le flux RSVP numerique n'est pas concerne par ces changements (colonnes optionnelles)", () => {
  // public.controller.js (RSVP numerique -> syncGuestbookEntry) n'a pas ete modifie par cette
  // phase et ne renseigne jamais submissionKey/editToken lors de son create/update ; ces deux
  // colonnes sont declarees optionnelles (String?) dans schema.prisma, donc Prisma les laisse a
  // NULL sans aucune erreur de validation. Verifie ici que le schema Prisma declare bien ces
  // deux colonnes comme optionnelles (pas de regression si quelqu'un les rend un jour requises
  // par erreur).
  const fs = require('node:fs');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
  assert.match(schema, /submissionKey\s+String\?\s+@unique/);
  assert.match(schema, /editToken\s+String\?\s+@unique/);
});

test("G. un invite reconnu par getEntryStatus sur une entree DIGITAL ne peut pas la modifier via PATCH", async () => {
  const { access, db } = loadControllers({ qrTokens: [ACTIVE_QR_TOKEN] });

  // Simule une entree DIGITAL deja creee par syncGuestbookEntry() (public.controller.js),
  // jamais par ce controleur QR — reproduit juste sa forme pour ce test.
  const digitalEntry = {
    id: 'entry-digital-1', invitationId: 'inv-1', rsvpId: 'rsvp-1', qrTokenId: null,
    source: 'DIGITAL', guestName: 'Amelie', message: 'Laisse via mon invitation', tableNumber: null,
    status: 'PENDING', approvedAt: null, submissionKey: null, editToken: null,
    createdAt: new Date(), updatedAt: new Date(),
  };
  db.entries.set(digitalEntry.id, digitalEntry);

  // getEntryStatus doit la reconnaitre en lecture seule, avec sa source.
  const resStatus = mockRes();
  await access.getEntryStatus({ params: { token: 'tok-active', entryId: digitalEntry.id } }, resStatus);
  assert.equal(resStatus.statusCode, 200);
  assert.equal(resStatus.body.source, 'DIGITAL');

  // Mais updateEntry (PATCH) reste strictement reserve aux entrees QR, quel que soit l'editToken.
  const resPatch = mockRes();
  await access.updateEntry({ params: { token: 'tok-active', entryId: digitalEntry.id }, body: { guestName: 'Attaquant', message: 'Modifie', editToken: 'peu-importe' } }, resPatch);
  assert.equal(resPatch.statusCode, 404, "une entree DIGITAL doit rester 404 au PATCH, comme avant cette phase");
  assert.equal(db.entries.get(digitalEntry.id).message, 'Laisse via mon invitation');
});
