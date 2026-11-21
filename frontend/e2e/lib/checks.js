// Contrôles réutilisables : débordement horizontal, images, polices, console, requêtes en échec.
import { CLOCK_NOW } from '../harness/scenarios.js';
import { stabilize } from './integrity.js';

// Tout message console de ce type est ignoré (bruit de l'outillage, pas de l'application).
const IGNORED_CONSOLE = [/\[vite\]/i, /Download the React DevTools/i];

/** Ouvre la page du harness avec horloge figée ; retourne l'objet `watch` qui collecte les anomalies. */
export async function openScenario(page, { key, scenario = 'full', blockGoogleFonts = false, photos: photosOpt = null }) {
  const watch = { consoleErrors: [], pageErrors: [], failedRequests: [], blockedExternal: [], stabilizeMs: 0, blockExternal: blockGoogleFonts };

  page.on('console', (msg) => {
    if (!['error', 'warning'].includes(msg.type())) return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    // Ressources externes volontairement bloquées par le test (blockGoogleFonts) : pas une erreur de l'application.
    if (watch.blockExternal && /ERR_BLOCKED_BY_CLIENT/.test(text)) return;
    watch.consoleErrors.push(`${msg.type()}: ${text}`);
  });
  page.on('pageerror', (err) => watch.pageErrors.push(String(err)));
  page.on('requestfailed', (req) => {
    watch.failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`);
  });

  // Date.now() figé (les timers continuent de tourner) : le compte à rebours affiche toujours la même valeur.
  // Conditions optionnelles : E2E_SLOW=1 (réseau ~ 3G lente, Chromium uniquement), E2E_REDUCED_MOTION=1.
  if (process.env.E2E_REDUCED_MOTION === '1') await page.emulateMedia({ reducedMotion: 'reduce' });
  if (process.env.E2E_SLOW === '1') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400, // ms
      downloadThroughput: (400 * 1024) / 8, // ~400 kbit/s
      uploadThroughput: (400 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // ~ Android d'entrée de gamme
  }

  // Option (templates sans dépendance Google Fonts) : on bloque Google Fonts et on ne compte pas ces blocages comme des échecs.
  // Un template qui en dépendrait afficherait alors ses polices de secours, ce que le contrôle des polices détecte.
  if (blockGoogleFonts) {
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => {
      watch.blockedExternal.push(route.request().url());
      return route.abort('blockedbyclient');
    });
    // La carte Google est remplacée par une page neutre : les captures ne dépendent plus d'un service externe.
    await page.route(/maps\.google\.com/, (route) => {
      watch.blockedExternal.push(route.request().url());
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0;display:grid;place-items:center;height:100vh;background:#d8d1c3;color:#5f574d;font:14px sans-serif">Carte (simulée en test)</body>' });
    });
    page.removeAllListeners('requestfailed');
    page.on('requestfailed', (req) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return;
      watch.failedRequests.push(`${req.url()} — ${req.failure()?.errorText}`);
    });
  }

  await page.clock.setFixedTime(new Date(CLOCK_NOW));
  // E2E_REAL_PHOTOS=1 : photographies autorisées déposées dans e2e/fixtures/photos (voir son README) ; E2E_PHOTOS_NODIMS=1 : sans dimensions.
  // Option `photos` (prioritaire sur l'environnement) : 'real' | 'real-nodims' | 'real-prod' (sans dimensions NI vignettes, état actuel de l'application).
  const mode = photosOpt || (process.env.E2E_REAL_PHOTOS === '1' ? (process.env.E2E_PHOTOS_NODIMS === '1' ? 'real-nodims' : 'real') : null);
  const photos = !mode ? '' : mode === 'real' ? '&photos=1' : mode === 'real-nodims' ? '&photos=1&nodims=1' : '&photos=1&nodims=1&nothumbs=1';
  await page.goto(`/?key=${encodeURIComponent(key)}&scenario=${encodeURIComponent(scenario)}${photos}`, { waitUntil: 'load' });
  await page.waitForSelector('#cover', { timeout: 20_000 });
  // Templates chargés à la demande (React.lazy) : on attend que la hauteur de la page cesse de changer avant de défiler,
  // sinon la boucle de défilement s'arrête trop tôt (la page grandit quand les sections arrivent).
  await page.waitForFunction(
    () => {
      const h = document.documentElement.scrollHeight;
      const w = window;
      if (w.__lastH === h) { w.__stableTicks = (w.__stableTicks || 0) + 1; } else { w.__stableTicks = 0; w.__lastH = h; }
      return w.__stableTicks >= 5; // 5 relevés consécutifs identiques (polling 100 ms)
    },
    null,
    { timeout: 10_000, polling: 100 }
  ).catch(() => {});
  await settle(page);
  // Stabilisation des animations AVANT toute capture/mesure (delai max : E2E_STABILIZE_MS, defaut 3000 ms).
  watch.stabilizeMs = await stabilize(page);
  return watch;
}

/** Défile toute la page (déclenche loading="lazy" et les révélations au scroll), attend polices et images. */
export async function settle(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 200));
    window.scrollTo(0, 0);
  });
  // Sous forte charge la boucle de défilement peut « sauter » des images loading="lazy" : on amène à l'écran, une par une,
  // celles qui n'ont pas démarré (ce que ferait un invité qui s'y arrête), puis on revient en haut.
  await page.evaluate(async () => {
    for (const img of [...document.images].filter((i) => !i.complete)) {
      img.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 150));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
  const allDone = () => [...document.images].every((i) => i.complete && (i.naturalWidth > 0 || !i.currentSrc));
  const done = await page.waitForFunction(allDone, null, { timeout: 8_000 }).then(() => true).catch(() => false);
  if (!done) {
    // Deuxième passe (machine très chargée) : on repasse sur les images encore en attente, une par une, puis on attend de nouveau.
    await page.evaluate(async () => {
      for (const img of [...document.images].filter((i) => !(i.complete && i.naturalWidth > 0))) {
        img.scrollIntoView({ block: 'center' });
        await new Promise((r) => setTimeout(r, 400));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(allDone, null, { timeout: 15_000 }).catch(() => {});
  }
}

/** Mesures de la page à l'instant T. */
export function collectMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const vw = window.innerWidth;

    // Éléments dont le bord droit dépasse l'écran ET qui ne sont pas rognés par un ancêtre overflow:hidden/clip.
    const clipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (['hidden', 'clip', 'auto', 'scroll'].includes(o.overflowX)) return true;
      }
      return false;
    };
    const overflowing = [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > vw + 1 && !clipped(el))
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).slice(0, 40)}`);

    const images = [...document.images].map((i) => ({
      src: i.currentSrc || i.src,
      ok: i.complete && i.naturalWidth > 0,
      lazy: i.loading === 'lazy',
      hasAlt: i.hasAttribute('alt'),
    }));

    // Familles réellement utilisées par du texte visible, et si le navigateur dispose d'une police chargée pour elles.
    const used = new Map();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim() || !n.parentElement) continue;
      const cs = getComputedStyle(n.parentElement);
      const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      const spec = `${cs.fontStyle} ${cs.fontWeight} 16px "${family}"`;
      if (!used.has(spec)) used.set(spec, { family, weight: cs.fontWeight, style: cs.fontStyle });
    }
    const fonts = [...used.entries()].map(([spec, f]) => ({ ...f, loaded: document.fonts.check(spec) }));

    return {
      viewportWidth: vw,
      scrollWidth: doc.scrollWidth,
      height: doc.scrollHeight,
      horizontalOverflow: doc.scrollWidth > vw,
      overflowing,
      images,
      fonts,
    };
  });
}

/** Familles génériques/système : pas de téléchargement attendu. */
const SYSTEM_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'Times New Roman', 'Arial', 'Georgia', 'system-ui']);

export function summarize(metrics, watch) {
  const problems = [];
  if (metrics.horizontalOverflow) problems.push(`Défilement horizontal : scrollWidth ${metrics.scrollWidth} > ${metrics.viewportWidth}`);
  if (metrics.overflowing.length) problems.push(`Éléments dépassant l'écran sans être rognés : ${metrics.overflowing.join(', ')}`);
  const broken = metrics.images.filter((i) => !i.ok);
  if (broken.length) problems.push(`${broken.length} image(s) non chargée(s) : ${broken.map((i) => i.src).join(', ')}`);
  const noAlt = metrics.images.filter((i) => !i.hasAlt);
  if (noAlt.length) problems.push(`${noAlt.length} image(s) sans attribut alt`);
  const badFonts = metrics.fonts.filter((f) => !f.loaded && !SYSTEM_FAMILIES.has(f.family));
  if (badFonts.length) problems.push(`Polices non chargées : ${badFonts.map((f) => `${f.family} ${f.weight}`).join(', ')}`);
  if (watch.consoleErrors.length) problems.push(`Console : ${watch.consoleErrors.join(' | ')}`);
  if (watch.pageErrors.length) problems.push(`Erreurs de page : ${watch.pageErrors.join(' | ')}`);
  // Les polices Google sont une dépendance externe : une requête de police échouée est signalée mais distinguée.
  if (watch.failedRequests.length) problems.push(`Requêtes en échec : ${watch.failedRequests.join(' | ')}`);
  return problems;
}
