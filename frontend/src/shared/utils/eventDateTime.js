// La date de l'événement est stockée sans heure (minuit UTC du jour choisi) et l'heure est un texte
// libre ("19:30", "19h30", "19 h"). On les combine ici en un instant précis.
//
// L'heure saisie est celle du lieu de l'événement, pas celle de l'appareil de l'invité. Le lieu est
// fixé à la RD Congo (Kinshasa/Ouest : UTC+1, sans heure d'été), donc un simple décalage suffit.
const EVENT_UTC_OFFSET_HOURS = 1;

export function parseEventTime(eventTime) {
  if (!eventTime) return null;
  const match = String(eventTime).match(/(\d{1,2})\s*(?:[:hH]\s*(\d{1,2})?)?/);
  if (!match) return null;
  let hours = Number(match[1]);
  if (/pm/i.test(String(eventTime)) && hours < 12) hours += 12;
  const minutes = match[2] ? Number(match[2]) : 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

// Retourne un timestamp (ms) ou null si pas de date.
export function getEventTimestamp(eventDate, eventTime) {
  if (!eventDate) return null;
  const base = new Date(eventDate).getTime();
  if (Number.isNaN(base)) return null;
  const time = parseEventTime(eventTime);
  // Sans heure exploitable : on garde l'ancien comportement (minuit de la date).
  if (!time) return base;
  return base + ((time.hours - EVENT_UTC_OFFSET_HOURS) * 60 + time.minutes) * 60 * 1000;
}

// La date est stockée à minuit UTC : on l'affiche en UTC pour que le jour ne bascule jamais
// selon le fuseau de l'appareil (ex. invité en Amérique qui verrait la veille).
export function formatEventDate(eventDate, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Date(eventDate).toLocaleDateString('fr-FR', { ...options, timeZone: 'UTC' });
}
