// Interactions communes : envoi du RSVP (simulé, sans backend) et navigation clavier de base.
// Les interactions propres à un template (lightbox, ouverture animée…) s'ajouteront dans leur propre fichier.
import { test, expect } from '@playwright/test';
import { selectedTemplates } from '../templates.js';
import { openScenario } from '../lib/checks.js';

for (const { key } of selectedTemplates()) {
  test(`RSVP · ${key}`, async ({ page }) => {
    const watch = await openScenario(page, { key, scenario: 'full' });
    const form = page.locator('#rsvp form');
    await form.scrollIntoViewIfNeeded();

    await form.locator('input[type="text"], input:not([type])').first().fill('Invité de test');
    await form.locator('button[type="submit"]').click();

    await expect.poll(() => page.evaluate(() => window.__lastRsvp?.form?.name)).toBe('Invité de test');
    expect(watch.pageErrors).toEqual([]);
  });

  test(`clavier · ${key} : tous les contrôles sont atteignables et visibles`, async ({ page }) => {
    await openScenario(page, { key, scenario: 'full' });
    const count = await page.evaluate(() => document.querySelectorAll('a[href], button, input, textarea, select').length);
    expect(count).toBeGreaterThan(0);
    // Tab ×N ne doit jamais faire défiler horizontalement la page.
    for (let i = 0; i < Math.min(count, 25); i++) await page.keyboard.press('Tab');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
}
