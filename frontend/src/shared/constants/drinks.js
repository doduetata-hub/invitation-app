// Boissons proposées dans le formulaire de réponse (RSVP). Enregistrées telles quelles dans la réponse de l'invité, ce qui permet de
// les trier et de les compter dans la liste d'invités de l'administration. « Autre » ouvre un champ libre : la valeur enregistrée est
// alors « Autre : <texte> » (les réponses « Autre » restent ainsi regroupées au tri, tout en gardant ce que l'invité a écrit).
export const DRINKS = ['Castel', 'Beaufort', 'Heineken', 'Nkoyi', 'Coca', 'Fanta', "Vital'o"];
export const OTHER_DRINK = 'Autre';

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Valeur enregistrée → { choice, other } pour remplir le formulaire. Une ancienne réponse en texte libre devient « Autre ». */
export function splitDrink(value) {
  const v = (value || '').trim();
  if (!v) return { choice: '', other: '' };
  const known = DRINKS.find((d) => norm(d) === norm(v));
  if (known) return { choice: known, other: '' };
  const m = v.match(/^autre\s*:\s*(.*)$/i);
  if (m) return { choice: OTHER_DRINK, other: m[1].trim() };
  if (norm(v) === 'autre') return { choice: OTHER_DRINK, other: '' };
  return { choice: OTHER_DRINK, other: v };
}

/** { choice, other } → valeur à enregistrer. */
export function joinDrink(choice, other) {
  if (!choice) return '';
  if (choice !== OTHER_DRINK) return choice;
  const t = (other || '').trim();
  return t ? `${OTHER_DRINK} : ${t}` : OTHER_DRINK;
}

/** Libellé de regroupement (tri, filtre, comptage) : toutes les réponses « Autre : … » comptent comme « Autre ». */
export function drinkGroup(value) {
  const v = (value || '').trim();
  if (!v) return '';
  const { choice } = splitDrink(v);
  return choice;
}
