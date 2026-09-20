// Contrat partagé entre le parcours d'invitation numérique (RsvpSection/PublicInvitationPage)
// et le parcours QR papier (GuestbookQrPage) : reconnaître, sur le MÊME appareil, qu'un message
// du livre d'or existe déjà pour cette invitation — pour qu'un invité qui a déjà répondu via son
// lien personnalisé, puis scanne aussi le QR posé sur une table (ou l'inverse), retrouve son
// message existant au lieu d'en créer un second par mégarde. Centralisé ici plutôt que dupliqué
// dans les deux pages pour que la clé de stockage ne puisse jamais diverger entre elles.
function storageKey(invitationId) {
  return `gb_entry_${invitationId}`;
}

export function loadRememberedGuestbookEntry(invitationId) {
  try {
    const raw = localStorage.getItem(storageKey(invitationId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function rememberGuestbookEntry(invitationId, record) {
  try {
    localStorage.setItem(storageKey(invitationId), JSON.stringify(record));
  } catch {
    // Stockage indisponible (navigation privée, quota) : tant pis, juste sans reconnaissance à
    // la prochaine visite/au prochain scan.
  }
}

export function forgetRememberedGuestbookEntry(invitationId) {
  try {
    localStorage.removeItem(storageKey(invitationId));
  } catch {
    // rien de plus à faire si le stockage n'est pas accessible
  }
}
