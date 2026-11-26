# L'Embarquement — images à générer avec ChatGPT

*« Destination : notre mariage ». L'invité fait glisser le volet du hublot, le soleil se lève sur les nuages, sa carte d'embarquement se pose devant lui.*

Dossier de dépôt : `frontend/src/public/templates/embarquement/assets/source/`
Format : gardez les **PNG d'origine** de ChatGPT, avec les noms de fichiers ci-dessous. Je m'occupe du détourage, des tailles et de la compression.

## Mode d'emploi

1. Ouvrez **une nouvelle conversation ChatGPT** réservée à L'Embarquement.
2. Collez le **message de départ**.
3. Demandez l'image 1. **Envoyez-la-moi avant de continuer** : le cadrage du hublot commande toute la scène.
4. Une fois l'image 1 validée, demandez les suivantes une par une, dans la même conversation.

## Message de départ

```text
I am creating the visual assets for a luxury digital wedding invitation called "L'Embarquement": the golden age of air travel, a window seat at dawn above the clouds. I will ask for the images one at a time. Rules for EVERY image:
- Photorealistic, refined, cinematic, warm and elegant.
- Palette: midnight blue #101F3C, ticket ivory #F5EEDF, horizon blue #7FA3C7, dawn coral #E9765B, sun gold #E3AE55.
- Absolutely NO text, letters, numbers, signs, airline names, logos, flags or watermarks.
- NO people, no hands.
- One single image per request, in the exact orientation I ask for.
Reply "ready" and wait for my first request.
```

## 1. `cabine.png` — la paroi de la cabine et le hublot (vertical 2:3, 1024 × 1536)

```text
Vertical 2:3 image, 1024x1536. Interior wall of a luxury aircraft cabin seen perfectly straight on, flat frontal view, no perspective tilt. ONE large rounded-oval passenger window, exactly centered horizontally, its width about 60% of the image width and its height about 48% of the image height, with its center at 38% from the top. The window has a deep, elegant ivory surround with a thin brass trim. The whole visible window opening is filled with a perfectly flat, uniform pure green #00FF00 (no reflection, no gradient, no shade, no green light spilling on the frame). No green anywhere else. The wall around is in soft pre-dawn shadow, midnight blue and warm ivory, with a gentle warm reading light from above. At the very bottom, the top edge of a midnight-blue leather seat armrest. The lower 28% of the image stays calm and dark. No text, no signs, no buttons with symbols, no people.
```

À vérifier : hublot bien centré et de face, vert parfaitement uni, aucun pictogramme.

## 2. `volet.png` — le volet fermé (vertical 2:3)

```text
Vertical 2:3 image, 1024x1536. Close-up of a closed aircraft window shade seen perfectly straight on, filling the ENTIRE image edge to edge (no window frame, no wall visible). Matte warm ivory surface with very fine horizontal texture, soft shading toward the edges, a thin line of warm dawn light leaking along the very bottom edge, and one slim horizontal brass grip handle centered at 88% from the top. Same light and style as the cabin. No text.
```

## 3. `ciel-aube.png` — la vue par le hublot (vertical 2:3)

```text
Vertical 2:3 image, 1024x1536. View from an aircraft above a vast sea of soft clouds at sunrise. The horizon sits at 55% from the top, the sun just rising on it, slightly left of center, coral and gold light on the cloud tops, fading up into horizon blue and then deep midnight blue at the top. The tip of an aircraft wing, plain polished metal with no markings, enters from the lower right. Crystal clear, serene, photorealistic. No window frame, no text.
```

## 4. `ciel-large.png` — le panorama (3:2, 1536 × 1024)

```text
Same sunrise sky and sea of clouds, now a wide 3:2 landscape panorama, 1536x1024, WITHOUT any wing or aircraft. Horizon at 62% from the top, calm uncluttered upper half. No text.
```

## 5. `nuages.png` — les nuages en relief (3:2, fond noir)

```text
Wide 3:2 image, 1536x1024. Several separate soft white clouds of different sizes, widely spaced, photographed against a perfectly flat pure black #000000 background. Natural wispy edges fading smoothly into the black. No sky color, no horizon, no stars, no text.
```

Le fond noir est volontaire : il disparaît à l'intégration, sans détourage.

## 6. `papier-billet.png` — le papier du billet (vertical)

```text
Vertical 2:3 image, 1024x1536. Flat top-down scan of a premium vintage airline ticket paper, ivory #F5EEDF, fine cotton fibres, with an extremely faint guilloche security line pattern in pale coral and pale blue only near the edges. The center is almost plain. Even lighting, no shadows, no folds, no perforations, absolutely no text or numbers.
```

## 7. `cuir-passeport.png` — le fond des sections sombres (vertical)

```text
Vertical 2:3 image, 1024x1536. Flat top-down photograph of fine grained midnight-blue leather #101F3C, like a luxury passport cover, soft even light, very subtle grain, low contrast, edge to edge. No stitching, no emblem, no embossing, no text.
```

## 8. `tampons.png` — les tampons de voyage (carré, fond blanc)

```text
Square image, 1024x1024, perfectly flat pure white #FFFFFF background. Exactly 6 separate vintage passport ink stamps arranged in a grid of 3 columns and 2 rows, widely spaced, none touching: 1) an airplane inside a circle, 2) two interlaced wedding rings inside an oval, 3) a heart inside a square with rounded corners, 4) a rising sun inside a half circle, 5) a compass rose inside a circle, 6) a palm tree inside a hexagon. Real uneven ink texture, alternating dawn coral #E9765B and midnight blue #101F3C. Pictograms only: NO letters, NO numbers, NO dates anywhere.
```

## 9. `carte-itineraire.png` — le fond du programme (vertical)

```text
Vertical 2:3 image, 1024x1536. An antique engraved world map used as a very pale background: faint midnight-blue lines for coastlines and a delicate grid of meridians on ivory paper #F5EEDF, one small elegant compass rose near the bottom. Extremely light and low contrast so dark text stays readable on top. NO place names, NO letters, NO numbers, no route lines.
```

## État : images reçues et intégrées

Les originaux sont dans `assets/source/` (non utilisés par l'application). Le template utilise les versions optimisées de `assets/`
(environ 660 Ko au total) ; les polices sont dans `fonts/`. `volet.png` a été retourné pour placer la poignée en bas.

## Ce qui est fait à partir de ces images

1. Découpe du hublot, mise au même repère du volet et du ciel, tailles mobile / ordinateur, compression (objectif : moins de 900 Ko au total).
2. Le volet qui glisse au doigt, la lumière qui entre, le panneau à volets tournants et les sons sont réalisés en code.
3. Tous les textes (noms, date, siège, consignes) sont ajoutés par-dessus et modifiables dans l'administration.
