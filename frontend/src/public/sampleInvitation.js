// Données d'exemple des modèles : aperçus de l'administration et liens de démonstration envoyés aux clients (/demo/<clé du modèle>).
// Tout est fictif, y compris le numéro de téléphone.

// Comme une vraie invitation : la date est enregistrée à minuit UTC, l'heure à part (voir shared/utils/eventDateTime.js).
function dateInDays(days) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

const unsplash = (id, width) => `https://images.unsplash.com/${id}?w=${width}&q=70&auto=format`;
const photo = (id, type, photoId) => ({ id, type, url: unsplash(photoId, 1200), thumbUrl: unsplash(photoId, 800) });

const GALLERY = [
  'photo-1519741497674-611481863552',
  'photo-1465495976277-4387d4b0b4c6',
  'photo-1522673607200-164d1b6ce486',
  'photo-1511285560929-80b456fea0bc',
  'photo-1606216794074-735e91aa2c92',
  'photo-1583939003579-730e3918a45a',
];

export function buildSampleInvitation(templateKey) {
  return {
    template: { key: templateKey },
    title: 'Mariage',
    namesLine: 'Josué & Sephora',
    eventDate: dateInDays(45),
    eventTime: '15:00',
    venueName: 'Domaine des Roses',
    address: 'Avenue de la Justice, Gombe, Kinshasa',
    latitude: null,
    longitude: null,
    invitationText:
      "Avec joie, nous vous invitons à célébrer notre union entourés de notre famille et de nos amis.",
    personalMessage: 'Votre présence sera le plus beau des cadeaux.',
    dressCode: 'Smoking et doré',
    contactPhone: '+243000000000',
    contactWhatsapp: '+243000000000',
    events: [
      { id: 'e1', title: 'Cérémonie', time: '15:00', location: 'Paroisse Saint-Paul', description: '' },
      { id: 'e2', title: 'Cocktail', time: '17:00', location: 'Jardin du Domaine', description: '' },
      { id: 'e3', title: 'Dîner & Soirée', time: '19:30', location: 'Grande Salle', description: 'Ouvert jusqu\'à 2h' },
    ],
    media: [
      photo('cover', 'cover', 'photo-1519225421980-715cb0215aed'),
      ...GALLERY.map((photoId, i) => photo(`m${i + 1}`, 'gallery', photoId)),
    ],
  };
}

// Invitation de démonstration : la même, adressée à un invité fictif — le client voit aussi le nom sur l'invitation, la table,
// le nombre de places et le billet avec son QR code. Le QR code est une image fixe qui ne donne accès à rien.
export function buildDemoInvitation(templateKey) {
  return {
    ...buildSampleInvitation(templateKey),
    guest: {
      code: 'DEMO',
      name: 'Grâce Mbuyi',
      maxPersons: 2,
      tableNumber: '7',
      alreadyAnswered: false,
      rsvp: null,
      guestbook: null,
      qrUrl: '/demo-qr.png',
    },
  };
}
