// Miniatures de l'administration : node --test e2e/unit/thumbSrc.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbSrc } from '../../src/admin/components/thumbSrc.js';

test('galerie avec variante -> thumbUrl', () => assert.equal(thumbSrc({ type: 'gallery', url: '/a.jpg', thumbUrl: '/a-w800.jpg' }, 'gallery'), '/a-w800.jpg'));
test('galerie sans variante (anciennes photos) -> image principale', () => {
  assert.equal(thumbSrc({ type: 'gallery', url: '/a.jpg', thumbUrl: null }, 'gallery'), '/a.jpg');
  assert.equal(thumbSrc({ type: 'gallery', url: '/a.jpg' }, 'gallery'), '/a.jpg');
});
test('couverture -> toujours l\'image principale, même si thumbUrl existait', () => {
  assert.equal(thumbSrc({ type: 'cover', url: '/c.jpg', thumbUrl: '/c-w800.jpg' }, 'cover'), '/c.jpg');
  assert.equal(thumbSrc({ type: 'cover', url: '/c.jpg', thumbUrl: '/c-w800.jpg' }, 'gallery'), '/c.jpg');
});
