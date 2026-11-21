// Fabrique les variantes de test à partir des photographies déposées dans e2e/fixtures/photos/ (originaux jamais modifiés) en utilisant
// le VRAI code de l'application : processImage (1600 px couverture, 1200 px galerie, JPEG 82) et makeGalleryVariant (800 px).
//   node e2e/scripts/make-photo-variants.cjs
// Sorties (ignorées par git) : fixtures/photos/web/cover.jpg, gallery-01.jpg … gallery-NN.jpg, manifest.json (dimensions),
// thumbs/gallery-NN.jpg (variantes de 800 px : ce que l'application enregistre dans Media.thumbUrl).
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', '..');
const { processImage, makeGalleryVariant } = require(path.join(root, 'backend', 'src', 'services', 'image.service.js'));
const dir = path.resolve(__dirname, '..', 'fixtures', 'photos');
const web = path.join(dir, 'web');

(async () => {
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g)$/i.test(f)).sort();
  if (files.length === 0) throw new Error(`aucune photographie dans ${dir}`);
  fs.mkdirSync(path.join(web, 'thumbs'), { recursive: true });
  const cover = files.find((f) => /^couverture|^cover/i.test(f));
  const manifest = {};
  let gi = 0;
  let mainBytes = 0;
  let thumbBytes = 0;
  for (const f of files) {
    const isCover = f === cover;
    const processed = await processImage(fs.readFileSync(path.join(dir, f)), { maxWidth: isCover ? 1600 : 1200, mimetype: 'image/jpeg' });
    const name = isCover ? 'cover.jpg' : `gallery-${String(++gi).padStart(2, '0')}.jpg`;
    fs.writeFileSync(path.join(web, name), processed.buffer);
    manifest[name] = { w: processed.width, h: processed.height };
    mainBytes += processed.buffer.length;
    if (!isCover) {
      const variant = await makeGalleryVariant(processed.buffer);
      if (variant) {
        fs.writeFileSync(path.join(web, 'thumbs', name), variant.buffer);
        thumbBytes += variant.buffer.length;
      }
    }
  }
  fs.writeFileSync(path.join(web, 'manifest.json'), JSON.stringify(manifest, null, 1));
  console.log(`${files.length} photographies -> ${Object.keys(manifest).length} variantes principales (${Math.round(mainBytes / 1024)} Ko) + ${gi} variantes 800 px (${Math.round(thumbBytes / 1024)} Ko)`);
})().catch((e) => { console.error(e); process.exit(1); });
