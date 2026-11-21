// Campagne visuelle : template × scénario × largeur (la largeur vient du projet Playwright, w360…w1920).
// Pour chaque combinaison : page complète chargée, mesures, capture dans e2e/.output/screenshots/.
// Ces tests ÉCHOUENT sur : défilement horizontal, image locale cassée, police non chargée, erreur console.
// Ils NE jugent PAS la qualité graphique : les captures doivent être relues par une personne.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { SCENARIOS } from '../harness/scenarios.js';
import { selectedTemplates, selectedScenarios } from '../templates.js';
import { openScenario, collectMetrics, summarize } from '../lib/checks.js';
import { checkIntegrity, integrityProblems } from '../lib/integrity.js';

const OUT = path.resolve('e2e/.output/screenshots');

for (const { key } of selectedTemplates()) {
  for (const scenario of selectedScenarios(SCENARIOS)) {
    test(`${key} · ${scenario}`, async ({ page }, testInfo) => {
      const width = testInfo.project.name; // ex. "w390"
      const watch = await openScenario(page, { key, scenario });
      const metrics = await collectMetrics(page);

      const dir = path.join(OUT, key, scenario);
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${width}.png`), fullPage: true });

      // Integrite : chaque section presente doit se stabiliser a l'ecran (voir lib/integrity.js). Mesures jointes au rapport.
      const integrity = await checkIntegrity(page);
      const problems = [...summarize(metrics, watch), ...integrityProblems(integrity)];
      await testInfo.attach('metrics.json', { body: JSON.stringify({ metrics, watch, integrity }, null, 2), contentType: 'application/json' });
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
}
