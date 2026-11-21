// Jeux de données de test. Tout est fictif et local : noms inventés, images abstraites de
// e2e/fixtures/img (servies sur /img/...). Aucune photographie de personne réelle.
//
// Chaque scénario part de `base` puis le modifie : un scénario = un cas limite à contrôler.

export const SCENARIOS = [
  'full', // données complètes
  'long-names', // noms, titre et lieu très longs
  'no-cover', // pas de photo de couverture
  'gallery-empty', // aucune photo de galerie
  'gallery-one', // une seule photo
  'gallery-many', // 20 photos de proportions mélangées (portrait, paysage, panorama, carré, très haut)
  'big-text', // textes volumineux, programme de 12 lignes
  'minimal', // ni date, ni lieu, ni programme, ni contact
];

// Scénarios supplémentaires (hors campagne des templates existants) : photos SANS dimensions (width/height null, cas des photos antérieures à la migration).
export const EXTRA_SCENARIOS = ['gallery-no-dims'];

// Date d'événement fixe ; les tests figent l'horloge du navigateur (page.clock) juste avant.
export const EVENT_DATE = '2027-06-12T00:00:00.000Z';
export const CLOCK_NOW = '2027-05-01T10:00:00.000Z';

const PHOTOS = [
  { name: 'portrait', w: 1000, h: 1500 },
  { name: 'landscape', w: 1500, h: 1000 },
  { name: 'panorama', w: 2400, h: 800 },
  { name: 'square', w: 1200, h: 1200 },
  { name: 'tall', w: 800, h: 1600 },
];

function photo(i, type = 'gallery') {
  const p = PHOTOS[i % PHOTOS.length];
  return {
    id: `${type}-${i}`,
    type,
    url: `/img/${p.name}.svg`,
    mimeType: 'image/svg+xml',
    order: i,
    // Même forme que les lignes Media de l'API publique (width/height peuvent être null
    // pour les photos existantes : la variante « sans dimensions » est testée dans gallery-many).
    width: i % 4 === 3 ? null : p.w,
    height: i % 4 === 3 ? null : p.h,
  };
}

const lorem =
  "Nous avons le bonheur de vous convier à la célébration de notre union. Votre présence à nos côtés rendra cette journée inoubliable, entre rires, musique et partage. ";

function base(templateKey) {
  return {
    template: { key: templateKey },
    title: 'Mariage',
    namesLine: 'Awa & Koffi',
    eventType: 'mariage',
    eventDate: EVENT_DATE,
    eventTime: '15:00',
    venueName: 'Domaine des Flamboyants',
    address: '12 avenue des Cocotiers, Abidjan',
    latitude: null,
    longitude: null,
    invitationText: 'Avec joie, nous vous invitons à célébrer notre mariage entourés de nos familles et de nos amis.',
    personalMessage: 'Votre présence sera le plus beau des cadeaux.',
    dressCode: 'Tenue de cérémonie, touche de couleur chaude',
    musicUrl: null,
    contactPhone: '+22501020304',
    contactWhatsapp: '+22501020304',
    theme: null,
    rsvpEditLocked: false,
    guestbookClosed: false,
    guest: null,
    events: [
      { id: 'e1', title: 'Cérémonie civile', time: '10:00', location: 'Mairie de Cocody', description: '' },
      { id: 'e2', title: 'Bénédiction', time: '14:00', location: 'Paroisse Saint-Jean', description: '' },
      { id: 'e3', title: 'Réception', time: '18:30', location: 'Domaine des Flamboyants', description: "Cocktail, dîner et soirée dansante jusqu'à l'aube" },
    ],
    media: [photo(100, 'cover'), photo(0), photo(1), photo(2), photo(4), photo(3), photo(5)].map((m, i) =>
      i === 0 ? { ...m, url: '/img/cover.svg', width: 1600, height: 1067, id: 'cover' } : m
    ),
  };
}

export function buildScenario(templateKey, scenario = 'full') {
  const inv = base(templateKey);
  const cover = inv.media[0];

  switch (scenario) {
    case 'full':
      return inv;
    case 'long-names':
      return {
        ...inv,
        title: 'Cérémonie de mariage traditionnel et religieux des familles réunies',
        namesLine: "Marie-Alexandrine de Montmorency-Laval & Jean-Baptiste-Emmanuel Kouassi-N'Guessan",
        venueName: 'Grand salon de réception du Domaine des Flamboyants et de la Palmeraie royale',
        address: "Boulevard de la Corniche, Résidence Les Hauts de la Lagune, Immeuble B, 3e étage, Abidjan-Cocody-Riviera",
        dressCode: 'Tenue de cérémonie traditionnelle africaine ou costume sombre, accompagnée de touches de couleur chaude',
      };
    case 'no-cover':
      return { ...inv, media: inv.media.filter((m) => m.type !== 'cover') };
    case 'gallery-empty':
      return { ...inv, media: [cover] };
    case 'gallery-one':
      return { ...inv, media: [cover, photo(0)] };
    case 'gallery-many':
      return { ...inv, media: [cover, ...Array.from({ length: 20 }, (_, i) => photo(i))] };
    case 'gallery-no-dims':
      return { ...inv, media: [cover, ...Array.from({ length: 8 }, (_, i) => ({ ...photo(i), width: null, height: null }))] };
    case 'big-text':
      return {
        ...inv,
        invitationText: lorem.repeat(8),
        personalMessage: lorem.repeat(4),
        events: Array.from({ length: 12 }, (_, i) => ({
          id: `e${i}`,
          title: `Moment ${i + 1} de la journée`,
          time: `${String(8 + i).padStart(2, '0')}:00`,
          location: 'Lieu de rassemblement à définir avec les familles',
          description: lorem.repeat(2),
        })),
      };
    case 'minimal':
      return {
        ...inv,
        eventDate: null,
        eventTime: null,
        venueName: null,
        address: null,
        dressCode: null,
        invitationText: null,
        personalMessage: null,
        events: [],
        contactPhone: null,
        contactWhatsapp: null,
        media: [],
      };
    default:
      throw new Error(`Scénario inconnu : ${scenario}`);
  }
}
