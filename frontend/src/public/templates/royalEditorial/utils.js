// Utilitaires propres à Royal Editorial (aucune dépendance au reste de l'application).

const NAME_SEPARATORS = [' & ', ' et ', ' + ', '&'];

/** « Awa & Koffi » -> { first: 'Awa', second: 'Koffi' } ; sans séparateur -> { first: <tout>, second: null }. */
export function splitNames(namesLine) {
  const line = (namesLine || '').trim();
  if (!line) return { first: '', second: null };
  for (const sep of NAME_SEPARATORS) {
    const i = line.indexOf(sep);
    if (i > 0 && i < line.length - sep.length) {
      return { first: line.slice(0, i).trim(), second: line.slice(i + sep.length).trim() };
    }
  }
  return { first: line, second: null };
}

/** Taille typographique des noms selon le plus long mot-nom (évite tout débordement des noms très longs). */
export function nameScale({ first, second }) {
  const longest = Math.max(first.length, second ? second.length : 0);
  if (longest <= 7) return 'xl';
  if (longest <= 12) return 'l';
  if (longest <= 22) return 'm';
  return 's';
}

export function initials({ first, second }) {
  const f = first.trim().charAt(0).toUpperCase();
  const s = second ? second.trim().charAt(0).toUpperCase() : '';
  return { f, s };
}

/** Médias publics de l'invitation, séparés par type. Les dimensions peuvent être absentes (null). */
export function mediaOf(invitation) {
  const media = invitation.media || [];
  return {
    cover: media.find((m) => m.type === 'cover') || null,
    gallery: media.filter((m) => m.type === 'gallery'),
  };
}

export function isVideo(m) {
  return Boolean(m?.mimeType && m.mimeType.startsWith('video/'));
}

/** Rapport largeur/hauteur connu, sinon null (la galerie le mesure alors au chargement). */
export function knownRatio(m) {
  return m && m.width > 0 && m.height > 0 ? m.width / m.height : null;
}

export function altFor(kind, { index = 0, total = 1, namesLine } = {}) {
  const who = namesLine ? ` de ${namesLine}` : '';
  if (kind === 'cover') return `Photographie de couverture${who}`;
  return `Photographie ${index + 1} sur ${total}${who}`;
}
