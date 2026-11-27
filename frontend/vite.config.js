import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import demoPreviews from './demoPreviews.js';

export default defineConfig({
  plugins: [react(), demoPreviews()],
  optimizeDeps: {
    // @ffmpeg/ffmpeg crée son worker via `new Worker(new URL('./worker.js', import.meta.url))` :
    // ce chemin relatif suppose que worker.js reste physiquement à côté du fichier qui le
    // référence. Le pré-bundling esbuild de Vite (node_modules/.vite/deps/@ffmpeg_ffmpeg.js) ne
    // recopie pas worker.js à côté, donc ce Worker échoue avec un 404 muet une fois passé par le
    // pré-bundling — exclu ici pour que Vite serve le paquet tel quel depuis node_modules.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      // Sous Docker Desktop (Windows), surveiller les fichiers toutes les 300 ms épuise le processeur et ralentit chaque page :
      // on espace les vérifications et on ignore les dossiers générés qui ne servent pas au rechargement.
      interval: 1500,
      ignored: ['**/dist/**', '**/playwright-report/**', '**/test-results/**', '**/e2e/**', '**/.git/**'],
    },
  },
});
