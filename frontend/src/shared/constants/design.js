export const COLOR_FIELDS = [
  { key: 'colorBg', label: 'Fond' },
  { key: 'colorSurface', label: 'Cartes / surfaces' },
  { key: 'colorPrimary', label: 'Primaire' },
  { key: 'colorSecondary', label: 'Secondaire' },
  { key: 'colorText', label: 'Texte' },
  { key: 'colorTextMuted', label: 'Texte secondaire' },
  { key: 'colorAccent', label: 'Accent' },
];

export const FONT_OPTIONS = [
  { label: 'Playfair Display (élégant, serif)', value: "'Playfair Display', serif" },
  { label: 'Cormorant Garamond (classique, serif)', value: "'Cormorant Garamond', serif" },
  { label: 'Poppins (moderne, sans-serif)', value: "'Poppins', sans-serif" },
  { label: 'Quicksand (doux, sans-serif)', value: "'Quicksand', sans-serif" },
];

export const SECTION_LABELS = {
  countdown: 'Compte à rebours',
  program: 'Programme',
  gallery: 'Galerie',
  map: 'Lieu / carte',
  rsvp: 'RSVP',
  contact: 'Contact',
};

// "cover" est toujours présent en première position et non désactivable.
export const TOGGLABLE_SECTIONS = ['countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'];
