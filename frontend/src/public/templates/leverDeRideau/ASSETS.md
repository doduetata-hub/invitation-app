# Le Lever de rideau — images à générer avec ChatGPT

*Votre mariage en grande première. L'invité frappe les trois coups sur la scène, tire le cordon doré, le rideau se lève, le projecteur
révèle les noms, puis il touche « Prendre place ».*

Dossier de dépôt : `frontend/src/public/templates/leverDeRideau/assets/source/`
Format : gardez les **fichiers d'origine** de ChatGPT, avec les noms ci-dessous. Je m'occupe du détourage, des tailles et de la compression.

## Mode d'emploi

1. Ouvrez **une nouvelle conversation ChatGPT** réservée au Lever de rideau.
2. Collez le **message de départ**.
3. Demandez l'image 1 (le cadre de scène) et **envoyez-la-moi avant de continuer** : son ouverture commande les images 2 et 3.
4. Une fois l'image 1 validée, demandez les suivantes une par une, dans la même conversation.

## Message de départ

```text
I am creating the visual assets for a luxury digital wedding invitation called "Le Lever de rideau": opening night in a Belle Epoque theatre. I will ask for the images one at a time. Rules for EVERY image:
- Photorealistic, rich, elegant, warm theatrical lighting.
- Palette: crimson velvet #6B0F1F, deep fold red #43060F, antique gold #E2BE77, playbill cream #F6EBD6, stage black #12090A.
- Absolutely NO text, letters, numbers, signs, logos, crests with writing or watermarks.
- NO people, no hands, no audience.
- No cartoon or 3D render look.
- One single image per request, in the exact orientation I ask for.
Reply "ready" and wait for my first request.
```

## 1. `cadre-scene.png` — le cadre de scène (vertical 2:3, 1024 × 1536)

```text
Vertical 2:3 image, 1024x1536. A Belle Epoque theatre proscenium seen perfectly straight on, flat frontal view, perfectly symmetrical. A richly carved antique gold frame with a gently arched top surrounds ONE large stage opening. The opening is exactly centered, spans from 11% to 89% of the width and from 13% to 71% of the height, with straight sides, a flat bottom edge and a softly arched top. The whole opening is filled with a perfectly flat, uniform pure green #00FF00 (no gradient, no shadow, no green light spilling on the frame). No green anywhere else. Below the opening: the front edge of a wooden stage with a row of small warm footlights, then dark wood paneling. The lowest 20% stays calm and dark. No curtain, no text, no people.
```

À vérifier : de face et symétrique, vert parfaitement uni, rampe de lumières sous l'ouverture, aucune lettre dans les sculptures.

## 2. `rideau.png` — le rideau fermé (vertical 2:3)

```text
Vertical 2:3 image, 1024x1536. A closed heavy crimson velvet stage curtain seen perfectly straight on, filling the ENTIRE image edge to edge (no frame, no floor, no wall visible). Deep vertical folds, rich texture, a soft warm light from below catching the folds. A thick antique gold fringe and a band of gold embroidery along the very bottom edge. One central seam where the two halves meet. No text, no emblem.
```

## 3. `scene.png` — la scène derrière le rideau (vertical 2:3)

```text
Same camera, same framing and lighting as the first image. Vertical 2:3 image, 1024x1536, WITHOUT the golden frame: an empty theatre stage seen from the audience, perfectly frontal. A painted backdrop of a soft twilight sky with faint golden clouds, discreet crimson side drapes at the far left and right, and a polished wooden plank floor starting at 60% from the top. A single warm spotlight forms a round pool of light on the floor at the center. IMPORTANT: the central area from 20% to 55% of the height must be calm and darker so cream text stays readable. No furniture, no people, no text.
```

## 4. `cordon.png` — le cordon à tirer (vertical, fond transparent)

```text
Vertical 2:3 image, 1024x1536, TRANSPARENT background (PNG with alpha). One single thick twisted antique gold theatre rope hanging perfectly straight down from the top edge, ending in a large ornate silk tassel in gold with a crimson core. The rope is centered, the tassel ends at 85% of the height. Crisp edges, soft warm light, no shadow, no text.
```

Si ChatGPT ne rend pas un vrai fond transparent (images 4, 8 et 9), demandez :
`Replace the background with a perfectly flat, uniform pure blue #0000FF. No blue anywhere in the subject, no gradient, no shadow.`

## 5. `salle.png` — la salle de théâtre (3:2, 1536 × 1024)

```text
Wide 3:2 image, 1536x1024. The auditorium of an empty Belle Epoque theatre seen from the stage, frontal and symmetrical: rows of crimson velvet seats, three tiers of gilded balconies, a large crystal chandelier, warm dim lights. Calm and slightly darker in the middle. No people, no exit signs, no numbers on seats, no text.
```

## 6. `velours.png` — le fond des sections sombres (vertical)

```text
Vertical 2:3 image, 1024x1536. Flat close-up of deep crimson velvet #43060F hanging in very soft, wide, shallow folds, low contrast, evenly lit, edge to edge. Dark enough for cream text. No fringe, no seam, no emblem, no text.
```

## 7. `papier-programme.png` — le papier du programme (vertical)

```text
Vertical 2:3 image, 1024x1536. Flat top-down scan of a cream theatre playbill paper #F6EBD6 with fine texture, decorated only with delicate Art Nouveau gold line ornaments in the four corners and a very thin gold border line. The central 75% is completely empty. Even lighting, no folds, no text, no letters.
```

## 8. `cadre-dore.png` — le cadre du portrait (vertical, intérieur transparent)

```text
Vertical 2:3 image, 1024x1536. A single ornate antique gold picture frame, oval, seen perfectly straight on, with fine carved laurel details and a small ribbon ornament at the top. The INSIDE of the oval is completely empty and TRANSPARENT. Outside the frame is also transparent. The frame is centered and fills about 90% of the height. No text.
```

## 9. `ornements.png` — la planche d'ornements (vertical, fond transparent)

```text
Vertical 2:3 image, 1024x1536, transparent background. Exactly 6 separate antique gold theatre ornaments arranged in a grid of 2 columns and 3 rows, widely spaced, none touching:
1) the pair of comedy and tragedy theatre masks,
2) vintage opera glasses,
3) a lyre,
4) an open lace hand fan,
5) a bouquet of crimson roses tied with a gold ribbon,
6) a laurel wreath.
All with the same warm light, crisp edges, no shadows, no text.
```

## Ce que je fais dès réception

1. Découpe de l'ouverture du cadre, alignement du rideau et de la scène, tailles mobile et ordinateur, compression (objectif : moins de 900 Ko sur téléphone).
2. Les trois coups, le cordon, le lever du rideau, le projecteur, les ampoules du compte à rebours et les sons sont réalisés en code.
3. Tous les textes sont ajoutés par-dessus et modifiables dans l'administration ; les gestes sont obligatoires comme sur les autres modèles.
