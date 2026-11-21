# Contrôle visuel des templates (Playwright)

Outillage de validation des invitations : captures, mesures, accessibilité. **Il ne remplace pas la relecture
graphique humaine** : un template n'est « terminé » qu'après approbation des captures.

## Principe
- `harness/` : mini-application Vite (port 5299) qui monte le vrai `InvitationPage` sans connexion admin ni backend.
  Les données viennent de `harness/scenarios.js`, les images de `fixtures/img/` (SVG abstraits, aucune photo de personne).
- `tests/visual.spec.js` : template × scénario × largeur → capture pleine page + contrôles (débordement horizontal, images,
  polices, console).
- `tests/a11y.spec.js` : axe-core (WCAG 2 A/AA). Bloquant pour les nouveaux templates, informatif pour les `legacy`.
- `tests/interactions.spec.js` : envoi du RSVP simulé, parcours clavier.

## Lancer
```
npx playwright test                                   # tout (5 largeurs) — long
npx playwright test --project=w390                    # une largeur
E2E_TEMPLATES=mariage-elegant E2E_SCENARIOS=full,gallery-many npx playwright test visual --project=w390
E2E_SLOW=1 npx playwright test ...                    # réseau ~400 kbit/s, CPU x4 (Android d'entrée de gamme)
E2E_REDUCED_MOTION=1 npx playwright test ...          # prefers-reduced-motion
npx playwright show-report e2e/.output/report
```
Largeurs : 360, 390, 768, 1280, 1920 (projets `w360` … `w1920`). Sorties : `e2e/.output/` (captures dans
`screenshots/<template>/<scénario>/<largeur>.png`) — à ignorer par git.

## Chromium
Sous Windows, si la révision exacte de Playwright n'est pas dans `%LOCALAPPDATA%\ms-playwright`, la plus récente
`chromium-*` présente est réutilisée (surcharge : `PW_CHROMIUM_PATH`). Ailleurs : `npx playwright install chromium`.

## Ajouter un template
Ajouter sa clé dans `templates.js` (sans `legacy`). Aucun autre changement.

## Photographies autorisées
Procédure pour valider un template avec de vraies photos : voir `fixtures/photos/README.md` (variable `E2E_REAL_PHOTOS=1`).

## Intégrité des sections
`lib/integrity.js` : chaque section doit se stabiliser à l'écran (opacité effective >= 0.99, aucune animation finie en cours,
contenu interne non masqué). Délai maximal : `E2E_STABILIZE_MS` (3000 ms par défaut). Opacité et durée sont jointes au rapport.

## Limites connues
- Les polices des templates existants viennent de Google Fonts (réseau) ; les futurs templates auront les leurs en local.
- Le scénario « invité nominatif » (QR d'entrée) n'est pas couvert : il appelle l'API.
- Le livre d'or, la lightbox et l'ouverture animée n'existent pas encore : leurs tests viendront avec eux.
