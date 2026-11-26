// Message qui accompagne le lien personnalisé d'un invité (bouton WhatsApp et bouton « Copier » des listes d'invités).
const TWO_NAMES = /\s(&|et|\+)\s|&/i;

/**
 * @param {object} params
 * @param {string} [params.guestName] nom de l'invité
 * @param {string} [params.namesLine] noms des hôtes (« Awa & Koffi », ou un seul prénom)
 * @param {string} params.url lien personnalisé de l'invité
 */
export function buildInvitationMessage({ guestName, namesLine, url }) {
  const guest = (guestName || '').trim();
  const hosts = (namesLine || '').trim();
  // « Le couple » seulement quand deux noms sont indiqués : un anniversaire ou un baptême n'en a qu'un.
  const couple = TWO_NAMES.test(hosts);
  const invite = couple ? `Le couple ${hosts} vous invite !` : hosts ? `${hosts} vous invite !` : 'Vous êtes invité(e) !';
  const remember = couple ? "N'oubliez pas de laisser un message au couple." : "N'oubliez pas de laisser un petit message.";
  return [
    `Bonjour${guest ? ` ${guest}` : ''} !`,
    '',
    invite,
    'Veuillez recevoir votre invitation personnalisée en cliquant sur le lien suivant :',
    url,
    '',
    remember,
  ].join('\n');
}
