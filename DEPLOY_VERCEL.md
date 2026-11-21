# Déploiement sur Vercel — JHR EVENTS

Alternative à `DEPLOY.md` (VPS/Docker). Ce document décrit la configuration **réelle** du dépôt (`vercel.json`,
`backend/scripts/guardBuildTarget.js`). Il s'applique à la **mise à jour d'une application déjà en ligne** : les
données existantes (invitations, invités, QR codes, RSVP, livres d'or, médias) ne doivent jamais être modifiées par
un déploiement.

> **Ce qui N'EST PAS automatique.** Le build Vercel **ne lance ni migration Prisma, ni seed, ni sauvegarde**.
> Ces opérations sont explicites, séparées du build et soumises au garde-fou (voir §3 et §8).

**État de vérification** : le code, le garde-fou (43 tests) et l'installation/build du frontend ont été vérifiés
localement (Windows, Node 22). **Jamais vérifiés sur Vercel** : un build Linux réel, l'exposition de
`VERCEL_PROJECT_ID`, l'aperçu WhatsApp réel. Chaque point non vérifié est signalé « à vérifier » plus bas.

## 1. Architecture actuelle

| Élément | Rôle |
|---|---|
| `frontend/dist` | Application React (Vite), servie en statique |
| `api/index.js` | Fonction serverless : réexporte l'application Express (`backend/src/app.js`) pour toutes les routes `/api/*` |
| `api/share.js` | Fonction serverless dédiée à l'aperçu de partage des robots (voir §9) |
| PostgreSQL externe | Données de l'application (Neon, Supabase, Vercel Postgres… : au choix, non imposé par le code) |
| Stockage S3 externe | Photos, vidéos, musique (Cloudflare R2, AWS S3, Backblaze B2…) |

Réécritures (`vercel.json`, dans cet ordre) :

1. `/i/:slug` → `/api/share?slug=:slug`, **uniquement** pour les robots de partage (en-tête `user-agent`) et si la
   requête d'origine n'a pas de paramètre `slug`.
2. `/api/:path*` → `/api` (fonction Express).
3. `/((?!api/).*)` → `/index.html` (application React).

Un visiteur humain ne correspond jamais à la règle 1 : il reçoit toujours l'application React.

## 2. Installation et build (ce que fait `vercel.json`)

```
installCommand : cd backend && npm install && npm install --no-save --os=linux --cpu=x64 --libc=glibc sharp && cd ../frontend && npm ci --omit=dev
buildCommand   : cd backend && node scripts/guardBuildTarget.js --mode=build && cd ../frontend && npm run build
outputDirectory: frontend/dist
```

- **Backend** : `npm install` (le `postinstall` lance `prisma generate`, **sans connexion à la base**), puis une
  installation explicite de `sharp` pour Linux/glibc.
- **Frontend** : `npm ci --omit=dev`. Cela exige que `frontend/package-lock.json` soit **livré** (versionné) et
  cohérent avec `frontend/package.json`, sinon l'installation échoue. `vite` et `@vitejs/plugin-react` sont dans
  `dependencies` ; Playwright et axe (tests e2e) restent en `devDependencies` et ne sont pas installés au déploiement.
- **Build** : le garde-fou s'exécute **avant** le build du frontend ; s'il refuse, le build s'arrête (`&&`). Le build
  ne touche jamais la base.
- **Fonctions** : `api/index.js` (30 s max, inclut `backend/src` et `pdfkit`) et `api/share.js` (15 s max, inclut
  `backend/src`). Les durées maximales autorisées dépendent du plan Vercel (à vérifier).
- **Node** : le `package.json` racine déclare `engines.node = 22.x`. Les Dockerfiles (VPS) utilisent encore
  `node:20-alpine`. Le réglage Node du projet Vercel est à vérifier dans l'interface.
- **Lockfiles** : `frontend/package-lock.json` est versionné (complet, toutes plateformes). `backend/package-lock.json`
  n'est **pas** versionné : celui généré localement est incomplet et ne référence que la variante musl de `sharp`,
  ce qui avait fait tomber la production (voir `.gitignore`). Les dépendances du backend sont donc résolues à chaque
  build dans leurs plages `package.json`.
- **`.vercelignore`** s'applique aux déploiements par **CLI** (qui ne lit pas `.gitignore`) : il évite d'envoyer
  `.env*`, les sorties de tests, les captures, les uploads locaux, etc. Pour un déploiement **Git**, seul compte ce
  qui est commité : son application aux builds Git n'est pas vérifiée.

## 3. Le garde-fou (`backend/scripts/guardBuildTarget.js`)

Il empêche qu'un build ou une opération touche une ressource de production depuis un environnement de test. Il ne
fait aucune connexion réseau ou base et ne lit aucun fichier `.env` (il teste seulement l'existence de quelques
fichiers). Ses messages ne contiennent jamais d'URL, d'hôte, de clé ni de secret : seulement un code (`E_…`).

### Les quatre modes (`--mode=…`)

| Mode | Usage | Effet |
|---|---|---|
| `build` | `vercel.json`, avant le build du frontend | Ne touche jamais la base. Voir les règles ci-dessous. |
| `preflight` | À lancer à la main avant tout déploiement de test | Toutes les vérifications, aucune opération |
| `migrate` | Opération explicite, hors Vercel | Vérifications + autorisation d'opération, puis `prisma migrate deploy` |
| `seed` | Opération explicite, hors Vercel | Vérifications + autorisation d'opération, puis `node prisma/seed.js` |

Règles du mode `build` :

- **Preview** : les contrôles complets d'isolation sont **obligatoires**. Sans configuration de test déclarée, le
  build est refusé (`E_PREVIEW_NEEDS_ISOLATION`). Un Preview ne passe jamais en « mode neutre ».
- **Production** : le build « neutre » (application seule, aucune base touchée) n'est autorisé que si `VERCEL_ENV` vaut
  `production` **et** que `VERCEL_PROJECT_ID` est présent et **égal exactement** à `productionProjectId` de
  `backend/scripts/production-project.json`. Ce fichier est livré avec `null` : **fermé par défaut**, tout build
  de production est refusé (`E_PROD_ID_NOT_CONFIGURED`) tant que le propriétaire n'y a pas mis le vrai identifiant
  du projet (Project Settings → General). `VERCEL_ENV=production` seul ne prouve rien (un projet de test déployé
  avec `--prod` échoue).
- **Une configuration de test est « déclarée »** dès qu'**une** de ces variables existe, même vide :
  `STAGING_DB_AUTHORIZATION`, `PRODUCTION_DB_HOSTS`, `PRODUCTION_R2_TARGETS`, `PRODUCTION_JWT_SHA256`. Toutes les
  vérifications s'appliquent alors (base, stockage, JWT, URL publique), et les valeurs vides ou invalides sont
  refusées.
- Sur le projet de production identifié, la présence d'une variable de préproduction (les quatre ci-dessus ou
  `STAGING_OP_AUTHORIZATION`) est **refusée** (`E_TEST_CONFIG_ON_PRODUCTION`).
- Toujours refusés : toute variable `VITE_*` définie par vous (même vide), et tout fichier `.env`, `.env.local`, `.env.production` ou
  `.env.production.local` dans `frontend/`. Seule exception : l'espace de noms `VITE_VERCEL_*` (par exemple `VITE_VERCEL_URL`,
  `VITE_VERCEL_ENV`, `VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG`), que Vercel injecte lui-même au build quand il détecte Vite ;
  en cas de refus, le journal indique les NOMS (jamais les valeurs) des variables fautives.

Cible de test : `backend/scripts/staging-targets.json` (livré **vide** : toute vérification complète est refusée
tant qu'une cible relue n'y figure pas). Une cible déclare `id`, `dbHost`, `dbPort`, `poolHost`, `poolPort`,
`dbName`, `publicHost`, `storageDriver` (`s3`), `s3Endpoint`, `s3Bucket`, `s3PublicBaseUrl`.

### Ce que le garde-fou ne peut pas prouver (contrôles manuels obligatoires)

- Que le jeton R2 est **limité au bucket de test** (à vérifier dans Cloudflare : droits « Object Read & Write » sur ce
  seul bucket).
- Que `PRODUCTION_DB_HOSTS`, `PRODUCTION_R2_TARGETS` et `PRODUCTION_JWT_SHA256` sont exactes et complètes.
- Que l'hôte déclaré « test » est réellement une base de test.
- Que le nom `VERCEL_PROJECT_ID` ne peut pas être remplacé par une variable de projet (à tester dans l'interface).
- Qu'une variable système est bien exposée au build (réglage « Automatically expose System Environment Variables » :
  à vérifier). Si elle ne l'est pas, le garde-fou refuse (`E_BAD_ENV` ou `E_NO_PROJECT_ID`).

## 4. Variables d'environnement

Voir `.env.vercel.example` (modèle, sans secret). Ne jamais committer de valeur réelle : les fichiers `.env.*` sont
ignorés par Git, sauf les modèles `*.example`.

**Communes (production et test, valeurs différentes dans chaque projet)** : `PUBLIC_BASE_URL`, `DATABASE_URL`
(connexion poolée), `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_SECURE`, `STORAGE_DRIVER=s3`, `S3_ENDPOINT`,
`S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL`. Facultatives : `NODE_ENV`,
`FACE_FOCUS`, `SMTP_*` (production seulement, voir plus bas).

**Projet de test uniquement** (obligatoires pour que le build passe les contrôles complets) :
`DIRECT_DATABASE_URL`, `STAGING_DB_AUTHORIZATION` (`ALLOW_MIGRATE_SEED_ON:<id de la cible>`), `PRODUCTION_DB_HOSTS`
(`hôte[:port],…`), `PRODUCTION_R2_TARGETS` (`bucket:<nom>,public:<hôte>[,endpoint:<hôte>]`, au moins un `bucket:` et
un `public:`), `PRODUCTION_JWT_SHA256` (empreinte SHA-256 du `JWT_SECRET` de production, calculée **hors du dépôt**).

**Saisies dans le terminal de l'opérateur, jamais dans Vercel** (opérations explicites) : `STAGING_OP_AUTHORIZATION`
(`ALLOW_MIGRATE_ON:<id>` ou `ALLOW_SEED_ON:<id>`), `ADMIN_EMAIL` et `ADMIN_PASSWORD` (seed). `DIRECT_DATABASE_URL` y est
aussi nécessaire pour ces opérations. Le **projet de production** n'a pas besoin de `DIRECT_DATABASE_URL` dans Vercel :
ne pas l'y définir.

**Interdites en production** : `STAGING_DB_AUTHORIZATION`, `PRODUCTION_DB_HOSTS`, `PRODUCTION_R2_TARGETS`,
`PRODUCTION_JWT_SHA256`, `STAGING_OP_AUTHORIZATION` (le build est refusé), ainsi que toute `VITE_*`. La production
ne doit **jamais** utiliser la base, le bucket, le jeton R2 ni le `JWT_SECRET` de préproduction.

**Interdites en test** : toute `VITE_*`, `SMTP_HOST` (aucun vrai e-mail ne doit partir du test),
`RESET_ADMIN_PASSWORD`, et la définition manuelle de `VERCEL_PROJECT_ID` (variable système). Ne pas définir
`VITE_API_BASE_URL` : le frontend appelle `/api` sur la même origine.

`ADMIN_EMAIL` et `ADMIN_PASSWORD` ne sont plus lus par le build : ils ne servent qu'au seed explicite.

## 5. Préproduction et production : différences

| | Production | Préproduction (projet `invitations-wa-test`) |
|---|---|---|
| Projet Vercel | existant | distinct, sans héritage de variables |
| Base PostgreSQL | production | base de test, **hôte différent** |
| Bucket R2 et jeton | production | bucket de test, jeton limité à ce bucket |
| `JWT_SECRET`, compte admin | production | secrets et compte distincts |
| Build | neutre, seulement si `productionProjectId` renseigné et égal à `VERCEL_PROJECT_ID` | contrôles complets, cible déclarée |
| Variables de protection | **absentes** | **obligatoires** |
| Données | réelles, à conserver | fictives |
| Protection d'accès Vercel | selon vos besoins | désactivée pour que les robots lisent la page (aperçu WhatsApp) |

Les builds Preview du projet de production sont refusés par construction. Réglage à faire dans l'interface Vercel
(libellés à vérifier) : désactiver ou ignorer les builds hors production pour ce projet.

## 6. Mettre à jour l'application existante (production)

La mise à jour décrite ici **ne change pas le schéma** : le dossier `backend/prisma/migrations` contient 16
migrations et aucune n'est ajoutée. Vérifier avec `git diff` / `git status` sur ce dossier avant chaque mise à
jour : s'il y a de nouvelles migrations, voir §8.

**Avant** (rien de ceci n'est automatique) :
1. Test réussi sur le projet de test (voir §5 et la check-list ci-dessous).
2. **Sauvegarde** de la base de production, hors du dépôt : snapshot ou restauration à un instant donné selon l'offre
   de l'hébergeur Postgres (à vérifier chez le fournisseur), ou export :
   ```powershell
   pg_dump --format=custom --file=<chemin-hors-depot>\sauvegarde-AAAAMMJJ.dump "<URL directe de production>"
   ```
   Le fichier contient des données personnelles : ne jamais le placer dans le dépôt (les `*.dump` ne sont pas
   ignorés par `.gitignore`). Les médias dans le bucket ne sont pas sauvegardés par ce document : se renseigner
   auprès de Cloudflare ; la mise à jour ne supprime aucun média existant.
3. Dans Vercel, projet de production : aucune variable de la liste « interdites en production » ; Node attendu ;
   `productionProjectId` renseigné (après avoir confirmé que `VERCEL_PROJECT_ID` est exposé au build).

**Déployer** depuis un commit relu (poussé sur `newrepo`, jamais sur `origin` par défaut) ou par CLI
(`vercel --prod`, qui utilise `.vercelignore`).

**Après** (vérifier sur des données existantes, sans rien supprimer) :
- `GET /api/health` répond `{"status":"ok"}`.
- Connexion à l'administration ; ouverture d'une invitation existante, de son lien public `/i/<slug>`, de son RSVP,
  de son livre d'or et de ses QR codes.
- Téléversement d'une photo **sur une invitation de test** ; la suppression ne se teste que sur cette photo.
- Aperçu de partage (voir §9).

## 7. Retour au déploiement précédent

Dans Vercel : onglet *Deployments*, choisir le déploiement précédent en état « Ready » et le rétablir
(fonction de retour instantané ou promotion du déploiement ; libellés à vérifier dans l'interface). Cela rétablit
le code et la configuration du projet, **pas** les données ni le schéma : comme cette mise à jour ne contient aucune
migration, il n'y a rien à défaire côté base. Une migration Prisma n'est jamais supposée réversible.

## 8. Migrations et seeds : procédure explicite

Les commandes npm `npm run prisma:deploy` et `npm run seed` (dans `backend/`) existent, mais **elles contournent le
garde-fou** : ne jamais les lancer contre la production sans sauvegarde et autorisation.

**Base de test**, depuis `backend/`, dans un terminal où les variables ci-dessus sont définies (`$env:NOM='<valeur>'`),
sans fichier `backend/.env` ni `backend/prisma/.env` (sinon `E_DOTENV_PRESENT`) et hors build Vercel :

```powershell
node scripts/guardBuildTarget.js --mode=preflight   # contrôles, aucune opération
node scripts/guardBuildTarget.js --mode=migrate     # exige STAGING_OP_AUTHORIZATION=ALLOW_MIGRATE_ON:<id>
node scripts/guardBuildTarget.js --mode=seed        # exige STAGING_OP_AUTHORIZATION=ALLOW_SEED_ON:<id>, ADMIN_EMAIL, ADMIN_PASSWORD
```

L'autorisation de migrate ne vaut pas pour seed, et inversement. Les deux opérations utilisent
`DIRECT_DATABASE_URL`.

**Production** : le garde-fou n'a **pas** de mode de production. Aucune migration ni aucun seed n'est donc lancé
sur la production par le dépôt actuel. Si une migration devient nécessaire, ou pour ajouter la ligne du template
`royal-editorial` (le seed est ce qui crée les 10 templates), il faut une procédure séparée, relue et autorisée :
sauvegarde, `npx prisma migrate status` (lecture seule côté données, nécessite l'URL directe), puis opération
explicite. À définir avant de la lancer.

**Précautions pour le seed** (`backend/prisma/seed.js`) : il crée le compte admin s'il n'existe pas et ne réécrit
pas son mot de passe sauf si `RESET_ADMIN_PASSWORD=true` ; il crée ou met à jour (nom et catégorie) les 10
templates ; il ne supprime rien. Il exige `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

Empreinte du `JWT_SECRET` de production (valeur à saisir dans `PRODUCTION_JWT_SHA256`), sans afficher le secret :

```powershell
$s = Read-Host -AsSecureString 'JWT_SECRET de production'
$b = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
$h = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($b))
($h | ForEach-Object { $_.ToString('x2') }) -join ''
```

## 9. Aperçu WhatsApp (`api/share.js`)

- WhatsApp, Facebook, Twitter, Telegram, Discord, Slack et LinkedIn lisent le HTML de `/i/<slug>` sans exécuter de
  JavaScript. La règle de réécriture envoie ces robots vers `api/share.js`, qui réutilise `getSharePage`
  (`backend/src/controllers/share.controller.js`) pour produire les balises Open Graph : titre, description
  (200 caractères maximum, coupée à un mot), image de couverture en URL **absolue**, `og:url`.
- Le slug vient uniquement du chemin `/i/<slug>` : une requête qui contient déjà `?slug=` ne déclenche pas la
  réécriture. Le paramètre `guest` est ignoré.
- Invitation non publiée ou inexistante : réponse 404. Googlebot et Bing ne sont pas ciblés.
- Le limiteur de `api/share.js` (600 requêtes par 15 min et par IP) est en mémoire, par instance : il freine une
  rafale, il ne protège pas la base globalement.
- Conditions : image publique en https (`S3_PUBLIC_BASE_URL`), protection d'accès Vercel désactivée sur le projet de
  test. WhatsApp met l'aperçu en cache : tester avec un lien jamais partagé.
- **Non vérifié en ligne** : comportement de la barre finale (`/i/<slug>/`), fusion des paramètres par Vercel,
  rendu réel dans WhatsApp. Test : `curl.exe -s -A "WhatsApp/2.23" https://<domaine-de-test>/i/<slug>` doit renvoyer
  du HTML avec `og:title`, `og:description`, `og:image` ; le même appel avec `-A "Mozilla/5.0"` doit renvoyer
  l'application React, sans `og:`.

## 10. Stockage S3/R2 et stockage local sur Vercel

- Le disque d'une fonction serverless est éphémère : `STORAGE_DRIVER=local` ne fonctionne jamais sur Vercel.
  `STORAGE_DRIVER=s3` est obligatoire ; le garde-fou le vérifie pour le projet de test.
- Les requêtes entrantes d'une fonction Vercel sont limitées (4,5 Mo) : le navigateur dépose donc les fichiers
  **directement** dans le bucket (URL signée valable 5 minutes), puis le backend finalise (traitement de l'image,
  écriture en base).
- Fichiers : `<uuid>.jpg` (image) et `<uuid>-w800.jpg` (variante de galerie de 800 px) ; les dépôts bruts
  `raw-<uuid>` sont supprimés après finalisation. Recommandé : une règle de cycle de vie du bucket supprimant les
  `raw-*` abandonnés (à configurer côté Cloudflare).
- Le bucket doit être lisible publiquement. Pour l'envoi direct depuis le navigateur, une règle CORS autorisant la
  méthode `PUT`, l'en-tête `Content-Type` et l'origine du projet est vraisemblablement nécessaire (à vérifier lors
  du premier essai sur le bucket de test).
- Sur le projet de test : bucket et jeton **distincts** de la production.

## 11. Limites connues
- Jamais déployé depuis cet environnement : la première mise en ligne d'un projet de test doit valider §2, §3, §9.
- Build Linux non exécuté localement (seule la résolution des paquets Linux glibc a été vérifiée).
- `sharp` et `heic-convert` ont des binaires natifs : tester l'envoi d'une vraie photo (et d'une photo HEIC).
- `installCommand` installe `sharp` sans préciser de version ; le comportement exact est à vérifier.
- L'anti-abus (`express-rate-limit`) garde son état en mémoire : approximatif en serverless.
