import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { renderFrame } from './guestbookVideoRenderer';

// Cœur ffmpeg.wasm MONO-thread (pas -mt) chargé depuis un CDN au moment de la génération, pas au
// chargement de l'appli : la version multi-thread irait plus vite mais exige des en-têtes
// COOP/COEP sur TOUT le site pour utiliser SharedArrayBuffer — un risque de configuration en plus
// pour un gain qui, ici, ne sert qu'un remuxage/encodage occasionnel, pas une fonctionnalité
// utilisée à chaque page.
// build ESM (pas /dist/umd) : @ffmpeg/ffmpeg crée son worker avec `type: "module"` (nécessaire
// pour les bundlers modernes comme Vite) — dans ce type de worker, `importScripts` échoue et le
// chargement retombe sur un `import()` dynamique, qui exige un vrai module ES (le build
// /dist/umd n'en est pas un — vérifié en isolant le problème via le navigateur intégré : le
// Worker ne postait jamais de réponse, sans la moindre erreur visible).
const FFMPEG_CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

// 720p/24fps plutôt que 1080p/30fps : nettement plus léger à calculer et encoder en JS/WASM
// mono-thread, pour un rendu qui reste net sur téléphone/réseaux sociaux (où cette vidéo sera
// surtout regardée).
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;
export const VIDEO_FPS = 24;

// Une image à la fois (canvas.toBlob) : mesuré à plus de 1 seconde PAR IMAGE dès que l'onglet
// n'est pas au premier plan (vérifié via le navigateur intégré — Chromium ralentit fortement
// l'encodage d'image lié au compositeur d'une page cachée, y compris via OffscreenCanvas). Un
// admin qui change d'onglet pendant la génération subirait donc la même chose. Les pixels bruts
// (getImageData), eux, ne sont pas concernés (~10ms/image, caché ou non) : on regroupe donc
// plusieurs images brutes par lot ("segment") et on laisse ffmpeg lui-même les compresser en
// H.264 — un vrai calcul WASM, jamais lié au rendu de la page, jamais ralenti de cette façon.
// Borne aussi la mémoire (un segment de 24 images ~85 Mo de pixels bruts, jamais toute la vidéo
// à la fois) : nécessaire puisque le livre d'or peut compter énormément de témoignages, sans
// limite (choix fait avec le client).
const SEGMENT_FRAMES = 24;

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    // Nécessaire pour pouvoir relire les pixels du canvas (getImageData) une fois l'image
    // dessinée dessus : sans ça, une image d'un autre domaine (stockage S3/R2) "tainte" le canvas
    // et fait échouer l'export avec une SecurityError. Si le stockage ne renvoie pas les en-têtes
    // CORS nécessaires, l'image échoue proprement ici (onerror) plutôt que de planter plus loin.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Précharge toutes les images utilisées par la timeline (couverture + photos des témoignages)
// AVANT le rendu image par image : jamais de photo à moitié chargée dans une image de la vidéo,
// et jamais de requête réseau au milieu de la boucle de rendu. Une photo qui échoue à charger est
// simplement absente de la vidéo (dégradation déjà utilisée par le PDF et le mode écran), jamais
// bloquant pour le reste de la génération.
async function preloadImages(timeline, coverUrl) {
  const urls = new Set();
  if (coverUrl) urls.add(coverUrl);
  for (const scene of timeline.scenes) {
    if (scene.type === 'entry' && scene.entry.photo?.url) urls.add(scene.entry.photo.url);
  }
  const images = new Map();
  await Promise.all(
    [...urls].map(async (url) => {
      const img = await loadImage(url);
      if (img) images.set(url, img);
    })
  );
  return images;
}

// Positions/délais des particules générés UNE fois (pas à chaque image) pour un mouvement
// cohérent d'un bout à l'autre de la vidéo plutôt qu'un tirage aléatoire différent par image.
function buildParticles() {
  return Array.from({ length: 14 }, () => ({
    leftFrac: Math.random(),
    delay: Math.random() * 10,
    duration: 10 + Math.random() * 8,
  }));
}

function audioExtensionFor(url) {
  const withoutQuery = url.split('?')[0];
  const ext = withoutQuery.split('.').pop();
  return ext && ext.length <= 4 ? ext : 'mp3';
}

function segmentFileName(s) {
  return `segment_${String(s).padStart(4, '0')}.mp4`;
}

// Dessine et extrait (en pixels bruts, jamais via toBlob — voir plus haut) les images d'UN
// segment, dans un unique buffer concaténé prêt à être écrit en une seule fois.
function renderSegmentRaw(ctx, { startFrame, count, ...renderOpts }, onFrameRendered) {
  const frameBytes = VIDEO_WIDTH * VIDEO_HEIGHT * 4;
  const buffer = new Uint8Array(frameBytes * count);
  for (let j = 0; j < count; j += 1) {
    const i = startFrame + j;
    const time = i / VIDEO_FPS;
    renderFrame(ctx, { width: VIDEO_WIDTH, height: VIDEO_HEIGHT, time, ...renderOpts });
    const { data } = ctx.getImageData(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    buffer.set(data, j * frameBytes);
    onFrameRendered?.(i);
  }
  return buffer;
}

// Orchestre tout le pipeline : rendu HORS-LIGNE, segment par segment (jamais de capture temps
// réel façon captureStream/MediaRecorder — voir le plan pour le raisonnement), chaque segment
// encodé en H.264 dès qu'il est prêt puis libéré de la mémoire, tous les segments enfin
// concaténés et mixés avec la musique déjà uploadée sur l'invitation (bouclée et coupée
// automatiquement à la durée de la vidéo via -shortest, jamais de capture audio en temps réel à
// gérer). `onProgress({ phase, current, total })` alimente la barre de progression de
// GuestbookVideoPage ; `canvas` doit déjà être monté dans la page (aperçu visible pendant le
// rendu, mis à jour à chaque image).
export async function generateGuestbookVideo({ canvas, timeline, coverUrl, musicUrl, onProgress }) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;

  onProgress?.({ phase: 'preload', current: 0, total: 1 });
  await document.fonts.ready;
  const images = await preloadImages(timeline, coverUrl);
  const particles = buildParticles();

  const totalFrames = Math.max(1, Math.ceil(timeline.totalDuration * VIDEO_FPS));
  const totalSegments = Math.ceil(totalFrames / SEGMENT_FRAMES);

  onProgress?.({ phase: 'load-ffmpeg', current: 0, total: 1 });
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  const renderOpts = { timeline, images, coverUrl, particles };
  const segmentFiles = [];
  for (let s = 0; s < totalSegments; s += 1) {
    const startFrame = s * SEGMENT_FRAMES;
    const count = Math.min(SEGMENT_FRAMES, totalFrames - startFrame);
    const raw = renderSegmentRaw(ctx, { startFrame, count, ...renderOpts }, (i) => {
      onProgress?.({ phase: 'render', current: i + 1, total: totalFrames });
    });
    // eslint-disable-next-line no-await-in-loop
    await ffmpeg.writeFile('segment_raw.rgba', raw);
    const segName = segmentFileName(s);
    // eslint-disable-next-line no-await-in-loop
    await ffmpeg.exec([
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-video_size', `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`,
      '-framerate', String(VIDEO_FPS), '-i', 'segment_raw.rgba',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20', segName,
    ]);
    // eslint-disable-next-line no-await-in-loop
    await ffmpeg.deleteFile('segment_raw.rgba');
    segmentFiles.push(segName);
    onProgress?.({ phase: 'encode', current: s + 1, total: totalSegments });
    // Cède la main au navigateur entre deux segments (aperçu repeint, UI réactive) : un
    // setTimeout plutôt qu'un requestAnimationFrame, ralenti dans les mêmes proportions que
    // toBlob quand l'onglet n'est pas au premier plan.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  let musicBytes = null;
  let musicExt = null;
  if (musicUrl) {
    try {
      const res = await fetch(musicUrl);
      if (res.ok) {
        musicBytes = new Uint8Array(await res.arrayBuffer());
        musicExt = audioExtensionFor(musicUrl);
      }
    } catch {
      musicBytes = null; // musique inaccessible : la vidéo se génère quand même, muette
    }
  }

  onProgress?.({ phase: 'mux', current: 0, total: 1 });
  const concatList = segmentFiles.map((f) => `file '${f}'`).join('\n');
  await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatList));

  const args = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt'];
  if (musicBytes) {
    await ffmpeg.writeFile(`audio.${musicExt}`, musicBytes);
    const fadeStart = Math.max(0, timeline.totalDuration - 2.5);
    args.push(
      '-stream_loop', '-1', '-i', `audio.${musicExt}`,
      '-shortest', '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', `afade=t=out:st=${fadeStart}:d=2.5`
    );
  } else {
    args.push('-c:v', 'copy');
  }
  args.push('-movflags', '+faststart', 'output.mp4');

  await ffmpeg.exec(args);

  const data = await ffmpeg.readFile('output.mp4');
  onProgress?.({ phase: 'mux', current: 1, total: 1 });
  return new Blob([data], { type: 'video/mp4' });
}
