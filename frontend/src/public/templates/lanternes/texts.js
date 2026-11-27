// Textes fixes des « Lanternes » que l'organisateur peut personnaliser depuis l'administration (Design → « Textes de l'invitation »).
// Ils sont enregistrés dans theme.texts de l'invitation ; un champ laissé vide garde le texte d'origine ci-dessous.
// Les noms, la date, l'heure, le lieu, le programme, le texte d'invitation, le dress code, le message personnel et le nom / la table
// de l'invité viennent, eux, des champs habituels de l'invitation.
const SMALL = 'Petite phrase au-dessus du titre';
const TITLE = 'Titre';

export const TEXT_GROUPS = [
  { title: 'Ouverture (la lanterne)', fields: [
    { key: 'gateEyebrow', label: 'Annonce en haut de l\'écran', default: 'La nuit de notre mariage' },
    { key: 'gateHold', label: 'Invitation à allumer la lanterne', default: 'Maintenez pour allumer' },
    { key: 'gateSwipe', label: 'Invitation à la lâcher', default: 'Glissez vers le haut pour la lâcher' },
    { key: 'gateEnter', label: 'Bouton pour entrer', default: 'Rejoindre la fête' },
  ] },
  { title: 'Couverture', fields: [
    { key: 'heroEyebrow', label: 'Phrase au-dessus des noms', default: 'Vous invitent à une nuit de lumière' },
    { key: 'openLabel', label: 'Indication pour descendre', default: 'Faites défiler' },
  ] },
  { title: 'Invitation', fields: [
    { key: 'introEyebrow', label: SMALL, default: 'Une invitation' },
    { key: 'introTitle', label: TITLE, default: 'Venez briller avec nous' },
    { key: 'introFooter', label: "Phrase sous le texte d'invitation", default: 'Avec toute notre affection' },
    { key: 'seatText', label: "Étiquette de table ({table} = numéro de table de l'invité)", default: 'Votre lanterne : table {table}' },
  ] },
  { title: 'Détails', fields: [
    { key: 'detailsEyebrow', label: SMALL, default: 'À retenir' },
    { key: 'detailsTitle', label: TITLE, default: 'La grande soirée' },
    { key: 'labelDate', label: 'Intitulé « date »', default: 'Date' },
    { key: 'labelTime', label: 'Intitulé « heure »', default: 'Heure' },
    { key: 'labelPlace', label: 'Intitulé « lieu »', default: 'Lieu' },
    { key: 'routeLink', label: "Bouton de l'itinéraire", default: 'Itinéraire' },
  ] },
  { title: 'Dress code', fields: [
    { key: 'dressEyebrow', label: SMALL, default: 'Les couleurs de la nuit' },
    { key: 'dressTitle', label: TITLE, default: 'Dress code' },
    { key: 'dressText', label: 'Explication', default: 'Pour illuminer la soirée à nos côtés, nous vous invitons à respecter le code vestimentaire.', multiline: true },
  ] },
  { title: 'Compte à rebours', fields: [
    { key: 'countEyebrow', label: SMALL, default: 'Les lanternes s\'allument' },
    { key: 'countTitle', label: TITLE, default: 'Dans' },
  ] },
  { title: 'Programme', fields: [
    { key: 'progEyebrow', label: SMALL, default: 'Au fil de l\'eau' },
    { key: 'progTitle', label: TITLE, default: 'Le programme' },
    { key: 'progText', label: 'Phrase sous le titre', default: 'Les lumières de la soirée, heure par heure.', multiline: true },
  ] },
  { title: 'Galerie', fields: [
    { key: 'galEyebrow', label: SMALL, default: 'Nos instants' },
    { key: 'galTitle', label: TITLE, default: 'En lumière' },
  ] },
  { title: 'Lieu', fields: [
    { key: 'placeEyebrow', label: SMALL, default: 'Comment nous rejoindre' },
    { key: 'placeTitle', label: TITLE, default: 'Le lieu' },
  ] },
  { title: 'Réponse (RSVP)', fields: [
    { key: 'rsvpEyebrow', label: SMALL, default: 'Votre présence compte' },
    { key: 'rsvpTitle', label: TITLE, default: 'Envoyez votre vœu' },
    { key: 'rsvpSub', label: 'Phrase sous le titre ({noms} = les prénoms des hôtes)', default: '{noms} seront heureux de vous compter parmi eux.', multiline: true },
  ] },
  { title: "Billet QR de l'invité", fields: [
    { key: 'ticketEyebrow', label: SMALL, default: 'Votre accès personnel' },
    { key: 'ticketTitle', label: TITLE, default: 'Votre lanterne' },
    { key: 'ticketText', label: 'Explication', default: "Présentez ce QR code à l'accueil le jour de l'événement.", multiline: true },
    { key: 'ticketTop', label: 'En-tête du billet', default: "Billet d'accès" },
  ] },
  { title: 'Fin de page', fields: [
    { key: 'closingText', label: 'Message de remerciement', default: 'Merci de partager avec nous cette nuit. Votre présence sera notre plus belle lumière.', multiline: true },
    { key: 'closingBless', label: 'Dernière phrase', default: 'À très bientôt.' },
  ] },
];

const DEFAULTS = Object.fromEntries(TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.default])));

/** Texte personnalisé de l'invitation, ou le texte d'origine du template si le champ est vide. */
export function getText(invitation, key) {
  const v = invitation?.theme?.texts?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULTS[key];
}
