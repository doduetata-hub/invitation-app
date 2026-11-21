// Royal Editorial — campagne complète (5 largeurs × 9 scénarios) : rendu, intégrité des sections, accessibilité (axe,
// BLOQUANT), polices locales, images/alt, clavier, lightbox, RSVP simulé, reduced-motion, résilience de l'observateur.
// Google Fonts et Google Maps sont BLOQUÉS pour ce template : il ne doit dépendre d'aucun des deux.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { SCENARIOS, EXTRA_SCENARIOS } from '../harness/scenarios.js';
import { openScenario, collectMetrics, summarize, settle } from '../lib/checks.js';
import { checkIntegrity, integrityProblems } from '../lib/integrity.js';

const KEY = 'royal-editorial';
const ALL = [...SCENARIOS, ...EXTRA_SCENARIOS]; // 9 scénarios
const OUT = path.resolve('e2e/.output/royal');
const A11Y_OUT = path.resolve('e2e/.output/royal-a11y');

// Sections attendues dans le DOM selon le scénario (InvitationPage omet les sections vides).
const ALL_SECTIONS = ['cover', 'countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'];
const EXPECTED = {
  'gallery-empty': ALL_SECTIONS.filter((s) => s !== 'gallery'),
  minimal: ['cover', 'rsvp'],
};
const expectedFor = (scenario) => EXPECTED[scenario] || ALL_SECTIONS;

// Chauffe le serveur de développement (premiere compilation des modules du template) pour que les mesures
// ne dépendent pas du démarrage à froid de Vite.
test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:5299' });
  const page = await ctx.newPage();
  await page.goto('/?key=royal-editorial&scenario=gallery-many');
  await page.waitForSelector('.re-root', { timeout: 60_000 }).catch(() => {});
  await ctx.close();
});

for (const scenario of ALL) {
  test.describe(`royal · ${scenario}`, () => {
    test('rendu, intégrité, polices locales, images', async ({ page }, testInfo) => {
      const watch = await openScenario(page, { key: KEY, scenario, blockGoogleFonts: true });
      const metrics = await collectMetrics(page);
      const integrity = await checkIntegrity(page, { expected: expectedFor(scenario) });

      // Capture APRÈS stabilisation, pleine page.
      const dir = path.join(OUT, scenario);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${testInfo.project.name}.png`), fullPage: true });

      // Polices : Royal Serif doit être CHARGÉE (fichiers locaux), sans aucune requête vers Google nécessaire.
      const fontInfo = await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].filter((f) => f.family.replace(/"/g, '') === 'Royal Serif').map((f) => `${f.style}/${f.weight}:${f.status}`);
      });
      const usedRoyal = metrics.fonts.some((f) => f.family === 'Royal Serif');
      const loadedRoyal = fontInfo.some((s) => s.endsWith(':loaded'));

      // Images : toute image hors galerie a un alt non vide ; chaque vignette de galerie porte un libellé.
      const imgIssues = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll('img').forEach((i) => {
          const inTile = i.closest('.re-gal__item');
          if (!inTile && !(i.getAttribute('alt') || '').trim()) bad.push(`img sans alt : ${i.src.slice(-40)}`);
        });
        document.querySelectorAll('.re-gal__item').forEach((b) => {
          if (!(b.getAttribute('aria-label') || '').trim()) bad.push('vignette sans aria-label');
        });
        return bad;
      });

      const problems = [
        ...summarize(metrics, watch),
        ...integrityProblems(integrity),
        ...imgIssues,
        ...(usedRoyal && !loadedRoyal ? [`Police locale « Royal Serif » non chargée : ${fontInfo.join(', ') || 'aucune @font-face'}`] : []),
        ...(!usedRoyal ? ['Royal Serif non utilisée par le texte visible'] : []),
      ];

      await testInfo.attach('royal-metrics.json', {
        body: JSON.stringify({ scenario, width: testInfo.project.name, stabilizeMs: watch.stabilizeMs, blockedExternal: watch.blockedExternal.length, fontInfo, integrity, overflow: metrics.horizontalOverflow, height: metrics.height }, null, 2),
        contentType: 'application/json',
      });
      expect(problems, problems.join('\n')).toEqual([]);
    });

    test('accessibilité WCAG A/AA (axe) — bloquant', async ({ page }, testInfo) => {
      await openScenario(page, { key: KEY, scenario, blockGoogleFonts: true });
      await checkIntegrity(page, { expected: expectedFor(scenario) }); // contrastes mesurés sur un rendu stabilisé
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        sample: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), why: (n.any[0]?.message || n.failureSummary || '').slice(0, 160) })),
      }));
      fs.mkdirSync(A11Y_OUT, { recursive: true });
      fs.writeFileSync(path.join(A11Y_OUT, `${scenario}-${testInfo.project.name}.json`), JSON.stringify({ passes: results.passes.length, violations: summary }, null, 2));
      await testInfo.attach('axe.json', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
      expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
    });
  });
}

test.describe('royal · interactions', () => {
  test('RSVP simulé : envoi et confirmation', async ({ page }) => {
    const watch = await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const form = page.locator('#rsvp form');
    await form.scrollIntoViewIfNeeded();
    await form.getByLabel('Nom', { exact: false }).first().fill('Invité de test');
    await form.locator('button[type="submit"]').click();
    await expect(page.getByText('Votre réponse a bien été enregistrée.')).toBeVisible();
    expect(await page.evaluate(() => window.__lastRsvp?.form?.name)).toBe('Invité de test');
    expect(watch.pageErrors).toEqual([]);
  });

  test('clavier : parcours complet sans piège, focus toujours visible à l\'écran', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'gallery-many', blockGoogleFonts: true });
    const seen = new Set();
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { id: `${el.tagName}:${el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 20) || el.getAttribute('name') || ''}`, inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, outline: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' || cs.borderBottomStyle !== 'none' };
      });
      if (info) { seen.add(info.id); expect(info.inView, `focus hors écran : ${info.id}`).toBe(true); }
    }
    // 20 vignettes + champs RSVP + liens : bien plus de 25 éléments distincts atteignables.
    expect(seen.size).toBeGreaterThan(25);
  });

  test('lightbox : ouverture clavier, flèches, Échap, focus restitué', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'gallery-many', blockGoogleFonts: true });
    const first = page.locator('.re-gal__item').first();
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Galerie photographique' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('1 / 20')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByText('2 / 20')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
  });

  test('lightbox : balayage horizontal change de photographie', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'gallery-many', blockGoogleFonts: true });
    await page.locator('.re-gal__item').nth(2).scrollIntoViewIfNeeded();
    await page.locator('.re-gal__item').nth(2).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('3 / 20')).toBeVisible();
    const box = await page.locator('.re-lb__stage').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 8 });
    await page.mouse.up();
    await expect(dialog.getByText('4 / 20')).toBeVisible();
  });

  test('accessibilité (axe) avec la lightbox ouverte — bloquant', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'gallery-many', blockGoogleFonts: true });
    await page.locator('.re-gal__item').nth(1).scrollIntoViewIfNeeded();
    await page.locator('.re-gal__item').nth(1).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const summary = results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
    // Le bouton de fermeture et le compteur sont réellement lisibles (couleur != fond)
    const colors = await page.evaluate(() => {
      const c = getComputedStyle(document.querySelector('.re-lb__count'));
      const b = getComputedStyle(document.querySelector('.re-lb'));
      return { text: c.color, bg: b.backgroundColor };
    });
    expect(colors.text).not.toBe(colors.bg);
    expect(colors.text).toBe('rgb(244, 239, 230)');
  });

  test('résilience : sans IntersectionObserver, tout est visible', async ({ page }) => {
    await page.addInitScript(() => { delete window.IntersectionObserver; });
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const rows = await checkIntegrity(page, { timeoutMs: 1500 });
    expect(integrityProblems(rows)).toEqual([]);
  });

  test('résilience : observateur qui ne déclenche jamais, sans défilement', async ({ page }) => {
    await page.addInitScript(() => {
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
    });
    await page.goto('/?key=royal-editorial&scenario=full');
    await page.waitForSelector('#cover');
    await page.waitForTimeout(2200); // délai de garde de 1,5 s
    const hidden = await page.evaluate(() => document.querySelectorAll('.re-reveal.is-armed').length);
    expect(hidden, 'éléments encore masqués alors que l\'observateur est muet').toBe(0);
  });
});

test.describe('royal · reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('tout est visible immédiatement, sans transition', async ({ page }) => {
    await page.goto('/?key=royal-editorial&scenario=full');
    await page.waitForSelector('#cover');
    const state = await page.evaluate(() => ({
      armed: document.querySelectorAll('.re-reveal.is-armed').length,
      minOpacity: Math.min(...[...document.querySelectorAll('.re-reveal')].map((e) => parseFloat(getComputedStyle(e).opacity))),
      transitions: [...document.querySelectorAll('.re-reveal')].filter((e) => getComputedStyle(e).transitionDuration !== '0s').length,
    }));
    expect(state.armed).toBe(0);
    expect(state.minOpacity).toBe(1);
    expect(state.transitions).toBe(0);
    const rows = await checkIntegrity(page, { timeoutMs: 500 });
    expect(integrityProblems(rows)).toEqual([]);
    expect(rows.every((r) => r.settleMs < 400)).toBe(true);
  });
});

test.describe('royal · isolation', () => {
  test('un template existant ne charge ni le CSS, ni les polices, ni le chunk de Royal Editorial', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'w1280', 'vérifié une seule fois');
    const urls = [];
    page.on('request', (r) => urls.push(r.url()));
    await openScenario(page, { key: 'mariage-elegant', scenario: 'full' });
    const leaked = urls.filter((u) => /royalEditorial\/(sections|royal\.css|Cover|Gallery|Lightbox)|LibreBaskerville/.test(u));
    expect(leaked).toEqual([]);
  });
});


// ---------------------------------------------------------------------------------------------------------------
// A4.1 — placeholder du champ « mot » et cohérence d'architecture
// ---------------------------------------------------------------------------------------------------------------

// Mesure la hauteur qu'occupe le texte d'invite (placeholder) dans la largeur utile du champ, et la compare à la hauteur utile.
async function measurePlaceholder(page) {
  return page.evaluate(() => {
    const ta = document.querySelector('#rsvp textarea');
    const cs = getComputedStyle(ta);
    const ph = getComputedStyle(ta, '::placeholder');
    const probe = document.createElement('div');
    Object.assign(probe.style, {
      position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', textTransform: 'none',
      fontFamily: ph.fontFamily, fontSize: ph.fontSize, fontWeight: ph.fontWeight, lineHeight: ph.lineHeight, letterSpacing: ph.letterSpacing,
      width: `${ta.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)}px`,
    });
    probe.textContent = ta.placeholder;
    document.body.appendChild(probe);
    const need = probe.getBoundingClientRect().height;
    probe.remove();
    return { placeholderChars: ta.placeholder.length, need: Math.round(need), have: Math.round(ta.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)), width: ta.clientWidth };
  });
}

test.describe('royal · régression placeholder (nom de 80 caractères)', () => {
  test("le texte d'invite du champ « mot » n'est jamais rogné", async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'long-names', blockGoogleFonts: true });
    await page.locator('#rsvp textarea').scrollIntoViewIfNeeded();
    const m = await measurePlaceholder(page);
    expect(m.placeholderChars, "le scénario doit porter un nom d'au moins 80 caractères").toBeGreaterThanOrEqual(80 + 30);
    expect(m.need, `texte ${m.need}px > zone ${m.have}px (largeur ${m.width}px)`).toBeLessThanOrEqual(m.have);
  });

  test("contrôle négatif : l'ancien style (zone de 112 px, police 1,1 rem) AURAIT rogné le texte en petit écran", async ({ page }, testInfo) => {
    test.skip(Number(testInfo.project.name.slice(1)) > 390, 'sur grand écran 2 lignes suffisent déjà, seul le petit écran est concerné');
    await openScenario(page, { key: KEY, scenario: 'long-names', blockGoogleFonts: true });
    await page.addStyleTag({ content: '.re-rsvp__form textarea { min-height: 112px !important; } .re-rsvp__form textarea::placeholder { font-size: 1.1rem !important; line-height: normal !important; }' });
    await page.locator('#rsvp textarea').scrollIntoViewIfNeeded();
    const m = await measurePlaceholder(page);
    expect(m.need, `le contrôle doit détecter le défaut (besoin ${m.need}px, zone ${m.have}px)`).toBeGreaterThan(m.have);
  });
});

test.describe('royal · architecture', () => {
  test('sections déclarées = sections rendues ; présentation du couple dans la couverture ; un seul formulaire RSVP ; clés identiques', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'w1280', 'vérification structurelle, une seule fois');
    const root = path.resolve('..');
    const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
    const index = read('frontend/src/public/templates/royalEditorial/index.jsx');
    const registry = read('frontend/src/public/templates/registry.js');
    const seed = read('backend/prisma/seed.js');

    // 1. Clés : frontend (index.jsx, registre) = backend (seed)
    const frontKey = index.match(/key:\s*'([^']+)'/)[1];
    expect(frontKey).toBe('royal-editorial');
    expect(registry).toContain('[royalEditorial.key]: royalEditorial');
    expect(seed).toMatch(new RegExp(String.raw`key:\s*'` + frontKey + "'"));

    // 2. Sections déclarées par le template = ordre par défaut de l'application
    const declared = [...index.matchAll(/^\s{4}(\w+): wrapSection\(/gm)].map((m) => m[1]);
    const defaults = registry.match(/DEFAULT_SECTIONS_ORDER = \[([^\]]+)\]/)[1].split(',').map((x) => x.replace(/['\s]/g, ''));
    const keyOf = { cover: 'cover', countdown: 'countdown', program: 'program', gallery: 'gallery', map: 'map', rsvp: 'rsvp', contact: 'contact' };
    expect(declared.sort()).toEqual(Object.keys(keyOf).sort());
    expect([...defaults].sort()).toEqual(declared);
    expect(declared).toHaveLength(7);

    // 3. Rendu réel
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const dom = await page.evaluate(() => ({
      ids: [...document.querySelector('.re-root').children].map((c) => c.id),
      introInsideCover: Boolean(document.querySelector('#cover .re-intro')),
      introCount: document.querySelectorAll('.re-intro').length,
      forms: document.querySelectorAll('form').length,
      formsInRsvp: document.querySelectorAll('#rsvp form').length,
    }));
    expect(dom.ids).toEqual(['cover', 'countdown', 'program', 'gallery', 'map', 'rsvp', 'contact']);
    expect(dom.introInsideCover && dom.introCount === 1).toBe(true);
    expect(dom.forms).toBe(1);
    expect(dom.formsInRsvp).toBe(1);

    // 4. Aucune duplication du formulaire : aucun <form>, onSubmit ni appel d'API dans le template ; Rsvp.jsx réutilise RsvpSection
    const dir = path.join(root, 'frontend/src/public/templates/royalEditorial');
    const sources = fs.readdirSync(dir).filter((f) => /\.(jsx|js)$/.test(f)).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
    for (const [f, src] of sources) {
      expect(/<form[\s>]/.test(src), `${f} ne doit pas contenir de <form>`).toBe(false);
      expect(/onSubmit|api\.(post|upload)|fetch\(/.test(src.replace(/\/\/.*$/gm, '')), `${f} ne doit pas gérer d'envoi`).toBe(false);
    }
    expect(fs.readFileSync(path.join(dir, 'Rsvp.jsx'), 'utf8')).toContain("import RsvpSection from '../../sections/RsvpSection'");
  });
});
