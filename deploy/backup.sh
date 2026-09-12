#!/bin/bash
# Sauvegarde PostgreSQL (format custom pg_dump, compressé) + rotation.
# Usage : ./deploy/backup.sh
# Cron suggéré (tous les jours à 3h) :
#   0 3 * * * cd /path/to/invitations-app && ./deploy/backup.sh >> deploy/backups/backup.log 2>&1
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
  echo "Erreur : .env.production introuvable." >&2
  exit 1
fi

set -a
. ./.env.production
set +a

BACKUP_DIR="deploy/backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="$BACKUP_DIR/invitations-$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"

echo "Sauvegarde de la base '$POSTGRES_DB' vers $FILENAME..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$FILENAME"

echo "Sauvegarde terminée ($(du -h "$FILENAME" | cut -f1))."

echo "Suppression des sauvegardes de plus de $RETENTION_DAYS jours..."
find "$BACKUP_DIR" -name "invitations-*.dump" -mtime +$RETENTION_DAYS -delete

echo "Terminé."
