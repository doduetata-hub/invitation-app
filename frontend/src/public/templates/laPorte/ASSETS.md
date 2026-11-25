# La Porte — calques photographiques de la séquence d'ouverture

Dossier de dépôt : `frontend/src/public/templates/laPorte/assets/gate/`
Format : **webp**, qualité 80–85. Aucun texte, aucune lettre, aucun logo, aucun filigrane dans AUCUNE image (tout le texte est en HTML).

## Cadre commun à tous les calques (à respecter pour qu'ils s'empilent exactement)

- Format **vertical 2:3**, source 2048 × 3072 px (je produis les versions mobiles 800 × 1200 et 1200 × 1800).
- Prise de vue **de face, à hauteur d'yeux, perspective frontale** : la porte est centrée, ses lignes verticales sont parfaitement droites. Spectateur à l'intérieur du hall, la porte devant lui.
- **Même caméra, même focale (35 mm), même éclairage pour tous** : lumière chaude des deux appliques en laiton de part et d'autre de la porte, crépuscule bleu doré dehors.
- Le linteau (panneau sombre au-dessus de la porte) est **vide** : le monogramme et les noms sont ajoutés en HTML.
- Le tapis rouge est **vide** : la consigne « Touchez la poignée » est ajoutée en HTML.

À fournir à l'outil comme image de référence : vos deux images (porte fermée, porte ouverte). Demandez « garde exactement l'architecture, la lumière et le style, change uniquement ce qui est indiqué ».

## 1. `plate-open-empty.webp` — le décor avec la porte retirée
Prompt :
> Same hall and framing as the reference. The double wooden door is completely removed: an empty doorway in the natural stone frame, opening onto a manicured garden at dusk, soft blue-golden sky, trees, a lit gate lantern in the distance, a paved path. Nobody visible. Warm wall sconces on both sides, tall gold vases with white hydrangea and roses, polished marble floor, clean red carpet with thin gold border, no text anywhere, no monogram on the dark lintel panel. Photorealistic luxury wedding photography, 35mm, shallow depth of field on the garden.

## 2. `leaf-left.webp` et `leaf-right.webp` — les deux battants, fond transparent
Prompt (un par battant) :
> One single leaf of a dark walnut double door, photographed perfectly straight-on, flat even light, isolated on a plain white background (to be cut out). Raised mouldings with three panels, natural wood grain, brushed brass vertical pull handle, [left leaf: no knocker / right leaf: brass ring knocker]. Hinges visible on the outer edge. Photorealistic, no text, no reflections of surroundings.

Fournir avec **fond transparent** (détourage net, ombres retirées). Même largeur et même hauteur que dans le décor fermé de référence : si besoin, je les recale.

## 3. `visitor.webp` — le visiteur, fond transparent
Prompt :
> Elegant man standing, full body, three-quarter front view, dark tailored ceremony suit, white shirt, black bow tie, polished shoes, calm posture, holding an ivory envelope with a burgundy wax seal low in his right hand. Face softly in natural shadow, turned slightly down. Warm dusk rim light from behind. Isolated on plain white background (to be cut out). Photorealistic, no text.

Si vous préférez un visage non visible : demandez « face in deep natural shadow ».

## 4. L'enveloppe (trois petits calques)
- `envelope-paper.webp` : « Flat ivory cotton paper texture, subtle fibres, very slight warm shading at the edges, 7:5 landscape, no text. »
- `envelope-flap.webp` : « Envelope back flap, triangular, ivory paper, soft crease along the fold, isolated on white (to be cut out), no text. »
- `wax-seal.webp` : « Burgundy wax seal, round, slightly irregular edge, soft highlights, **no letters, no emblem**, isolated on white (to be cut out), top view. »

Le monogramme doré et le nom du destinataire sont ajoutés en HTML par-dessus.

## Ce que je fais dès réception
1. Je recale les calques sur un même repère, produis les tailles mobile / tablette / ordinateur et compresse (objectif 500–700 Ko au total).
2. Je branche le composant de scène (même machine d'états, mêmes interactions, mêmes sons).
3. Je règle les gonds, la perspective, les ombres et la lumière à l'ouverture, puis l'enveloppe.
4. Je mesure la fluidité sur mobile.
