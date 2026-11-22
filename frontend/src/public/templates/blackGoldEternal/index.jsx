import { lazy, Suspense } from 'react';

// BLACK & GOLD ETERNAL — template « mariage religieux » noir, or champagne et ivoire (clé stable : 'black-gold-eternal',
// identique dans prisma/seed.js et templateCatalog.service.js). Ce fichier est minuscule : CSS, polices et sections sont
// chargés à la demande dans un chunk séparé, comme Noir Gala et Royal Editorial.
const loadChunk = () => import('./sections.jsx');
const Frame = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#080706' }} />;
}

function wrapSection(name, min) {
  const Lazy = lazySection(name);
  return function BlackGoldSection(props) {
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
  colorBg: '#080706',
  colorSurface: '#15110d',
  colorPrimary: '#080706',
  colorSecondary: '#d6ad60', // or champagne
  colorText: '#f5efe4', // ivoire
  colorTextMuted: '#bdb3a2',
  colorAccent: '#ebc879', // or lumineux
  fontHeading: "'BGE Display', 'Cormorant Garamond', Garamond, 'Times New Roman', Georgia, serif",
  fontBody: "'BGE Sans', Manrope, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  radius: '0px',
};

export default {
  key: 'black-gold-eternal',
  name: 'Black & Gold Eternal',
  tokens,
  Wrapper,
  sectionComponents: {
    cover: wrapSection('Cover', '100vh'),
    countdown: wrapSection('Countdown', '50vh'),
    program: wrapSection('Program', '40vh'),
    gallery: wrapSection('Gallery', '60vh'),
    map: wrapSection('Place', '40vh'),
    rsvp: wrapSection('Rsvp', '60vh'),
    contact: wrapSection('Contact', '0px'),
  },
};
