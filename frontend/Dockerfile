FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Développement (docker-compose.yml) : code monté en bind-mount, serveur Vite avec HMR ---
FROM deps AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# --- Build de production : bundle statique optimisé ---
FROM deps AS build
COPY . .
RUN npm run build

# --- Production (docker-compose.prod.yml) : Nginx sert uniquement les fichiers statiques buildés ---
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.static.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
