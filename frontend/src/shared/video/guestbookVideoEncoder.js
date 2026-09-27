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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Un signalement client a montré la vidéo générée SANS aucune photo ni musique, alors que le
// livre d'or en avait — sans la moindre erreur, chaque échec de chargement étant traité comme
// "média absent" (dégradation volontaire, voir loadImage). Cause réelle : lire les OCTETS d'un
// média depuis JavaScript (canvas.getImageData après dessin, fetch pour la musique) exige des
// en-têtes CORS de la part du stockage — contrairement à un simple <img>/<audio> qui n'en a
// besoin d'aucun pour s'afficher/jouer. Le stockage S3/R2 utilisé en production n'en envoie pas
// par défaut. On relaie donc ces médias via notre propre API (fetch serveur-à-serveur, jamais
// soumis au CORS du navigateur), servis depuis NOTRE domaine : plus aucune restriction CORS à
// appliquer, quels que soient les en-têtes du stockage d'origine. Une URL déjà relative
// (stockage local, déjà même origine) n'a besoin d'aucun relais.
function withCorsProxy(url) {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}/media-proxy?url=${encodeURIComponent(url)}`;
}

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

// Un signalement client a montré la génération bloquée indéfiniment, sans la moindre erreur, sur
// un livre d'or de 9 messages dont seulement 2 avec photo — l'onglet restant réactif entre-temps
// (donc pas un blocage du fil principal, plutôt une étape asynchrone qui ne répond jamais). Deux
// garde-fous ajoutés en réaction : un délai de sécurité ici (une image dont le chargement ne
// déclenche NI succès NI erreur, ex. connexion qui reste ouverte sans jamais répondre, bloquerait
// sinon tout le préchargement pour toujours) et withWatchdog plus bas (pour ffmpeg lui-même).
function loadImage(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      resolve(result);
    };
    // Nécessaire pour pouvoir relire les pixels du canvas (getImageData) une fois l'image
    // dessinée dessus : sans ça, une image d'un autre domaine (stockage S3/R2) "tainte" le canvas
    // et fait échouer l'export avec une SecurityError. Si le stockage ne renvoie pas les en-têtes
    // CORS nécessaires, l'image échoue proprement ici (onerror) plutôt que de planter plus loin.
    img.crossOrigin = 'anonymous';
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    setTimeout(() => finish(null), timeoutMs);
    img.src = url;
  });
}

// Une vraie photo de téléphone dépasse largement ce qu'il faut pour un médaillon qui ne fait
// jamais plus de ~300px de large à l'écran (voir guestbookVideoRenderer.js) — or chaque image de
// CHAQUE segment redessine cette photo avec l'effet Ken Burns puis en relit les pixels
// (getImageData) : avec une photo à sa taille d'origine (3000-4000px, plusieurs Mo une fois
// décodée), ce travail répété peut suffire à ralentir tout l'onglet, y compris les échanges avec
// le Worker ffmpeg — un signalement client a montré des encodages de segment mettant plus de 60s
// à répondre, sans jamais échouer franchement, symptôme d'un système sous pression plutôt que
// d'un vrai blocage. On réduit donc chaque photo UNE fois, ici, avant qu'elle ne serve à quoi que
// ce soit — un canvas fonctionne aussi bien qu'une <img> comme source pour drawImage/getImageData
// ailleurs dans le moteur de rendu (voir le repli `naturalWidth || width` déjà en place).
const MAX_PHOTO_DIMENSION = 1000;

function downscaleIfNeeded(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h || Math.max(w, h) <= MAX_PHOTO_DIMENSION) return img;
  const scale = MAX_PHOTO_DIMENSION / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Fait échouer PROPREMENT (avec un message clair) une opération ffmpeg qui ne répondrait jamais,
// plutôt que de laisser la barre de progression bloquée pour toujours sans explication — ffmpeg
// tourne dans un Worker séparé : une opération qui ne répond jamais ne fige pas la page (l'onglet
// reste réactif), ce qui la rend justement difficile à distinguer d'un simple calcul long sans
// un délai de sécurité explicite comme celui-ci.
function withWatchdog(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} : aucune réponse après ${Math.round(ms / 1000)}s — le moteur vidéo semble bloqué. Réessaie ; si ça persiste, signale à quel pourcentage ça bloque.`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
      // La map reste indexée par l'URL D'ORIGINE (c'est elle que guestbookVideoRenderer.js
      // utilise pour retrouver l'image) : seul le chargement passe par le relais CORS.
      const img = await loadImage(withCorsProxy(url));
      if (img) images.set(url, downscaleIfNeeded(img));
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

// Un signalement client a montré un blocage TOUJOURS au même segment (50/117) pendant l'encodage
// — jamais une erreur, l'onglet restant réactif : la mémoire WASM interne de ffmpeg.wasm ne se
// libère jamais complètement entre deux ffmpeg.exec() sur la MÊME instance, et grossit à chaque
// segment encodé jusqu'à ce que l'agrandir devienne si lent que ça ressemble à un blocage complet
// (comportement connu de ffmpeg.wasm sur un traitement par lots — voir sa documentation sur les
// traitements répétés). On recrée donc l'instance ffmpeg toutes les RELOAD_EVERY_SEGMENTS
// segments : chaque segment déjà encodé est conservé côté JavaScript (un petit fichier, quelques
// dizaines de Ko) plutôt que dans le système de fichiers de ffmpeg, pour ne jamais dépendre d'un
// état accumulé dans une instance qu'on abandonne. Pour une vidéo courte (peu de segments), ce
// rechargement ne se produit jamais : aucun coût ajouté dans le cas courant.
const RELOAD_EVERY_SEGMENTS = 25;

async function createFfmpeg() {
  const ffmpeg = new FFmpeg();
  await withWatchdog(
    ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    }),
    30000,
    'Chargement du moteur vidéo'
  );
  return ffmpeg;
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
  let ffmpeg = await createFfmpeg();

  const renderOpts = { timeline, images, coverUrl, particles };
  const segmentFiles = [];
  // Bytes des segments déjà encodés, gardés côté JS (voir RELOAD_EVERY_SEGMENTS ci-dessus) —
  // jamais laissés dans le système de fichiers de ffmpeg au-delà de leur propre segment.
  const segmentBuffers = new Map();
  for (let s = 0; s < totalSegments; s += 1) {
    const startFrame = s * SEGMENT_FRAMES;
    const count = Math.min(SEGMENT_FRAMES, totalFrames - startFrame);
    const raw = renderSegmentRaw(ctx, { startFrame, count, ...renderOpts }, (i) => {
      onProgress?.({ phase: 'render', current: i + 1, total: totalFrames });
    });
    // eslint-disable-next-line no-await-in-loop
    await withWatchdog(ffmpeg.writeFile('segment_raw.rgba', raw), 20000, `Écriture du segment ${s + 1}/${totalSegments}`);
    const segName = segmentFileName(s);
    // 150s plutôt que les 60s initiaux : un signalement client a montré un encodage de segment
    // dépassant 60s SANS jamais être réellement bloqué (juste un ordinateur/des photos plus
    // lourds que dans nos tests) — voir MAX_PHOTO_DIMENSION ci-dessus pour la réduction des
    // photos elle-même, et ce délai élargi comme marge de sécurité supplémentaire.
    // eslint-disable-next-line no-await-in-loop
    await withWatchdog(
      ffmpeg.exec([
        '-f', 'rawvideo', '-pix_fmt', 'rgba', '-video_size', `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`,
        '-framerate', String(VIDEO_FPS), '-i', 'segment_raw.rgba',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast', '-crf', '20', segName,
      ]),
      150000,
      `Encodage du segment ${s + 1}/${totalSegments}`
    );
    // eslint-disable-next-line no-await-in-loop
    const segData = await withWatchdog(ffmpeg.readFile(segName), 15000, `Lecture du segment ${s + 1}/${totalSegments}`);
    segmentBuffers.set(segName, segData);
    // eslint-disable-next-line no-await-in-loop
    await withWatchdog(ffmpeg.deleteFile('segment_raw.rgba'), 10000, `Nettoyage du segment ${s + 1}/${totalSegments}`);
    // eslint-disable-next-line no-await-in-loop
    await withWatchdog(ffmpeg.deleteFile(segName), 10000, `Nettoyage du segment ${s + 1}/${totalSegments}`);
    segmentFiles.push(segName);
    onProgress?.({ phase: 'encode', current: s + 1, total: totalSegments });

    const isLastSegment = s === totalSegments - 1;
    if (!isLastSegment && (s + 1) % RELOAD_EVERY_SEGMENTS === 0) {
      onProgress?.({ phase: 'reload-ffmpeg', current: s + 1, total: totalSegments });
      ffmpeg.terminate();
      // eslint-disable-next-line no-await-in-loop
      ffmpeg = await createFfmpeg();
    }

    // Cède la main au navigateur entre deux segments (aperçu repeint, UI réactive) : un
    // setTimeout plutôt qu'un requestAnimationFrame, ralenti dans les mêmes proportions que
    // toBlob quand l'onglet n'est pas au premier plan.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Les segments ont pu être encodés par PLUSIEURS instances ffmpeg successives (voir
  // RELOAD_EVERY_SEGMENTS) : on les réécrit tous dans l'instance courante juste avant
  // l'assemblage final, qui les lit depuis son propre système de fichiers.
  for (const [segName, segData] of segmentBuffers) {
    // eslint-disable-next-line no-await-in-loop
    await withWatchdog(ffmpeg.writeFile(segName, segData), 15000, `Préparation de l'assemblage (${segName})`);
  }

  let musicBytes = null;
  let musicExt = null;
  if (musicUrl) {
    try {
      const res = await fetch(withCorsProxy(musicUrl));
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
  await withWatchdog(ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatList)), 10000, 'Préparation de l’assemblage');

  const args = ['-f', 'concat', '-safe', '0', '-i', 'concat.txt'];
  if (musicBytes) {
    await withWatchdog(ffmpeg.writeFile(`audio.${musicExt}`, musicBytes), 20000, 'Écriture de la musique');
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

  await withWatchdog(ffmpeg.exec(args), 120000, 'Assemblage final');

  const data = await withWatchdog(ffmpeg.readFile('output.mp4'), 20000, 'Lecture du fichier final');
  onProgress?.({ phase: 'mux', current: 1, total: 1 });
  return new Blob([data], { type: 'video/mp4' });
}
