import { useEffect, useRef, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { pad2 } from '../soireeKit/utils';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60), diff };
}
const UNITS = [['days', 'Jours'], ['hours', 'Heures'], ['minutes', 'Minutes'], ['seconds', 'Secondes']];

// Compte à rebours jusqu'à l'instant réel de la cérémonie (date + heure du lieu). Sans date, la section n'est pas affichée.
export default function Countdown({ invitation }) {
  const { eventDate, eventTime } = invitation;
  const target = getEventTimestamp(eventDate, eventTime);
  const [p, setP] = useState(() => (target === null ? null : parts(target)));
  // Première apparition : les chiffres montent de 0 à leur valeur (1,3 s, une seule fois). Sans animation si l'utilisateur les a réduites.
  const clockRef = useRef(null);
  const [k, setK] = useState(() => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0));
  useEffect(() => {
    if (k === 1) return undefined;
    const el = clockRef.current;
    let raf;
    let started = false;
    const run = () => {
      if (started) return;
      started = true;
      const t0 = performance.now();
      const step = (t) => {
        const x = Math.min(1, (t - t0) / 1300);
        setK(1 - (1 - x) ** 3);
        if (x < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const safety = setTimeout(run, 20000); // filet de sécurité seulement : l'animation se lance normalement à la première apparition
    let io;
    if (el && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(el);
    } else run();
    return () => { clearTimeout(safety); if (io) io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [k === 1]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (target === null) return undefined;
    setP(parts(target));
    const t = setInterval(() => setP(parts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (target === null || !p) return null;
  const finished = p.diff === 0;
  const longAgo = finished && Date.now() - target > 86400000;
  const long = formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="nv-count" aria-label="Compte à rebours">
      <Reveal>
        <p className="nv-eyebrow nv-eyebrow--ink">{finished ? 'Merci' : 'Le grand jour approche'}</p>
        <h2 className="nv-h2">{finished ? <>Une journée<br /><em>bénie.</em></> : <>Un rendez-vous<br /><em>avec l'amour.</em></>}</h2>
        {finished ? (
          <p className="nv-count__done">{longAgo ? `Nous avons célébré cette union le ${long}.` : "C'est aujourd'hui !"}</p>
        ) : (
          <>
            <p className="nv-sr">{`Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
            <ol className="nv-clock" aria-hidden="true" ref={clockRef}>
              {UNITS.map(([u, l]) => <li key={u}><b>{pad2(Math.round(p[u] * k))}</b><span>{l}</span></li>)}
            </ol>
          </>
        )}
      </Reveal>
    </section>
  );
}
