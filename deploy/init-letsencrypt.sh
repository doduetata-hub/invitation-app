#!/bin/bash
# Bootstrap initial des certificats Let's Encrypt (pattern standard : certificat factice
# temporaire pour permettre à Nginx de démarrer, puis certificat réel via certbot).
#
# À exécuter UNE SEULE FOIS sur le VPS, depuis la racine du projet, avant le premier
# démarrage durable de la stack :
#   ./deploy/init-letsencrypt.sh
#
# Prérequis :
#   - .env.production existe avec DOMAIN et CERTBOT_EMAIL renseignés
#   - le DNS de DOMAIN pointe déjà vers ce serveur (le challenge ACME HTTP-01 en dépend)
set -e

if [ ! -f .env.production ]; then
  echo "Erreur : .env.production introuvable à la racine du projet." >&2
  exit 1
fi

set -a
. ./.env.production
set +a

if [ -z "$DOMAIN" ] || [ -z "$CERTBOT_EMAIL" ]; then
  echo "Erreur : DOMAIN et CERTBOT_EMAIL doivent être définis dans .env.production" >&2
  exit 1
fi

COMPOSE="docker compose -f docker-compose.prod.yml"

echo "1/4 — Certificat factice temporaire pour permettre à Nginx de démarrer..."
$COMPOSE run --rm --entrypoint "\
  sh -c 'mkdir -p /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj \"/CN=localhost\"'" certbot

echo "2/4 — Démarrage de Nginx (sert le challenge ACME sur le port 80)..."
$COMPOSE up -d nginx

echo "3/4 — Suppression du certificat factice et obtention du vrai certificat..."
$COMPOSE run --rm --entrypoint "\
  sh -c 'rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf && \
  certbot certonly --webroot -w /var/www/certbot \
    --email $CERTBOT_EMAIL --agree-tos --no-eff-email -d $DOMAIN'" certbot

echo "4/4 — Rechargement de Nginx avec le certificat réel..."
$COMPOSE exec nginx nginx -s reload

echo ""
echo "Terminé. Démarrer le reste de la stack : $COMPOSE up -d"
