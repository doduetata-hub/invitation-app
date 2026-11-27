# Les Lanternes — images à générer avec ChatGPT

*Une nuit au bord de la lagune. L'invité maintient son doigt sur la lanterne pour l'allumer, glisse vers le haut pour la lâcher ; des
dizaines d'autres s'élèvent, les noms apparaissent, puis il touche « Rejoindre la fête ».*

Dossier de dépôt : `frontend/src/public/templates/lanternes/assets/source/`
Format : gardez les **fichiers d'origine** de ChatGPT, avec les noms ci-dessous. Je m'occupe du détourage, des tailles et de la compression.

## Mode d'emploi

1. Ouvrez **une nouvelle conversation ChatGPT** réservée aux Lanternes.
2. Collez le **message de départ**.
3. Demandez l'image 1 et **envoyez-la-moi avant de continuer** : toutes les autres en dépendent.
4. Une fois l'image 1 validée, demandez les suivantes une par une, dans la même conversation.

## Message de départ

```text
I am creating the visual assets for a luxury digital wedding invitation called "Les Lanternes": a warm tropical night by a calm lagoon, with glowing paper sky lanterns. I will ask for the images one at a time. Rules for EVERY image:
- Photorealistic, cinematic, elegant and serene. Fine editorial wedding photography.
- Palette: deep lagoon teal #0A2630, lantern amber #F2A33A, flame yellow #FFD58A, copper #C96F4A, rice paper ivory #F7EFE0.
- Absolutely NO text, letters, numbers, signs, logos or watermarks.
- NO people, no hands, no animals.
- No fantasy glitter, no oversaturation, no cartoon or 3D render look.
- One single image per request, in the exact orientation I ask for.
Reply "ready" and wait for my first request.
```

## 1. `lagune-fond.png` — le décor principal (vertical 2:3, 1024 × 1536)

```text
Vertical 2:3 image, 1024x1536. A calm tropical lagoon just after sunset, seen straight ahead at eye level from a short wooden pontoon. Deep teal sky with a soft warm band on the horizon and a few small stars. The horizon sits at 58% from the top. Silhouettes of coconut palms and mangroves frame only the far left and far right edges. Still water with gentle reflections. The wooden pontoon enters from the bottom center and occupies only the lowest 22%. IMPORTANT: NO lanterns and no lamps anywhere. The central area, from 15% to 52% of the height, must be empty, smooth and dark enough for ivory text. No boat, no building, no people, no text.
```

À vérifier : aucune lanterne, centre du ciel vide et sombre, horizon un peu sous le milieu.

## 2. `lagune-large.png` — le même décor en paysage (3:2, 1536 × 1024)

```text
Same lagoon, same light and style as the previous image, now a wide 3:2 landscape version, 1536x1024. Horizon at 62% from the top, palms and mangroves only on the far left and right, the pontoon centered at the bottom. Calm empty sky in the middle. NO lanterns, no text, no people.
```

## 3. `lanterne-eteinte.png` — la lanterne avant allumage (vertical, fond transparent)

```text
Vertical 2:3 image, 1024x1536, TRANSPARENT background (PNG with alpha). One single traditional paper sky lantern, seen perfectly straight on, centered: slightly rounded cylinder, wider at the top, open at the bottom with a thin wire ring and a small unlit wick holder. UNLIT: matte ivory rice paper with visible fibres and soft creases, softly lit by cool evening light, no glow. The lantern fills about 60% of the image height, centered. Crisp edges, no shadow, no strings, no text.
```

## 4. `lanterne-allumee.png` — la même lanterne allumée

```text
EXACTLY the same lantern as the previous image: same shape, same size, same position in the frame, same creases. Now LIT from inside: a small flame at the bottom ring, the rice paper glowing warm amber #F2A33A with a brighter yellow #FFD58A base, translucent fibres visible. Perfectly flat pure black #000000 background, with only a very soft natural halo close to the lantern. No text.
```

Le fond noir de l'image 4 est voulu : la lueur s'y fond naturellement à l'intégration.

Si ChatGPT ne rend pas un vrai fond transparent (images 3, 8 et 10), demandez :
`Replace the background with a perfectly flat, uniform pure blue #0000FF. No blue anywhere in the subject, no gradient, no shadow.`

## 5. `envol.png` — l'envol des lanternes (vertical, fond noir)

```text
Vertical 2:3 image, 1024x1536, perfectly flat pure black #000000 background. About 40 lit paper sky lanterns floating upward at different distances: a few large ones near the edges and lower area, many medium and tiny distant ones higher up. Warm amber glow, natural perspective, none overlapping heavily. The central area between 20% and 50% of the height has only a few tiny distant lanterns. No sky color, no stars, no landscape, no text.
```

## 6. `lune.png` — la pleine lune (carré, fond noir)

```text
Square image, 1024x1024. A realistic full moon with a warm ivory tone, fine surface detail, perfectly centered and filling about 70% of the frame, on a perfectly flat pure black #000000 background with only a very subtle soft halo. No clouds, no stars, no text.
```

## 7. `reflets-eau.png` — le fond des sections (vertical)

```text
Vertical 2:3 image, 1024x1536. Top-down close view of dark calm lagoon water at night, deep teal #0A2630, with sparse elongated golden reflections of warm lights, mostly near the left and right edges. The center is darker and very calm so ivory text stays readable. Even density, edge to edge, no horizon, no objects, no text.
```

## 8. `nenuphars.png` — la planche des étapes (vertical, fond transparent)

```text
Vertical 2:3 image, 1024x1536, transparent background. Exactly 6 separate floating elements arranged in a grid of 2 columns and 3 rows, widely spaced, none touching:
1) a white water lily flower on one lily pad,
2) a small floating candle in a banana-leaf bowl,
3) a pink water lily bud with two lily pads,
4) a round floating paper lantern, lit,
5) a frangipani flower cluster floating on a small leaf,
6) a single large lily pad with water droplets.
All seen from slightly above, same warm night light, crisp edges, no shadows, no text.
```

## 9. `papier-riz.png` — le papier des pages claires (vertical)

```text
Vertical 2:3 image, 1024x1536. Flat top-down scan of handmade rice paper, warm ivory #F7EFE0, with long visible fibres and a few tiny pressed petals only near the corners. The central 75% is plain and empty. A very soft warm light from below. No folds, no deckled border, no text.
```

## 10. `guirlande.png` — la guirlande de la galerie (paysage, fond transparent)

```text
Wide 3:2 image, 1536x1024, transparent background. One single string of small warm fairy lights on a thin natural twine, hanging in one gentle curve from the left edge to the right edge, in the upper third of the image, with 8 small glowing bulbs and 5 small wooden clothes pegs hanging from the twine. Nothing else: no photos, no paper, no text.
```

## Ce que je fais dès réception

1. Détourage, alignement des deux lanternes, tailles mobile et ordinateur, compression (objectif : moins de 900 Ko sur téléphone).
2. L'allumage au doigt, l'envol, les reflets, la lueur et les sons sont réalisés en code.
3. Tous les textes sont ajoutés par-dessus et modifiables dans l'administration ; les gestes sont obligatoires comme sur les autres modèles.
