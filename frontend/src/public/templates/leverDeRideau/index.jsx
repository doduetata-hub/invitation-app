import { lazy, Suspense } from 'react';

// LE LEVER DE RIDEAU — un mariage en grande première. L'invité frappe les trois coups, tire le cordon doré, le rideau se lève et le
// projecteur révèle les noms. Puis une invitation velours et or : portrait en cadre doré, programme en actes, compte à rebours aux
// ampoules, galerie encadrée, billet de théâtre avec QR code. Clé stable : 'lever-de-rideau'.
// Ce fichier est minuscule : CSS, polices et sections sont chargés à la demande dans un chunk séparé.
import { TEXT_GROUPS } from './texts';

const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#12090a' }} />;
}

function wrap(section, min) {
  const Lazy = lazySection(section);
  return function RideauSection(props) {
    return (
      <Suspense fallback={<Fallback min={min} />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

function Wrapper({ children }) {
  return (
    <Suspense fallback={<Fallback min="100vh" />}>
      <FrameLazy>{children}</FrameLazy>
    </Suspense>
  );
}

const tokens = {
  colorBg: '#f6ebd6',
  colorSurface: '#fdf6e8',
  colorPrimary: '#6b0f1f',
  colorSecondary: '#6b0f1f', // velours cramoisi : texte blanc lisible sur les boutons de la page du livre d'or par QR code
  colorText: '#2a0a0f',
  colorTextMuted: '#6d4a45',
  colorAccent: '#e2be77',
  fontHeading: "'LR Display', 'Cinzel', Georgia, 'Times New Roman', serif",
  fontBody: "'LR Serif', 'Spectral', Georgia, 'Times New Roman', serif",
  radius: '6px',
};

export default {
  key: 'lever-de-rideau',
  name: 'Le Lever de rideau',
  tokens,
  // Textes que l'organisateur peut personnaliser dans l'administration (voir texts.js).
  texts: TEXT_GROUPS,
  // Charge les polices du template pour les autres pages de l'invitation (ex. livre d'or par QR code) qui reprennent son identité.
  loadAssets: () => import('./fonts.css'),
  Wrapper,
  sectionComponents: {
    cover: wrap('Cover', '100vh'),
    countdown: wrap('Countdown', '40vh'),
    program: wrap('Program', '40vh'),
    gallery: wrap('Gallery', '60vh'),
    map: wrap('Place', '40vh'),
    rsvp: wrap('Finale', '60vh'),
    contact: wrap('Contact', '0px'),
  },
};
