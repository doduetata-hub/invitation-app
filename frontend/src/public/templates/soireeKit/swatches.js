// Couleurs reconnues dans le dress code : un pétale est dessiné pour chacune. Les expressions composées (« vert sauge », « rose
// poudré ») passent en premier pour ne donner qu'un seul pétale.
const SWATCHES = [
  ['vert sauge|sauge', '#a9b89c'], ['rose poudr[eé]|poudr[eé]|pivoine', '#e5b8ae'], ['bleu nuit|bleu marine|marine', '#0f1b3d'],
  ['vert [eé]meraude|[eé]meraude', '#1f5a44'], ['noir', '#151515'], ['blanc(?:he)?', '#fdfcf8'], ['ivoire|cr[eè]me', '#efe4cc'],
  ['dor[eé]|or', 'linear-gradient(135deg,#f3dfa6,#a8854a)'], ['argent[eé]?', 'linear-gradient(135deg,#f1f1f1,#9aa0a8)'], ['bordeaux', '#5b1424'],
  ['corail|saumon', '#e9765b'], ['rouge', '#a3182b'], ['bleu', '#4a79b0'], ['vert', '#1f5a44'], ['rose', '#e5a3b0'], ['beige', '#d8c3a0'], ['gris|anthracite', '#6b6f72'],
  ['violet|mauve|lilas|lavande', '#9b84b8'], ['nude', '#d9b9a2'], ['marron|chocolat|caf[eé]', '#5a3a28'], ['orange|terracotta|p[eê]che', '#d08358'],
  ['jaune|moutarde|champagne', '#dcc38a'],
];

/** Couleurs citées dans le texte du dress code, dans l'ordre : [{ at, bg }] (5 au plus). */
export function swatchesOf(text) {
  let rest = (text || '').toLowerCase();
  const found = [];
  SWATCHES.forEach(([words, bg]) => {
    const re = new RegExp(`(^|[^a-zà-ÿ])((?:${words})(?:e?s|e)?)(?=$|[^a-zà-ÿ])`);
    const hit = re.exec(rest);
    if (!hit) return;
    const at = hit.index + hit[1].length;
    found.push({ at, bg });
    rest = rest.slice(0, at) + ' '.repeat(hit[2].length) + rest.slice(at + hit[2].length);
  });
  return found.sort((a, b) => a.at - b.at).slice(0, 5);
}
