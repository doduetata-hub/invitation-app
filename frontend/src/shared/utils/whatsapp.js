// Indicatif par défaut (RDC) appliqué uniquement à un numéro local sans indicatif (ex: "089...").
// wa.me exige le format international complet sans "0" ni "+" ; un numéro qui a déjà un
// indicatif (ex: "+33...") n'est jamais touché puisqu'il ne commence pas par "0" une fois nettoyé.
const DEFAULT_COUNTRY_CODE = '243';

export function buildWhatsappShareUrl(phone, message) {
  if (!phone) return null;

  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0')) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1);
  }

  const params = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${params}`;
}
