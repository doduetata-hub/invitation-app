// Royal Editorial : bouton Retour (Android / geste retour / Alt+←) dans la lightbox. Émulation navigateur : page.goBack() est le même
// événement « popstate » que le bouton Retour d'Android, mais ce N'EST PAS un test sur téléphone réel.
import { test, expect } from '@playwright/test';
import { openScenario } from '../lib/checks.js';

const KEY = 'royal-editorial';
const dlg = (page) => page.getByRole('dialog', { name: 'Galerie photographique' });
const hasMark = (page) => page.evaluate(() => Boolean(history.state && history.state.reLightbox));

async function start(page) {
  await page.goto('about:blank'); // page précédente : sert à détecter un retour qui QUITTERAIT l'invitation
  await openScenario(page, { key: KEY, scenario: 'gallery-many', blockGoogleFonts: true });
  const tile = page.locator('.re-gal__item').nth(2);
  await tile.scrollIntoViewIfNeeded();
  return { tile, url: page.url() };
}
const open = async (tile, page) => { await tile.click(); await expect(dlg(page)).toBeVisible(); };

test.describe('lightbox : bouton Retour', () => {
  test('Retour ferme la lightbox, reste sur l\'invitation, focus restitué ; réouverture puis Retour de nouveau', async ({ page }) => {
    const { tile, url } = await start(page);
    for (let i = 0; i < 2; i++) {
      await open(tile, page);
      expect(await hasMark(page)).toBe(true);
      await page.goBack();
      await expect(dlg(page)).toBeHidden();
      expect(page.url()).toBe(url);
      await expect(tile).toBeFocused();
      await expect(page.locator('.re-gal')).toBeVisible();
    }
  });

  test('navigation précédent/suivant n\'ajoute aucune entrée ; Retour ferme depuis n\'importe quelle photo', async ({ page }) => {
    const { tile, url } = await start(page);
    await open(tile, page);
    const len = await page.evaluate(() => history.length);
    // Les boutons ne sont affichés que sur grand écran (balayage sur mobile) : le clavier couvre toutes les largeurs
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    const next = dlg(page).getByRole('button', { name: 'Photographie suivante' });
    if (await next.isVisible()) { await next.click(); await dlg(page).getByRole('button', { name: 'Photographie précédente' }).click(); }
    await expect(dlg(page).getByText('4 / 20')).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBe(len);
    await page.goBack();
    await expect(dlg(page)).toBeHidden();
    expect(page.url()).toBe(url);
  });

  for (const how of ['croix', 'Échap', 'fond']) {
    test(`fermeture par ${how} : aucune entrée parasite (un Retour ensuite QUITTE l'invitation), puis réouverture normale`, async ({ page }) => {
      const { tile, url } = await start(page);
      await open(tile, page);
      if (how === 'croix') await dlg(page).getByRole('button', { name: 'Fermer la galerie' }).click();
      else if (how === 'Échap') await page.keyboard.press('Escape');
      else {
        const s = await page.locator('.re-lb__stage').boundingBox();
        const m = await page.locator('.re-lb__media').boundingBox();
        const p = m.y - s.y > 24 ? { x: s.x + s.width / 2, y: s.y + 6 } : { x: s.x + 6, y: s.y + s.height / 2 };
        await page.mouse.click(p.x, p.y);
      }
      await expect(dlg(page)).toBeHidden();
      await expect(tile).toBeFocused();
      await expect.poll(() => hasMark(page)).toBe(false);
      expect(page.url()).toBe(url);
      // Réouverture, puis fermeture par Retour
      await open(tile, page);
      await page.goBack();
      await expect(dlg(page)).toBeHidden();
      expect(page.url()).toBe(url);
      // Plus aucune entrée de la lightbox : le Retour suivant quitte l'invitation
      await page.goBack();
      await expect.poll(() => page.url()).toBe('about:blank');
    });
  }
});
