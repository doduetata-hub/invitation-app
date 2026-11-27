// Textes fixes de « La Serre » que l'organisateur peut personnaliser depuis l'administration (Design → « Textes de l'invitation »).
// Ils sont enregistrés dans theme.texts de l'invitation ; un champ laissé vide garde le texte d'origine ci-dessous.
// Les noms, la date, l'heure, le lieu, le programme, le texte d'invitation, le dress code, le message personnel et le nom / la table
// de l'invité viennent, eux, des champs habituels de l'invitation.
const SMALL = 'Petite phrase au-dessus du titre';
const SCRIPT = 'Titre (en écriture manuscrite)';

export const TEXT_GROUPS = [
  { title: 'Ouverture (la buée)', fields: [
    { key: 'gateWipe', label: 'Invitation à essuyer la vitre', default: 'Essuyez la buée avec votre doigt' },
    { key: 'gateEyebrow', label: 'Phrase au-dessus des noms', default: 'Le mariage de' },
    { key: 'gateEnter', label: 'Bouton pour entrer', default: 'Entrer dans la serre' },
  ] },
  { title: 'Couverture', fields: [
    { key: 'heroEyebrow', label: 'Phrase au-dessus du portrait', default: 'Ont la joie de vous convier' },
    { key: 'openLabel', label: 'Indication pour descendre', default: 'Faites défiler' },
  ] },
  { title: 'Invitation', fields: [
    { key: 'introEyebrow', label: SMALL, default: 'Une invitation' },
    { key: 'introTitle', label: SCRIPT, default: 'Vous êtes conviés' },
    { key: 'introFooter', label: "Phrase sous le texte d'invitation", default: 'Avec toute notre affection' },
    { key: 'seatText', label: "Étiquette de table ({table} = numéro de table de l'invité)", default: 'Votre table {table}' },
  ] },
  { title: 'Détails', fields: [
    { key: 'detailsEyebrow', label: SMALL, default: 'À retenir' },
    { key: 'detailsTitle', label: SCRIPT, default: 'Le grand jour' },
    { key: 'labelDate', label: 'Intitulé « date »', default: 'Date' },
    { key: 'labelTime', label: 'Intitulé « heure »', default: 'Heure' },
    { key: 'labelPlace', label: 'Intitulé « lieu »', default: 'Lieu' },
    { key: 'routeLink', label: "Bouton de l'itinéraire", default: 'Itinéraire' },
  ] },
  { title: 'Dress code', fields: [
    { key: 'dressEyebrow', label: SMALL, default: 'Couleurs du jardin' },
    { key: 'dressTitle', label: SCRIPT, default: 'Dress code' },
    { key: 'dressText', label: 'Explication', default: 'Pour fleurir cette journée à nos côtés, nous vous invitons à respecter le code vestimentaire.', multiline: true },
  ] },
  { title: 'Compte à rebours', fields: [
    { key: 'countEyebrow', label: SMALL, default: 'La floraison approche' },
    { key: 'countTitle', label: SCRIPT, default: 'Plus que' },
  ] },
  { title: 'Programme', fields: [
    { key: 'progEyebrow', label: SMALL, default: 'Au fil de la journée' },
    { key: 'progTitle', label: SCRIPT, default: 'Le programme' },
    { key: 'progText', label: 'Phrase sous le titre', default: 'Chaque moment fleurit à son heure.', multiline: true },
  ] },
  { title: 'Galerie', fields: [
    { key: 'galEyebrow', label: SMALL, default: 'Notre herbier' },
    { key: 'galTitle', label: SCRIPT, default: 'En images' },
    { key: 'galCaption', label: 'Légende sous chaque photo (suivie de son numéro)', default: 'Planche' },
  ] },
  { title: 'Lieu', fields: [
    { key: 'placeEyebrow', label: SMALL, default: 'Comment nous rejoindre' },
    { key: 'placeTitle', label: SCRIPT, default: 'Le lieu' },
  ] },
  { title: 'Réponse (RSVP)', fields: [
    { key: 'rsvpEyebrow', label: SMALL, default: 'Votre présence compte' },
    { key: 'rsvpTitle', label: SCRIPT, default: 'Répondez-nous' },
    { key: 'rsvpSub', label: 'Phrase sous le titre ({noms} = les prénoms des hôtes)', default: '{noms} seront heureux de vous compter parmi eux.', multiline: true },
  ] },
  { title: "Billet QR de l'invité", fields: [
    { key: 'ticketEyebrow', label: SMALL, default: 'Votre accès personnel' },
    { key: 'ticketTitle', label: SCRIPT, default: 'Votre billet' },
    { key: 'ticketText', label: 'Explication', default: "Présentez ce QR code à l'accueil le jour de l'événement.", multiline: true },
    { key: 'ticketTop', label: 'En-tête du billet', default: "Billet d'accès" },
  ] },
  { title: 'Fin de page', fields: [
    { key: 'closingText', label: 'Message de remerciement', default: 'Merci de partager avec nous ce moment. Votre présence fera fleurir cette journée.', multiline: true },
    { key: 'closingBless', label: 'Dernière phrase', default: 'À très bientôt.' },
  ] },
];

const DEFAULTS = Object.fromEntries(TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.default])));

/** Texte personnalisé de l'invitation, ou le texte d'origine du template si le champ est vide. */
export function getText(invitation, key) {
  const v = invitation?.theme?.texts?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULTS[key];
}
