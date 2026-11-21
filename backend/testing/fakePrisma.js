// Double Prisma en mémoire pour les tests d'import de médias (aucune base de données). Fichier utilitaire : il ne contient pas de test.
const path = require('path');

const matches = (row, where = {}) =>
  Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return v.some((w) => matches(row, w));
    if (v && typeof v === 'object' && 'in' in v) return v.in.includes(row[k]);
    if (v && typeof v === 'object' && 'not' in v) return row[k] !== v.not;
    return row[k] === v;
  });

function installFakePrisma(srcDir) {
  const db = { media: [], invitations: new Map(), seq: 0, failNextMediaCreate: false, failNextMediaUpdate: false };
  const prisma = {
    invitation: {
      findUnique: async ({ where }) => db.invitations.get(where.id) || null,
      delete: async ({ where }) => {
        if (!db.invitations.has(where.id)) { const e = new Error('absent'); e.code = 'P2025'; throw e; }
        db.invitations.delete(where.id);
        db.media = db.media.filter((m) => m.invitationId !== where.id); // onDelete: Cascade
        return {};
      },
    },
    media: {
      create: async ({ data }) => {
        if (db.failNextMediaCreate) { db.failNextMediaCreate = false; throw new Error('base indisponible (simulation)'); }
        const row = { id: `m${++db.seq}`, thumbUrl: null, width: null, height: null, focusX: null, focusY: null, focusSource: null, createdAt: new Date(), ...data };
        db.media.push(row);
        return row;
      },
      findUnique: async ({ where }) => db.media.find((m) => m.id === where.id) || null,
      findMany: async ({ where } = {}) => db.media.filter((m) => matches(m, where)),
      count: async ({ where } = {}) => db.media.filter((m) => matches(m, where)).length,
      delete: async ({ where }) => {
        const i = db.media.findIndex((m) => m.id === where.id);
        if (i < 0) { const e = new Error('absent'); e.code = 'P2025'; throw e; }
        return db.media.splice(i, 1)[0];
      },
      deleteMany: async ({ where }) => { const before = db.media.length; db.media = db.media.filter((m) => !matches(m, where)); return { count: before - db.media.length }; },
      update: async ({ where, data }) => {
        if (db.failNextMediaUpdate) { db.failNextMediaUpdate = false; throw new Error('écriture refusée (simulation)'); }
        const row = db.media.find((m) => m.id === where.id);
        if (!row) { const e = new Error('absent'); e.code = 'P2025'; throw e; }
        Object.assign(row, data);
        return row;
      },
    },
  };
  const p = require.resolve(path.join(srcDir, 'db', 'prismaClient.js'));
  require.cache[p] = { id: p, filename: p, loaded: true, exports: prisma };
  return { db, prisma };
}

function fakeRes() {
  const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; }, send() { return r; } };
  return r;
}

module.exports = { installFakePrisma, fakeRes };
