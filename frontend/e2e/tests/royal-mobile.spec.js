// Royal Editorial — compatibilité mobile (360, 390, 768 px) par ÉMULATION Chromium (écran tactile, viewport mobile).
// IMPORTANT : aucun appareil Android réel, aucun navigateur WhatsApp, aucun vrai clavier virtuel n'est utilisé ici.
// Le « clavier virtuel » est émulé en réduisant la hauteur du viewport visible ; les gestes tactiles passent par le
// protocole DevTools (Input.dispatchTouchEvent), pas par des doigts sur un écran.
import { test, expect } from '@playwright/test';
import { openScenario } from '../lib/checks.js';
import { checkIntegrity, integrityProblems } from '../lib/integrity.js';

const KEY = 'royal-editorial';
const WIDTH = (testInfo) => Number(testInfo.project.name.slice(1));

test.beforeEach(async ({}, testInfo) => {
  test.skip(WIDTH(testInfo) > 768, 'compatibilité mobile : largeurs <= 768 px uniquement');
});

async function touchSwipe(page, from, to, steps = 8) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test.describe('royal · mobile', () => {
  test('RSVP petit écran : champs >= 16 px (pas de zoom automatique), cibles tactiles >= 44 px, aucun débordement', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const report = await page.evaluate(() => {
      const bad = [];
      const form = document.querySelector('#rsvp form');
      form.querySelectorAll('input:not([type=radio]):not([type=file]), textarea, select').forEach((el) => {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 16) bad.push(`champ ${el.name || el.type || el.tagName} : police ${fs}px < 16px (zoom automatique iOS)`);
        const r = el.getBoundingClientRect();
        if (r.height < 44) bad.push(`champ ${el.name || el.tagName} : hauteur ${Math.round(r.height)}px < 44px`);
      });
      document.querySelectorAll('#rsvp button, #rsvp label:has(input[type=radio]), #contact a, #map a').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height < 44) bad.push(`${el.tagName.toLowerCase()} « ${(el.textContent || '').trim().slice(0, 24)} » : hauteur ${Math.round(r.height)}px < 44px`);
      });
      return { bad, overflow: document.documentElement.scrollWidth > window.innerWidth };
    });
    expect(report.bad, report.bad.join('\n')).toEqual([]);
    expect(report.overflow).toBe(false);
  });

  test('clavier virtuel (ÉMULÉ par réduction du viewport) : chaque champ et le bouton restent atteignables et non recouverts', async ({ page }, testInfo) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const width = WIDTH(testInfo);
    await page.locator('#rsvp form input').first().scrollIntoViewIfNeeded();
    await page.setViewportSize({ width, height: 320 }); // visible restant quand un clavier occupe environ la moitié de l'écran
    const results = await page.evaluate(async () => {
      const out = [];
      const targets = [...document.querySelectorAll('#rsvp form input:not([type=file]), #rsvp form textarea, #rsvp form button[type=submit]')];
      for (const el of targets) {
        el.scrollIntoView({ block: 'center' });
        await new Promise((r) => setTimeout(r, 50));
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const top = document.elementFromPoint(cx, cy);
        out.push({
          field: el.name || el.type || el.tagName,
          inView: r.top >= 0 && r.bottom <= window.innerHeight,
          covered: !(top === el || el.contains(top) || (top && top.closest('label') === el.closest('label') && el.closest('label'))),
          h: Math.round(r.height),
        });
      }
      return out;
    });
    const problems = results.filter((r) => !r.inView || r.covered).map((r) => `${r.field}: ${!r.inView ? 'hors de la zone visible' : ''} ${r.covered ? 'recouvert' : ''}`);
    expect(results.length).toBeGreaterThan(3);
    expect(problems, problems.join('\n')).toEqual([]);
    // Le champ reçoit bien le texte saisi avec la zone réduite
    const name = page.locator('#rsvp form input').first();
    await name.focus();
    await page.keyboard.type('Test clavier');
    await expect(name).toHaveValue('Test clavier');
  });

  test('lightbox tactile : ouverture par toucher, balayage gauche/droite, fermeture (bouton, fond), balayage sur le fond sans fermeture', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'gallery-many', blockGoogleFonts: true });
    const tile = page.locator('.re-gal__item').nth(2);
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    const dialog = page.getByRole('dialog', { name: 'Galerie photographique' });
    await expect(dialog.getByText('3 / 20')).toBeVisible();

    const box = await page.locator('.re-lb__stage').boundingBox();
    const y = box.y + box.height / 2;
    await touchSwipe(page, { x: box.x + box.width * 0.85, y }, { x: box.x + box.width * 0.15, y });
    await expect(dialog.getByText('4 / 20')).toBeVisible();
    await touchSwipe(page, { x: box.x + box.width * 0.15, y }, { x: box.x + box.width * 0.85, y });
    await expect(dialog.getByText('3 / 20')).toBeVisible();

    // Un balayage dont le doigt se lève sur le FOND (en dehors de la photo) ne doit pas fermer la lightbox
    const img = await page.locator('.re-lb__media').boundingBox();
    if (img.y > box.y + 20) {
      await touchSwipe(page, { x: box.x + 20, y: box.y + 8 }, { x: box.x + box.width - 20, y: box.y + 8 });
      await expect(dialog).toBeVisible();
    }

    // Fermeture : bouton
    await dialog.getByRole('button', { name: 'Fermer la galerie' }).tap();
    await expect(dialog).toBeHidden();
    await expect(tile).toBeFocused();

    // Fermeture : toucher le fond
    await tile.tap();
    await expect(dialog).toBeVisible();
    const stage = await page.locator('.re-lb__stage').boundingBox();
    const m = await page.locator('.re-lb__media').boundingBox();
    const bgPoint = m.y - stage.y > 24 ? { x: stage.x + stage.width / 2, y: stage.y + 6 } : { x: stage.x + 6, y: stage.y + stage.height / 2 };
    await page.touchscreen.tap(bgPoint.x, bgPoint.y);
    await expect(dialog).toBeHidden();
  });

  test('liens : WhatsApp, téléphone, Google Maps (attributs de sécurité, cibles) — sans ouvrir les services externes', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true });
    const links = await page.evaluate(() => {
      const pick = (sel) => {
        const a = document.querySelector(sel);
        if (!a) return null;
        const r = a.getBoundingClientRect();
        return { href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), h: Math.round(r.height), w: Math.round(r.width), name: a.textContent.trim() };
      };
      return { wa: pick('#contact a[href^="https://wa.me/"]'), tel: pick('#contact a[href^="tel:"]'), maps: pick('#map a[href*="google.com/maps"]') };
    });
    expect(links.wa.href).toBe('https://wa.me/22501020304');
    expect(links.tel.href).toBe('tel:+22501020304');
    expect(links.maps.href).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    for (const l of [links.wa, links.maps]) {
      expect(l.target).toBe('_blank');
      expect(l.rel).toContain('noopener');
      expect(l.name).toContain('nouvel onglet'); // annoncé aux lecteurs d'écran
    }
    for (const l of [links.wa, links.tel, links.maps]) {
      expect(l.h).toBeGreaterThanOrEqual(44);
      expect(l.w).toBeGreaterThanOrEqual(44);
    }
  });

  test('navigation par ancre : /#rsvp amène bien le formulaire à l\'écran malgré le chargement différé', async ({ page }) => {
    await page.goto('/?key=royal-editorial&scenario=full#rsvp');
    await page.waitForSelector('.re-rsvp');
    await page.waitForTimeout(1500);
    const pos = await page.evaluate(() => ({ top: document.getElementById('rsvp').getBoundingClientRect().top, vh: window.innerHeight }));
    expect(pos.top, `le bloc RSVP est à ${Math.round(pos.top)}px du haut de l'écran`).toBeGreaterThanOrEqual(-8);
    expect(pos.top).toBeLessThan(pos.vh * 0.7);
    const rows = await checkIntegrity(page, { timeoutMs: 1500 });
    expect(integrityProblems(rows)).toEqual([]);
  });

  test('sans photographie + noms très longs : les noms de la couverture ne débordent pas', async ({ page }) => {
    for (const scenario of ['no-cover', 'long-names']) {
      await openScenario(page, { key: KEY, scenario, blockGoogleFonts: true });
      const o = await page.evaluate(() => {
        const h1 = document.querySelector('#cover h1');
        return { sw: h1.scrollWidth, cw: h1.clientWidth, page: document.documentElement.scrollWidth, vw: window.innerWidth };
      });
      expect(o.sw, `${scenario}: noms plus larges que leur zone`).toBeLessThanOrEqual(o.cw + 1);
      expect(o.page).toBeLessThanOrEqual(o.vw);
    }
  });
});

test.describe('royal · mobile · mouvements réduits', () => {
  test.use({ reducedMotion: 'reduce' });
  test('lightbox et sections sans transition, contenu visible d\'emblée', async ({ page }) => {
    await page.goto('/?key=royal-editorial&scenario=gallery-many');
    await page.waitForSelector('.re-gal__item');
    const tile = page.locator('.re-gal__item').nth(1);
    await tile.scrollIntoViewIfNeeded();
    await tile.tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    const state = await page.evaluate(() => ({
      armed: document.querySelectorAll('.re-reveal.is-armed').length,
      anim: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length,
    }));
    expect(state.armed).toBe(0);
    expect(state.anim).toBe(0);
  });
});
