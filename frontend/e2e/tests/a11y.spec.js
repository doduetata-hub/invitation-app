// Accessibilité automatique (axe-core). Rapporte les violations dans le rapport Playwright et en JSON ;
// n'échoue que sur les violations « serious » et « critical ». axe ne remplace pas une relecture humaine.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { selectedTemplates } from '../templates.js';
import { openScenario } from '../lib/checks.js';

const OUT = path.resolve('e2e/.output/a11y');

for (const { key, legacy } of selectedTemplates()) {
  test(`axe · ${key}`, async ({ page }, testInfo) => {
    await openScenario(page, { key, scenario: 'full' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${key}-${testInfo.project.name}.json`), JSON.stringify(summary, null, 2));
    await testInfo.attach('axe.json', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });

    const blocking = summary.filter((v) => ['serious', 'critical'].includes(v.impact));
    // Templates déjà commercialisés : on ENREGISTRE leurs violations (état des lieux) sans bloquer, car on
    // ne les modifie pas. Tout nouveau template doit être sans violation serious/critical.
    if (legacy) {
      test.info().annotations.push({ type: 'a11y-legacy', description: `${blocking.length} violation(s) serious/critical (informatif)` });
      return;
    }
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
