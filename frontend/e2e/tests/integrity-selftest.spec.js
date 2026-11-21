// Auto-test du détecteur d'intégrité (lib/integrity.js) : il doit SIGNALER des pannes injectées (dans le navigateur de test
// uniquement, via addStyleTag / Element.animate) et NE PAS signaler une page saine ni une simple transition de couleur de bouton.
import { test, expect } from '@playwright/test';
import { openScenario } from '../lib/checks.js';
import { checkIntegrity, verdictOf } from '../lib/integrity.js';

const KEY = 'royal-editorial';
const verdicts = (rows) => Object.fromEntries(rows.map((r) => [r.id, r.verdict]));

test.describe("détecteur d'intégrité · auto-test", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'w1280', 'auto-test du détecteur, une seule largeur');
  });

  test('page saine : toutes les sections OK', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const v = verdicts(await checkIntegrity(page, { timeoutMs: 1500 }));
    expect(Object.values(v).every((x) => x === 'OK'), JSON.stringify(v)).toBe(true);
    expect(Object.keys(v)).toHaveLength(7);
  });

  test('section à opacité 0 → OPACITE 0', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.addStyleTag({ content: '#gallery { opacity: 0 !important; }' });
    expect(verdicts(await checkIntegrity(page, { timeoutMs: 600 })).gallery).toBe('OPACITE 0');
  });

  test('contenu interne masqué dans une section visible → CONTENU INTERNE A OPACITE 0', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.addStyleTag({ content: '.re-rsvp__side { opacity: 0 !important; }' });
    expect(verdicts(await checkIntegrity(page, { timeoutMs: 600 })).rsvp).toBe('CONTENU INTERNE A OPACITE 0');
  });

  test("section déplacée hors de l'écran → HORS ZONE", async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.addStyleTag({ content: '#map { transform: translateX(-4000px) !important; }' });
    expect(verdicts(await checkIntegrity(page, { timeoutMs: 600 })).map).toBe('HORS ZONE');
  });

  test('section masquée (display:none) → MASQUEE ou HORS ZONE', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.addStyleTag({ content: '#program > * { display: none !important; }' });
    const rows = await checkIntegrity(page, { timeoutMs: 600 });
    expect(['HORS ZONE', 'MASQUEE (display:none)']).toContain(verdicts(rows).program);
  });

  test("animation d'opacité qui ne se termine pas (6 s) → EN ANIMATION", async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.evaluate(() => { document.getElementById('program').animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 6000, fill: 'both' }); });
    const v = verdicts(await checkIntegrity(page, { timeoutMs: 800 }));
    expect(v.program, JSON.stringify(v)).toBe('EN ANIMATION');
    expect(Object.entries(v).filter(([id, x]) => id !== 'program' && x !== 'OK')).toEqual([]);
  });

  test("animation INTERNE de transformation encore en cours → EN ANIMATION", async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.evaluate(() => { document.querySelector('#program .re-prog__item').animate([{ transform: 'translateY(30px)' }, { transform: 'none' }], { duration: 6000, fill: 'both' }); });
    const v = verdicts(await checkIntegrity(page, { timeoutMs: 800 }));
    expect(v.program, JSON.stringify(v)).toBe('EN ANIMATION');
  });

  test("transition de COULEUR des boutons (survol) en cours : n'est PAS un blocage de contenu", async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    await page.addStyleTag({ content: '.re-btn { transition: background-color 20s linear, color 20s linear !important; }' });
    const btn = page.locator('#contact .re-btn').first();
    await btn.scrollIntoViewIfNeeded();
    await btn.hover(); // déclenche une transition de couleur de 20 s
    const v = verdicts(await checkIntegrity(page, { timeoutMs: 800 }));
    expect(v.contact, JSON.stringify(v)).toBe('OK');
  });

  test('verdictOf : table de décision', () => {
    expect(verdictOf({ present: false })).toBe('ABSENTE');
    expect(verdictOf({ present: true, hiddenBy: 'display:none' })).toMatch(/^MASQUEE/);
    expect(verdictOf({ present: true, offDocument: true })).toBe('HORS ZONE');
    expect(verdictOf({ present: true, opacity: 0 })).toBe('OPACITE 0');
    expect(verdictOf({ present: true, opacity: 1, descHidden: 2 })).toBe('CONTENU INTERNE A OPACITE 0');
    expect(verdictOf({ present: true, opacity: 0.5 })).toBe('EN ANIMATION');
    expect(verdictOf({ present: true, opacity: 1, running: 1 })).toBe('EN ANIMATION');
    expect(verdictOf({ present: true, opacity: 1, running: 0, descHidden: 0 })).toBe('OK');
  });
});
