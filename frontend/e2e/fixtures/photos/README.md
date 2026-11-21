# Remplacer les images de test par des photographies autorisées

Les captures et les tests utilisent par défaut des images abstraites (`../img/*.svg`). Pour valider un template avec de
**vraies photographies** (dont vous détenez les droits d'utilisation) :

1. Copiez les fichiers dans ce dossier (`e2e/fixtures/photos/`). Formats : `.jpg`, `.jpeg`, `.png`, `.webp`.
   - `cover.jpg` (ou tout fichier dont le nom commence par `cover`) = photographie de couverture.
   - Les autres fichiers (ordre alphabétique) = galerie. Mélangez portraits, paysages, panoramas et carrés.
   - Conseil : 1600 px de large maximum, comme l'application (elle redimensionne à 1600 px pour la couverture, 1200 px pour la galerie).
2. Ce dossier est ignoré par git (voir `.gitignore` ici) : rien n'est publié par erreur.
3. Lancez les tests ou les captures avec la variable `E2E_REAL_PHOTOS=1` :
   ```
   $env:E2E_REAL_PHOTOS = '1'; npx playwright test royal-editorial -g "royal · full" --project=w390 --project=w1280
   ```
   Les photos remplacent les SVG ; leurs dimensions réelles sont mesurées et fournies au template comme le fait l'API.
   Ajoutez `&nodims=1` à l'URL du harness (ou `E2E_PHOTOS_NODIMS=1`) pour simuler des photos sans dimensions.
4. Les captures sont écrites dans `e2e/.output/royal/<scénario>/` comme d'habitude : renommez le dossier avant de relancer
   si vous voulez conserver les captures « abstraites ».
5. Supprimez les photos de ce dossier quand la validation est terminée.

Aucune photo n'est téléchargée ni fournie par l'outillage.
