// Catalogue des templates fournis par le CODE (frontend/src/public/templates/registry.js) qui doivent exister en base.
// Les nouveaux templates n'apparaissent dans l'administration que si leur ligne existe dans « invitation_templates » ; le seed les crée, mais il n'est
// plus lancé automatiquement au build. Cette garantie légère, AJOUT SEUL, comble ce vide : à la première liste de templates demandée par un
// administrateur authentifié, les lignes manquantes sont créées (INSERT … ON CONFLICT DO NOTHING via skipDuplicates).
//
// Propriétés voulues : jamais de modification ni de suppression d'une ligne existante (nom, catégorie, désactivation par l'administrateur conservés) ;
// idempotent ; un échec (droits, base) est journalisé et n'empêche jamais la liste de s'afficher ; une seule tentative réussie par instance.
const REQUIRED_TEMPLATES = [{ key: 'royal-editorial', name: 'Royal Editorial', category: 'mariage' }];

let done = false;

async function ensureCodeTemplates(prisma, templates = REQUIRED_TEMPLATES) {
  if (done) return { created: 0, skipped: true };
  try {
    const r = await prisma.invitationTemplate.createMany({ data: templates, skipDuplicates: true });
    done = true;
    return { created: r.count, skipped: false };
  } catch (err) {
    console.warn(`[templates] ajout des templates manquants non effectué : ${err && err.message}`);
    return { created: 0, skipped: false, error: true };
  }
}

function resetForTests() { done = false; }

module.exports = { ensureCodeTemplates, REQUIRED_TEMPLATES, resetForTests };
