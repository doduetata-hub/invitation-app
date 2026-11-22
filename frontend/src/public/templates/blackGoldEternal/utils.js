// Utilitaires propres à « Black & Gold Eternal » (réutilise ceux de Royal Editorial pour les noms et les médias).
export { splitNames, initials, mediaOf, isVideo } from '../royalEditorial/utils';

export const pad2 = (n) => String(n).padStart(2, '0');
export const upFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Section masquée par l'administrateur (theme.disabledSections) ? */
export function isDisabled(invitation, key) {
  return (invitation?.theme?.disabledSections || []).includes(key);
}

/** Point focal d'une photo : visage détecté ou placé à la main dans l'admin, sinon le tiers supérieur (là où sont les visages). */
export function focalOf(m, fallback = '50% 26%') {
  if (m && Number.isFinite(m.focusX) && Number.isFinite(m.focusY) && m.focusSource !== 'none') {
    return `${m.focusX}% ${m.focusY}%`;
  }
  return fallback;
}

/** « Noir / Noir » -> ['NOIR', 'NOIR'] ; « Tenue de soirée » -> ['TENUE DE SOIRÉE']. Ne coupe que sur « / », « + » ou « & ». */
export function dressWords(text) {
  const t = (text || '').trim();
  if (!t) return [];
  return t.split(/\s*[/+&]\s*/).map((w) => w.trim()).filter(Boolean).map((w) => w.toLocaleUpperCase('fr-FR'));
}

/** Adresse du lieu en une ligne lisible. */
export function venueLine(invitation) {
  return [invitation.address].filter(Boolean).join(', ');
}
