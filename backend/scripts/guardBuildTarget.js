// Garde-fou de préproduction (build Vercel ET opérations explicites sur la base de test).
// Refuse (exit 1) toute configuration qui pourrait faire communiquer la préproduction avec la production :
// PostgreSQL, Cloudflare R2/stockage, secret JWT, URL publiques, variables VITE_*, e-mail, migrations et seed.
// Échec par défaut : toute information absente, ambiguë ou incohérente arrête l'exécution.
//
// Aucune dépendance (modules Node intégrés), aucune connexion réseau/base, jamais de lecture de .env (seule
// l'EXISTENCE de quelques fichiers .env est testée). Les messages ne contiennent JAMAIS d'URL, d'hôte, de clé,
// de secret ni de valeur de variable : seulement un code d'erreur stable et une phrase fixe.
//
// ───────────── MODES (--mode=…) ─────────────
//  build      Dans vercel.json, AVANT « npm run build » du frontend. Ne touche JAMAIS la base. Vérifie : aucune VITE_*,
//             aucun fichier .env du frontend. Une configuration de test est « déclarée » dès qu'UNE des quatre variables
//             STAGING_DB_AUTHORIZATION, PRODUCTION_DB_HOSTS, PRODUCTION_R2_TARGETS, PRODUCTION_JWT_SHA256 EXISTE (clé présente,
//             même vide ou faite d'espaces) : TOUTES les vérifications ci-dessous s'appliquent alors, et les valeurs invalides
//             sont refusées. Sans déclaration :
//              • VERCEL_ENV=preview  -> REFUSÉ (E_PREVIEW_NEEDS_ISOLATION) : un Preview ne passe JAMAIS en mode neutre ;
//              • VERCEL_ENV=production -> build « neutre » SEULEMENT si VERCEL_PROJECT_ID est présent et égal, exactement, à
//                « productionProjectId » de backend/scripts/production-project.json (livré à null = FERMÉ). VERCEL_ENV=production
//                n'est jamais une preuve d'identité : un projet de test déployé avec --prod échoue ici.
//             Projet de production identifié + variable de test présente (une des quatre ou STAGING_OP_AUTHORIZATION) : REFUSÉ
//             (E_TEST_CONFIG_ON_PRODUCTION) : les variables de préproduction n'ont rien à faire sur ce projet.
//  preflight  Toutes les vérifications, aucune opération. À lancer avant tout déploiement de test.
//  migrate    Toutes les vérifications + STAGING_OP_AUTHORIZATION=ALLOW_MIGRATE_ON:<id>, puis `prisma migrate deploy`.
//  seed       Toutes les vérifications + STAGING_OP_AUTHORIZATION=ALLOW_SEED_ON:<id>, puis `node prisma/seed.js`.
//             (migrate/seed refusent de tourner dans un build Vercel (VERCEL=1) : opérations explicites seulement.)
//
// ───────────── CONFIGURATION ─────────────
// Cible autorisée, dans backend/scripts/staging-targets.json (versionnée, relue) :
//   { "id": "wa-test-1",
//     "dbHost": "<hôte EXACT de DIRECT_DATABASE_URL>", "dbPort": 5432,
//     "poolHost": "<hôte EXACT de DATABASE_URL (pooler)>", "poolPort": 5432, "dbName": "<base>",
//     "publicHost": "<hôte EXACT de PUBLIC_BASE_URL>",
//     "storageDriver": "s3", "s3Endpoint": "https://<hôte>", "s3Bucket": "<bucket de test>",
//     "s3PublicBaseUrl": "https://<hôte public des médias>" }
// Variables d'environnement OBLIGATOIRES (toutes les vérifications complètes) :
//   STAGING_DB_AUTHORIZATION=ALLOW_MIGRATE_SEED_ON:<id>   (autorisation de la cible ; nom historique conservé)
//   PRODUCTION_DB_HOSTS="hôte[:port],…"                    (liste noire PostgreSQL de production)
//   PRODUCTION_R2_TARGETS="bucket:<nom>,public:<hôte>[,endpoint:<hôte>],…"   (liste noire stockage ; ≥1 bucket: ET ≥1 public:)
//   PRODUCTION_JWT_SHA256="<sha256 hexadécimal du JWT_SECRET de production>[,…]"   (calculé HORS du dépôt)
//   DIRECT_DATABASE_URL, DATABASE_URL, PUBLIC_BASE_URL, STORAGE_DRIVER=s3, S3_ENDPOINT, S3_BUCKET, S3_PUBLIC_BASE_URL,
//   S3_ACCESS_KEY, S3_SECRET_KEY, JWT_SECRET.
// Variables INTERDITES : toute VITE_*, SMTP_HOST (aucun vrai e-mail depuis le test), RESET_ADMIN_PASSWORD.
//
// ───────────── CE QUE CE GARDE-FOU NE PEUT PAS PROUVER (contrôles externes obligatoires) ─────────────
//  • Que le jeton R2 (S3_ACCESS_KEY/S3_SECRET_KEY) est limité au bucket de test : à vérifier dans Cloudflare (jeton
//    « Object Read & Write » restreint à CE bucket, jamais « tous les buckets »). Le garde-fou ne compare que des NOMS.
//  • Que PRODUCTION_DB_HOSTS / PRODUCTION_R2_TARGETS / PRODUCTION_JWT_SHA256 sont exacts et complets (saisis par l'opérateur).
//  • Que l'hôte déclaré « test » est réellement une base de test (relecture humaine de staging-targets.json).
//  • Que les variables du projet Vercel de test sont bien celles saisies (le build ne voit que son propre environnement).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const BACKEND_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend');

const MESSAGES = {
  E_NO_MODE: 'mode absent ou inconnu (--mode=build|preflight|migrate|seed)',
  E_NOT_VERCEL: 'build hors de Vercel (VERCEL=1 absent)',
  E_BAD_ENV: 'environnement de déploiement non reconnu (VERCEL_ENV)',
  E_PREVIEW_NEEDS_ISOLATION: 'build Preview sans configuration d\'isolation déclarée : le mode neutre est interdit sur Preview',
  E_PROD_ID_NOT_CONFIGURED: 'projet de production non identifié (production-project.json vide ou invalide) : build neutre refusé',
  E_NO_PROJECT_ID: 'VERCEL_PROJECT_ID absent ou invalide : build neutre refusé',
  E_PROJECT_MISMATCH: 'ce projet n\'est pas le projet de production déclaré : build neutre refusé',
  E_TEST_CONFIG_ON_PRODUCTION: 'variables de préproduction présentes sur le projet de production : interdit',
  E_OP_IN_BUILD: 'migrate/seed refusés dans un build Vercel : opérations explicites seulement',
  E_DOTENV_PRESENT: 'un fichier .env local pourrait compléter silencieusement l\'environnement (backend)',
  E_VITE_ENV: 'variable VITE_* définie : interdit (le frontend doit utiliser /api sur la même origine)',
  E_VITE_FILE: 'fichier .env du frontend présent : interdit',
  E_SMTP_SET: 'SMTP_HOST défini : aucun vrai e-mail ne doit pouvoir partir depuis le test',
  E_RESET_SET: 'RESET_ADMIN_PASSWORD défini : interdit pendant le contrôle',
  E_NO_AUTH: 'autorisation STAGING_DB_AUTHORIZATION absente',
  E_NO_OP_AUTH: 'autorisation d\'opération STAGING_OP_AUTHORIZATION absente',
  E_OP_AUTH_MISMATCH: 'autorisation d\'opération ne correspondant pas à l\'opération ou à la cible',
  E_NO_DB_URL: 'DIRECT_DATABASE_URL absente',
  E_BAD_DB_URL: 'DIRECT_DATABASE_URL invalide (format strict postgres://utilisateur:motdepasse@hôte:port/base)',
  E_NO_RUNTIME_URL: 'DATABASE_URL absente (cible ambiguë)',
  E_BAD_RUNTIME_URL: 'DATABASE_URL invalide (format strict postgres://utilisateur:motdepasse@hôte:port/base)',
  E_QUERY_PARAM: 'paramètre de connexion interdit, inconnu, répété ou invalide dans une URL de base',
  E_NO_PUBLIC_URL: 'PUBLIC_BASE_URL absente ou invalide (https://hôte seul : ni chemin, ni port, ni identifiants)',
  E_NO_DENYLIST: 'PRODUCTION_DB_HOSTS absente ou vide (liste noire de production obligatoire)',
  E_DENYLIST_INVALID: 'PRODUCTION_DB_HOSTS contient une entrée invalide',
  E_NO_R2_DENYLIST: 'PRODUCTION_R2_TARGETS absente, vide ou sans entrée bucket: et public:',
  E_R2_DENYLIST_INVALID: 'PRODUCTION_R2_TARGETS contient une entrée invalide',
  E_NO_JWT_FP: 'PRODUCTION_JWT_SHA256 absente ou invalide (empreinte SHA-256 hexadécimale de 64 caractères)',
  E_TARGETS_INVALID: 'liste des cibles de test illisible ou invalide',
  E_TARGETS_EMPTY: 'aucune cible de test autorisée dans staging-targets.json',
  E_DB_NOT_ALLOWED: 'la base de destination n\'est pas une cible de test autorisée',
  E_PORT_MISMATCH: 'le port ne correspond pas à celui de la cible',
  E_AMBIGUOUS: 'plusieurs cibles correspondent (configuration ambiguë)',
  E_DENIED: 'la destination figure dans la liste de production interdite',
  E_AUTH_MISMATCH: 'autorisation ne correspondant pas à la cible',
  E_PUBLIC_MISMATCH: 'PUBLIC_BASE_URL ne correspond pas à la cible de test',
  E_URL_MISMATCH: 'DATABASE_URL et DIRECT_DATABASE_URL ne correspondent pas à la même cible',
  E_STORAGE_DRIVER: 'STORAGE_DRIVER doit valoir exactement s3',
  E_S3_MISSING: 'variable de stockage S3_* absente',
  E_S3_INVALID: 'S3_ENDPOINT ou S3_PUBLIC_BASE_URL invalide (https://hôte seul) ou S3_BUCKET invalide',
  E_S3_MISMATCH: 'stockage (endpoint, bucket ou URL publique) ne correspondant pas à la cible de test',
  E_R2_DENIED: 'le stockage désigne une ressource de production interdite',
  E_NO_JWT: 'JWT_SECRET absent ou vide',
  E_JWT_WEAK: 'JWT_SECRET trop faible (32 caractères minimum, varié, sans espaces de bord ni valeur d\'exemple)',
  E_JWT_SAME_AS_PROD: 'JWT_SECRET identique à celui de production',
};

// ---------- noms d'hôtes ----------
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const HOST_RE = new RegExp(`^${LABEL}(?:\\.${LABEL})*$`);
// Normalisation d'un nom d'hôte déclaré : minuscules, UN point final DNS retiré, puis validation DNS stricte.
// Refuse les jokers, les adresses IP/numériques (dernier label sans lettre), les noms trop longs.
function normHost(raw) {
  if (typeof raw !== 'string') return null;
  let h = raw.toLowerCase();
  if (h.endsWith('.')) h = h.slice(0, -1);
  if (!h || h.length > 253 || !HOST_RE.test(h)) return null;
  if (!/[a-z]/.test(h.split('.').pop())) return null;
  return h;
}
const validPort = (v) => Number.isInteger(v) && v >= 1 && v <= 65535;

// « https://hôte » SEUL (une barre finale tolérée, car le code de l'application la retire) : ni chemin, ni port, ni requête,
// ni identifiants, ni fragment, ni antislash, ni espace, ni protocole autre que https. -> hôte normalisé ou null.
function parseOrigin(raw) {
  if (typeof raw !== 'string' || /[^\x21-\x7e]/.test(raw) || raw.includes('\\')) return null;
  const m = /^https:\/\/([A-Za-z0-9.-]+)\/?$/.exec(raw);
  if (!m || m[1].endsWith('.')) return null;
  return normHost(m[1]);
}

// ---------- URL PostgreSQL stricte ----------
const URL_RE = /^(postgres|postgresql):\/\/([A-Za-z0-9._~%!$&'()*+,;=-]+):([A-Za-z0-9._~%!$&'()*+,;=-]+)@([A-Za-z0-9.-]+):([0-9]{1,5})\/([A-Za-z0-9._~%-]+)(?:\?([A-Za-z0-9._~%=&-]+))?$/;
const intIn = (lo, hi) => (v) => /^[0-9]{1,4}$/.test(v) && Number(v) >= lo && Number(v) <= hi && String(Number(v)) === v;
// Liste blanche des paramètres de requête. Rôle de chacun (aucun ne modifie la destination) :
//   sslmode/channel_binding : chiffrement TLS ; connection_limit/pool_timeout : taille/attente du pool Prisma ;
//   connect_timeout : délai de connexion ; pgbouncer=true : désactive les requêtes préparées (pooler) ;
//   schema : schéma Prisma, imposé à « public ». Refusés par défaut : host, hostaddr, port, dbname, user, password,
//   options, service, passfile, sslrootcert, application_name, socket_dir_path, et tout inconnu.
const PARAMS = {
  sslmode: (v) => ['require', 'prefer', 'disable'].includes(v),
  channel_binding: (v) => ['require', 'prefer', 'disable'].includes(v),
  pgbouncer: (v) => v === 'true',
  connection_limit: intIn(1, 100),
  connect_timeout: intIn(1, 300),
  pool_timeout: intIn(0, 300),
  schema: (v) => v === 'public',
};

// -> { missing } | { invalid } | { badParam } | { host, port, name, params }
function parseDbUrl(raw, { allowPgbouncer = false } = {}) {
  if (typeof raw !== 'string' || !raw.trim()) return { missing: true };
  // Aucun espace, caractère de contrôle, non-ASCII, antislash ni fragment, où que ce soit (pas de « trim » : un espace est refusé).
  if (/[^\x21-\x7e]/.test(raw) || raw.includes('\\') || raw.includes('#')) return { invalid: true };
  if (/%(?![0-9A-Fa-f]{2})/.test(raw)) return { invalid: true };
  const m = URL_RE.exec(raw);
  if (!m) return { invalid: true };
  const [, , , , hostRaw, portRaw, nameRaw, query] = m;
  if (hostRaw.endsWith('.')) return { invalid: true }; // pas de FQDN avec point final dans une URL de connexion
  const host = normHost(hostRaw);
  const port = Number(portRaw);
  if (!host || String(port) !== portRaw || !validPort(port)) return { invalid: true };
  let name;
  try { name = decodeURIComponent(nameRaw); } catch { return { invalid: true }; }
  if (!/^[A-Za-z0-9._-]{1,63}$/.test(name)) return { invalid: true };
  const params = {};
  if (query !== undefined) {
    for (const pair of query.split('&')) {
      const kv = /^([a-z_]+)=([A-Za-z0-9._-]+)$/.exec(pair);
      if (!kv) return { badParam: true };
      const [, k, v] = kv;
      if (!Object.prototype.hasOwnProperty.call(PARAMS, k) || !PARAMS[k](v)) return { badParam: true };
      if (k === 'pgbouncer' && !allowPgbouncer) return { badParam: true };
      if (Object.prototype.hasOwnProperty.call(params, k)) return { badParam: true }; // répété = ambigu
      params[k] = v;
    }
  }
  return { host, port, name, params };
}

// ---------- liste noire PostgreSQL ----------
// Entrées « hôte » ou « hôte:port » ; exactes, sans joker ni inclusion. Chaque hôte est aussi comparé à son jumeau
// poolé/direct (premier label avec ou sans « -pooler »), pour qu'une entrée donnée sous une seule forme bloque les deux.
function twinHosts(host) {
  const [first, ...rest] = host.split('.');
  const alt = first.endsWith('-pooler') ? first.slice(0, -'-pooler'.length) : `${first}-pooler`;
  return [host, [alt, ...rest].join('.')];
}
function parseDenylist(raw) {
  if (typeof raw !== 'string' || !raw.replace(/[\s,]/g, '')) return { missing: true };
  const entries = [];
  for (const item of raw.split(',')) {
    const t = item.trim();
    const m = /^([^:]+)(?::([0-9]{1,5}))?$/.exec(t);
    if (!m) return { invalid: true };
    const host = normHost(m[1]);
    const port = m[2] === undefined ? null : Number(m[2]);
    if (!host || (port !== null && (!validPort(port) || String(port) !== m[2]))) return { invalid: true };
    for (const h of twinHosts(host)) entries.push({ host: h, port });
  }
  return { entries };
}
const denied = (entries, host, port) => entries.some((e) => e.host === host && (e.port === null || e.port === port));

// ---------- liste noire stockage (R2) ----------
// Entrées typées, exactes : « bucket:<nom> », « public:<hôte> » (domaine public de médias OU du site), « endpoint:<hôte> ».
// Au moins un bucket: ET un public: sont obligatoires. N'ajouter endpoint: que si le test utilise un AUTRE compte Cloudflare :
// l'endpoint R2 est propre au compte, donc commun à tous ses buckets.
const BUCKET_RE = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
function parseR2Denylist(raw) {
  if (typeof raw !== 'string' || !raw.replace(/[\s,]/g, '')) return { missing: true };
  const out = { bucket: new Set(), public: new Set(), endpoint: new Set() };
  for (const item of raw.split(',')) {
    const m = /^(bucket|public|endpoint):(\S+)$/.exec(item.trim());
    if (!m) return { invalid: true };
    if (m[1] === 'bucket') { if (!BUCKET_RE.test(m[2])) return { invalid: true }; out.bucket.add(m[2]); } else {
      const h = normHost(m[2]);
      if (!h) return { invalid: true };
      out[m[1]].add(h);
    }
  }
  if (!out.bucket.size || !out.public.size) return { missing: true };
  return out;
}

// ---------- empreintes JWT ----------
function parseJwtFingerprints(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const list = raw.split(',').map((s) => s.trim().toLowerCase());
  if (list.length > 5 || list.some((h) => !/^[0-9a-f]{64}$/.test(h))) return null;
  return new Set(list);
}
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
function weakJwt(secret) {
  if (secret.length < 32 || secret !== secret.trim()) return true;
  if (new Set(secret).size < 12) return true;
  return /change.?me|your.?secret|example|placeholder|password|secret.?key|jwt.?secret/i.test(secret);
}

// ---------- cibles ----------
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
function normTarget(t) {
  if (!t || typeof t !== 'object') return null;
  const o = {
    id: t.id, dbHost: normHost(t.dbHost), dbPort: t.dbPort, poolHost: normHost(t.poolHost), poolPort: t.poolPort,
    dbName: t.dbName, publicHost: normHost(t.publicHost),
    storageDriver: t.storageDriver, s3Endpoint: parseOrigin(t.s3Endpoint), s3Bucket: t.s3Bucket, s3PublicHost: parseOrigin(t.s3PublicBaseUrl),
  };
  if (typeof o.id !== 'string' || !ID_RE.test(o.id) || !o.dbHost || !o.poolHost || !o.publicHost) return null;
  if (!validPort(o.dbPort) || !validPort(o.poolPort)) return null;
  if (typeof o.dbName !== 'string' || !/^[A-Za-z0-9._-]{1,63}$/.test(o.dbName)) return null;
  if (o.storageDriver !== 's3' || !o.s3Endpoint || !o.s3PublicHost) return null;
  if (typeof o.s3Bucket !== 'string' || !BUCKET_RE.test(o.s3Bucket)) return null;
  return o;
}

const MODES = ['build', 'preflight', 'migrate', 'seed'];
const OPS = ['migrate', 'seed'];
const FRONTEND_ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local'];
const BACKEND_ENV_FILES = [path.join(BACKEND_DIR, '.env'), path.join(BACKEND_DIR, 'prisma', '.env')];
const hasValue = (v) => typeof v === 'string' && v.length > 0;
// PRÉSENCE d'une variable = existence de sa clé : absente (clé inexistante ou undefined) ≠ définie, même vide ou blanche.
const isSet = (env, k) => Object.prototype.hasOwnProperty.call(env, k) && env[k] !== undefined;
// Les quatre variables dont la présence déclare une configuration de test (et déclenche TOUTES les vérifications).
const PROTECTION_VARS = ['STAGING_DB_AUTHORIZATION', 'PRODUCTION_DB_HOSTS', 'PRODUCTION_R2_TARGETS', 'PRODUCTION_JWT_SHA256'];
// Variables de préproduction interdites sur le projet de production identifié.
const TEST_ONLY_VARS = [...PROTECTION_VARS, 'STAGING_OP_AUTHORIZATION'];
// Identifiant de projet Vercel : « prj_ » + caractères alphanumériques. Les valeurs d'exemple/fictives ne sont jamais acceptées.
const PROJECT_ID_RE = /^prj_[A-Za-z0-9]{10,64}$/;
const PLACEHOLDER_RE = /fictif|example|placeholder|changeme|dummy|sample|fake|todo|xxx|null|undefined|test/i;
const validProjectId = (v) => typeof v === 'string' && PROJECT_ID_RE.test(v) && !PLACEHOLDER_RE.test(v);

// deps.fileExists : injectable pour les tests (existence seulement, jamais de lecture).
// productionProjectId : valeur de production-project.json (null/absent/invalide => build neutre FERMÉ).
function evaluate(env, rawTargets, { mode, fileExists = fs.existsSync, productionProjectId } = {}) {
  const fail = (code) => ({ ok: false, code, message: MESSAGES[code] });
  if (!MODES.includes(mode)) return fail('E_NO_MODE');

  // --- contexte d'exécution ---
  if (mode === 'build') {
    if (env.VERCEL !== '1') return fail('E_NOT_VERCEL');
    if (!['preview', 'production'].includes(env.VERCEL_ENV)) return fail('E_BAD_ENV');
  }
  if (OPS.includes(mode) && env.VERCEL === '1') return fail('E_OP_IN_BUILD');
  if (OPS.includes(mode) && BACKEND_ENV_FILES.some((f) => fileExists(f))) return fail('E_DOTENV_PRESENT');

  // --- frontend : aucune VITE_* (définie, même vide), aucun .env du frontend. Le frontend utilise « /api » (même origine). ---
  if (Object.keys(env).some((k) => /^VITE_/i.test(k) && env[k] !== undefined)) return fail('E_VITE_ENV');
  if (FRONTEND_ENV_FILES.some((f) => fileExists(path.join(FRONTEND_DIR, f)))) return fail('E_VITE_FILE');

  // --- build : « neutre » réservé au projet de production IDENTIFIÉ ; Preview ne l'obtient jamais ---
  if (mode === 'build') {
    const declared = PROTECTION_VARS.some((k) => isSet(env, k)); // clé présente, même vide ou blanche
    // Projet de production identifié (identifiant exact) : aucune variable de préproduction n'a le droit d'y figurer.
    const idMatches = env.VERCEL_ENV === 'production' && validProjectId(productionProjectId) && validProjectId(env.VERCEL_PROJECT_ID)
      && env.VERCEL_PROJECT_ID === productionProjectId;
    if (idMatches && TEST_ONLY_VARS.some((k) => isSet(env, k))) return fail('E_TEST_CONFIG_ON_PRODUCTION');
    if (!declared) {
      if (env.VERCEL_ENV === 'preview') return fail('E_PREVIEW_NEEDS_ISOLATION');
      // production : le mode neutre exige l'identité du projet (VERCEL_ENV=production seul ne prouve rien). Fermé par défaut.
      if (!validProjectId(productionProjectId)) return fail('E_PROD_ID_NOT_CONFIGURED');
      if (!validProjectId(env.VERCEL_PROJECT_ID)) return fail('E_NO_PROJECT_ID');
      if (env.VERCEL_PROJECT_ID !== productionProjectId) return fail('E_PROJECT_MISMATCH');
      return { ok: true, neutral: true };
    }
    // sinon : configuration de test déclarée => vérifications complètes ci-dessous (valeurs vides/blanches refusées par elles)
  }

  // --- communications réelles interdites ---
  if (hasValue(env.SMTP_HOST)) return fail('E_SMTP_SET');
  if (env.RESET_ADMIN_PASSWORD !== undefined) return fail('E_RESET_SET');

  // --- autorisation ---
  if (!env.STAGING_DB_AUTHORIZATION) return fail('E_NO_AUTH');

  // --- PostgreSQL ---
  const direct = parseDbUrl(env.DIRECT_DATABASE_URL);
  if (direct.missing) return fail('E_NO_DB_URL');
  if (direct.invalid) return fail('E_BAD_DB_URL');
  if (direct.badParam) return fail('E_QUERY_PARAM');
  const runtime = parseDbUrl(env.DATABASE_URL, { allowPgbouncer: true });
  if (runtime.missing) return fail('E_NO_RUNTIME_URL');
  if (runtime.invalid) return fail('E_BAD_RUNTIME_URL');
  if (runtime.badParam) return fail('E_QUERY_PARAM');

  const publicHost = parseOrigin(env.PUBLIC_BASE_URL);
  if (!publicHost) return fail('E_NO_PUBLIC_URL');

  // --- listes de production OBLIGATOIRES ---
  const deny = parseDenylist(env.PRODUCTION_DB_HOSTS);
  if (deny.missing) return fail('E_NO_DENYLIST');
  if (deny.invalid) return fail('E_DENYLIST_INVALID');
  const r2deny = parseR2Denylist(env.PRODUCTION_R2_TARGETS);
  if (r2deny.missing) return fail('E_NO_R2_DENYLIST');
  if (r2deny.invalid) return fail('E_R2_DENYLIST_INVALID');
  const jwtFps = parseJwtFingerprints(env.PRODUCTION_JWT_SHA256);
  if (!jwtFps) return fail('E_NO_JWT_FP');

  if (!Array.isArray(rawTargets)) return fail('E_TARGETS_INVALID');
  if (rawTargets.length === 0) return fail('E_TARGETS_EMPTY');
  const targets = rawTargets.map(normTarget);
  if (targets.some((t) => !t)) return fail('E_TARGETS_INVALID');

  if (denied(deny.entries, direct.host, direct.port) || denied(deny.entries, runtime.host, runtime.port)) return fail('E_DENIED');

  const byHostName = targets.filter((t) => t.dbHost === direct.host && t.dbName === direct.name);
  if (byHostName.length === 0) return fail('E_DB_NOT_ALLOWED');
  if (byHostName.length > 1) return fail('E_AMBIGUOUS');
  const target = byHostName[0];
  if (denied(deny.entries, target.dbHost, target.dbPort) || denied(deny.entries, target.poolHost, target.poolPort)) return fail('E_DENIED');

  if (direct.port !== target.dbPort) return fail('E_PORT_MISMATCH');
  if (env.STAGING_DB_AUTHORIZATION !== `ALLOW_MIGRATE_SEED_ON:${target.id}`) return fail('E_AUTH_MISMATCH');
  if (OPS.includes(mode)) {
    if (!env.STAGING_OP_AUTHORIZATION) return fail('E_NO_OP_AUTH');
    if (env.STAGING_OP_AUTHORIZATION !== `ALLOW_${mode.toUpperCase()}_ON:${target.id}`) return fail('E_OP_AUTH_MISMATCH');
  }
  if (publicHost !== target.publicHost) return fail('E_PUBLIC_MISMATCH');
  if (runtime.host !== target.poolHost || runtime.port !== target.poolPort || runtime.name !== target.dbName) return fail('E_URL_MISMATCH');

  // --- stockage : applicatif (s3 obligatoire) et Cloudflare R2 ---
  if (env.STORAGE_DRIVER !== 's3') return fail('E_STORAGE_DRIVER');
  if (![env.S3_ENDPOINT, env.S3_BUCKET, env.S3_PUBLIC_BASE_URL, env.S3_ACCESS_KEY, env.S3_SECRET_KEY].every(hasValue)) return fail('E_S3_MISSING');
  const s3Endpoint = parseOrigin(env.S3_ENDPOINT);
  const s3Public = parseOrigin(env.S3_PUBLIC_BASE_URL);
  if (!s3Endpoint || !s3Public || !BUCKET_RE.test(env.S3_BUCKET)) return fail('E_S3_INVALID');
  // Production d'abord (message plus parlant), puis égalité EXACTE avec la cible.
  if (r2deny.bucket.has(env.S3_BUCKET) || r2deny.bucket.has(target.s3Bucket)
    || r2deny.endpoint.has(s3Endpoint) || r2deny.endpoint.has(target.s3Endpoint)
    || [s3Public, target.s3PublicHost, publicHost, target.publicHost].some((h) => r2deny.public.has(h))) return fail('E_R2_DENIED');
  if (s3Endpoint !== target.s3Endpoint || env.S3_BUCKET !== target.s3Bucket || s3Public !== target.s3PublicHost) return fail('E_S3_MISMATCH');

  // --- JWT : différent de la production, sans jamais comparer ni afficher le secret lui-même ---
  if (!hasValue(env.JWT_SECRET)) return fail('E_NO_JWT');
  if (weakJwt(env.JWT_SECRET)) return fail('E_JWT_WEAK');
  if (jwtFps.has(sha256(env.JWT_SECRET)) || jwtFps.has(sha256(env.JWT_SECRET.trim()))) return fail('E_JWT_SAME_AS_PROD');

  // Empreinte de journal : identifiant de cible + hôte normalisé + nom de base. Jamais l'URL, les identifiants ni les paramètres.
  const fingerprint = crypto.createHash('sha256').update(`${target.id}|${direct.host}|${direct.name}`).digest('hex').slice(0, 8);
  return { ok: true, targetId: target.id, fingerprint, directUrl: env.DIRECT_DATABASE_URL };
}

function loadTargets(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data.targets) ? data.targets : null;
  } catch {
    return null;
  }
}

// Identifiant du projet de production (fichier versionné). null si absent, illisible, vide ou invalide => build neutre FERMÉ.
function loadProductionProjectId(file) {
  try {
    const id = JSON.parse(fs.readFileSync(file, 'utf8')).productionProjectId;
    return validProjectId(id) ? id : null;
  } catch {
    return null;
  }
}

// Exécute l'opération UNE FOIS le garde-fou passé, dans le même processus (aucun écart possible entre le contrôle et l'action).
// DATABASE_URL est remplacée par l'URL DIRECTE (les migrations n'acceptent pas le pooler). Pas de shell, pas de npx.
function runOperation(mode, env, directUrl, spawn = spawnSync) {
  const childEnv = { ...env, DATABASE_URL: directUrl };
  if (mode === 'migrate') {
    const prismaCli = path.join(path.dirname(require.resolve('prisma/package.json', { paths: [BACKEND_DIR] })), 'build', 'index.js');
    return spawn(process.execPath, [prismaCli, 'migrate', 'deploy'], { cwd: BACKEND_DIR, env: childEnv, stdio: 'inherit' });
  }
  return spawn(process.execPath, [path.join(BACKEND_DIR, 'prisma', 'seed.js')], { cwd: BACKEND_DIR, env: childEnv, stdio: 'inherit' });
}

function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const log = deps.log || console.log;
  const logErr = deps.logErr || console.error;
  const exit = deps.exit || process.exit;
  const modeArg = argv.find((a) => a.startsWith('--mode='));
  const mode = modeArg ? modeArg.slice('--mode='.length) : undefined;
  const result = evaluate(env, loadTargets(deps.targetsFile || path.join(__dirname, 'staging-targets.json')), {
    mode,
    fileExists: deps.fileExists || fs.existsSync,
    productionProjectId: loadProductionProjectId(deps.productionProjectFile || path.join(__dirname, 'production-project.json')),
  });
  if (!result.ok) {
    logErr(`[build-guard] REFUSÉ (${result.code}) : ${result.message}. Arrêt avant toute opération.`);
    return exit(1);
  }
  if (result.neutral) {
    log('[build-guard] OK : build applicatif seul du projet de production identifié (aucune base touchée, aucune migration, aucun seed).');
    return exit(0);
  }
  log(`[build-guard] OK (${mode}) : cible de test « ${result.targetId} » autorisée (empreinte ${result.fingerprint}).`);
  if (OPS.includes(mode)) {
    const r = runOperation(mode, env, result.directUrl, deps.spawn);
    if (r.status !== 0) { logErr(`[build-guard] opération « ${mode} » en échec (code ${r.status}).`); return exit(r.status || 1); }
    log(`[build-guard] opération « ${mode} » terminée.`);
  }
  return exit(0);
}

if (require.main === module) main();

module.exports = { evaluate, main, loadProductionProjectId, validProjectId, runOperation, parseDbUrl, parseDenylist, parseR2Denylist, parseOrigin, parseJwtFingerprints, normHost, twinHosts, MESSAGES };
