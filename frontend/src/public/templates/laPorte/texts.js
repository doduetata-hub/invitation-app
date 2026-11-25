// Textes fixes de « La Porte » que l'organisateur peut personnaliser depuis l'administration (Design → « Textes de l'invitation »).
// Ils sont enregistrés dans theme.texts de l'invitation ; un champ laissé vide garde le texte d'origine ci-dessous.
// Les noms, la date, l'heure, le lieu, le programme, le texte d'invitation, le dress code, le message personnel et le nom / la table
// de l'invité viennent, eux, des champs habituels de l'invitation.
const SMALL = 'Petite phrase au-dessus du titre';
const L1 = 'Titre (première ligne)';
const L2 = 'Titre (deuxième ligne, en italique)';

export const TEXT_GROUPS = [
  { title: 'Ouverture de la porte', fields: [
    { key: 'gateKnock', label: "Phrase avant d'ouvrir", default: "Quelqu'un sonne à votre porte…" },
    { key: 'gateHint', label: 'Explication sous la phrase', default: 'Un messager vous apporte une invitation.', multiline: true },
    { key: 'gateButton', label: 'Invitation à toucher la poignée', default: 'Touchez la poignée pour ouvrir' },
    { key: 'gateFrom', label: "Phrase pendant que l'enveloppe arrive ({noms} = les prénoms des hôtes)", default: 'Un message de {noms}', multiline: true },
    { key: 'gateSeal', label: 'Invitation à rompre le sceau', default: 'Touchez le sceau pour lire' },
    { key: 'gateSkip', label: "Lien pour passer l'ouverture", default: 'Passer' },
  ] },
  { title: 'Couverture', fields: [
    { key: 'heroEyebrow', label: 'Phrase au-dessus des noms', default: 'Ont la joie de vous convier' },
    { key: 'openLabel', label: 'Indication pour descendre', default: 'Faites défiler' },
  ] },
  { title: 'Invitation', fields: [
    { key: 'introEyebrow', label: SMALL, default: 'Une invitation' },
    { key: 'introTitle', label: 'Titre (en écriture manuscrite)', default: 'Vous êtes invités' },
    { key: 'introFooter', label: "Phrase sous le texte d'invitation", default: 'Avec toute notre affection' },
    { key: 'seatText', label: "Carte de table ({table} = numéro de table de l'invité)", default: 'Vous êtes placé(e) à la table {table}' },
  ] },
  { title: 'Détails', fields: [
    { key: 'detailsEyebrow', label: SMALL, default: 'À retenir' },
    { key: 'detailsTitle', label: 'Titre (en écriture manuscrite)', default: 'Le grand jour' },
    { key: 'labelDate', label: 'Intitulé « date »', default: 'Date' },
    { key: 'labelTime', label: 'Intitulé « heure »', default: 'Heure' },
    { key: 'labelPlace', label: 'Intitulé « lieu »', default: 'Lieu' },
    { key: 'routeLink', label: "Bouton de l'itinéraire", default: 'Itinéraire' },
  ] },
  { title: 'Dress code', fields: [
    { key: 'dressEyebrow', label: SMALL, default: 'Élégance & harmonie' },
    { key: 'dressTitle', label: 'Titre', default: 'Dress code' },
    { key: 'dressText', label: 'Explication', default: 'Pour célébrer ce jour dans une belle harmonie, nous vous invitons à respecter le code vestimentaire.', multiline: true },
  ] },
  { title: 'Compte à rebours', fields: [
    { key: 'countEyebrow', label: SMALL, default: 'Le grand jour approche' },
    { key: 'countTitle1', label: L1, default: 'Plus que' },
    { key: 'countTitle2', label: L2, default: 'quelques instants.' },
  ] },
  { title: 'Programme', fields: [
    { key: 'progEyebrow', label: SMALL, default: 'Le déroulé' },
    { key: 'progTitle', label: 'Titre (en écriture manuscrite)', default: 'Programme' },
    { key: 'progText', label: 'Phrase sous le titre', default: 'Les temps forts de notre journée, heure par heure.', multiline: true },
  ] },
  { title: 'Galerie', fields: [
    { key: 'galEyebrow', label: SMALL, default: 'Quelques instants' },
    { key: 'galTitle', label: 'Titre (en écriture manuscrite)', default: 'En images' },
  ] },
  { title: 'Lieu', fields: [
    { key: 'placeEyebrow', label: SMALL, default: 'Comment nous rejoindre' },
    { key: 'placeTitle', label: 'Titre (en écriture manuscrite)', default: 'Le lieu' },
  ] },
  { title: 'Réponse (RSVP)', fields: [
    { key: 'rsvpEyebrow', label: SMALL, default: 'Votre présence compte' },
    { key: 'rsvpTitle', label: 'Titre (en écriture manuscrite)', default: 'Répondez-nous' },
    { key: 'rsvpSub', label: 'Phrase sous le titre ({noms} = les prénoms des hôtes)', default: '{noms} seront heureux de vous compter parmi eux.', multiline: true },
  ] },
  { title: "Billet QR de l'invité", fields: [
    { key: 'ticketEyebrow', label: SMALL, default: 'Votre accès personnel' },
    { key: 'ticketTitle', label: 'Titre (en écriture manuscrite)', default: 'Votre billet' },
    { key: 'ticketText', label: 'Explication', default: "Présentez ce QR code à l'accueil le jour de l'événement.", multiline: true },
    { key: 'ticketTop', label: 'En-tête du billet', default: "Billet d'accès" },
  ] },
  { title: 'Fin de page', fields: [
    { key: 'closingText', label: 'Message de remerciement', default: 'Merci de partager avec nous ce moment. Votre présence rendra cette journée encore plus précieuse.', multiline: true },
    { key: 'closingBless', label: 'Dernière phrase', default: 'À très bientôt.' },
  ] },
];

const DEFAULTS = Object.fromEntries(TEXT_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.default])));

/** Texte personnalisé de l'invitation, ou le texte d'origine du template si le champ est vide. */
export function getText(invitation, key) {
  const v = invitation?.theme?.texts?.[key];
  return typeof v === 'string' && v.trim() ? v.trim() : DEFAULTS[key];
}
