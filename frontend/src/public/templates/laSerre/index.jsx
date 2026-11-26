import { lazy, Suspense } from 'react';

// LA SERRE — une verrière fleurie au lever du soleil. L'invité essuie la buée sur la vitre, la serre apparaît avec les noms, les pivoines
// s'écartent. Puis une invitation claire et végétale : portrait dans une arche, programme le long d'une tige qui fleurit, photos en
// herbier, billet QR en étiquette botanique. Clé stable : 'la-serre'.
// Ce fichier est minuscule : CSS, polices et sections sont chargés à la demande dans un chunk séparé.
import { TEXT_GROUPS } from './texts';

const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#f4f1e8' }} />;
}

function wrap(section, min) {
  const Lazy = lazySection(section);
  return function SerreSection(props) {
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
  colorBg: '#f4f1e8',
  colorSurface: '#fbf9f3',
  colorPrimary: '#1f3d31',
  colorSecondary: '#1f3d31', // vert verrière : texte blanc lisible sur les boutons de la page du livre d'or par QR code
  colorText: '#1f3d31',
  colorTextMuted: '#4f6457',
  colorAccent: '#a8854a',
  fontHeading: "'LS Display', 'Libre Caslon Display', Georgia, 'Times New Roman', serif",
  fontBody: "'LS Sans', 'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  radius: '10px',
};

export default {
  key: 'la-serre',
  name: 'La Serre',
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
