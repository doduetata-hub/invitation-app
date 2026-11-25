import { lazy, Suspense } from 'react';

// LA PORTE — l'invitation arrive en main propre : un messager frappe à la porte de l'invité, la porte s'ouvre, une enveloppe scellée lui est
// remise. Puis une invitation nuit & or : portrait sous une arche, programme en frise lumineuse, billet QR. Clé stable : 'la-porte'.
// Ce fichier est minuscule : CSS, polices et sections sont chargés à la demande dans un chunk séparé.
import { TEXT_GROUPS } from './texts';

const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#0b0c11' }} />;
}

function wrap(section, min) {
  const Lazy = lazySection(section);
  return function PorteSection(props) {
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
  colorBg: '#0b0c11',
  colorSurface: '#14161d',
  colorPrimary: '#0b0c11',
  colorSecondary: '#8a6a2f', // or foncé : texte blanc lisible sur les boutons de la page du livre d'or par QR code
  colorText: '#f4ecdc',
  colorTextMuted: '#b9b09c',
  colorAccent: '#d8b878',
  fontHeading: "'LP Serif', 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  fontBody: "'LP Sans', 'Jost', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  radius: '2px',
};

export default {
  key: 'la-porte',
  name: 'La Porte',
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
