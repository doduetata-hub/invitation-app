// Visage principal d'une photo de livre d'or : sert à centrer l'avatar rond sur le visage (écran de la
// salle, PDF) au lieu de cadrer au hasard. Détecteur BlazeFace (MediaPipe, Apache 2.0) exécuté par la
// bibliothèque Human en WebAssembly : aucune dépendance native, tourne aussi sur Vercel. Le modèle et
// les deux fichiers .wasm sont versionnés dans src/assets/face (aucun téléchargement à l'exécution).
//
// Meilleur effort, jamais bloquant : un envoi de photo ne doit jamais échouer à cause de cette étape.
// Trois résultats distincts (ne pas les confondre : « aucun visage » est définitif, « indisponible »
// doit être réessayé plus tard) :
//   { focusX, focusY } : visage trouvé ;
//   null               : photo analysée, aucun visage (cadrage par défaut) ;
//   false              : analyse impossible (détecteur absent, désactivé, trop lent, erreur).
//
// Le point renvoyé est le centre du visage en pourcentage de l'image (0-100), indépendant de la forme
// de l'avatar : c'est l'écran / le PDF qui en déduisent le recadrage (voir squareCropAroundFocus).
const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const sharp = require('sharp');

const ASSET_DIR = path.join(__dirname, '..', 'assets', 'face');
// Plus grand côté de l'image analysée : assez pour des visages de groupe, rapide sur un petit serveur.
const DETECT_SIZE = 512;
const DEFAULT_TIMEOUT_MS = 8000;

const isEnabled = () => process.env.FACE_FOCUS !== 'off';

// Human charge ses modèles avec fetch() ; celui de Node ne sait pas lire les adresses file:// . On le
// lui apprend ici, pour ce seul cas (aucune autre partie de l'application n'utilise file://).
let fetchPatched = false;
function allowLocalFileFetch() {
  if (fetchPatched) return;
  fetchPatched = true;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (!url.startsWith('file://')) return realFetch(input, init);
    const data = fs.readFileSync(fileURLToPath(url));
    return new Response(data, { status: 200, headers: { 'content-type': url.endsWith('.json') ? 'application/json' : 'application/octet-stream' } });
  };
}

let humanPromise = null;
function getHuman() {
  if (!humanPromise) {
    humanPromise = (async () => {
      allowLocalFileFetch();
      // Chemin littéral : le bundle de déploiement le repère ainsi (le sous-chemin dist/ n'est pas exporté).
      const mod = require('../../node_modules/@vladmandic/human/dist/human.node-wasm.js');
      const Human = mod.default || mod;
      const human = new Human({
        backend: 'wasm',
        wasmPath: `${ASSET_DIR.replace(/\\/g, '/')}/`,
        modelBasePath: pathToFileURL(`${ASSET_DIR}${path.sep}`).href,
        debug: false,
        async: false,
        filter: { enabled: false },
        face: {
          enabled: true,
          detector: { enabled: true, rotation: false, maxDetected: 6, minConfidence: 0.3, return: false },
          mesh: { enabled: false },
          iris: { enabled: false },
          description: { enabled: false },
          emotion: { enabled: false },
          antispoof: { enabled: false },
          liveness: { enabled: false },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        gesture: { enabled: false },
        segmentation: { enabled: false },
      });
      await human.load();
      return human;
    })().catch((err) => {
      humanPromise = null; // un nouvel essai aura lieu à la prochaine photo
      throw err;
    });
  }
  return humanPromise;
}

// Les détections se font l'une après l'autre : TensorFlow n'est pas prévu pour des appels simultanés.
let queue = Promise.resolve();

async function runDetection(buffer) {
  const human = await getHuman();
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: DETECT_SIZE, height: DETECT_SIZE, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tensor = human.tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32');
  let result;
  try {
    result = await human.detect(tensor);
  } finally {
    human.tf.dispose(tensor);
  }
  const faces = (result.face || []).filter((f) => Array.isArray(f.box) && f.box[2] > 0 && f.box[3] > 0);
  if (!faces.length) return null;
  // Photo de groupe : le plus grand visage (le plus proche de l'objectif) est celui de la personne
  // qui envoie le message dans la grande majorité des cas.
  const best = faces.reduce((a, b) => (b.box[2] * b.box[3] > a.box[2] * a.box[3] ? b : a));
  const [x, y, w, h] = best.box;
  return {
    focusX: Math.round(Math.min(100, Math.max(0, ((x + w / 2) / info.width) * 100)) * 10) / 10,
    focusY: Math.round(Math.min(100, Math.max(0, ((y + h / 2) / info.height) * 100)) * 10) / 10,
  };
}

// Voir l'en-tête pour les trois résultats possibles. Ne lève jamais d'erreur.
async function detectFaceFocus(buffer, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!isEnabled() || !buffer) return false;
  const job = queue.then(() => runDetection(buffer));
  queue = job.catch(() => {});
  let timer;
  try {
    return await Promise.race([
      job,
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch (err) {
    console.warn('[faceFocus] détection impossible :', err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Recadre l'image en carré centré sur le point (focusX, focusY en %), pour l'avatar rond du PDF. Le
// carré est le plus grand possible (côté = plus petit côté de l'image), calé pour rester dans l'image.
async function squareCropAroundFocus(buffer, focus, { size = 640 } = {}) {
  const { width, height } = await sharp(buffer).metadata();
  if (!width || !height) return buffer;
  const side = Math.min(width, height);
  const cx = (Math.min(100, Math.max(0, focus.focusX)) / 100) * width;
  const cy = (Math.min(100, Math.max(0, focus.focusY)) / 100) * height;
  const left = Math.round(Math.min(width - side, Math.max(0, cx - side / 2)));
  const top = Math.round(Math.min(height - side, Math.max(0, cy - side / 2)));
  return sharp(buffer).extract({ left, top, width: side, height: side }).resize(size, size, { withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
}

module.exports = { detectFaceFocus, squareCropAroundFocus };
