const inFifteenDays = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

export function buildSampleInvitation(templateKey) {
  return {
    template: { key: templateKey },
    title: 'Mariage',
    namesLine: 'Marie & Paul',
    eventDate: inFifteenDays,
    venueName: 'Domaine des Roses',
    address: '12 chemin des Vignes, 33000 Bordeaux',
    latitude: null,
    longitude: null,
    invitationText:
      "Avec joie, nous vous invitons à célébrer notre union entourés de notre famille et de nos amis.",
    personalMessage: 'Votre présence sera le plus beau des cadeaux.',
    contactPhone: '+33612345678',
    contactWhatsapp: '+33612345678',
    events: [
      { id: 'e1', title: 'Cérémonie', time: '15:00', location: 'Église Saint-Paul', description: '' },
      { id: 'e2', title: 'Cocktail', time: '17:00', location: 'Jardin du Domaine', description: '' },
      { id: 'e3', title: 'Dîner & Soirée', time: '19:30', location: 'Grande Salle', description: 'Ouvert jusqu\'à 2h' },
    ],
    media: [
      { id: 'cover', type: 'cover', url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=60' },
      { id: 'm1', type: 'gallery', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&q=60' },
      { id: 'm2', type: 'gallery', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=300&q=60' },
      { id: 'm3', type: 'gallery', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=300&q=60' },
    ],
  };
}
