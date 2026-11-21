// Templates contrôlés par la campagne visuelle. Ajouter ici la clé de chaque nouveau template
// (la même que dans registry.js et prisma/seed.js) pour qu'il entre dans la campagne.
//
// `legacy: true` = template déjà commercialisé : ses captures de référence ne doivent JAMAIS changer
// à cause du développement des nouveaux templates (test de non-régression).
export const TEMPLATES = [
  { key: 'mariage-elegant', legacy: true },
  { key: 'mariage-moderne', legacy: true },
  { key: 'mariage-romantique', legacy: true },
  { key: 'mariage-traditionnel', legacy: true },
  { key: 'anniversaire', legacy: true },
  { key: 'bapteme', legacy: true },
  { key: 'fiancailles', legacy: true },
  { key: 'professionnel', legacy: true },
  { key: 'luxury-wedding-gold', legacy: true },
];

// Restreindre la campagne : E2E_TEMPLATES=mariage-elegant,bapteme  E2E_SCENARIOS=full,gallery-many
const only = (name) => (process.env[name] ? new Set(process.env[name].split(',').map((s) => s.trim())) : null);

export function selectedTemplates() {
  const f = only('E2E_TEMPLATES');
  return TEMPLATES.filter((t) => !f || f.has(t.key));
}

export function selectedScenarios(all) {
  const f = only('E2E_SCENARIOS');
  return all.filter((s) => !f || f.has(s));
}
