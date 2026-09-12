# Déploiement sur Vercel

Alternative à `DEPLOY.md` (VPS/Docker). Plus rapide à mettre en ligne, mais nécessite deux
services externes que Vercel n'héberge pas lui-même : une base PostgreSQL et un stockage
compatible S3 pour les photos/vidéos/musique.

## Pourquoi ces deux services externes sont obligatoires

- **PostgreSQL** : Vercel n'héberge pas de base de données lui-même dans ce projet — il faut un
  fournisseur externe. Options gratuites/pas chères : [Neon](https://neon.tech),
  [Supabase](https://supabase.com), ou Vercel Postgres (propulsé par Neon) depuis l'onglet
  **Storage** du projet Vercel.
- **Stockage S3** : le disque d'une fonction serverless Vercel est éphémère (rien n'est
  conservé entre deux requêtes) — les photos ne peuvent donc pas être stockées sur disque comme
  en Docker. Options : [Cloudflare R2](https://developers.cloudflare.com/r2/) (gratuit jusqu'à
  10 Go), AWS S3, Backblaze B2 (tous compatibles, le pilote `s3Storage` de l'app est déjà écrit
  pour n'importe lequel d'entre eux).

## 1. Créer les services externes

1. Crée un projet Postgres (Neon/Supabase/Vercel Postgres). Récupère **deux** chaînes de
   connexion si ton fournisseur les distingue : une **pooled** (souvent avec `-pooler` dans le
   nom d'hôte ou `?pgbouncer=true`) et une **directe**. Utilise l'URL directe uniquement pour la
   commande de migration à l'étape 3 ; l'URL pooled sera celle de l'app en production (étape 4).
2. Crée un bucket S3 (ex: Cloudflare R2), rends-le public en lecture (ou place un CDN devant),
   récupère : endpoint, région, nom du bucket, clé d'accès, clé secrète.

## 2. Copier le gabarit d'environnement

```bash
cp .env.vercel.example .env.vercel.local
```

Remplis-le avec les vraies valeurs (voir commentaires du fichier).

## 3. Appliquer les migrations et créer le compte admin (une seule fois, depuis ta machine)

```bash
cd backend
DATABASE_URL="<ton-url-POSTGRES-DIRECTE>" npx prisma migrate deploy
DATABASE_URL="<ton-url-POSTGRES-DIRECTE>" ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node prisma/seed.js
```

À refaire uniquement après un nouveau `git pull` contenant des migrations Prisma.

## 4. Déployer sur Vercel

Connecte le repo GitHub/GitLab à un nouveau projet Vercel (ou `vercel --prod` en CLI). Vercel
détecte `vercel.json` à la racine automatiquement — aucun réglage de framework à choisir.

Dans **Project Settings → Environment Variables**, ajoute toutes les variables de
`.env.vercel.example` avec cette fois l'URL Postgres **pooled** pour `DATABASE_URL`, et
`PUBLIC_BASE_URL` = l'URL exacte de ton déploiement Vercel (ou ton domaine personnalisé une
fois branché dans Vercel).

Déploie. Vercel construit le frontend (`frontend/dist`) et expose `backend/src/app.js` comme
fonction serverless unique sous `/api/*` (voir `api/index.js` et les `rewrites` de
`vercel.json`).

## 5. Vérifier après le premier déploiement

- Ouvrir l'URL Vercel → la page admin doit charger.
- Se connecter avec `ADMIN_EMAIL`/`ADMIN_PASSWORD` du seed.
- Uploader une photo de couverture sur une invitation → confirme que `STORAGE_DRIVER=s3` est
  bien pris en compte et que le bucket accepte l'écriture.
- Tester le RSVP public sur une invitation publiée.

## 6. Mettre à jour l'application

Un nouveau `git push` sur la branche connectée redéploie automatiquement. S'il y a de nouvelles
migrations Prisma, répète l'étape 3 avec l'URL directe **avant** ou **après** le déploiement
(les migrations ne s'appliquent jamais automatiquement sur Vercel, contrairement au VPS).

## Limites connues de ce mode de déploiement (honnêteté avant de t'y fier)

- **Non testé sur un vrai compte Vercel** depuis cet environnement de développement — je n'ai
  pas d'accès Vercel pour vérifier le déploiement de bout en bout. Le code est prêt et cohérent
  avec les pratiques standard Vercel + Express + Prisma, mais la première mise en ligne réelle
  doit être validée avec la checklist de l'étape 5.
- `sharp` (compression d'images) et `heic-convert` (conversion HEIC) sont des dépendances avec
  binaires natifs/WASM — généralement compatibles avec le runtime Node de Vercel, mais à tester
  concrètement en uploadant une vraie photo (et si possible une photo HEIC depuis un iPhone)
  après le premier déploiement.
- Le anti-abus par limite de requêtes (`express-rate-limit`) garde son état en mémoire : en
  serverless, chaque instance froide repart de zéro et les instances concurrentes ne partagent
  pas ce compteur — la protection devient approximative (elle continue de fonctionner, juste
  moins précisément qu'en VPS où un seul processus persiste).
- Les migrations Prisma ne s'appliquent jamais automatiquement (pas de conteneur qui démarre à
  chaque déploiement comme en Docker) — à faire manuellement à chaque changement de schéma
  (étape 3/6).
