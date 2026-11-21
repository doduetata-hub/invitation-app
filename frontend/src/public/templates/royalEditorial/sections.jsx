// Point d'entrée du chunk « Royal Editorial » chargé à la demande : CSS, polices, sections, lightbox.
// Rien de ce module n'est importé par le registre (voir index.jsx) : les neuf templates existants ne le chargent jamais.
import { useEffect } from 'react';
import './royal.css';

export { default as Cover } from './Cover';
export { default as Countdown } from './Countdown';
export { default as Program } from './Program';
export { default as Gallery } from './Gallery';
export { default as Place } from './Place';
export { default as Rsvp } from './Rsvp';
export { default as Contact } from './Contact';

// Cadre commun : conteneur racine + navigation par ancre (/i/slug#rsvp).
// Le navigateur fait défiler vers l'ancre au chargement, avant que les sections (chargées à la demande) n'existent : on
// refait donc ce défilement UNE fois, quand la hauteur de la page s'est stabilisée, sauf si l'invité a déjà commencé à défiler.
export function Frame({ children }) {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!/^[a-z]+$/.test(id)) return undefined;
    let cancelled = false;
    let tries = 0;
    let last = -1;
    let stable = 0;
    let timer;
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const cancel = () => { cancelled = true; };
    events.forEach((e) => window.addEventListener(e, cancel, { once: true, passive: true }));
    const tick = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      const h = document.documentElement.scrollHeight;
      stable = h === last ? stable + 1 : 0;
      last = h;
      if (el && stable >= 3) { el.scrollIntoView({ block: 'start' }); return; }
      if (++tries < 40) timer = setTimeout(tick, 100);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, cancel));
    };
  }, []);
  return <div className="re-root">{children}</div>;
}
