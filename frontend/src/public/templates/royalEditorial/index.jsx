import { lazy, Suspense } from 'react';

// ROYAL EDITORIAL — premier template premium (clé stable : 'royal-editorial', identique dans prisma/seed.js).
// Ce fichier est volontairement minuscule : il est importé par registry.js, tout le reste (CSS, polices, sections,
// lightbox) est chargé à la demande dans un chunk séparé, uniquement pour les invitations qui utilisent ce template.

const loadChunk = () => import('./sections.jsx');

const Frame = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

const INK = '#12100e';

function Fallback({ min = '40vh' }) {
  // Style en ligne : le CSS du template n'est pas encore chargé à ce moment-là.
  return <div aria-hidden="true" style={{ minHeight: min, background: INK }} />;
}

function wrapSection(name, min) {
  const Lazy = lazySection(name);
  return function RoyalSection(props) {
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
      <Frame>{children}</Frame>
    </Suspense>
  );
}

// Jetons par défaut (le thème de l'invitation peut les surcharger). Contrastes WCAG AA vérifiés — voir royal.css.
const tokens = {
  colorBg: '#f4efe6', // ivoire chaud
  colorSurface: '#fbf8f2',
  colorPrimary: '#12100e', // noir profond (bandes sombres)
  colorSecondary: '#6f5320', // or profond : texte/boutons sur ivoire (6,2:1)
  colorText: '#12100e',
  colorTextMuted: '#5f574d', // gris chaud (6,2:1 sur ivoire)
  colorAccent: '#cfb98a', // champagne (9,9:1 sur noir)
  fontHeading: "'Royal Serif', 'Libre Baskerville', Georgia, 'Times New Roman', serif",
  fontBody: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  radius: '0px',
};

export default {
  key: 'royal-editorial',
  name: 'Royal Editorial',
  tokens,
  Wrapper,
  sectionComponents: {
    cover: wrapSection('Cover', '100vh'),
    countdown: wrapSection('Countdown', '20vh'),
    program: wrapSection('Program', '40vh'),
    gallery: wrapSection('Gallery', '60vh'),
    map: wrapSection('Place', '40vh'),
    rsvp: wrapSection('Rsvp', '60vh'),
    contact: wrapSection('Contact', '30vh'),
  },
};
