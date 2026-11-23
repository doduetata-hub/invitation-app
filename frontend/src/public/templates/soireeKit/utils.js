// Utilitaires partagés par les templates « soirée » (Soirée Ivoire, Mariage Coutumier, Soirée de Gala).

const NAME_SEPARATORS = [' & ', ' et ', ' + ', '&'];

/** « Awa & Koffi » -> { first: 'Awa', second: 'Koffi' } ; sans séparateur -> { first: <tout>, second: null }. */
export function splitNames(namesLine) {
  const line = (namesLine || '').trim();
  if (!line) return { first: '', second: null };
  for (const sep of NAME_SEPARATORS) {
    const i = line.indexOf(sep);
    if (i > 0 && i < line.length - sep.length) return { first: line.slice(0, i).trim(), second: line.slice(i + sep.length).trim() };
  }
  return { first: line, second: null };
}

export function initials({ first, second }) {
  return { f: first.trim().charAt(0).toUpperCase(), s: second ? second.trim().charAt(0).toUpperCase() : '' };
}

export const isVideo = (m) => Boolean(m?.mimeType && m.mimeType.startsWith('video/'));

/** Médias publics de l'invitation : couverture et galerie (photos uniquement pour la mise en page). */
export function mediaOf(invitation) {
  const media = invitation.media || [];
  const cover = media.find((m) => m.type === 'cover') || null;
  const gallery = media.filter((m) => m.type === 'gallery');
  return { cover, gallery, photos: gallery.filter((m) => !isVideo(m)) };
}

/** n-ième photo de la galerie (en boucle) pour illustrer une section ; null s'il n'y en a aucune. */
export function pick(photos, n) {
  return photos.length ? photos[n % photos.length] : null;
}

export const pad2 = (n) => String(n).padStart(2, '0');
export const upFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Section masquée par l'administrateur (theme.disabledSections) ? */
export function isDisabled(invitation, key) {
  return (invitation?.theme?.disabledSections || []).includes(key);
}

/** Point focal de la photo (visage détecté ou placé à la main dans l'admin), sinon le tiers supérieur où se trouvent les visages. */
export function focalOf(m, fallback = '50% 28%') {
  if (m && Number.isFinite(m.focusX) && Number.isFinite(m.focusY) && m.focusSource !== 'none') return `${m.focusX}% ${m.focusY}%`;
  return fallback;
}

export const WEEKDAYS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

/** Grille du mois (dimanche en premier, comme sur les maquettes) calculée en UTC, comme les dates de l'application. */
export function monthGrid(eventDate) {
  const d = new Date(eventDate);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const offset = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array(offset).fill(null);
  for (let i = 1; i <= count; i += 1) cells.push(i);
  return { cells, day: d.getUTCDate() };
}

/** Tracé déchiré déterministe : points d'une ligne brisée en % (toujours les mêmes). */
export function tearPoints(seed = 7, steps = 26, amp = 3) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pts = [];
  for (let i = 0; i <= steps; i += 1) pts.push([(i / steps) * 100, (rnd() - 0.5) * 2 * amp]);
  return pts;
}
