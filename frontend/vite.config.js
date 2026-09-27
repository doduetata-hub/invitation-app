import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
      interval: 300,
    },
  },
});
