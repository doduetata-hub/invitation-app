// Adresse de l'image du QR code d'entrée d'un invité. L'invité fictif d'une démonstration fournit sa propre image (guest.qrUrl) :
// il n'existe pas côté serveur.
export function guestQrUrl(slug, guest) {
  return guest.qrUrl || `/api/public/invitations/${slug}/qrcode?guest=${encodeURIComponent(guest.code)}`;
}
