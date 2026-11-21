import { lazy, Suspense } from 'react';

// NOIR GALA — template « soirée de gala » noir et or (clé stable : 'noir-gala', identique dans prisma/seed.js et templateCatalog.service.js).
// Comme Royal Editorial : ce fichier est minuscule, tout le reste (CSS, sections) est chargé à la demande dans un chunk séparé.
const loadChunk = () => import('./sections.jsx');
const Frame = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#0a0908' }} />;
}

function wrapSection(name, min) {
  const Lazy = lazySection(name);
  return function NoirSection(props) {
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

const tokens = {
  colorBg: '#0a0908',
  colorSurface: '#15110e',
  colorPrimary: '#0a0908',
  colorSecondary: '#c8a45a', // or
  colorText: '#f3ecdf', // ivoire
  colorTextMuted: '#b9ae9c',
  colorAccent: '#e6cf98', // or clair
  fontHeading: "'Noir Serif', 'Libre Baskerville', Georgia, 'Times New Roman', serif",
  fontBody: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  radius: '0px',
};

export default {
  key: 'noir-gala',
  name: 'Noir Gala',
  tokens,
  Wrapper,
  sectionComponents: {
    cover: wrapSection('Cover', '100vh'),
    countdown: wrapSection('SaveTheDate', '60vh'),
    program: wrapSection('Program', '40vh'),
    gallery: wrapSection('Gallery', '60vh'),
    map: wrapSection('Place', '40vh'),
    rsvp: wrapSection('Rsvp', '60vh'),
    contact: wrapSection('Contact', '30vh'),
  },
};
