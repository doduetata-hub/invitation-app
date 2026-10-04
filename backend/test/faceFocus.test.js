// Tests du service de cadrage sur le visage. Le test de détection charge le VRAI détecteur (modèle et
// WebAssembly versionnés dans src/assets/face) : il prouve que le chargement fonctionne dans cet
// environnement. Une photo de visage réelle n'est pas versionnée (données personnelles) : la détection
// d'un vrai visage a été vérifiée à part sur de vraies photos ; ici, on contrôle surtout les trois
// résultats possibles et le recadrage.
// Lancer avec : node --test test/faceFocus.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { detectFaceFocus, squareCropAroundFocus } = require('../src/services/faceFocus.service');

const flatImage = (width, height, background = '#a06030') => sharp({ create: { width, height, channels: 3, background } }).jpeg().toBuffer();

test('détection désactivée (FACE_FOCUS=off) -> false, sans rien charger', async () => {
  const previous = process.env.FACE_FOCUS;
  process.env.FACE_FOCUS = 'off';
  try {
    assert.equal(await detectFaceFocus(await flatImage(200, 200)), false);
  } finally {
    if (previous === undefined) delete process.env.FACE_FOCUS;
    else process.env.FACE_FOCUS = previous;
  }
});

test('détecteur réel : une image sans visage -> null (analysée, aucun visage), jamais une erreur', async () => {
  const previous = process.env.FACE_FOCUS;
  delete process.env.FACE_FOCUS;
  try {
    const result = await detectFaceFocus(await flatImage(400, 300), { timeoutMs: 30000 });
    assert.equal(result, null, 'false signifierait que le détecteur ne charge pas dans cet environnement');
  } finally {
    if (previous !== undefined) process.env.FACE_FOCUS = previous;
  }
});

test('délai dépassé -> false (jamais bloquant)', async () => {
  const previous = process.env.FACE_FOCUS;
  delete process.env.FACE_FOCUS;
  try {
    assert.equal(await detectFaceFocus(await flatImage(400, 300), { timeoutMs: 1 }), false);
  } finally {
    if (previous !== undefined) process.env.FACE_FOCUS = previous;
  }
});

test('recadrage carré : centré sur le point, calé dans l\'image, côté = plus petit côté', async () => {
  // 300 x 900 : haut rouge, milieu vert, bas bleu (300 px chacun)
  const stripes = await sharp({ create: { width: 300, height: 900, channels: 3, background: '#ff0000' } })
    .composite([
      { input: await sharp({ create: { width: 300, height: 300, channels: 3, background: '#00ff00' } }).png().toBuffer(), top: 300, left: 0 },
      { input: await sharp({ create: { width: 300, height: 300, channels: 3, background: '#0000ff' } }).png().toBuffer(), top: 600, left: 0 },
    ])
    .jpeg({ quality: 100 })
    .toBuffer();

  const dominant = async (buffer) => {
    const { data } = await sharp(buffer).resize(1, 1).raw().toBuffer({ resolveWithObject: true });
    return [...data].map((v) => Math.round(v / 85)); // 0, 1, 2, 3 par canal
  };

  const top = await squareCropAroundFocus(stripes, { focusX: 50, focusY: 5 }, { size: 100 });
  const middle = await squareCropAroundFocus(stripes, { focusX: 50, focusY: 50 }, { size: 100 });
  const bottom = await squareCropAroundFocus(stripes, { focusX: 50, focusY: 98 }, { size: 100 });
  for (const crop of [top, middle, bottom]) {
    const meta = await sharp(crop).metadata();
    assert.deepEqual([meta.width, meta.height], [100, 100]);
  }
  assert.deepEqual(await dominant(top), [3, 0, 0]);
  assert.deepEqual(await dominant(middle), [0, 3, 0]);
  assert.deepEqual(await dominant(bottom), [0, 0, 3]);
});
