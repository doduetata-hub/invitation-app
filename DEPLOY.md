# Déploiement en production (VPS)

## Prérequis

- Un VPS avec Docker et Docker Compose (plugin v2) installés.
- Un nom de domaine dont le DNS (enregistrement A) pointe déjà vers l'IP du VPS.
- Ports 80 et 443 ouverts (pare-feu du VPS / fournisseur cloud).

## 1. Premier déploiement

```bash
git clone <votre-repo> invitations-app
cd invitations-app
cp .env.production.example .env.production
```

Éditer `.env.production` et renseigner de vraies valeurs (domaine, emails, mots de passe forts,
secret JWT long et aléatoire — voir les commentaires du fichier).

Construire les images :

```bash
docker compose -f docker-compose.prod.yml build
```

Obtenir le certificat HTTPS (bootstrap Let's Encrypt, une seule fois) :

```bash
./deploy/init-letsencrypt.sh
```

Démarrer toute la stack :

```bash
docker compose -f docker-compose.prod.yml up -d
```

Les migrations Prisma s'appliquent automatiquement au démarrage du backend
(voir `backend/docker-entrypoint.prod.sh`).

Créer le compte admin unique :

```bash
docker compose -f docker-compose.prod.yml exec backend npm run seed
```

Vérifier que tout tourne :

```bash
docker compose -f docker-compose.prod.yml ps
curl -I https://votre-domaine.com
```

## 2. Mettre à jour l'application

```bash
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Les migrations Prisma en attente s'appliquent automatiquement au redémarrage du backend.

## 3. Sauvegardes

```bash
./deploy/backup.sh
```

Écrit un dump compressé dans `deploy/backups/`, avec rotation automatique (14 jours).

Pour automatiser (tous les jours à 3h) :

```bash
crontab -e
# ajouter :
0 3 * * * cd /chemin/vers/invitations-app && ./deploy/backup.sh >> deploy/backups/backup.log 2>&1
```

**Restauration :**

```bash
./deploy/restore.sh deploy/backups/invitations-20260101-030000.dump
```

⚠️ Remplace intégralement le contenu de la base actuelle — une confirmation est demandée.

Les photos uploadées vivent dans le volume Docker `uploads_data` (stockage local, voir
`STORAGE_DRIVER` dans `.env.production.example`). Pensez à sauvegarder ce volume séparément si
vous ne migrez pas vers un stockage objet (S3/MinIO) :

```bash
docker run --rm -v invitations-app_uploads_data:/data -v "$(pwd)/deploy/backups":/backup \
  alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz -C /data .
```

## 4. Renouvellement du certificat HTTPS

Automatique : le service `certbot` de `docker-compose.prod.yml` vérifie toutes les 12h et
renouvelle si nécessaire. Aucune action manuelle requise après le bootstrap initial.

## 5. Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx
```

Rotation automatique configurée (10 Mo × 3 fichiers par service, voir `x-logging` dans
`docker-compose.prod.yml`).

## 6. Revenir en arrière (rollback)

```bash
git checkout <commit-ou-tag-precedent>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Si une migration de base de données doit aussi être annulée, restaurer la dernière sauvegarde
antérieure au déploiement problématique via `./deploy/restore.sh`.

---

**Non vérifié en conditions réelles** : cette configuration suit les pratiques standard
(certbot + Nginx + Docker Compose) mais n'a pas pu être testée contre un vrai VPS/domaine depuis
cet environnement de développement. Validez le flux complet (`init-letsencrypt.sh` en particulier)
sur votre serveur avant d'y faire confiance en production.
