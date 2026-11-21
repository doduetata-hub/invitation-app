// Point d'entrée du chunk « Noir Gala » chargé à la demande (voir index.jsx).
import { useEffect } from 'react';
import './noir.css';

export { default as Cover } from './Cover';
export { default as SaveTheDate } from './SaveTheDate';
export { default as Program } from './Program';
export { default as Gallery } from './Gallery';
export { default as Place } from './Place';
export { default as Rsvp } from './Rsvp';
export { default as Contact } from './Contact';

// Navigation par ancre (/i/slug#rsvp) : les sections sont chargées à la demande, on refait le défilement une fois la page stabilisée.
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
  return <div className="ng-root">{children}</div>;
}
