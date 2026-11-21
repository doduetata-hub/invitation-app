// Contrôle visuel et d'accessibilité des templates d'invitation (voir e2e/README.md).
//
// - Le « harness » (e2e/harness) monte directement InvitationPage sans connexion admin ni backend,
//   avec des données et des images 100 % locales (e2e/fixtures) : aucun réseau externe requis pour
//   les images, aucun photo de personne réelle.
// - Une largeur = un projet Playwright (360, 390, 768, 1280, 1920).
// - Chromium : on réutilise une installation déjà présente dans le cache ms-playwright quand la
//   révision exacte attendue par cette version de Playwright n'y est pas (aucun téléchargement).
import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const WIDTHS = [360, 390, 768, 1280, 1920];
const HARNESS_PORT = 5299;

function findCachedChromium() {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH;
  // Hors Windows (CI, Docker), on laisse Playwright utiliser son propre navigateur téléchargé.
  if (process.platform !== 'win32') return undefined;

  const cacheRoot =
    process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  if (!fs.existsSync(cacheRoot)) return undefined;

  const candidates = fs
    .readdirSync(cacheRoot)
    .filter((d) => /^chromium-\d+$/.test(d))
    .map((d) => ({ dir: d, rev: Number(d.split('-')[1]) }))
    .sort((a, b) => b.rev - a.rev) // révision la plus récente d'abord
    .map(({ dir }) => path.join(cacheRoot, dir, 'chrome-win64', 'chrome.exe'))
    .filter((p) => fs.existsSync(p));
  return candidates[0];
}

const executablePath = findCachedChromium();

export default defineConfig({
  testDir: './e2e/tests',
  outputDir: './e2e/.output/results',
  snapshotPathTemplate: '{testDir}/../baseline/{arg}{ext}',
  // Un échec ne doit pas masquer les autres templates : on veut le rapport complet.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: './e2e/.output/report' }]],
  use: {
    baseURL: `http://localhost:${HARNESS_PORT}`,
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'fr-FR',
    // Date figée pour que le compte à rebours ne varie pas d'une capture à l'autre.
    timezoneId: 'Africa/Abidjan',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: WIDTHS.map((width) => ({
    name: `w${width}`,
    use: {
      viewport: { width, height: width <= 768 ? 844 : 900 },
      // Les largeurs <= 768 simulent un téléphone/tablette tactile (hasTouch), pas un autre moteur.
      hasTouch: width <= 768,
      isMobile: width <= 480,
    },
  })),
  webServer: {
    command: 'npx vite --config e2e/harness/vite.config.js',
    url: `http://localhost:${HARNESS_PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
