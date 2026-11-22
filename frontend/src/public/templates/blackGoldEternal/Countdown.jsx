import { useEffect, useState } from 'react';
import Reveal from '../royalEditorial/Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { pad2 } from './utils';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60), diff };
}
const UNITS = [['days', 'Jours', 100], ['hours', 'Heures', 24], ['minutes', 'Minutes', 60], ['seconds', 'Secondes', 60]];
const R = 30;
const C = 2 * Math.PI * R;

function Ring({ value, max, label }) {
  const frac = Math.min(1, value / max);
  return (
    <li className="bge-ring">
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle className="bge-ring__bg" cx="36" cy="36" r={R} />
        <circle className="bge-ring__fg" cx="36" cy="36" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <b>{pad2(value)}</b>
      <span>{label}</span>
    </li>
  );
}

// Compte à rebours jusqu'à l'instant réel de l'événement (date + heure du lieu, voir eventDateTime). Sans date, la section n'est pas affichée.
export default function Countdown({ invitation }) {
  const { eventDate, eventTime } = invitation;
  const target = getEventTimestamp(eventDate, eventTime);
  const [p, setP] = useState(() => (target === null ? null : parts(target)));
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
    <section className="bge-count" aria-label="Compte à rebours">
      <Reveal>
        <h2 className="bge-h2">Compte à rebours</h2>
      </Reveal>
      {finished ? (
        <Reveal delay={80}>
          <p className="bge-count__done">{longAgo ? `Nous avons célébré cette union le ${long}.` : "C'est aujourd'hui !"}</p>
        </Reveal>
      ) : (
        <Reveal delay={80}>
          <p className="bge-sr">{`Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
          <ol className="bge-rings" aria-hidden="true">
            {UNITS.map(([k, l, max]) => <Ring key={k} value={p[k]} max={max} label={l} />)}
          </ol>
        </Reveal>
      )}
    </section>
  );
}
