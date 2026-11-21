// Serveur de développement DÉDIÉ aux tests visuels : il ne touche ni à vite.config.js de l'application
// ni à son build. Les fichiers de e2e/fixtures sont servis à la racine (/img/...).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '..', '..');

export default defineConfig({
  root: here,
  publicDir: path.resolve(here, '..', 'fixtures'),
  // Cache de pré-bundling dans node_modules du frontend (ignoré par git), jamais ailleurs sur le disque.
  cacheDir: path.resolve(frontendRoot, 'node_modules', '.vite-e2e'),
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5299,
    strictPort: true,
    fs: { allow: [frontendRoot] },
  },
});
