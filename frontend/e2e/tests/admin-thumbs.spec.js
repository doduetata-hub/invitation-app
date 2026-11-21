// Rendu RÉEL de MediaUploader (miniatures de l'administration) dans Chromium, sans backend ni base (harnais e2e/harness/admin.html).
// Nécessite les photographies de test non versionnées (e2e/fixtures/photos/web, voir scripts/make-photo-variants.cjs).
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const HAS = fs.existsSync(path.resolve('e2e/fixtures/photos/web/thumbs/gallery-01.jpg'));
test.skip(!HAS, 'photographies de test absentes');
test.beforeEach(({}, ti) => { test.skip(ti.project.name !== 'w1280', 'rendu identique à toute largeur : une seule'); });

const bg = (page) => page.locator('[style*="background-image"]').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage.replace(/^url\("?|"?\)$/g, '').replace(/^https?:\/\/[^/]+/, '')));

test('galerie : variante si thumbUrl, image principale sinon, vidéo en <video>, aucune requête de couverture', async ({ page }) => {
  const requested = [];
  page.on('request', (r) => { if (/\/photos\//.test(r.url())) requested.push(new URL(r.url()).pathname); });
  await page.goto('/admin.html?type=gallery');
  await expect(page.locator('video')).toHaveCount(1);
  await expect.poll(async () => (await bg(page)).length).toBe(3);
  expect(await bg(page)).toEqual(['/photos/web/thumbs/gallery-01.jpg', '/photos/web/thumbs/gallery-02.jpg', '/photos/web/gallery-03.jpg']);
  await page.waitForTimeout(800);
  expect(requested.filter((u) => /\/web\/gallery-0[12]\.jpg/.test(u)), 'les images principales avec variante ne sont pas chargées').toEqual([]);
  expect(requested.some((u) => /cover|gallery-04/.test(u))).toBe(false);
  // image réellement chargée (miniature non cassée) : la tuile a une taille et une image de fond décodable
  const ok = await page.evaluate(() => Promise.all(['/photos/web/thumbs/gallery-01.jpg', '/photos/web/gallery-03.jpg'].map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = u; }))));
  expect(ok).toEqual([true, true]);
  await page.screenshot({ path: path.resolve('e2e/.output-a46/admin-galerie.png') });
});

test('couverture : image principale, jamais la variante (même si thumbUrl est renseigné)', async ({ page }) => {
  await page.goto('/admin.html?type=cover');
  await expect.poll(async () => (await bg(page)).length).toBe(1);
  expect(await bg(page)).toEqual(['/photos/web/cover.jpg']);
  await page.screenshot({ path: path.resolve('e2e/.output-a46/admin-couverture.png') });
});
