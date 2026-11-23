// Textes fixes de « Rosace Noire » que l'organisateur peut personnaliser depuis l'administration (Design → « Textes de l'invitation »).
// Ils sont enregistrés dans theme.texts de l'invitation ; un champ laissé vide garde le texte d'origine ci-dessous.
// Les noms, la date, l'heure, le lieu, le programme, le texte d'invitation, le dress code et le message personnel viennent, eux, des
// champs habituels de l'invitation (le message personnel remplace le verset).
const SMALL = 'Petite phrase au-dessus du titre';
const L1 = 'Titre (première ligne)';
const L2 = 'Titre (deuxième ligne, en italique)';

export const TEXT_GROUPS = [
  { title: 'Couverture', fields: [
    { key: 'heroEyebrow', label: 'Phrase au-dessus des noms', default: 'Une promesse · Une foi · Une vie' },
    { key: 'openLabel', label: 'Bouton pour descendre', default: "Découvrir l'invitation" },
  ] },
  { title: 'Invitation', fields: [
    { key: 'introEyebrow', label: SMALL, default: 'Avec la bénédiction de Dieu' },
    { key: 'introTitle1', label: L1, default: 'Vous êtes' },
    { key: 'introTitle2', label: L2, default: 'invités.' },
    { key: 'introFooter', label: "Phrase sous le texte d'invitation", default: 'Deux cœurs · Une seule promesse' },
    { key: 'featureEyebrow', label: 'Légende de la grande photo', default: "Le début d'une nouvelle histoire" },
  ] },
  { title: 'Détails de la cérémonie', fields: [
    { key: 'detailsEyebrow', label: SMALL, default: 'À retenir' },
    { key: 'detailsTitle1', label: L1, default: 'Les détails' },
    { key: 'detailsTitle2', label: L2, default: 'de la cérémonie.' },
    { key: 'labelDate', label: 'Intitulé « date »', default: 'Date' },
    { key: 'labelTime', label: 'Intitulé « heure »', default: 'Accueil' },
    { key: 'labelPlace', label: 'Intitulé « lieu »', default: 'Lieu' },
    { key: 'routeLink', label: "Lien vers l'itinéraire", default: "Ouvrir l'itinéraire" },
  ] },
  { title: 'Dress code', fields: [
    { key: 'dressEyebrow', label: SMALL, default: 'Élégance & harmonie' },
    { key: 'dressTitle', label: 'Titre', default: 'Dress code' },
    { key: 'dressText', label: 'Explication', default: 'Pour célébrer cette journée dans une belle harmonie, nous vous invitons à respecter le code vestimentaire.', multiline: true },
  ] },
  { title: 'Compte à rebours', fields: [
    { key: 'countEyebrow', label: SMALL, default: 'Le grand jour approche' },
    { key: 'countTitle1', label: L1, default: 'Un rendez-vous' },
    { key: 'countTitle2', label: L2, default: "avec l'amour." },
  ] },
  { title: 'Programme', fields: [
    { key: 'progEyebrow', label: SMALL, default: 'Ordre de la célébration' },
    { key: 'progTitle1', label: L1, default: 'Le déroulé' },
    { key: 'progTitle2', label: L2, default: 'de la journée.' },
  ] },
  { title: 'Galerie', fields: [
    { key: 'galEyebrow', label: SMALL, default: 'Quelques instants à deux' },
    { key: 'galTitle1', label: L1, default: 'Notre histoire,' },
    { key: 'galTitle2', label: L2, default: 'en images.' },
  ] },
  { title: 'Lieu', fields: [
    { key: 'placeEyebrow', label: SMALL, default: 'Comment nous rejoindre' },
    { key: 'placeTitle1', label: L1, default: 'Le lieu' },
    { key: 'placeTitle2', label: L2, default: 'de la célébration.' },
  ] },
  { title: 'Réponse (RSVP)', fields: [
    { key: 'rsvpEyebrow', label: SMALL, default: 'Votre présence compte' },
    { key: 'rsvpTitle1', label: L1, default: 'Confirmez' },
    { key: 'rsvpTitle2', label: L2, default: 'votre venue.' },
    { key: 'rsvpSub', label: 'Phrase sous le titre ({noms} = les prénoms des mariés)', default: '{noms} seront heureux de vous compter parmi eux.', multiline: true },
  ] },
  { title: "Billet QR de l'invité", fields: [
    { key: 'ticketEyebrow', label: SMALL, default: 'Votre accès personnel' },
    { key: 'ticketTitle1', label: L1, default: 'Le billet' },
    { key: 'ticketTitle2', label: L2, default: 'des mariés.' },
    { key: 'ticketText', label: 'Explication', default: "Présentez ce QR code à l'accueil le jour de la cérémonie.", multiline: true },
    { key: 'ticketTop', label: 'En-tête du billet', default: 'Accès cérémonie' },
  ] },
  { title: 'Fin de page', fields: [
    { key: 'closingText', label: 'Message de remerciement', default: 'Merci de partager avec nous ce jour béni. Votre présence et vos prières rendront ce moment encore plus précieux.', multiline: true },
    { key: 'closingBless', label: 'Dernière phrase', default: 'Que Dieu bénisse cette union.' },
  ] },
];

const DEFAULTS = Object.fromEntries(TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.default])));

/** Texte personnalisé de l'invitation, ou le texte d'origine du template si le champ est vide. */
export function getText(invitation, key) {
  const v = invitation?.theme?.texts?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULTS[key];
}
