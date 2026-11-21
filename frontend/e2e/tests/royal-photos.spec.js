// Royal Editorial — validation avec les 19 PHOTOGRAPHIES RÉELLES (1 couverture + 18 galerie).
// Ces photographies ne sont pas versionnées (e2e/fixtures/photos/.gitignore) : la suite ne tourne que si E2E_REAL_PHOTOS=1.
//   $env:E2E_REAL_PHOTOS = '1'; npx playwright test royal-photos
// Deux modes de données :
//   real       : dimensions + vignettes 480 px fournies (cas cible : l'application les enregistre) ;
//   real-prod  : SANS dimensions ni vignettes = état ACTUEL de l'application pour les photos de galerie.
// Les originaux (e2e/fixtures/photos/*.jpeg) ne sont jamais lus par le navigateur : seules les variantes de web/ le sont.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openScenario, collectMetrics, summarize } from '../lib/checks.js';
import { checkIntegrity, integrityProblems } from '../lib/integrity.js';
import AxeBuilder from '@axe-core/playwright';

const KEY = 'royal-editorial';
const PHOTOS_DIR = path.resolve('e2e/fixtures/photos');
const WEB = path.join(PHOTOS_DIR, 'web');
const OUT = path.resolve('e2e/.output-a44/photos'); // A4.4 : nouveau dossier, les captures de la phase A4.2 (.output-a42) sont conservées
const ENABLED = process.env.E2E_REAL_PHOTOS === '1';
const MODES = ['real', 'real-prod'];
const NAMES = ['cover.jpg', ...Array.from({ length: 18 }, (_, i) => `gallery-${String(i + 1).padStart(2, '0')}.jpg`)];
const width = (ti) => Number(ti.project.name.slice(1));

test.describe('photos réelles', () => {
  test.skip(!ENABLED, 'E2E_REAL_PHOTOS=1 requis (photographies non versionnées)');

  test('les 19 photographies sont présentes (originaux + variantes)', async () => {
    const originals = fs.readdirSync(PHOTOS_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    const missingVariants = NAMES.filter((n) => !fs.existsSync(path.join(WEB, n)));
    expect(missingVariants, `variantes manquantes : ${missingVariants.join(', ')}`).toEqual([]);
    expect(originals.length, `originaux attendus : 19, trouvés : ${originals.length}`).toBe(19);
    expect(fs.existsSync(path.join(WEB, 'manifest.json'))).toBe(true);
  });

  for (const mode of MODES) {
    test(`rendu complet (${mode}) : 18 photographies de galerie, chargées, proportions respectées, aucun débordement`, async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        window.__cls = 0;
        try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
      });
      const watch = await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: mode });
      const w = width(testInfo);
      const metrics = await collectMetrics(page);
      const integrity = await checkIntegrity(page, { timeoutMs: 6000 }); // pages lourdes (18 photographies) : marge si la machine est chargée
      const cls = await page.evaluate(() => +window.__cls.toFixed(4));

      const dir = path.join(OUT, mode);
      fs.mkdirSync(dir, { recursive: true });
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: path.join(dir, `hero_w${w}.png`) });
      await page.screenshot({ path: path.join(dir, `full_w${w}.png`), fullPage: true });
      await page.locator('.re-gal').screenshot({ path: path.join(dir, `gallery_w${w}.png`) });

      const g = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('.re-gal__item')];
        const rows = [...document.querySelectorAll('.re-gal__row')].map((r) => [...r.querySelectorAll('.re-gal__item')].map((t) => t.getBoundingClientRect()));
        const imgs = tiles.map((t) => t.querySelector('img'));
        const problems = [];
        imgs.forEach((im, i) => {
          if (!im) { problems.push(`tuile ${i + 1} sans image`); return; }
          if (!(im.complete && im.naturalWidth > 0)) problems.push(`photo ${i + 1} non chargée`);
          const r = im.getBoundingClientRect();
          const natural = im.naturalWidth / im.naturalHeight;
          const shown = r.width / r.height;
          if (Math.abs(shown / natural - 1) > 0.02) problems.push(`photo ${i + 1} : proportion affichée ${shown.toFixed(3)} ≠ originale ${natural.toFixed(3)}`);
        });
        const tileWidths = tiles.map((t) => Math.round(t.getBoundingClientRect().width));
        const rowHeights = rows.map((r) => r.map((b) => Math.round(b.height)));
        const rowSizes = rows.map((r) => r.length);
        return { n: tiles.length, problems, minTile: Math.min(...tileWidths), maxTile: Math.max(...tileWidths), rowSizes, rowHeights, cover: document.querySelector('#cover img')?.getAttribute('alt') };
      });

      const minAllowed = w <= 480 ? 140 : w <= 1100 ? 220 : 300;
      const problems = [
        ...summarize(metrics, watch),
        ...integrityProblems(integrity),
        ...g.problems,
        ...(g.n !== 18 ? [`${g.n} tuiles au lieu de 18`] : []),
        ...(g.minTile < minAllowed ? [`photographie trop petite : ${g.minTile}px < ${minAllowed}px`] : []),
        ...(!g.cover ? ['couverture sans alt'] : []),
        // Rangées justifiées : toutes les photographies d'une rangée ont la même hauteur (à 4 px près)
        ...g.rowHeights.flatMap((hs, i) => (Math.max(...hs) - Math.min(...hs) > 4 ? [`rangée ${i + 1} : hauteurs inégales ${hs.join('/')}`] : [])),
        // Dernière rangée équilibrée sur mobile et bureau (la tablette peut finir sur une photographie « temps fort »)
        ...(w !== 768 && g.rowSizes[g.rowSizes.length - 1] < 2 ? [`dernière rangée déséquilibrée (${g.rowSizes.at(-1)} photo)`] : []),
        // Stabilité du chargement : avec dimensions fournies, quasi aucun décalage de mise en page
        ...(mode === 'real' && cls > 0.1 ? [`décalage cumulé de mise en page (CLS) ${cls} > 0,1`] : []),
        ...(mode === 'real-prod' && cls > 0.25 ? [`décalage cumulé de mise en page (CLS) ${cls} > 0,25`] : []),
      ];
      await testInfo.attach('photos-metrics.json', { body: JSON.stringify({ mode, width: w, cls, rowSizes: g.rowSizes, rowHeights: g.rowHeights, minTile: g.minTile, maxTile: g.maxTile, height: metrics.height, stabilizeMs: watch.stabilizeMs }, null, 2), contentType: 'application/json' });
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }

  test('lightbox : les 18 photographies, portrait entier visible, navigation précédente/suivante et boucle', async ({ page }, testInfo) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: 'real-prod' });
    const w = width(testInfo);
    const tiles = page.locator('.re-gal__item');
    await expect(tiles).toHaveCount(18);
    const first = tiles.first();
    await first.scrollIntoViewIfNeeded();
    await first.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Galerie photographique' });
    await expect(dialog).toBeVisible();

    const problems = [];
    fs.mkdirSync(path.join(OUT, 'lightbox'), { recursive: true });
    for (let i = 0; i < 18; i++) {
      await expect(dialog.getByText(`${i + 1} / 18`)).toBeVisible();
      await page.waitForFunction(() => { const im = document.querySelector('.re-lb__media'); return im && im.complete && im.naturalWidth > 0; }, null, { timeout: 15000 });
      const m = await page.evaluate(() => {
        const im = document.querySelector('.re-lb__media').getBoundingClientRect();
        const st = document.querySelector('.re-lb__stage').getBoundingClientRect();
        const el = document.querySelector('.re-lb__media');
        return { x: im.x, y: im.y, w: im.width, h: im.height, sx: st.x, sy: st.y, sw: st.width, sh: st.height, nat: el.naturalWidth / el.naturalHeight, vw: innerWidth, vh: innerHeight };
      });
      const inside = m.x >= m.sx - 1 && m.y >= m.sy - 1 && m.x + m.w <= m.sx + m.sw + 1 && m.y + m.h <= m.sy + m.sh + 1 && m.x >= 0 && m.y >= 0 && m.x + m.w <= m.vw + 1 && m.y + m.h <= m.vh + 1;
      if (!inside) problems.push(`photo ${i + 1} : image coupée ou hors cadre (${Math.round(m.w)}x${Math.round(m.h)} dans ${Math.round(m.sw)}x${Math.round(m.sh)})`);
      if (Math.abs(m.w / m.h / m.nat - 1) > 0.02) problems.push(`photo ${i + 1} : déformée (${(m.w / m.h).toFixed(3)} vs ${m.nat.toFixed(3)})`);
      if (m.w < Math.min(m.sw, m.sh * m.nat) * 0.9) problems.push(`photo ${i + 1} : trop petite dans la lightbox (${Math.round(m.w)}px)`);
      if (i === 0 || i === 8 || i === 17) await page.screenshot({ path: path.join(OUT, 'lightbox', `w${w}_photo${String(i + 1).padStart(2, '0')}.png`) });
      if (i < 17) await page.keyboard.press('ArrowRight');
    }
    // Dernière -> suivante : retour à la première ; première -> précédente : retour à la dernière
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByText('1 / 18')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(dialog.getByText('18 / 18')).toBeVisible();
    // Boutons précédent/suivant (affichés à partir de 700 px)
    if (w > 700) {
      await dialog.getByRole('button', { name: 'Photographie suivante' }).click();
      await expect(dialog.getByText('1 / 18')).toBeVisible();
      await dialog.getByRole('button', { name: 'Photographie précédente' }).click();
      await expect(dialog.getByText('18 / 18')).toBeVisible();
    }
    // Fermeture : Échap (focus restitué sur la photo d'origine), bouton, fond
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
    await tiles.nth(17).scrollIntoViewIfNeeded();
    await tiles.nth(17).click();
    await expect(dialog.getByText('18 / 18')).toBeVisible();
    await dialog.getByRole('button', { name: 'Fermer la galerie' }).click();
    await expect(dialog).toBeHidden();
    await tiles.nth(8).scrollIntoViewIfNeeded();
    await tiles.nth(8).click();
    await expect(dialog.getByText('9 / 18')).toBeVisible();
    const st = await page.locator('.re-lb__stage').boundingBox();
    await page.mouse.click(st.x + 4, st.y + st.height / 2); // fond (hors photographie)
    await expect(dialog).toBeHidden();
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('lightbox tactile : balayage sur 3 photographies, boucle première/dernière', async ({ page }, testInfo) => {
    test.skip(width(testInfo) > 768, 'balayage tactile : mobile et tablette');
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: 'real-prod' });
    const tiles = page.locator('.re-gal__item');
    await tiles.first().scrollIntoViewIfNeeded();
    await tiles.first().tap();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('1 / 18')).toBeVisible();
    const swipe = async (dx) => {
      const b = await page.locator('.re-lb__stage').boundingBox();
      const y = b.y + b.height / 2;
      const cdp = await page.context().newCDPSession(page);
      const x0 = b.x + b.width * (dx < 0 ? 0.85 : 0.15);
      const x1 = b.x + b.width * (dx < 0 ? 0.15 : 0.85);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
      for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
      await page.waitForTimeout(350);
    };
    await swipe(-1);
    await expect(dialog.getByText('2 / 18')).toBeVisible();
    await swipe(+1);
    await expect(dialog.getByText('1 / 18')).toBeVisible();
    await swipe(+1); // première -> boucle vers la dernière
    await expect(dialog.getByText('18 / 18')).toBeVisible();
    await swipe(-1); // dernière -> première
    await expect(dialog.getByText('1 / 18')).toBeVisible();
    await dialog.getByRole('button', { name: 'Fermer la galerie' }).tap();
    await expect(dialog).toBeHidden();
  });

  test('mouvements réduits : tout visible d\'emblée, lightbox sans animation', async ({ browser }, testInfo) => {
    const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:5299', viewport: testInfo.project.use.viewport, reducedMotion: 'reduce', hasTouch: testInfo.project.use.hasTouch, isMobile: testInfo.project.use.isMobile });
    const page = await ctx.newPage();
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: 'real' });
    const st = await page.evaluate(() => ({ armed: document.querySelectorAll('.re-reveal.is-armed').length, anim: document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).length }));
    expect(st.armed).toBe(0);
    expect(st.anim).toBe(0);
    await page.locator('.re-gal__item').nth(5).scrollIntoViewIfNeeded();
    await page.locator('.re-gal__item').nth(5).click();
    await expect(page.getByRole('dialog').getByText('6 / 18')).toBeVisible();
    await ctx.close();
  });

  test('accessibilité WCAG A/AA avec les 19 photographies (page, puis lightbox ouverte) — bloquant', async ({ page }) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: 'real' });
    await checkIntegrity(page, { timeoutMs: 6000 });
    const r1 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const s1 = r1.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    expect(s1, JSON.stringify(s1, null, 2)).toEqual([]);
    await page.locator('.re-gal__item').nth(3).scrollIntoViewIfNeeded();
    await page.locator('.re-gal__item').nth(3).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.waitForTimeout(400);
    const r2 = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const s2 = r2.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    expect(s2, JSON.stringify(s2, null, 2)).toEqual([]);
  });

  for (const mode of MODES) {
    test(`poids et chargement différé (${mode}) : les photographies hors écran ne sont pas téléchargées à l'ouverture`, async ({ page }, testInfo) => {
      const bytes = new Map(); // url -> octets
      page.on('response', async (r) => {
        const u = r.url();
        // En développement Vite sert aussi des modules JS « ...jpg?url&import » : seules les vraies images (content-type image/*) comptent.
        if (!/\/photos\/web\/.+\.jpg/.test(u) || !(r.headers()['content-type'] || '').startsWith('image/')) return;
        try { bytes.set(u.split('/web/')[1], (await r.body()).length); } catch { /* requête abandonnée */ }
      });
      await page.route(/fonts\.(googleapis|gstatic)\.com|maps\.google\.com/, (r) => r.abort());
      await page.goto(`/?key=${KEY}&scenario=full&photos=1${mode === 'real-prod' ? '&nodims=1&nothumbs=1' : ''}`);
      await page.waitForSelector('.re-gal__item');
      await page.waitForTimeout(2500); // ouverture : sans défilement
      const atOpen = new Map(bytes);
      const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
      const openBytes = sum(atOpen);
      const openCount = atOpen.size;
      // Défilement complet, comme un invité qui parcourt la page
      await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
      await page.waitForTimeout(2500);
      const total = sum(bytes);
      const info = { mode, width: width(testInfo), ouverture: { photos: openCount, Ko: Math.round(openBytes / 1024), fichiers: [...atOpen.keys()] }, apresDefilement: { photos: bytes.size, Ko: Math.round(total / 1024) } };
      await testInfo.attach('poids.json', { body: JSON.stringify(info, null, 2), contentType: 'application/json' });
      fs.mkdirSync(path.join(OUT, 'poids'), { recursive: true });
      fs.writeFileSync(path.join(OUT, 'poids', `${mode}_w${width(testInfo)}.json`), JSON.stringify(info, null, 2));
      // L'ouverture ne doit pas charger la galerie entière : moins de la moitié des octets, et pas plus de 9 des 19 photographies.
      expect(openCount, `${openCount} photographies chargées à l'ouverture`).toBeLessThanOrEqual(9);
      expect(openBytes, `${Math.round(openBytes / 1024)} Ko à l'ouverture sur ${Math.round(total / 1024)} Ko`).toBeLessThan(total * 0.6);
    });
  }

  test("variantes 800 px : srcset/sizes, variante choisie selon l'écran, poids réellement transféré (390/768/1280)", async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== 'w1280', 'mesure sur trois écrans dans un seul test');
    const SCREENS = [
      { label: 'mobile 390 (x2,75)', w: 390, h: 844, dpr: 2.75 },
      { label: 'tablette 768 (x2)', w: 768, h: 1024, dpr: 2 },
      { label: 'bureau 1280 (x1)', w: 1280, h: 900, dpr: 1 },
    ];
    const results = [];
    for (const sc of SCREENS) {
      for (const mode of ['real-prod', 'real']) {
        const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:5299', viewport: { width: sc.w, height: sc.h }, deviceScaleFactor: sc.dpr, hasTouch: sc.w < 800, isMobile: sc.w < 500 });
        const page = await ctx.newPage();
        const bytes = new Map();
        page.on('response', async (r) => {
          const u = r.url();
          if (!/\/photos\/web\/.+\.jpg/.test(u) || !(r.headers()['content-type'] || '').startsWith('image/')) return;
          try { bytes.set(u.split('/web/')[1], (await r.body()).length); } catch { /* abandonnée */ }
        });
        await page.route(/fonts\.(googleapis|gstatic)\.com|maps\.google\.com/, (r) => r.abort());
        await page.goto(`/?key=${KEY}&scenario=full&photos=1${mode === 'real-prod' ? '&nodims=1&nothumbs=1' : ''}`);
        await page.waitForSelector('.re-gal__item');
        await page.waitForTimeout(2000);
        const openBytes = [...bytes.values()].reduce((a, b) => a + b, 0);
        const openCount = bytes.size;
        await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
        await page.waitForTimeout(2500);
        const total = [...bytes.values()].reduce((a, b) => a + b, 0);
        const tiles = await page.evaluate(() => [...document.querySelectorAll('.re-gal__item img')].map((im) => ({
          srcset: im.getAttribute('srcset'),
          sizes: im.getAttribute('sizes'),
          current: (im.currentSrc || '').split('/web/')[1] || '',
          natural: im.naturalWidth,
          cssW: Math.round(im.getBoundingClientRect().width),
          ratioErr: Math.abs(im.getBoundingClientRect().width / im.getBoundingClientRect().height / (im.naturalWidth / im.naturalHeight) - 1),
        })));
        const usingThumb = tiles.filter((t) => t.current.startsWith('thumbs/')).length;
        // Qualité : la variante de 800 px ne doit JAMAIS être choisie quand la tuile exige plus de pixels (largeur CSS x densité de l'écran) ;
        // l'image principale (>= 1040 px) est la plus grande disponible. NB : naturalWidth est exprimé en pixels CSS pour une image à
        // descripteurs `w` ; on se fonde donc sur la variante choisie (thumbs/ = 800 px réels).
        const upscaled = tiles
          .filter((t) => t.current.startsWith('thumbs/') && t.cssW * sc.dpr > 800 * 1.05)
          .map((t) => `${t.current} (800 px réels) pour ${Math.round(t.cssW * sc.dpr)} px exigés`);
        const info = { ecran: sc.label, donnees: mode === 'real' ? 'avec variantes 800 px' : 'actuelles (sans variante)', ouverture: { photos: openCount, Ko: Math.round(openBytes / 1024) }, apresDefilement: { photos: bytes.size, Ko: Math.round(total / 1024) }, tuilesAvecVariante: usingThumb, tuiles: tiles.length, agrandies: upscaled, exemple: tiles[1] };
        results.push(info);
        // Contrôles
        expect(tiles.length).toBe(18);
        expect(tiles.every((t) => t.ratioErr < 0.02), 'proportions respectées').toBe(true);
        if (mode === 'real') {
          expect(tiles.every((t) => /800w/.test(t.srcset || '') && !!t.sizes), 'chaque tuile porte srcset (800w + principale) et sizes').toBe(true);
          expect(upscaled, `images agrandies : ${upscaled.join(', ')}`).toEqual([]);
        } else {
          expect(tiles.every((t) => !t.srcset), 'sans variante : simple src').toBe(true);
        }
        await ctx.close();
      }
    }
    fs.mkdirSync(path.join(OUT, 'poids'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'poids', 'variantes-800.json'), JSON.stringify(results, null, 2));
    await testInfo.attach('poids-variantes.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
    const get = (label, donnees) => results.find((r) => r.ecran.startsWith(label) && r.donnees.startsWith(donnees));
    for (const label of ['mobile', 'tablette', 'bureau']) {
      const before = get(label, 'actuelles').apresDefilement.Ko;
      const after = get(label, 'avec variantes').apresDefilement.Ko;
      expect(after, `${label} : ${after} Ko avec variantes vs ${before} Ko sans`).toBeLessThan(before * 0.8);
    }
  });

  test("couverture : la variante de 800 px n'est jamais utilisée (ni srcset, ni vignette demandée)", async ({ page }) => {
    const requested = [];
    page.on('request', (r) => { if (/\/photos\/web\//.test(r.url())) requested.push(r.url().split('/web/')[1]); });
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: 'real' });
    const c = await page.evaluate(() => {
      const im = document.querySelector('#cover .re-cover__photo img');
      return { srcset: im.getAttribute('srcset'), sizes: im.getAttribute('sizes'), current: (im.currentSrc || '').split('/web/')[1], width: im.getAttribute('width'), height: im.getAttribute('height') };
    });
    expect(c.srcset).toBeNull();
    expect(c.sizes).toBeNull();
    expect(c.current).toBe('cover.jpg');
    expect(requested.filter((u) => /cover/.test(u) && u.startsWith('thumbs/')), 'aucune vignette de couverture demandée').toEqual([]);
    expect(c.width && c.height, 'dimensions de la couverture transmises').toBeTruthy();
  });

  test('couverture : visage visible, aucune coupe à la tête (position du sujet dans le cadre)', async ({ page }, testInfo) => {
    await openScenario(page, { key: KEY, scenario: 'full', blockGoogleFonts: true, photos: 'real' });
    await page.evaluate(() => scrollTo(0, 0));
    const c = await page.evaluate(() => {
      const im = document.querySelector('#cover .re-cover__photo img');
      const box = im.getBoundingClientRect();
      const nat = im.naturalWidth / im.naturalHeight;
      // Partie de l'image réellement affichée avec object-fit: cover et object-position
      const cs = getComputedStyle(im);
      const [px, py] = cs.objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const scale = Math.max(box.width / im.naturalWidth, box.height / im.naturalHeight);
      const dispW = im.naturalWidth * scale;
      const dispH = im.naturalHeight * scale;
      const cropTop = (dispH - box.height) * py; // pixels d'image masqués en haut (écran)
      const cropBottom = (dispH - box.height) * (1 - py);
      const cropSides = dispW - box.width;
      return { nat, ratioBox: box.width / box.height, cropTopPct: +((cropTop / dispH) * 100).toFixed(1), cropBottomPct: +((cropBottom / dispH) * 100).toFixed(1), cropSidesPct: +((cropSides / dispW) * 100).toFixed(1), boxTop: Math.round(box.top), vh: innerHeight };
    });
    await testInfo.attach('couverture.json', { body: JSON.stringify(c, null, 2), contentType: 'application/json' });
    // Les têtes sont dans les premiers ~22 % de l'image : rien ne doit être coupé en haut (au plus 1 %), peu sur les côtés.
    expect(c.cropTopPct, `recadrage du haut ${c.cropTopPct}%`).toBeLessThanOrEqual(1);
    expect(c.cropSidesPct, `recadrage latéral ${c.cropSidesPct}%`).toBeLessThanOrEqual(8);
  });
});
