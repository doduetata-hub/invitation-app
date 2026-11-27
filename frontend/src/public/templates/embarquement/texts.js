// Textes fixes de « L'Embarquement » que l'organisateur peut personnaliser depuis l'administration (Design → « Textes de l'invitation »).
// Ils sont enregistrés dans theme.texts de l'invitation ; un champ laissé vide garde le texte d'origine ci-dessous.
// Les noms, la date, l'heure, le lieu, le programme, le texte d'invitation, le dress code, le message personnel et le nom / la table
// de l'invité viennent, eux, des champs habituels de l'invitation.
const SMALL = 'Petite phrase au-dessus du titre';
const TITLE = 'Titre';

export const TEXT_GROUPS = [
  { title: 'Ouverture (le hublot)', fields: [
    { key: 'gateEyebrow', label: 'Annonce au-dessus du hublot', default: 'Destination : notre mariage' },
    { key: 'gateDrag', label: 'Invitation à ouvrir le volet', default: 'Faites glisser le volet vers le haut' },
    { key: 'gatePass', label: 'En-tête de la carte', default: "Carte d'embarquement" },
    { key: 'gateBoard', label: 'Bouton pour entrer', default: 'Embarquer' },
  ] },
  { title: 'Couverture', fields: [
    { key: 'heroEyebrow', label: 'Phrase au-dessus des noms', default: 'Vous invitent à bord' },
    { key: 'openLabel', label: 'Indication pour descendre', default: 'Faites défiler' },
  ] },
  { title: 'Invitation', fields: [
    { key: 'introEyebrow', label: SMALL, default: 'Une invitation au voyage' },
    { key: 'introTitle', label: TITLE, default: 'Montez à bord' },
    { key: 'introFooter', label: "Phrase sous le texte d'invitation", default: 'Avec toute notre affection' },
    { key: 'seatText', label: "Étiquette de table ({table} = numéro de table de l'invité)", default: 'Votre siège : table {table}' },
  ] },
  { title: 'Informations de vol', fields: [
    { key: 'detailsEyebrow', label: SMALL, default: 'À retenir' },
    { key: 'detailsTitle', label: TITLE, default: 'Informations de vol' },
    { key: 'labelDate', label: 'Intitulé « date »', default: 'Départ' },
    { key: 'labelTime', label: 'Intitulé « heure »', default: 'Embarquement' },
    { key: 'labelPlace', label: 'Intitulé « lieu »', default: 'Destination' },
    { key: 'routeLink', label: "Bouton de l'itinéraire", default: 'Itinéraire' },
  ] },
  { title: 'Dress code', fields: [
    { key: 'dressEyebrow', label: SMALL, default: 'Tenue de bord' },
    { key: 'dressTitle', label: TITLE, default: 'Dress code' },
    { key: 'dressText', label: 'Explication', default: 'Pour voyager ensemble avec élégance, nous vous invitons à respecter le code vestimentaire.', multiline: true },
  ] },
  { title: 'Compte à rebours', fields: [
    { key: 'countEyebrow', label: SMALL, default: 'Prochain départ' },
    { key: 'countTitle', label: TITLE, default: 'Décollage dans' },
    { key: 'countBoard', label: 'En-tête du panneau', default: 'Départs' },
  ] },
  { title: 'Programme', fields: [
    { key: 'progEyebrow', label: SMALL, default: 'Étape par étape' },
    { key: 'progTitle', label: TITLE, default: 'Notre itinéraire' },
    { key: 'progText', label: 'Phrase sous le titre', default: 'Les escales de notre journée, heure par heure.', multiline: true },
    { key: 'progStop', label: 'Nom de chaque étape (suivi de son numéro)', default: 'Escale' },
  ] },
  { title: 'Galerie', fields: [
    { key: 'galEyebrow', label: SMALL, default: 'Nos souvenirs' },
    { key: 'galTitle', label: TITLE, default: 'Cartes postales' },
    { key: 'galCaption', label: 'Légende sous chaque photo (suivie de son numéro)', default: 'Souvenir' },
  ] },
  { title: 'Lieu', fields: [
    { key: 'placeEyebrow', label: SMALL, default: 'Terminal des festivités' },
    { key: 'placeTitle', label: TITLE, default: 'La destination' },
  ] },
  { title: 'Réponse (RSVP)', fields: [
    { key: 'rsvpEyebrow', label: SMALL, default: 'Votre présence compte' },
    { key: 'rsvpTitle', label: TITLE, default: 'Enregistrement' },
    { key: 'rsvpSub', label: 'Phrase sous le titre ({noms} = les prénoms des hôtes)', default: '{noms} seront heureux de vous compter à bord.', multiline: true },
    { key: 'rsvpDesk', label: 'En-tête du formulaire', default: 'Comptoir des passagers' },
  ] },
  { title: "Billet QR de l'invité", fields: [
    { key: 'ticketEyebrow', label: SMALL, default: 'Votre accès personnel' },
    { key: 'ticketTitle', label: TITLE, default: 'Votre carte' },
    { key: 'ticketText', label: 'Explication', default: "Présentez ce QR code à l'accueil le jour de l'événement.", multiline: true },
    { key: 'ticketTop', label: 'En-tête du billet', default: "Carte d'embarquement" },
  ] },
  { title: 'Fin de page', fields: [
    { key: 'closingText', label: 'Message de remerciement', default: 'Merci de partager avec nous ce voyage. Votre présence rendra la traversée encore plus belle.', multiline: true },
    { key: 'closingBless', label: 'Dernière phrase', default: 'À très bientôt à bord.' },
  ] },
];

const DEFAULTS = Object.fromEntries(TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.default])));

/** Texte personnalisé de l'invitation, ou le texte d'origine du template si le champ est vide. */
export function getText(invitation, key) {
  const v = invitation?.theme?.texts?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULTS[key];
}
