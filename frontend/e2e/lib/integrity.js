// Integrite de rendu des sections : une section n'est "visible" que si, apres l'avoir amenee a l'ecran comme le
// ferait un invite, elle se STABILISE a une opacite effective >= 0.99, sans animation finie en cours, a l'interieur
// du document. Generalisation du prototype e2e/diagnostics/d3-detector.mjs (valide sur 7 cas, dont 5 pannes injectees).
//
// Verdicts : OK | OPACITE 0 | EN ANIMATION | HORS ZONE | MASQUEE | ABSENTE
// Delai maximal de stabilisation configurable : option timeoutMs, sinon variable E2E_STABILIZE_MS (defaut 3000).

export const ESSENTIAL_SECTIONS = ['cover', 'countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'];

export function stabilizeTimeout(override) {
  const env = Number(process.env.E2E_STABILIZE_MS);
  return override ?? (Number.isFinite(env) && env > 0 ? env : 3000);
}

// Evalue dans la page. Opacite effective = produit des opacites de la section et de tous ses ancetres.
function inspectInPage(id) {
  const el = document.getElementById(id);
  if (!el) return { id, present: false };
  let opacity = 1;
  let hiddenBy = null;
  for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
    const cs = getComputedStyle(n);
    opacity *= parseFloat(cs.opacity);
    if (cs.display === 'none') hiddenBy = 'display:none';
    if (cs.visibility === 'hidden') hiddenBy = hiddenBy || 'visibility:hidden';
  }
  const r = el.getBoundingClientRect();
  const doc = document.documentElement;
  const docTop = r.top + window.scrollY;
  const offDocument =
    r.width === 0 ||
    r.height === 0 ||
    r.right < 0 ||
    r.left > doc.clientWidth ||
    docTop + r.height < 0 ||
    docTop > doc.scrollHeight;
  // Seules comptent les animations FINIES qui peuvent rendre un contenu invisible ou déplacé (opacité, transformations, visibilité,
  // détourage). Une transition de couleur de bouton (survol) en cours ne masque rien : elle n'est pas un blocage de contenu.
  const VISIBILITY_PROPS = /^(opacity|transform|translate|scale|rotate|visibility|display|clip|clipPath|filter)$/;
  const finite = (a) =>
    a.playState === 'running' &&
    a.effect?.getComputedTiming().iterations !== Infinity &&
    a.effect.getKeyframes().some((k) => Object.keys(k).some((p) => VISIBILITY_PROPS.test(p)));
  const running = el.getAnimations({ subtree: true }).filter(finite).length + (el.parentElement?.getAnimations().filter(finite).length || 0);
  // Contenu IMBRIQUE (ex. revelations internes a une section) : elements portant du texte dont l'opacite effective est ~0.
  // Les opacites partielles statiques (ex. 0.8 voulu) ne sont volontairement pas signalees.
  let descHidden = 0;
  const sample = [];
  for (const d of el.querySelectorAll('*')) {
    const own = [...d.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    let o = 1;
    let skip = false;
    for (let n = d; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || n.getAttribute('aria-hidden') === 'true') { skip = true; break; }
      o *= parseFloat(cs.opacity);
    }
    if (!skip && o < 0.05) { descHidden += 1; if (sample.length < 3) sample.push(`${d.tagName.toLowerCase()}.${String(d.className).slice(0, 24)}`); }
  }
  return { id, present: true, opacity: +opacity.toFixed(3), hiddenBy, offDocument, running, descHidden, descSample: sample, w: Math.round(r.width), h: Math.round(r.height) };
}

export function verdictOf(s) {
  if (!s.present) return 'ABSENTE';
  if (s.hiddenBy) return `MASQUEE (${s.hiddenBy})`;
  if (s.offDocument) return 'HORS ZONE';
  if (s.opacity < 0.05) return 'OPACITE 0';
  if (s.descHidden > 0) return 'CONTENU INTERNE A OPACITE 0';
  if (s.opacity < 0.99 || s.running > 0) return 'EN ANIMATION';
  return 'OK';
}

/**
 * Controle section par section. Chaque section presente dans le DOM (ou listee dans `expected`) est amenee a l'ecran,
 * puis on attend (jusqu'a timeoutMs) qu'elle se stabilise. Retourne une ligne par section avec les mesures d'opacite.
 * Les animations ne sont PAS desactivees : leur duree reelle est mesuree (settleMs).
 */
export async function checkIntegrity(page, { sections = ESSENTIAL_SECTIONS, expected = [], timeoutMs } = {}) {
  const limit = stabilizeTimeout(timeoutMs);
  const rows = [];
  for (const id of sections) {
    const exists = (await page.locator(`#${id}`).count()) > 0;
    if (!exists) {
      if (expected.includes(id)) rows.push({ id, present: false, verdict: 'ABSENTE', expected: true });
      continue;
    }
    // On parcourt TOUTE la hauteur de la section (pas seulement son debut) : les revelations internes se declenchent au passage.
    const box = await page.evaluate((i) => {
      const r = document.getElementById(i).getBoundingClientRect();
      return { top: r.top + window.scrollY, h: r.height, vh: window.innerHeight };
    }, id);
    const step = Math.max(200, Math.floor(box.vh * 0.6));
    for (let y = box.top; y < box.top + box.h; y += step) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(60);
    }
    await page.evaluate((yy) => window.scrollTo(0, yy), box.top + box.h - box.vh * 0.5);
    await page.waitForTimeout(60);
    const t0 = Date.now();
    let s = await page.evaluate(inspectInPage, id);
    const opacityStart = s.opacity;
    while (verdictOf(s) !== 'OK' && Date.now() - t0 < limit) {
      await page.waitForTimeout(80);
      s = await page.evaluate(inspectInPage, id);
    }
    rows.push({ ...s, verdict: verdictOf(s), opacityStart, settleMs: Date.now() - t0, timeoutMs: limit });
  }
  // Tout ce qui a ete declenche par le parcours (transitions imbriquees comprises) doit etre termine avant toute capture.
  const settledMs = await stabilize(page, { timeoutMs: limit });
  await page.evaluate(() => window.scrollTo(0, 0));
  rows.settledAfterScrollMs = settledMs;
  return rows;
}

/** Attend que TOUT soit stabilise avant une capture (sans echouer : le verdict est rendu par checkIntegrity). */
export async function stabilize(page, { timeoutMs } = {}) {
  const limit = stabilizeTimeout(timeoutMs);
  const t0 = Date.now();
  await page
    .waitForFunction(
      () => {
        const VIS = /^(opacity|transform|translate|scale|rotate|visibility|display|clip|clipPath|filter)$/;
        const finite = (a) =>
          a.playState === 'running' &&
          a.effect?.getComputedTiming().iterations !== Infinity &&
          a.effect.getKeyframes().some((k) => Object.keys(k).some((p) => VIS.test(p)));
        const animating = document.getAnimations().some(finite);
        const faded = [...document.querySelectorAll('[id]')]
          .filter((el) => ['cover', 'countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'].includes(el.id))
          .some((el) => {
            let o = 1;
            for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
            return o > 0.05 && o < 0.99; // en cours de fondu (un 0 franc = pas encore revele, traite par checkIntegrity)
          });
        return !animating && !faded;
      },
      null,
      { timeout: limit, polling: 80 }
    )
    .catch(() => {});
  return Date.now() - t0;
}

/** Messages de probleme (vide = integre). Les sections ATTENDUES absentes comptent comme probleme. */
export function integrityProblems(rows) {
  return rows
    .filter((r) => r.verdict !== 'OK')
    .map((r) => `Section #${r.id} : ${r.verdict}${r.opacity != null ? ` (opacite ${r.opacity}${r.settleMs != null ? `, ${r.settleMs} ms sans stabilisation` : ''})` : ''}`);
}
