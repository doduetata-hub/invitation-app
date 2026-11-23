// Textes personnalisés d'une invitation (theme.texts) : forme acceptée et nettoyage. Aucune base, aucun réseau.
// Lancer avec : node --test test/themeTexts.test.js
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTheme } = require(path.join(__dirname, '..', 'src', 'controllers', 'invitations.controller.js'));

test('theme.texts : conservé, nettoyé (espaces retirés, textes vides ignorés)', () => {
  const out = validateTheme({ texts: { introTitle1: '  Bienvenue ', introTitle2: '   ', closingText: 'Merci !' } });
  assert.deepEqual(out.texts, { introTitle1: 'Bienvenue', closingText: 'Merci !' });
});
test('theme sans texts : texts reste absent, le reste est inchangé', () => {
  const out = validateTheme({ disabledSections: ['gallery'] });
  assert.equal(out.texts, undefined);
  assert.deepEqual(out.disabledSections, ['gallery']);
});
test('theme.texts invalide : refusé', () => {
  for (const bad of [['a'], 'x', { 'clé invalide': 'x' }, { a: 12 }, { a: 'x'.repeat(601) }]) {
    assert.throws(() => validateTheme({ texts: bad }), (e) => e.status === 400, JSON.stringify(bad).slice(0, 40));
  }
  const many = Object.fromEntries(Array.from({ length: 81 }, (_, i) => [`k${i}`, 'x']));
  assert.throws(() => validateTheme({ texts: many }), (e) => e.status === 400);
});
