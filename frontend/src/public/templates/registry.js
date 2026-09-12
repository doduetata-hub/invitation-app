import mariageElegant from './mariageElegant.jsx';
import mariageModerne from './mariageModerne.jsx';
import mariageRomantique from './mariageRomantique.jsx';
import mariageTraditionnel from './mariageTraditionnel.jsx';
import anniversaire from './anniversaire.jsx';
import bapteme from './bapteme.jsx';
import fiancailles from './fiancailles.jsx';
import professionnel from './professionnel.jsx';
import luxuryWeddingGold from './luxuryWeddingGold/index.jsx';
import generic from './generic.jsx';

const TEMPLATES = {
  [mariageElegant.key]: mariageElegant,
  [mariageModerne.key]: mariageModerne,
  [mariageRomantique.key]: mariageRomantique,
  [mariageTraditionnel.key]: mariageTraditionnel,
  [anniversaire.key]: anniversaire,
  [bapteme.key]: bapteme,
  [fiancailles.key]: fiancailles,
  [professionnel.key]: professionnel,
  [luxuryWeddingGold.key]: luxuryWeddingGold,
  [generic.key]: generic,
};

export const DEFAULT_SECTIONS_ORDER = ['cover', 'countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'];

export function getTemplate(key) {
  return TEMPLATES[key] || generic;
}

export function isDesigned(key) {
  return key in TEMPLATES && key !== 'generic';
}
