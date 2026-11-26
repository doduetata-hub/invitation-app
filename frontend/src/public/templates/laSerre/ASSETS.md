# La Serre — images à générer avec ChatGPT

*Une verrière fleurie au lever du soleil. L'invité essuie la buée avec son doigt, les fleurs s'écartent, les noms apparaissent.*

Dossier de dépôt : `frontend/src/public/templates/laSerre/assets/source/`
Format : gardez les **PNG d'origine** de ChatGPT, avec les noms de fichiers ci-dessous. Je m'occupe du détourage fin, des tailles et de la compression.

## Mode d'emploi

1. Ouvrez **une nouvelle conversation ChatGPT** réservée à La Serre (le style reste cohérent d'une image à l'autre).
2. Collez le **message de départ**.
3. Demandez l'image 1. **Envoyez-la-moi avant de continuer** : toutes les autres en dépendent.
4. Une fois l'image 1 validée, demandez les suivantes une par une, dans la même conversation.

## Message de départ

```text
I am creating the visual assets for a luxury digital wedding invitation called "La Serre": a Victorian glasshouse in bloom at sunrise. I will ask for the images one at a time. Rules for EVERY image:
- Photorealistic, high-end editorial wedding photography, soft golden morning light coming from the upper left.
- Palette: pearl ivory #F4F1E8, deep glasshouse green #1F3D31, sage #A9B89C, blush peony pink #E5B8AE, aged brass #A8854A.
- Absolutely NO text, letters, numbers, signs, labels, logos, watermarks or frames with writing.
- NO people, no hands, no animals.
- Natural, refined, airy. No fantasy glow, no oversaturation, no cartoon or 3D render look.
- One single image per request, in the exact orientation I ask for.
Reply "ready" and wait for my first request.
```

## 1. `serre-fond.png` — le décor principal (vertical 2:3, 1024 × 1536)

```text
Vertical 2:3 image, 1024x1536. Interior of an elegant Victorian glasshouse at sunrise, seen from the entrance, perfectly frontal and symmetrical, eye level, 35mm lens. Slender wrought-iron structure painted deep green with small aged-brass details, tall arched glass roof. A central pale stone path leads into the distance between lush planting: blush peonies, white ranunculus, hydrangeas, ferns, olive and citrus trees in terracotta pots. Soft golden light and light morning mist at the far end. IMPORTANT: the central area, from 25% to 55% of the height, must stay calm, bright and uncluttered (soft light only), because names will be placed there later. The lower 15% is a simple stone floor. No door, no furniture in the middle, no text.
```

À vérifier : lignes verticales droites, centre dégagé et lumineux, aucune pancarte ni étiquette de plante.

## 2. `serre-fond-large.png` — le même décor en paysage (3:2, 1536 × 1024)

```text
Same glasshouse, same light, same plants and style as the previous image, now in a wide 3:2 landscape version, 1536x1024. Keep it frontal and symmetrical, reveal more of the glasshouse on both sides. The central third stays calm and bright. No text, no people.
```

## 3. `fleurs-gauche.png` — premier plan gauche (vertical, fond transparent)

```text
Vertical 2:3 image, 1024x1536, TRANSPARENT background (PNG with alpha). A lush foreground floral arrangement entering from the LEFT edge and the bottom-left corner only: large blush peonies, white ranunculus, eucalyptus, fern fronds and a few trailing leaves, same morning light as the glasshouse. The flowers are dense along the left and bottom edges and reach at most 65% of the width; the rest of the image is completely transparent. Sharp, crisp edges on every petal and leaf. No vase, no ground, no shadow on the background, no text.
```

## 4. `fleurs-droite.png` — premier plan droit (vertical, fond transparent)

```text
Same style as the previous image, but entering from the RIGHT edge and bottom-right corner. Not a mirrored copy: a different natural composition with the same flowers, slightly more white flowers and one tall olive branch. 1024x1536, transparent background, reaching at most 65% of the width. No vase, no shadow, no text.
```

Si ChatGPT ne rend pas un vrai fond transparent (images 3, 4, 7, 8), demandez :
`Replace the background with a perfectly flat, uniform pure blue #0000FF. No blue anywhere in the subject, no gradient, no shadow.`

## 5. `buee.png` — les gouttes sur la vitre (carré, 1024 × 1024)

```text
Square image, 1024x1024. Macro photograph of fine condensation on a glass pane: many tiny water droplets of varied sizes, a few larger drops and two or three thin trails running down. Background is a perfectly flat, even, neutral mid-gray #808080: no scenery behind the glass, no gradient, no vignette, no color cast. Distribution is even from edge to edge so the texture can be repeated. No text.
```

## 6. `papier-herbier.png` — le papier des pages claires (vertical)

```text
Vertical 2:3 image, 1024x1536. Flat top-down scan of a fine ivory cotton paper (#F4F1E8) with subtle fibres. Very faint, delicate pressed flowers and tiny leaves only near the corners and outer edges, pale and almost transparent. The central 70% is completely empty plain paper. Even lighting, no shadows, no folds, no deckled border, no text.
```

## 7. `verriere-arche.png` — le cadre du portrait (vertical, intérieur transparent)

```text
Vertical 2:3 image, 1024x1536. A single arched glasshouse window frame seen perfectly straight on: slim wrought iron painted deep green #1F3D31 with a thin aged-brass inner line, rounded arch on top, straight sides, flat sill at the bottom. A few fine climbing leaves and two small blush roses on the lower left and upper right of the frame. The INSIDE of the frame is completely empty and TRANSPARENT, with no glass, no bars and no reflections. Outside the frame is also transparent. The frame is centered and fills about 90% of the height. No text.
```

## 8. `rameaux.png` — la planche botanique (vertical, fond transparent)

```text
Vertical 2:3 image, 1024x1536, transparent background. A botanical specimen set of exactly 6 separate elements arranged in a grid of 2 columns and 3 rows, widely spaced, none touching or overlapping:
1) a closed blush peony bud on a short stem,
2) a half-open blush peony on a short stem,
3) a fully open blush peony on a short stem,
4) a eucalyptus sprig,
5) a fern frond,
6) a small olive branch.
All photographed flat from above with the same soft light, crisp edges, no shadows, no text, no labels.
```

Ils servent au programme : la tige fleurit à chaque étape (bouton, éclosion, fleur ouverte).

## 9. `feuillage-sombre.png` — le fond des sections vert profond (vertical)

```text
Vertical 2:3 image, 1024x1536. A very dark, low-key wall of dense foliage: large deep-green leaves and ferns in shadow, tones around #1F3D31 and darker, soft side light catching only a few leaf edges. Even density, very low contrast, calm, so that ivory text stays readable on top. No flowers, no bright spots, no text.
```

## État : images reçues et intégrées

Les originaux sont dans `assets/source/`. Les versions optimisées utilisées par le template sont dans `assets/` (environ 860 Ko sur
téléphone) ; les polices sont dans `fonts/`.

## Ce qui est fait à partir de ces images

1. Détourage, mise au même repère, tailles mobile / ordinateur, compression (objectif : moins de 900 Ko au total).
2. La buée, son effacement au doigt, les gouttes qui coulent et les sons sont réalisés en code.
3. Tous les textes (noms, date, consignes) sont ajoutés par-dessus et modifiables dans l'administration.
