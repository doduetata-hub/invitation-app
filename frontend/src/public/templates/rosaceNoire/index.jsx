import { lazy, Suspense } from 'react';

// ROSACE NOIRE — mariage religieux, noir & noir : un portrait dans une rosace dont l'inscription tourne, des noms géants, un déroulé
// façon feuillet de célébration, des tirages qui s'empilent, deux alliances pour le dress code et un billet QR. Clé stable : 'rosace-noire'.
// Ce fichier est minuscule : CSS, polices et sections sont chargés à la demande dans un chunk séparé.
const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#171713' }} />;
}

function wrap(section, min) {
  const Lazy = lazySection(section);
  return function RosaceSection(props) {
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
  colorBg: '#171713',
  colorSurface: '#201f1b',
  colorPrimary: '#171713',
  colorSecondary: '#8a7246', // or foncé : texte blanc lisible sur les boutons de la page du livre d'or par QR code
  colorText: '#f5f1e9',
  colorTextMuted: '#bdb6a8',
  colorAccent: '#d8c08e',
  fontHeading: "'NV Display', 'Playfair Display', Georgia, 'Times New Roman', serif",
  fontBody: "'NV Sans', 'DM Sans', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  radius: '2px',
};

export default {
  key: 'rosace-noire',
  name: 'Rosace Noire',
  tokens,
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
