// Garde-fou de préproduction (scripts/guardBuildTarget.js) : valeurs FICTIVES (.invalid) uniquement, aucune connexion réseau ni base,
// aucune lecture de .env, aucune migration ni seed réels (le lancement d'opération est simulé). Lancer : node --test test/buildGuard.test.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const SCRIPT = path.join(__dirname, '..', 'scripts', 'guardBuildTarget.js');
const { evaluate, main, loadProductionProjectId, parseDbUrl, parseDenylist, parseR2Denylist, parseOrigin } = require(SCRIPT);

const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const PROD_JWT = 'Pr0d!Zq7kP2#vN9@xR4$mT6&wB1^yH8*cL3';
const TEST_JWT = 'Zq7!kP2#vN9@xR4$mT6&wB1^yH8*cL3(dF5)gJ0e';
const TARGET = {
  id: 'wa-test-1', dbHost: 'db-test.example.invalid', dbPort: 5432, poolHost: 'db-test-pooler.example.invalid', poolPort: 6543, dbName: 'invit_test',
  publicHost: 'invit-test.example.invalid', storageDriver: 's3', s3Endpoint: 'https://s3-test.example.invalid', s3Bucket: 'invit-test-media', s3PublicBaseUrl: 'https://media-test.example.invalid',
};
const TARGETS = [TARGET];
const DIRECT = 'postgresql://user:SECRETPASS@db-test.example.invalid:5432/invit_test';
const POOLED = 'postgresql://user:SECRETPASS@db-test-pooler.example.invalid:6543/invit_test?pgbouncer=true&connection_limit=1';
const GOOD = {
  STAGING_DB_AUTHORIZATION: 'ALLOW_MIGRATE_SEED_ON:wa-test-1',
  DIRECT_DATABASE_URL: DIRECT, DATABASE_URL: POOLED, PUBLIC_BASE_URL: 'https://invit-test.example.invalid',
  PRODUCTION_DB_HOSTS: 'db-prod.example.invalid:5432',
  PRODUCTION_R2_TARGETS: 'bucket:invit-prod-media,public:media-prod.example.invalid,public:invitations.example.invalid,endpoint:s3-prod.example.invalid',
  PRODUCTION_JWT_SHA256: sha(PROD_JWT),
  STORAGE_DRIVER: 's3', S3_ENDPOINT: 'https://s3-test.example.invalid', S3_BUCKET: 'invit-test-media', S3_PUBLIC_BASE_URL: 'https://media-test.example.invalid',
  S3_ACCESS_KEY: 'ACCESSKEYFICTIF0000', S3_SECRET_KEY: 'SECRETKEYFICTIF000000000000', JWT_SECRET: TEST_JWT,
};
const NOFILE = () => false;
const code = (patch, targets = TARGETS, mode = 'preflight', fileExists = NOFILE) => evaluate({ ...GOOD, ...patch }, targets, { mode, fileExists }).code;
const both = (u) => ({ DIRECT_DATABASE_URL: u, DATABASE_URL: u });
const direct = (u) => ({ DIRECT_DATABASE_URL: u });

// ───────────────────────── cas nominal ─────────────────────────
test('configuration fictive complète et autorisée : acceptée ; l\'empreinte ne dépend que de (id, hôte, base)', () => {
  const r = evaluate(GOOD, TARGETS, { mode: 'preflight', fileExists: NOFILE });
  assert.equal(r.ok, true);
  assert.equal(r.targetId, 'wa-test-1');
  assert.match(r.fingerprint, /^[0-9a-f]{8}$/);
  const r2 = evaluate({ ...GOOD, DIRECT_DATABASE_URL: DIRECT.replace('SECRETPASS', 'AUTRE') + '?sslmode=require' }, TARGETS, { mode: 'preflight', fileExists: NOFILE });
  assert.equal(r2.fingerprint, r.fingerprint);
});
test('hôtes en majuscules (DNS insensible à la casse) et barre finale des URL publiques : acceptés', () => {
  assert.equal(code(direct('postgresql://u:p@DB-TEST.EXAMPLE.INVALID:5432/invit_test')), undefined);
  assert.equal(code({ S3_PUBLIC_BASE_URL: 'https://MEDIA-TEST.EXAMPLE.INVALID/' }), undefined);
  assert.equal(code({ S3_ENDPOINT: 'https://s3-test.example.invalid/' }), undefined);
});

// ───────────────────────── modes ─────────────────────────
test('mode absent ou inconnu : refus', () => {
  assert.equal(evaluate(GOOD, TARGETS, { mode: undefined === 1 ? 1 : 'inconnu' }).code, 'E_NO_MODE');
  assert.equal(evaluate(GOOD, TARGETS, { mode: '' }).code, 'E_NO_MODE');
});
test('build : exige Vercel (VERCEL=1, VERCEL_ENV preview|production)', () => {
  const b = { VERCEL: '1', VERCEL_ENV: 'preview' };
  assert.equal(code(b, TARGETS, 'build'), undefined);
  assert.equal(code({ ...b, VERCEL: undefined }, TARGETS, 'build'), 'E_NOT_VERCEL');
  assert.equal(code({ ...b, VERCEL: '0' }, TARGETS, 'build'), 'E_NOT_VERCEL');
  assert.equal(code({ ...b, VERCEL_ENV: 'development' }, TARGETS, 'build'), 'E_BAD_ENV');
  assert.equal(code({ ...b, VERCEL_ENV: undefined }, TARGETS, 'build'), 'E_BAD_ENV');
  assert.equal(code({ ...b, VERCEL_ENV: 'PREVIEW' }, TARGETS, 'build'), 'E_BAD_ENV');
});
// ───────────────────────── build : Preview, production identifiée, variables vides ─────────────────────────
const PROD_ID = 'prj_Zk3Ak9Qm2Lx8Tn4Vb7Rc1Dw5Hs'; // fictif, utilisé UNIQUEMENT comme valeur injectée dans les tests (le fichier livré vaut null)
const OTHER_ID = 'prj_Hb6Yq2Wd8Mf4Ks9Pr3Nv7Cg1Xz';
const PROD_RES = { // ressources de production fictives, sans aucune variable de protection
  DATABASE_URL: 'postgresql://u:p@db-prod-pooler.example.invalid:6543/prod?pgbouncer=true', DIRECT_DATABASE_URL: 'postgresql://u:p@db-prod.example.invalid:5432/prod',
  STORAGE_DRIVER: 's3', S3_ENDPOINT: 'https://s3-prod.example.invalid', S3_BUCKET: 'invit-prod-media', S3_PUBLIC_BASE_URL: 'https://media-prod.example.invalid',
  S3_ACCESS_KEY: 'PRODKEY', S3_SECRET_KEY: 'PRODSECRET', JWT_SECRET: PROD_JWT, PUBLIC_BASE_URL: 'https://invitations.example.invalid',
};
const PROTECTION = ['STAGING_DB_AUTHORIZATION', 'PRODUCTION_DB_HOSTS', 'PRODUCTION_R2_TARGETS', 'PRODUCTION_JWT_SHA256'];
const build = (env, opts = {}) => evaluate(env, opts.targets === undefined ? TARGETS : opts.targets, { mode: 'build', fileExists: opts.fileExists || NOFILE, productionProjectId: opts.prodId });
const PREVIEW = { VERCEL: '1', VERCEL_ENV: 'preview' };
const PRODUCTION = { VERCEL: '1', VERCEL_ENV: 'production' };

test('PREVIEW sans variable de protection : REFUSÉ, jamais neutre (même avec l\'identifiant de production, ou des ressources de production)', () => {
  assert.equal(build(PREVIEW).code, 'E_PREVIEW_NEEDS_ISOLATION');
  assert.equal(build({ ...PREVIEW, ...PROD_RES }).code, 'E_PREVIEW_NEEDS_ISOLATION');
  assert.equal(build({ ...PREVIEW, VERCEL_PROJECT_ID: PROD_ID }, { prodId: PROD_ID }).code, 'E_PREVIEW_NEEDS_ISOLATION');
  assert.equal(build({ ...PREVIEW, ...PROD_RES, VERCEL_PROJECT_ID: PROD_ID }, { prodId: PROD_ID, targets: [] }).code, 'E_PREVIEW_NEEDS_ISOLATION');
  for (const t of [[], null]) assert.equal(build(PREVIEW, { targets: t }).code, 'E_PREVIEW_NEEDS_ISOLATION');
});
test('PREVIEW avec UNE seule variable de protection (valeur valide ou non) : REFUSÉ', () => {
  for (const k of PROTECTION) {
    for (const v of [GOOD[k], 'x', '']) {
      const r = build({ ...PREVIEW, ...PROD_RES, [k]: v });
      assert.equal(r.ok, false, `${k}=${JSON.stringify(v).slice(0, 12)}`);
      assert.notEqual(r.neutral, true);
    }
  }
});
test('PREVIEW avec les quatre variables VIDES ou faites d\'espaces : REFUSÉ (contrôles complets déclenchés)', () => {
  for (const v of ['', ' ', '   ', '\t', ',', ' , ']) {
    const env = { ...PREVIEW, ...PROD_RES, ...Object.fromEntries(PROTECTION.map((k) => [k, v])) };
    const r = build(env);
    assert.equal(r.ok, false, JSON.stringify(v));
    assert.notEqual(r.neutral, true);
    assert.notEqual(r.code, 'E_PREVIEW_NEEDS_ISOLATION'); // le refus vient des contrôles complets, déclenchés par la PRÉSENCE de la clé
  }
  assert.equal(build({ ...PREVIEW, STAGING_DB_AUTHORIZATION: '' }).code, 'E_NO_AUTH');
  assert.equal(build({ ...PREVIEW, ...GOOD, PRODUCTION_DB_HOSTS: '' }).code, 'E_NO_DENYLIST');
  assert.equal(build({ ...PREVIEW, ...GOOD, PRODUCTION_R2_TARGETS: ' ' }).code, 'E_NO_R2_DENYLIST');
  assert.equal(build({ ...PREVIEW, ...GOOD, PRODUCTION_JWT_SHA256: '' }).code, 'E_NO_JWT_FP');
  assert.equal(build({ ...PREVIEW, ...GOOD, STAGING_DB_AUTHORIZATION: ' ' }).code, 'E_AUTH_MISMATCH');
  // une clé dont la valeur est `undefined` (non définie) équivaut à ABSENTE
  assert.equal(build({ ...PREVIEW, STAGING_DB_AUTHORIZATION: undefined }).code, 'E_PREVIEW_NEEDS_ISOLATION');
});
test('PREVIEW avec configuration complète et cible fictive autorisée : réussite (vérifications complètes, pas neutre)', () => {
  const r = build({ ...PREVIEW, ...GOOD });
  assert.equal(r.ok, true);
  assert.equal(r.neutral, undefined);
  assert.equal(r.targetId, 'wa-test-1');
});
test('PREVIEW utilisant des ressources de PRODUCTION malgré une configuration déclarée : REFUSÉ', () => {
  assert.equal(build({ ...PREVIEW, ...GOOD, ...PROD_RES }).code, 'E_DENIED');
  assert.equal(build({ ...PREVIEW, ...GOOD, S3_BUCKET: 'invit-prod-media' }).code, 'E_R2_DENIED');
  assert.equal(build({ ...PREVIEW, ...GOOD, S3_ENDPOINT: 'https://s3-prod.example.invalid' }).code, 'E_R2_DENIED');
  assert.equal(build({ ...PREVIEW, ...GOOD, S3_PUBLIC_BASE_URL: 'https://media-prod.example.invalid' }).code, 'E_R2_DENIED');
  assert.equal(build({ ...PREVIEW, ...GOOD, JWT_SECRET: PROD_JWT }).code, 'E_JWT_SAME_AS_PROD');
  assert.equal(build({ ...PREVIEW, ...GOOD, PUBLIC_BASE_URL: 'https://invitations.example.invalid' }).code, 'E_PUBLIC_MISMATCH');
});
test('PRODUCTION avec le bon identifiant de projet : build neutre accepté, sans toucher à rien', () => {
  assert.deepEqual(build({ ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID, ...PROD_RES }, { prodId: PROD_ID, targets: [] }), { ok: true, neutral: true });
});
test('PRODUCTION sans identifiant, avec un autre identifiant, invalide ou fictif : REFUSÉ', () => {
  assert.equal(build(PRODUCTION, { prodId: PROD_ID }).code, 'E_NO_PROJECT_ID'); // VERCEL_PROJECT_ID absent
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: '' }, { prodId: PROD_ID }).code, 'E_NO_PROJECT_ID');
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: OTHER_ID }, { prodId: PROD_ID }).code, 'E_PROJECT_MISMATCH'); // projet de TEST déployé avec --prod
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID.toLowerCase() }, { prodId: PROD_ID }).code, 'E_PROJECT_MISMATCH'); // égalité exacte (casse)
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: ` ${PROD_ID}` }, { prodId: PROD_ID }).code, 'E_NO_PROJECT_ID'); // pas de « trim »
  for (const bad of ['prj_', 'prj_court', 'abc', 'PRJ_Zk3Ak9Qm2Lx8Tn4Vb7Rc1Dw5Hs', 'prj_Zk3Ak9Qm2Lx8Tn4Vb7Rc1Dw5Hs\n', 'prj_Zk3Ak9Qm2Lx8Tn4Vb7Rc1Dw5Hs,prj_Hb6Yq2Wd8Mf4Ks9Pr3Nv7Cg1Xz',
    'prj_FictifFictifFictif123456', 'prj_ExampleExample123456', 'prj_PlaceholderPlaceholder1', 'prj_xxxxxxxxxxxxxxxx', 'prj_testtesttesttest1']) {
    assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: bad }, { prodId: PROD_ID }).code, 'E_NO_PROJECT_ID', JSON.stringify(bad));
  }
});
test('PRODUCTION : fichier d\'identification absent, null ou invalide (ou valeur fictive) -> mode neutre FERMÉ par défaut', () => {
  for (const id of [undefined, null, '', 'prj_', 'prj_FictifFictifFictif123456', 'prj_ExampleExample123456', 123, {}, ['x']]) {
    assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID }, { prodId: id }).code, 'E_PROD_ID_NOT_CONFIGURED', JSON.stringify(id));
  }
});
test('projet de TEST déployé avec VERCEL_ENV=production : jamais neutre (identifiant différent), contrôles complets s\'il a sa configuration', () => {
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: OTHER_ID }, { prodId: PROD_ID }).code, 'E_PROJECT_MISMATCH');
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: OTHER_ID }, { prodId: null }).code, 'E_PROD_ID_NOT_CONFIGURED');
  const r = build({ ...PRODUCTION, VERCEL_PROJECT_ID: OTHER_ID, ...GOOD }, { prodId: PROD_ID });
  assert.equal(r.ok, true); // configuration complète d'un vrai projet de test : vérifications complètes, jamais neutre
  assert.equal(r.neutral, undefined);
  assert.equal(build({ ...PRODUCTION, VERCEL_PROJECT_ID: OTHER_ID, ...GOOD, JWT_SECRET: PROD_JWT }, { prodId: PROD_ID }).code, 'E_JWT_SAME_AS_PROD');
});
test('PRODUCTION identifiée + variables de préproduction accidentelles (même vides) : REFUSÉ explicitement', () => {
  const prod = { ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID, ...PROD_RES };
  for (const k of [...PROTECTION, 'STAGING_OP_AUTHORIZATION']) {
    for (const v of [GOOD[k] || 'ALLOW_MIGRATE_ON:wa-test-1', '', ' ']) {
      assert.equal(build({ ...prod, [k]: v }, { prodId: PROD_ID, targets: [] }).code, 'E_TEST_CONFIG_ON_PRODUCTION', `${k}=${JSON.stringify(v).slice(0, 10)}`);
    }
  }
  assert.equal(build({ ...prod, ...GOOD }, { prodId: PROD_ID }).code, 'E_TEST_CONFIG_ON_PRODUCTION'); // même complète : jamais sur le projet de production
  assert.equal(build({ ...prod, STAGING_DB_AUTHORIZATION: undefined }, { prodId: PROD_ID }).neutral, true); // clé non définie = absente
});
test('VITE_* et .env du frontend refusés aussi pour le projet de production identifié', () => {
  const prod = { ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID };
  assert.equal(build({ ...prod, VITE_API_BASE_URL: 'https://x.invalid' }, { prodId: PROD_ID }).code, 'E_VITE_ENV');
  assert.equal(build(prod, { prodId: PROD_ID, fileExists: (f) => f.endsWith('.env.production') }).code, 'E_VITE_FILE');
});
test('non-régression : VERCEL=1 sans VERCEL_ENV, development, hors Vercel : refus en mode build', () => {
  assert.equal(build({ VERCEL: '1' }).code, 'E_BAD_ENV');
  assert.equal(build({ VERCEL: '1', VERCEL_ENV: '' }).code, 'E_BAD_ENV');
  assert.equal(build({ VERCEL: '1', VERCEL_ENV: 'development', ...GOOD }).code, 'E_BAD_ENV');
  assert.equal(build({ VERCEL_ENV: 'preview', ...GOOD }).code, 'E_NOT_VERCEL');
  assert.equal(build({ VERCEL: '0', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: PROD_ID }, { prodId: PROD_ID }).code, 'E_NOT_VERCEL');
});
test('non-régression : migrate et seed refusés en environnement Vercel, quelle que soit la configuration ; autorisations non interchangeables', () => {
  for (const op of ['migrate', 'seed']) {
    for (const venv of ['preview', 'production', 'development', undefined]) {
      const env = { ...GOOD, VERCEL: '1', VERCEL_ENV: venv, STAGING_OP_AUTHORIZATION: `ALLOW_${op.toUpperCase()}_ON:wa-test-1` };
      assert.equal(evaluate(env, TARGETS, { mode: op, fileExists: NOFILE }).code, 'E_OP_IN_BUILD', `${op}/${venv}`);
    }
  }
  const migrateOnly = { ...GOOD, STAGING_OP_AUTHORIZATION: 'ALLOW_MIGRATE_ON:wa-test-1' };
  const seedOnly = { ...GOOD, STAGING_OP_AUTHORIZATION: 'ALLOW_SEED_ON:wa-test-1' };
  assert.equal(evaluate(migrateOnly, TARGETS, { mode: 'seed', fileExists: NOFILE }).code, 'E_OP_AUTH_MISMATCH');
  assert.equal(evaluate(seedOnly, TARGETS, { mode: 'migrate', fileExists: NOFILE }).code, 'E_OP_AUTH_MISMATCH');
  assert.equal(evaluate(migrateOnly, TARGETS, { mode: 'migrate', fileExists: NOFILE }).ok, true);
  assert.equal(evaluate(seedOnly, TARGETS, { mode: 'seed', fileExists: NOFILE }).ok, true);
});
test('production-project.json livré : identifiant valide du projet de production (jamais fictif) ; le garde-fou le lit', () => {
  const file = path.join(__dirname, '..', 'scripts', 'production-project.json');
  const shipped = JSON.parse(fs.readFileSync(file, 'utf8')).productionProjectId;
  assert.match(shipped, /^prj_[A-Za-z0-9]{10,64}$/);
  assert.equal(loadProductionProjectId(file), shipped); // valide : ni fictif, ni d'exemple
  assert.notEqual(shipped, PROD_ID); // l'identifiant de test des tests n'est jamais l'identifiant livré
  assert.notEqual(shipped, OTHER_ID);
  assert.equal(loadProductionProjectId(path.join(os.tmpdir(), 'inexistant-guard.json')), null);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-pp-'));
  const f = path.join(dir, 'p.json');
  fs.writeFileSync(f, JSON.stringify({ productionProjectId: 'prj_FictifFictifFictif123456' }));
  assert.equal(loadProductionProjectId(f), null); // valeur fictive jamais acceptée
  fs.writeFileSync(f, JSON.stringify({ productionProjectId: PROD_ID }));
  assert.equal(loadProductionProjectId(f), PROD_ID);
  fs.writeFileSync(f, '{pas du json');
  assert.equal(loadProductionProjectId(f), null);
  fs.rmSync(dir, { recursive: true, force: true });
});
test('migrate/seed : refusés dans un build Vercel, exigent une autorisation d\'opération distincte et propre à l\'opération', () => {
  for (const op of ['migrate', 'seed']) {
    const ok = { STAGING_OP_AUTHORIZATION: `ALLOW_${op.toUpperCase()}_ON:wa-test-1` };
    assert.equal(code(ok, TARGETS, op), undefined, op);
    assert.equal(code({ ...ok, VERCEL: '1' }, TARGETS, op), 'E_OP_IN_BUILD');
    assert.equal(code({}, TARGETS, op), 'E_NO_OP_AUTH');
    assert.equal(code({ STAGING_OP_AUTHORIZATION: 'true' }, TARGETS, op), 'E_OP_AUTH_MISMATCH');
    assert.equal(code({ STAGING_OP_AUTHORIZATION: 'ALLOW_MIGRATE_ON:autre' }, TARGETS, op), 'E_OP_AUTH_MISMATCH');
  }
  assert.equal(code({ STAGING_OP_AUTHORIZATION: 'ALLOW_SEED_ON:wa-test-1' }, TARGETS, 'migrate'), 'E_OP_AUTH_MISMATCH');
  assert.equal(code({ STAGING_OP_AUTHORIZATION: 'ALLOW_MIGRATE_ON:wa-test-1' }, TARGETS, 'seed'), 'E_OP_AUTH_MISMATCH');
  // un .env local pourrait compléter silencieusement l'environnement du seed/de la migration
  assert.equal(code({ STAGING_OP_AUTHORIZATION: 'ALLOW_SEED_ON:wa-test-1' }, TARGETS, 'seed', (f) => f.endsWith(path.join('backend', '.env'))), 'E_DOTENV_PRESENT');
});
test('opérations : lancées UNE FOIS le contrôle passé, avec l\'URL directe ; jamais lancées en cas de refus ; aucune fuite dans les journaux', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
  const targetsFile = path.join(dir, 't.json');
  fs.writeFileSync(targetsFile, JSON.stringify({ targets: TARGETS }));
  const run = (argv, patch = {}) => {
    const calls = []; const out = [];
    const env = { ...GOOD, ...patch };
    const exit = main(argv, env, {
      targetsFile, fileExists: NOFILE, exit: (c) => c,
      log: (m) => out.push(m), logErr: (m) => out.push(m),
      spawn: (cmd, args, opts) => { calls.push({ cmd, args, opts }); return { status: 0 }; },
    });
    return { exit, calls, out: out.join('\n') };
  };
  const m = run(['--mode=migrate'], { STAGING_OP_AUTHORIZATION: 'ALLOW_MIGRATE_ON:wa-test-1' });
  assert.equal(m.exit, 0);
  assert.equal(m.calls.length, 1);
  assert.deepEqual(m.calls[0].args.slice(-2), ['migrate', 'deploy']);
  assert.equal(m.calls[0].opts.env.DATABASE_URL, DIRECT);
  assert.equal(m.calls[0].opts.cwd, path.join(__dirname, '..'));
  const s = run(['--mode=seed'], { STAGING_OP_AUTHORIZATION: 'ALLOW_SEED_ON:wa-test-1' });
  assert.equal(s.exit, 0);
  assert.match(s.calls[0].args[0], /seed\.js$/);
  assert.equal(s.calls[0].opts.env.DATABASE_URL, DIRECT);
  // refus : aucune opération lancée
  const refused = run(['--mode=migrate'], { STAGING_OP_AUTHORIZATION: undefined });
  assert.equal(refused.exit, 1);
  assert.equal(refused.calls.length, 0);
  assert.equal(run(['--mode=migrate'], { STAGING_OP_AUTHORIZATION: 'ALLOW_MIGRATE_ON:wa-test-1', JWT_SECRET: PROD_JWT }).calls.length, 0);
  assert.equal(run([]).exit, 1); // pas de mode
  // échec de l'opération : code de sortie propagé
  const failing = main(['--mode=seed'], { ...GOOD, STAGING_OP_AUTHORIZATION: 'ALLOW_SEED_ON:wa-test-1' }, { targetsFile, fileExists: NOFILE, exit: (c) => c, log() {}, logErr() {}, spawn: () => ({ status: 3 }) });
  assert.equal(failing, 3);
  // aucune valeur sensible dans les journaux du guard
  for (const r of [m, s, refused]) for (const secret of ['SECRETPASS', TEST_JWT, 'SECRETKEYFICTIF', 'ACCESSKEYFICTIF', 'db-test', 'invit-test-media', DIRECT]) assert.ok(!r.out.includes(secret), secret);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ───────────────────────── autorisation, environnement ─────────────────────────
test('autorisation absente, vide ou pour une autre cible : refus ; PREVIEW/STAGING ne prouvent rien', () => {
  assert.equal(code({ STAGING_DB_AUTHORIZATION: undefined }), 'E_NO_AUTH');
  assert.equal(code({ STAGING_DB_AUTHORIZATION: '' }), 'E_NO_AUTH');
  assert.equal(code({ STAGING_DB_AUTHORIZATION: 'ALLOW_MIGRATE_SEED_ON:autre' }), 'E_AUTH_MISMATCH');
  assert.equal(code({ STAGING_DB_AUTHORIZATION: 'true' }), 'E_AUTH_MISMATCH');
  assert.equal(code({ STAGING_DB_AUTHORIZATION: undefined, PREVIEW: '1', STAGING: 'true' }), 'E_NO_AUTH');
  assert.equal(code({ ...direct('postgresql://u:p@db-prod.example.invalid:5432/prod'), STAGING: 'true', PREVIEW: 'true' }), 'E_DENIED');
});
test('e-mail réel et réinitialisation du mot de passe admin : interdits', () => {
  assert.equal(code({ SMTP_HOST: 'smtp.example.invalid' }), 'E_SMTP_SET');
  assert.equal(code({ SMTP_HOST: '' }), undefined);
  assert.equal(code({ RESET_ADMIN_PASSWORD: 'true' }), 'E_RESET_SET');
  assert.equal(code({ RESET_ADMIN_PASSWORD: '' }), 'E_RESET_SET');
});

// ───────────────────────── PostgreSQL ─────────────────────────
test('URL de base ou URL publique absente/invalide : refus', () => {
  assert.equal(code({ DIRECT_DATABASE_URL: undefined }), 'E_NO_DB_URL');
  assert.equal(code({ DIRECT_DATABASE_URL: '  ' }), 'E_NO_DB_URL');
  assert.equal(code({ DATABASE_URL: undefined }), 'E_NO_RUNTIME_URL');
  assert.equal(code({ PUBLIC_BASE_URL: undefined }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'http://invit-test.example.invalid' }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://u:p@invit-test.example.invalid' }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://invit-test.example.invalid:8443' }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://invit-test.example.invalid/chemin' }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://invit-test.example.invalid?x=1' }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://invit-test.example.invalid.' }), 'E_NO_PUBLIC_URL');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://invitations.example.com' }), 'E_PUBLIC_MISMATCH');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://invit-test.example.invalid.evil.invalid' }), 'E_PUBLIC_MISMATCH');
  assert.equal(code({ PUBLIC_BASE_URL: 'https://xinvit-test.example.invalid' }), 'E_PUBLIC_MISMATCH');
});
test('liste noire PostgreSQL absente, vide ou malformée : refus', () => {
  for (const v of [undefined, '', '   ', ' , ,, ']) assert.equal(code({ PRODUCTION_DB_HOSTS: v }), 'E_NO_DENYLIST', String(v));
  for (const bad of ['*.example.invalid', 'db-prod.example.invalid:0', 'db-prod.example.invalid:70000', 'db-prod.example.invalid:abc', 'db-prod.example.invalid:5432:1',
    'postgresql://db-prod.example.invalid', 'db prod.example.invalid', 'db-prod.example.invalid,,autre.invalid', 'db-prod.example.invalid,', '10.0.0.1', 'exemple_.invalid', '-x.invalid']) {
    assert.equal(code({ PRODUCTION_DB_HOSTS: bad }), 'E_DENYLIST_INVALID', bad);
  }
});
test('liste noire PostgreSQL : formes directe et poolée, port, casse, point final ; aucun faux positif', () => {
  const prodDirect = 'postgresql://u:p@db-prod.example.invalid:5432/prod';
  const prodPooled = 'postgresql://u:p@db-prod-pooler.example.invalid:6543/prod?pgbouncer=true';
  assert.equal(code({ PRODUCTION_DB_HOSTS: 'db-prod.example.invalid', DATABASE_URL: prodPooled }), 'E_DENIED');
  assert.equal(code({ PRODUCTION_DB_HOSTS: 'db-prod-pooler.example.invalid', ...direct(prodDirect), DATABASE_URL: prodPooled }), 'E_DENIED');
  assert.equal(code({ DIRECT_DATABASE_URL: prodDirect }), 'E_DENIED');
  assert.equal(code({ DATABASE_URL: prodPooled }), 'E_URL_MISMATCH'); // entrée « hôte:5432 » : pooler à un autre port non listé, mais pas la cible
  assert.equal(code({ PRODUCTION_DB_HOSTS: 'DB-TEST.Example.Invalid.' }), 'E_DENIED');
  assert.equal(code({ PRODUCTION_DB_HOSTS: 'db-test.example.invalid:5432' }), 'E_DENIED');
  assert.equal(code({ PRODUCTION_DB_HOSTS: 'db-test.example.invalid:5999,db-test-pooler.example.invalid:5999' }), undefined);
  for (const ok of ['db-test', 'example.invalid', 'b-test.example.invalid', 'db-test.example.invalid.evil.invalid', 'x.db-test.example.invalid', 'notdb-test.example.invalid']) {
    assert.equal(code({ PRODUCTION_DB_HOSTS: ok }), undefined, ok);
  }
});
test('confusions d\'hôte, de base et de port : refus', () => {
  for (const host of ['db-test.example.invalid.attacker.test', 'notdb-test.example.invalid', 'x.db-test.example.invalid', 'ddb-test.example.invalid']) {
    assert.equal(code(direct(`postgresql://u:p@${host}:5432/invit_test`)), 'E_DB_NOT_ALLOWED', host);
  }
  assert.equal(code(direct('postgresql://u:p@db-test.example.invalid.:5432/invit_test')), 'E_BAD_DB_URL');
  assert.equal(code(direct('postgresql://u:p@*.example.invalid:5432/invit_test')), 'E_BAD_DB_URL');
  for (const name of ['invit_test2', 'Invit_Test', 'invit_tes', 'xinvit_test']) assert.equal(code(direct(`postgresql://u:p@db-test.example.invalid:5432/${name}`)), 'E_DB_NOT_ALLOWED', name);
  for (const name of ['invit_test/', 'invit_test/x', 'invit%2Ftest', 'invit_test%00', '']) assert.equal(code(direct(`postgresql://u:p@db-test.example.invalid:5432/${name}`)), 'E_BAD_DB_URL', name);
  assert.equal(code(direct('postgresql://u:p@db-test.example.invalid:5432/invit%5Ftest')), undefined);
  assert.equal(code(direct('postgresql://u:p@db-test.example.invalid:5433/invit_test')), 'E_PORT_MISMATCH');
  for (const p of ['', ':0', ':65536', ':05432', ':54a2', ':-1']) assert.equal(code(direct(`postgresql://u:p@db-test.example.invalid${p}/invit_test`)), 'E_BAD_DB_URL', p);
  assert.equal(code({ DATABASE_URL: POOLED.replace(':6543', ':6544') }), 'E_URL_MISMATCH');
  assert.equal(code({ DATABASE_URL: 'postgresql://u:p@autre-pooler.example.invalid:6543/invit_test?pgbouncer=true' }), 'E_URL_MISMATCH');
  assert.equal(code({ DATABASE_URL: POOLED.replace('/invit_test', '/invit_prod') }), 'E_URL_MISMATCH');
  assert.equal(code({ DATABASE_URL: DIRECT }), 'E_URL_MISMATCH');
});
test('paramètres de connexion : liste blanche ; host, hostaddr, options, inconnus, répétés refusés ; schema=public ; pgbouncer interdit en direct', () => {
  assert.equal(code(direct(DIRECT + '?sslmode=require&channel_binding=require&connect_timeout=15&schema=public')), undefined);
  assert.equal(code({ DATABASE_URL: POOLED + '&pool_timeout=20&sslmode=require' }), undefined);
  for (const q of ['host=db-prod.example.invalid', 'host=%2Ftmp', 'hostaddr=10.0.0.1', 'options=-c%20search_path%3Dx', 'port=5432', 'dbname=prod', 'user=x', 'password=x',
    'service=x', 'sslrootcert=x', 'application_name=x', 'socket_dir_path=/tmp', 'inconnu=1', 'SSLMODE=require', 'sslmode=verify-full', 'sslmode=']) {
    assert.ok(['E_QUERY_PARAM', 'E_BAD_DB_URL'].includes(code(direct(`${DIRECT}?${q}`))), q);
    assert.ok(['E_QUERY_PARAM', 'E_BAD_RUNTIME_URL'].includes(code({ DATABASE_URL: `${POOLED}&${q}` })), q);
  }
  for (const q of ['sslmode=require&sslmode=require', 'sslmode=require&sslmode=disable', 'sslmode', 'sslmode=require&', 'connect_timeout=0', 'connect_timeout=301', 'connection_limit=010', 'pgbouncer=false']) {
    assert.ok(['E_QUERY_PARAM', 'E_BAD_DB_URL'].includes(code(direct(`${DIRECT}?${q}`))), q);
  }
  assert.equal(code(direct(`${DIRECT}?schema=autre`)), 'E_QUERY_PARAM');
  assert.equal(code(direct(`${DIRECT}?schema=public`)), undefined);
  assert.equal(code(direct(`${DIRECT}?pgbouncer=true`)), 'E_QUERY_PARAM');
});
test('URL PostgreSQL mal formées (plusieurs @, antislash, fragment, contrôle, non-ASCII, IP…) : refus sans réparation', () => {
  const bad = [
    'postgresql://u:p@x@db-test.example.invalid:5432/invit_test',
    'postgresql://u:p@db-prod.example.invalid\\@db-test.example.invalid:5432/invit_test',
    'postgresql://u:p@db-test.example.invalid:5432/invit_test#frag',
    'postgresql://u:p@db-test.example.invalid:5432/invit_test\n', 'postgresql://u:p@db-test.example.invalid:5432/invit_test\r\n',
    'postgresql://u:p@db-test.example.invalid:5432/invit\u0000_test', 'postgresql://u:p@db-test.example.invalid:5432/invit_test\t',
    ' postgresql://u:p@db-test.example.invalid:5432/invit_test', 'postgresql://u:p@db-test.example.invalid :5432/invit_test',
    'postgresql://u:p@db-tést.example.invalid:5432/invit_test', 'postgresql://u:p@db-test.example.invalid,db-prod.example.invalid:5432/invit_test',
    'postgresql://db-test.example.invalid@db-prod.example.invalid:5432/invit_test', 'postgresql://u:p:q@db-test.example.invalid:5432/invit_test',
    'postgresql://u:p%@db-test.example.invalid:5432/invit_test', 'postgresql://:p@db-test.example.invalid:5432/invit_test', 'postgresql://u:@db-test.example.invalid:5432/invit_test',
    'postgresql://u@db-test.example.invalid:5432/invit_test', 'postgresql:///invit_test?host=/tmp', 'postgresql://u:p@[::1]:5432/invit_test',
    'postgresql://u:p@127.0.0.1:5432/invit_test', 'postgresql://u:p@2130706433:5432/invit_test', 'postgresql://u:p@0x7f.1:5432/invit_test',
    'mysql://u:p@db-test.example.invalid:5432/invit_test', 'POSTGRESQL://u:p@db-test.example.invalid:5432/invit_test', 'pas une url',
  ];
  for (const u of bad) {
    assert.equal(code(direct(u)), 'E_BAD_DB_URL', JSON.stringify(u));
    assert.equal(code({ DATABASE_URL: u }), 'E_BAD_RUNTIME_URL', JSON.stringify(u));
  }
  const r = parseDbUrl('postgres://us%40er:p%3Aw%2Fd@Db.Example.INVALID:5432/ba%2Dse?sslmode=require');
  assert.deepEqual({ host: r.host, port: r.port, name: r.name }, { host: 'db.example.invalid', port: 5432, name: 'ba-se' });
});

// ───────────────────────── cibles ─────────────────────────
test('cibles vides, invalides, incomplètes ou ambiguës : refus', () => {
  assert.equal(code({}, []), 'E_TARGETS_EMPTY');
  assert.equal(code({}, null), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ id: 'x' }]), 'E_TARGETS_INVALID');
  for (const field of Object.keys(TARGET)) {
    const { [field]: _omis, ...incomplete } = TARGET;
    assert.equal(code({}, [incomplete]), 'E_TARGETS_INVALID', `sans ${field}`);
  }
  assert.equal(code({}, [{ ...TARGET, dbPort: '5432' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, dbHost: '*.example.invalid' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, storageDriver: 'local' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, storageDriver: 'S3' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, s3Endpoint: 'http://s3-test.example.invalid' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, s3Endpoint: 'https://s3-test.example.invalid/bucket' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, s3PublicBaseUrl: 'https://media-test.example.invalid:8443' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [{ ...TARGET, s3Bucket: 'Invit-Test' }]), 'E_TARGETS_INVALID');
  assert.equal(code({}, [TARGET, { ...TARGET, id: 'dup' }]), 'E_AMBIGUOUS');
  assert.equal(code({}, [TARGET, { ...TARGET, dbName: 'autre' }]), undefined);
  assert.equal(code(both('postgresql://u:p@db-prod.example.invalid:5432/invit_prod'), TARGETS), 'E_DENIED');
  assert.equal(code({ ...both('postgresql://u:p@db-prod.example.invalid:5432/invit_prod'), PRODUCTION_DB_HOSTS: 'autre.invalid' }), 'E_DB_NOT_ALLOWED');
});

// ───────────────────────── stockage applicatif et R2 ─────────────────────────
test('stockage local ou invalide refusé : STORAGE_DRIVER doit valoir exactement « s3 »', () => {
  for (const v of [undefined, '', 'local', 'LOCAL', 'S3', 's3 ', 'minio']) assert.equal(code({ STORAGE_DRIVER: v }), 'E_STORAGE_DRIVER', String(v));
});
test('variables de stockage manquantes (endpoint, bucket, URL publique, clé d\'accès, secret) : refus', () => {
  for (const k of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_PUBLIC_BASE_URL', 'S3_ACCESS_KEY', 'S3_SECRET_KEY']) {
    assert.equal(code({ [k]: undefined }), 'E_S3_MISSING', k);
    assert.equal(code({ [k]: '' }), 'E_S3_MISSING', k);
  }
});
test('liste noire R2 : obligatoire (bucket: ET public:), format strict', () => {
  for (const v of [undefined, '', '  ', ' , ', 'endpoint:s3-prod.example.invalid', 'bucket:invit-prod-media', 'public:media-prod.example.invalid']) {
    assert.equal(code({ PRODUCTION_R2_TARGETS: v }), 'E_NO_R2_DENYLIST', String(v));
  }
  for (const bad of ['bucket:INVIT', 'bucket:ab', 'bucket:', 'foo:bar', 'invit-prod-media', 'public:*.example.invalid', 'public:media-prod.example.invalid:8443',
    'bucket:invit-prod-media,public:media-prod.example.invalid,,', 'bucket:invit-prod-media,public:https://media-prod.example.invalid', 'bucket:a b']) {
    assert.equal(code({ PRODUCTION_R2_TARGETS: bad }), 'E_R2_DENYLIST_INVALID', bad);
  }
  assert.ok(parseR2Denylist(GOOD.PRODUCTION_R2_TARGETS).bucket.has('invit-prod-media'));
});
test('bucket, endpoint et URL publique de production refusés', () => {
  assert.equal(code({ S3_BUCKET: 'invit-prod-media' }), 'E_R2_DENIED');
  assert.equal(code({ S3_ENDPOINT: 'https://s3-prod.example.invalid' }), 'E_R2_DENIED');
  assert.equal(code({ S3_PUBLIC_BASE_URL: 'https://media-prod.example.invalid' }), 'E_R2_DENIED');
  assert.equal(code({ S3_PUBLIC_BASE_URL: 'https://MEDIA-PROD.example.invalid/' }), 'E_R2_DENIED');
  assert.equal(code({ PRODUCTION_R2_TARGETS: GOOD.PRODUCTION_R2_TARGETS + ',bucket:invit-test-media' }), 'E_R2_DENIED'); // cible déclarée sur un bucket de production
  assert.equal(code({ PRODUCTION_R2_TARGETS: GOOD.PRODUCTION_R2_TARGETS + ',public:invit-test.example.invalid' }), 'E_R2_DENIED'); // domaine du site = domaine de production
  assert.equal(code({ PRODUCTION_R2_TARGETS: GOOD.PRODUCTION_R2_TARGETS + ',endpoint:s3-test.example.invalid' }), 'E_R2_DENIED');
});
test('mauvaise cible de stockage : égalité EXACTE avec la cible, domaines ressemblants refusés', () => {
  assert.equal(code({ S3_BUCKET: 'invit-test-media2' }), 'E_S3_MISMATCH');
  assert.equal(code({ S3_BUCKET: 'xinvit-test-media' }), 'E_S3_MISMATCH');
  assert.equal(code({ S3_BUCKET: 'autre-bucket' }), 'E_S3_MISMATCH');
  assert.equal(code({ S3_BUCKET: 'Invit-Test-Media' }), 'E_S3_INVALID');
  assert.equal(code({ S3_ENDPOINT: 'https://autre.example.invalid' }), 'E_S3_MISMATCH');
  for (const url of ['https://media-test.example.invalid.evil.invalid', 'https://xmedia-test.example.invalid', 'https://media.test.example.invalid', 'https://media-tes.example.invalid', 'https://sub.media-test.example.invalid']) {
    assert.equal(code({ S3_PUBLIC_BASE_URL: url }), 'E_S3_MISMATCH', url);
  }
  for (const url of ['https://media-test.example.invalid:8443', 'https://media-test.example.invalid/chemin', 'http://media-test.example.invalid', 'https://u:p@media-test.example.invalid',
    'https://media-test.example.invalid?x=1', 'https://media-test.example.invalid#x', 'https://media-test.example.invalid\\@evil.invalid', 'ftp://media-test.example.invalid', 'media-test.example.invalid', 'https://10.0.0.1', 'https://*.example.invalid']) {
    assert.equal(code({ S3_PUBLIC_BASE_URL: url }), 'E_S3_INVALID', url);
    assert.equal(code({ S3_ENDPOINT: url }), 'E_S3_INVALID', `endpoint ${url}`);
  }
  assert.equal(parseOrigin('https://Exemple.INVALID/'), 'exemple.invalid');
});

// ───────────────────────── JWT ─────────────────────────
test('JWT : absent, vide, faible, identique à la production -> refus ; empreintes obligatoires et valides', () => {
  assert.equal(code({ JWT_SECRET: undefined }), 'E_NO_JWT');
  assert.equal(code({ JWT_SECRET: '' }), 'E_NO_JWT');
  for (const weak of ['court', 'a'.repeat(40), ` ${TEST_JWT}`, `${TEST_JWT}\n`, 'changeme-AbCdEfGhIjKlMnOpQrStUvWx12', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-jwt-secret-1234', 'x'.repeat(31)]) {
    assert.equal(code({ JWT_SECRET: weak }), 'E_JWT_WEAK', JSON.stringify(weak));
  }
  assert.equal(code({ JWT_SECRET: PROD_JWT }), 'E_JWT_SAME_AS_PROD');
  assert.equal(code({ PRODUCTION_JWT_SHA256: sha(PROD_JWT).toUpperCase(), JWT_SECRET: PROD_JWT }), 'E_JWT_SAME_AS_PROD');
  assert.equal(code({ PRODUCTION_JWT_SHA256: `${sha('autre-secret-fictif-ABCDEFGHIJKLMN12345')},${sha(PROD_JWT)}`, JWT_SECRET: PROD_JWT }), 'E_JWT_SAME_AS_PROD');
  assert.equal(code({ PRODUCTION_JWT_SHA256: sha('un autre secret de production fictif 12345') }), undefined);
  for (const v of [undefined, '', '  ', 'abc', sha(PROD_JWT).slice(1), `${sha(PROD_JWT)}0`, 'z'.repeat(64), `${sha('a')},`, Array(6).fill(sha('a')).join(',')]) {
    assert.equal(code({ PRODUCTION_JWT_SHA256: v }), 'E_NO_JWT_FP', String(v));
  }
});

// ───────────────────────── frontend (Vite) ─────────────────────────
test('frontend : aucune VITE_* ; variable absente acceptée ; vide REFUSÉE (comportement explicite) ; URL de production ou externe refusée', () => {
  assert.equal(code({}), undefined); // absente : acceptée
  assert.equal(code({ VITE_API_BASE_URL: '' }), 'E_VITE_ENV'); // vide : refusée (il faut que la variable soit ABSENTE)
  assert.equal(code({ VITE_API_BASE_URL: 'https://invitations.example.invalid/api' }), 'E_VITE_ENV'); // « production »
  assert.equal(code({ VITE_API_BASE_URL: 'https://externe-quelconque.example.invalid' }), 'E_VITE_ENV');
  assert.equal(code({ VITE_API_BASE_URL: '/api' }), 'E_VITE_ENV'); // même la valeur par défaut : la variable doit être absente
  for (const name of ['VITE_SECRET', 'VITE_JWT_SECRET', 'VITE_S3_BUCKET', 'VITE_ANYTHING', 'vite_api_base_url', 'Vite_X']) {
    assert.equal(code({ [name]: 'x' }), 'E_VITE_ENV', name);
  }
  assert.equal(code({ VITE_API_BASE_URL: undefined }), undefined); // clé présente mais non définie : équivaut à absente
  assert.equal(code({ NOT_VITE_X: 'x', MY_VITE_VAR: 'x' }), undefined);
  for (const f of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    assert.equal(code({}, TARGETS, 'preflight', (p) => p.endsWith(path.join('frontend', f))), 'E_VITE_FILE', f);
  }
});
test('le code du frontend n\'utilise que VITE_API_BASE_URL (aucune autre VITE_* ne peut injecter une URL/secret) et Vite n\'a ni envPrefix ni define', () => {
  const root = path.join(__dirname, '..', '..', 'frontend');
  const used = new Set();
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(jsx?|mjs)$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/import\.meta\.env\.([A-Za-z0-9_]+)/g)) used.add(m[1]);
    }
  })(path.join(root, 'src'));
  assert.deepEqual([...used], ['VITE_API_BASE_URL']);
  const cfg = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');
  assert.doesNotMatch(cfg, /envPrefix|envDir|define\s*:|loadEnv/);
});

// ───────────────────────── vercel.json : le build ne touche plus la base ─────────────────────────
test('variables « framework » injectées par Vercel (VITE_VERCEL_*, liste fermée) : tolérées ; toute autre VITE_* refusée, avec ses NOMS (jamais ses valeurs)', () => {
  const platform = { VITE_VERCEL_URL: 'x.vercel.app', VITE_VERCEL_ENV: 'production', VITE_VERCEL_TARGET_ENV: 'production', VITE_VERCEL_PROJECT_ID: 'prj_Zk3Ak9Qm2Lx8Tn4Vb7Rc1Dw5Hs',
    VITE_VERCEL_GIT_COMMIT_REF: 'main', VITE_VERCEL_GIT_COMMIT_SHA: 'abc', VITE_VERCEL_PROJECT_PRODUCTION_URL: 'p.vercel.app', VITE_VERCEL_REGION: 'iad1',
    VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG: '{"a":1}' };
  const prod = { ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID, ...platform };
  assert.deepEqual(build(prod, { prodId: PROD_ID, targets: [] }), { ok: true, neutral: true });
  assert.equal(build({ ...PREVIEW, ...GOOD, ...platform }).ok, true); // configuration de test complète + variables de plateforme : acceptée
  for (const bad of ['VITE_API_BASE_URL', 'VITE_SECRET', 'vite_vercel_url', 'Vite_Vercel_Url', 'VITE_VERCEL', 'VITE_VERCEL_', 'VITE_VERCELX', 'VITE_VERCEL_url', 'VITE_', 'VITE_X_VERCEL_URL']) {
    const r = build({ ...prod, [bad]: 'https://prod.example.invalid/api' }, { prodId: PROD_ID, targets: [] });
    assert.equal(r.code, 'E_VITE_ENV', bad);
    assert.deepEqual(r.names, [bad]);
    assert.ok(!JSON.stringify(r).includes('prod.example.invalid')); // jamais la valeur
  }
  // main() : affiche les noms des variables fautives, pas leurs valeurs
  const out = [];
  const code = main(['--mode=build'], { ...PRODUCTION, VERCEL_PROJECT_ID: PROD_ID, VITE_API_BASE_URL: 'SECRETVALEUR' }, { productionProjectFile: path.join(os.tmpdir(), 'inexistant.json'), targetsFile: path.join(os.tmpdir(), 'inexistant2.json'), fileExists: NOFILE, exit: (c) => c, log: (m) => out.push(m), logErr: (m) => out.push(m) });
  assert.equal(code, 1);
  assert.match(out.join('\n'), /E_VITE_ENV.*VITE_API_BASE_URL/);
  assert.ok(!out.join('\n').includes('SECRETVALEUR'));
});
test('vercel.json : le build applicatif n\'exécute NI migration NI seed ; le garde-fou (--mode=build) précède le build du frontend', () => {
  const cmd = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'vercel.json'), 'utf8')).buildCommand;
  assert.doesNotMatch(cmd, /prisma|migrate|seed|DIRECT_DATABASE_URL/);
  const g = cmd.indexOf('node scripts/guardBuildTarget.js --mode=build');
  assert.ok(g >= 0 && g < cmd.indexOf('npm run build'));
  assert.match(cmd.slice(g, cmd.indexOf('npm run build')), /--mode=build && /);
  assert.match(cmd, /^cd backend && /);
});

// ───────────────────────── livraison et fuites ─────────────────────────
test('aucune fuite : messages et journaux sans URL, hôte, port, clé, secret, bucket ni valeur de variable', () => {
  const secrets = ['SECRETPASS', TEST_JWT, PROD_JWT, 'SECRETKEYFICTIF', 'ACCESSKEYFICTIF', 'db-test', 'db-prod', 'invit_test', 'postgresql://', 'invit-test.example', 'wa-test-1',
    'invit-test-media', 'invit-prod-media', 'media-test', 'media-prod', 's3-test', 's3-prod', '5432', '6543', sha(PROD_JWT)];
  const cases = [{}, { STAGING_DB_AUTHORIZATION: undefined }, { DIRECT_DATABASE_URL: undefined }, { PRODUCTION_DB_HOSTS: undefined }, { PRODUCTION_R2_TARGETS: undefined },
    { PRODUCTION_JWT_SHA256: undefined }, { PRODUCTION_R2_TARGETS: '*.db-prod.example.invalid' }, direct('postgresql://u:SECRETPASS@db-prod.example.invalid:5432/prod'),
    direct(DIRECT + '?host=db-prod.example.invalid'), { PUBLIC_BASE_URL: 'https://prod.example.invalid' }, { PRODUCTION_DB_HOSTS: 'db-test.example.invalid' },
    { STAGING_DB_AUTHORIZATION: 'ALLOW_MIGRATE_SEED_ON:SECRETPASS' }, { STORAGE_DRIVER: 'local' }, { S3_BUCKET: 'invit-prod-media' }, { S3_ENDPOINT: 'https://s3-prod.example.invalid' },
    { S3_PUBLIC_BASE_URL: 'https://media-prod.example.invalid' }, { S3_ACCESS_KEY: undefined }, { S3_BUCKET: 'autre-bucket' }, { JWT_SECRET: PROD_JWT }, { JWT_SECRET: 'court' },
    { JWT_SECRET: undefined }, { VITE_API_BASE_URL: 'https://invit-test.example.invalid' }, { SMTP_HOST: 'smtp.db-test.example.invalid' }];
  for (const c of cases) {
    const r = evaluate({ ...GOOD, ...c }, TARGETS, { mode: 'preflight', fileExists: NOFILE });
    if (r.ok) continue;
    for (const s of secrets) assert.ok(!String(r.message).includes(s), `${r.code} laisse fuir ${s}`);
  }
});
test('exécutable réel : cibles livrées vides -> exit 1 ; journaux sans secret ; hors Vercel -> build refusé ; sans mode -> refusé', () => {
  const baseEnv = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot };
  const run = (args, env) => spawnSync(process.execPath, [SCRIPT, ...args], { env, encoding: 'utf8' });
  const r = run(['--mode=preflight'], { ...baseEnv, ...GOOD });
  assert.equal(r.status, 1);
  const out = `${r.stdout}${r.stderr}`;
  assert.match(out, /REFUSÉ \(E_TARGETS_EMPTY\)/);
  for (const s of ['SECRETPASS', 'db-test', 'postgresql', 'invit-test', '5432', TEST_JWT, 'SECRETKEYFICTIF', 'invit-test-media']) assert.ok(!out.includes(s), s);
  assert.match(run(['--mode=build'], baseEnv).stderr, /E_NOT_VERCEL/);
  assert.match(run([], { ...baseEnv, ...GOOD }).stderr, /E_NO_MODE/);
  assert.match(run(['--mode=migrate'], { ...baseEnv, ...GOOD, STAGING_OP_AUTHORIZATION: 'ALLOW_MIGRATE_ON:wa-test-1' }).stderr, /E_TARGETS_EMPTY/); // aucune opération sans cible
  // fichier d'identification LIVRÉ (identifiant du projet de production) : un AUTRE identifiant est refusé, l'identifiant livré est accepté
  const shipped = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'production-project.json'), 'utf8')).productionProjectId;
  const other = run(['--mode=build'], { ...baseEnv, VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: PROD_ID });
  assert.equal(other.status, 1);
  assert.match(other.stderr, /E_PROJECT_MISMATCH/);
  const ok = run(['--mode=build'], { ...baseEnv, VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: shipped });
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /build applicatif seul/);
  assert.equal(run(['--mode=build'], { ...baseEnv, VERCEL: '1', VERCEL_ENV: 'production' }).status, 1); // identifiant absent
  assert.equal(run(['--mode=build'], { ...baseEnv, VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: shipped, VITE_API_BASE_URL: '/api' }).status, 1);
  assert.match(run(['--mode=build'], { ...baseEnv, VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: shipped }).stderr, /E_PREVIEW_NEEDS_ISOLATION/);
  for (const r of [other, ok]) assert.ok(!`${r.stdout}${r.stderr}`.includes(PROD_ID) && !`${r.stdout}${r.stderr}`.includes(shipped));
});
test('main() : build neutre accepté uniquement avec un fichier d\'identification valide ET un identifiant égal ; journaux sans identifiant', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-main-'));
  const pp = path.join(dir, 'pp.json');
  const run = (env, file) => {
    const out = [];
    const exit = main(['--mode=build'], env, { productionProjectFile: file, targetsFile: path.join(dir, 'absent.json'), fileExists: NOFILE, exit: (c) => c, log: (m) => out.push(m), logErr: (m) => out.push(m), spawn: () => { throw new Error('aucune opération attendue'); } });
    return { exit, out: out.join('\n') };
  };
  fs.writeFileSync(pp, JSON.stringify({ productionProjectId: PROD_ID }));
  const ok = run({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: PROD_ID }, pp);
  assert.equal(ok.exit, 0);
  assert.match(ok.out, /build applicatif seul/);
  assert.equal(run({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: OTHER_ID }, pp).exit, 1);
  assert.equal(run({ VERCEL: '1', VERCEL_ENV: 'production' }, pp).exit, 1);
  assert.equal(run({ VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_PROJECT_ID: PROD_ID }, pp).exit, 1);
  assert.equal(run({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: PROD_ID }, path.join(dir, 'absent.json')).exit, 1);
  for (const r of [ok, run({ VERCEL: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_ID: OTHER_ID }, pp)]) for (const id of [PROD_ID, OTHER_ID]) assert.ok(!r.out.includes(id), 'identifiant dans les journaux');
  fs.rmSync(dir, { recursive: true, force: true });
});
test('cibles livrées VIDES (preuve) : toute vérification complète est refusée', () => {
  const targets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'staging-targets.json'), 'utf8')).targets;
  assert.deepEqual(targets, []);
  assert.equal(evaluate(GOOD, targets, { mode: 'preflight', fileExists: NOFILE }).code, 'E_TARGETS_EMPTY');
  assert.equal(evaluate({ ...GOOD, VERCEL: '1', VERCEL_ENV: 'preview' }, targets, { mode: 'build', fileExists: NOFILE }).code, 'E_TARGETS_EMPTY');
});
test('parseDenylist : entrées normalisées avec jumeaux poolé/direct', () => {
  assert.deepEqual(parseDenylist('A.invalid:5432').entries.map((e) => e.host).sort(), ['a-pooler.invalid', 'a.invalid']);
});
