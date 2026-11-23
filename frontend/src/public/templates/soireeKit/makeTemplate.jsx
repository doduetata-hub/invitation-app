import { lazy, Suspense } from 'react';

// Fabrique des templates « soirée » : chaque template (clé, nom, palette, thème visuel, composition de la couverture) est un petit
// fichier qui appelle cette fonction ; tout le reste (CSS, polices, sections) est chargé à la demande dans un chunk séparé.
const loadChunk = () => import('./sections.jsx');
const FrameLazy = lazy(() => loadChunk().then((m) => ({ default: m.Frame })));
const lazySection = (name) => lazy(() => loadChunk().then((m) => ({ default: m[name] })));

export default function makeTemplate({ key, name, theme, tokens, hero, calendar }) {
  const Fallback = ({ min = '40vh' }) => <div aria-hidden="true" style={{ minHeight: min, background: tokens.colorBg }} />;
  const wrap = (section, min, extra = {}) => {
    const Lazy = lazySection(section);
    return function SoireeSection(props) {
      return (
        <Suspense fallback={<Fallback min={min} />}>
          <Lazy {...props} {...extra} />
        </Suspense>
      );
    };
  };
  function Wrapper({ children }) {
    return (
      <Suspense fallback={<Fallback min="100vh" />}>
        <FrameLazy theme={theme}>{children}</FrameLazy>
      </Suspense>
    );
  }
  return {
    key,
    name,
    tokens,
    // Charge les polices du template pour les autres pages de l'invitation (ex. livre d'or par QR code) qui reprennent son identité.
    loadAssets: () => import('./fonts.css'),
    Wrapper,
    sectionComponents: {
      cover: wrap('Cover', '100vh', { variant: hero, calendar }),
      countdown: wrap('Countdown', '40vh'),
      program: wrap('Program', '40vh'),
      gallery: wrap('Gallery', '60vh'),
      map: wrap('Place', '40vh'),
      rsvp: wrap('Finale', '60vh'),
      contact: wrap('Contact', '0px'),
    },
  };
}
