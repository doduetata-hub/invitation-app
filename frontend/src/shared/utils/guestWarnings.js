// Message d'avertissement avant suppression d'un invité : plus explicite quand l'invité a
// déjà répondu ou été pointé à l'entrée, car supprimer le Guest supprime aussi son Rsvp en
// cascade (schema.prisma, onDelete: Cascade) — une perte de données, pas juste un lien mort.
export function buildGuestDeleteWarning(guest) {
  const name = guest?.rsvp?.name || guest?.name || 'Cet invité';

  if (guest?.checkedInAt) {
    return `${name} a déjà été enregistré(e) comme arrivé(e) le jour J. Supprimer son lien effacera aussi son passage et sa réponse RSVP. Cette action est irréversible. Continuer ?`;
  }
  if (guest?.rsvp) {
    return `${name} a déjà répondu à l'invitation. Supprimer son lien effacera aussi sa réponse RSVP. Cette action est irréversible. Continuer ?`;
  }
  return `Supprimer le lien personnalisé de ${name} ? Cette action est irréversible : le lien cessera immédiatement de fonctionner, même si l'invité l'a déjà reçu.`;
}
