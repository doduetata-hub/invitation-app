// Catalogue de templates fournis par le code : ajout seul, idempotent, jamais bloquant. Base simulée, aucun réseau.
// Lancer avec : node --test test/templateCatalog.test.js
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const SRC = path.join(__dirname, '..', 'src');
const { ensureCodeTemplates, REQUIRED_TEMPLATES, resetForTests } = require(path.join(SRC, 'services', 'templateCatalog.service.js'));

const fakePrisma = (rows, opts = {}) => ({
  calls: [],
  invitationTemplate: {
    createMany: async function ({ data, skipDuplicates }) {
      this.parent.calls.push({ op: 'createMany', skipDuplicates, keys: data.map((d) => d.key) });
      if (opts.fail) throw new Error('permission refusée');
      let count = 0;
      for (const d of data) if (!rows.some((r) => r.key === d.key)) { rows.push({ ...d, isActive: true }); count++; }
      return { count };
    },
    update: async () => { throw new Error('update interdit'); },
    updateMany: async () => { throw new Error('updateMany interdit'); },
    upsert: async () => { throw new Error('upsert interdit'); },
    delete: async () => { throw new Error('delete interdit'); },
    deleteMany: async () => { throw new Error('deleteMany interdit'); },
  },
});
const mk = (rows, opts) => { const p = fakePrisma(rows, opts); p.invitationTemplate.parent = p; return p; };

test('le catalogue contient royal-editorial, noir-gala et black-gold-eternal, comme le seed et le registre du frontend', () => {
  assert.deepEqual(REQUIRED_TEMPLATES.map((t) => t.key), ['royal-editorial', 'noir-gala', 'black-gold-eternal']);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'seed.js'), 'utf8'), /key: 'noir-gala', name: 'Noir Gala', category: 'mariage'/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'public', 'templates', 'registry.js'), 'utf8'), /noirGala/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'seed.js'), 'utf8'), /key: 'royal-editorial', name: 'Royal Editorial', category: 'mariage'/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'public', 'templates', 'registry.js'), 'utf8'), /royalEditorial/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'seed.js'), 'utf8'), /key: 'black-gold-eternal', name: 'Black & Gold Eternal', category: 'mariage'/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'public', 'templates', 'registry.js'), 'utf8'), /blackGoldEternal/);
});
test('ligne absente : créée une fois (skipDuplicates) ; deuxième appel sans effet', async () => {
  resetForTests();
  const rows = [{ key: 'mariage-elegant', name: 'Mariage Élégant', category: 'mariage', isActive: true }];
  const p = mk(rows);
  assert.deepEqual(await ensureCodeTemplates(p), { created: 3, skipped: false });
  assert.deepEqual(rows.map((r) => r.key), ['mariage-elegant', 'royal-editorial', 'noir-gala', 'black-gold-eternal']);
  assert.deepEqual(await ensureCodeTemplates(p), { created: 0, skipped: true });
  assert.equal(p.calls.length, 1);
  assert.equal(p.calls[0].skipDuplicates, true);
});
test('ligne déjà présente (même renommée ou désactivée) : AUCUNE modification', async () => {
  resetForTests();
  const rows = [
    { key: 'royal-editorial', name: 'Nom choisi par l\'admin', category: 'autre', isActive: false },
    { key: 'noir-gala', name: 'Noir Gala', category: 'mariage', isActive: true },
    { key: 'black-gold-eternal', name: 'Black & Gold Eternal', category: 'mariage', isActive: true },
  ];
  const before = JSON.stringify(rows);
  const r = await ensureCodeTemplates(mk(rows));
  assert.equal(r.created, 0);
  assert.equal(JSON.stringify(rows), before);
});
test('échec de la base : journalisé, jamais propagé ; nouvelle tentative possible', async () => {
  resetForTests();
  const rows = [];
  const p = mk(rows, { fail: true });
  const r = await ensureCodeTemplates(p);
  assert.equal(r.error, true);
  assert.equal(rows.length, 0);
  const r2 = await ensureCodeTemplates(mk(rows));
  assert.equal(r2.created, 3);
});
