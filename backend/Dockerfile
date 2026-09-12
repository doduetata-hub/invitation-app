FROM node:20-alpine AS base

WORKDIR /app


# openssl : requis par Prisma. python3/make/g++ : filet de sécurité pour les modules natifs
# (bcrypt, sharp) quand npm doit compiler depuis les sources (échec de téléchargement du binaire
# précompilé, plateforme non couverte, etc.) plutôt que d'échouer sans recours.
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

# --- Développement (docker-compose.yml) : code monté en bind-mount, nodemon, tout npm install ---
FROM base AS development
EXPOSE 4000
CMD ["npm", "run", "dev"]

# --- Production (docker-compose.prod.yml) : image immuable, migrations appliquées au démarrage ---
FROM base AS production
ENV NODE_ENV=production
RUN npm prune --omit=dev
RUN chmod +x ./docker-entrypoint.prod.sh
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.prod.sh"]
CMD ["npm", "start"]
