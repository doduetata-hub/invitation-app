import { lazy, Suspense } from 'react';

// LES LANTERNES — une nuit au bord de la lagune. L'invité allume sa lanterne en maintenant le doigt, la lâche d'un geste vers le haut, le
// ciel s'illumine avec les noms. Puis une invitation nuit et ambre : portrait dans la pleine lune, compte à rebours en lanternes,
// programme au fil de l'eau, photos suspendues à une guirlande, billet QR. Clé stable : 'les-lanternes'.
// Ce fichier est minuscule : CSS, polices et sections sont chargés à la demande dans un chunk séparé.
import { TEXT_GROUPS } from './texts';

const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

function Fallback({ min = '40vh' }) {
  return <div aria-hidden="true" style={{ minHeight: min, background: '#061a22' }} />;
}

function wrap(section, min) {
  const Lazy = lazySection(section);
  return function LanternesSection(props) {
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
  colorBg: '#f7efe0',
  colorSurface: '#fffaf0',
  colorPrimary: '#0a2630',
  colorSecondary: '#0a2630', // bleu lagune : texte blanc lisible sur les boutons de la page du livre d'or par QR code
  colorText: '#0a2630',
  colorTextMuted: '#45606a',
  colorAccent: '#f2a33a',
  fontHeading: "'LL Display', 'Marcellus', Georgia, 'Times New Roman', serif",
  fontBody: "'LL Sans', 'Mulish', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  radius: '12px',
};

export default {
  key: 'les-lanternes',
  name: 'Les Lanternes',
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
