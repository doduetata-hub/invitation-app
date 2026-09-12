#!/bin/bash
# Restauration d'une sauvegarde PostgreSQL créée par backup.sh.
# Usage : ./deploy/restore.sh deploy/backups/invitations-20260101-030000.dump
#
# ATTENTION : remplace intégralement le contenu de la base de données actuelle.
set -e

cd "$(dirname "$0")/.."

FILE="$1"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage : ./deploy/restore.sh <fichier .dump>" >&2
  exit 1
fi

if [ ! -f .env.production ]; then
  echo "Erreur : .env.production introuvable." >&2
  exit 1
fi

set -a
. ./.env.production
set +a

read -p "Ceci va écraser la base '$POSTGRES_DB'. Continuer ? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Annulé."
  exit 0
fi

echo "Restauration de $FILE vers '$POSTGRES_DB'..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$FILE"

echo "Restauration terminée."
