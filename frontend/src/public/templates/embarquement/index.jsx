import { lazy, Suspense } from 'react';

// L'EMBARQUEMENT — « Destination : notre mariage ». L'invité ouvre le volet de son hublot, le soleil se lève sur les nuages et sa carte
// d'embarquement se pose. Puis une invitation d'âge d'or du voyage : portrait dans un hublot, panneau des départs, itinéraire à tampons,
// cartes postales, enregistrement et carte d'embarquement QR. Clé stable : 'embarquement'.
// Ce fichier est minuscule : CSS, polices et sections sont chargés à la demande dans un chunk séparé.
import { TEXT_GROUPS } from './texts';

const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#101f3c' }} />;
}

function wrap(section, min) {
  const Lazy = lazySection(section);
  return function EmbarquementSection(props) {
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
  colorBg: '#f5eedf',
  colorSurface: '#fbf7ee',
  colorPrimary: '#101f3c',
  colorSecondary: '#101f3c', // bleu nuit : texte blanc lisible sur les boutons de la page du livre d'or par QR code
  colorText: '#101f3c',
  colorTextMuted: '#4c5a75',
  colorAccent: '#e3ae55',
  fontHeading: "'EM Display', 'Italiana', Georgia, 'Times New Roman', serif",
  fontBody: "'EM Sans', 'Albert Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  radius: '10px',
};

export default {
  key: 'embarquement',
  name: "L'Embarquement",
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
