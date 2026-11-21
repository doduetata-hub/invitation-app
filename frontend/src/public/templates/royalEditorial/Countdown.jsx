import { useEffect, useState } from 'react';
import { getEventTimestamp } from '../../../shared/utils/eventDateTime';
import Reveal from './Reveal';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

const UNITS = [
  ['days', 'Jours'],
  ['hours', 'Heures'],
  ['minutes', 'Minutes'],
  ['seconds', 'Secondes'],
];

// Quatre colonnes TOUJOURS sur une ligne (pas de retour à la ligne orphelin) : les chiffres se réduisent avec l'écran.
export default function Countdown({ invitation }) {
  const target = getEventTimestamp(invitation.eventDate, invitation.eventTime);
  const [p, setP] = useState(() => (target === null ? null : parts(target)));

  useEffect(() => {
    if (target === null) return undefined;
    setP(parts(target));
    const t = setInterval(() => setP(parts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  if (target === null || !p) return null;
  const finished = p.days === 0 && p.hours === 0 && p.minutes === 0 && p.seconds === 0;

  return (
    <div className="re-dark re-band re-count">
      <div className="re-wrap">
        <div className="re-count__head">
          <span className="re-kicker re-kicker--gold">{finished ? 'Aujourd\'hui' : 'Avant le grand jour'}</span>
        </div>
        {/* Texte stable pour les lecteurs d'écran (les chiffres changent chaque seconde, ils sont masqués) */}
        <p className="re-sr">
          {finished
            ? "L'événement a lieu maintenant."
            : `Il reste ${p.days} jour${p.days > 1 ? 's' : ''}, ${p.hours} heure${p.hours > 1 ? 's' : ''} et ${p.minutes} minute${p.minutes > 1 ? 's' : ''}.`}
        </p>
        <Reveal>
          <div className="re-count__grid" aria-hidden="true">
            {UNITS.map(([key, label]) => (
              <div className="re-count__cell" key={key}>
                <span className="re-count__num">{String(p[key]).padStart(2, '0')}</span>
                <span className="re-count__label">{label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
