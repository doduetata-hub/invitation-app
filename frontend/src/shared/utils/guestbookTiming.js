// Durée d'affichage adaptée à la longueur du texte RÉELLEMENT montré (la page courante, pas tout
// le message si celui-ci est scindé en deux temps) : un mot très court ne mérite pas les mêmes
// 8 secondes qu'un paragraphe entier, et un message dense doit rester assez longtemps pour se
// laisser lire confortablement à voix basse par la salle. Partagé entre le mode écran
// (GuestbookDisplayPage) et la vidéo générée (guestbookVideoTimeline) pour un rythme identique.
export function durationForText(text) {
  const len = (text || '').length;
  if (len <= 80) return 7500; // court : ~7-9 s
  if (len <= 280) return 11000; // moyen : ~10-14 s
  return 14000; // long/scindé : chaque écran garde le temps d'une lecture posée
}
