import { useEffect, useState } from 'react';
import Reveal from './Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { pad2 } from './utils';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60), diff };
}
const UNITS = [['days', 'Jours'], ['hours', 'Heures'], ['minutes', 'Minutes'], ['seconds', 'Secondes']];

// Compte à rebours jusqu'à l'instant réel de l'événement (date + heure du lieu). Sans date, la section n'est pas affichée.
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
    <section className="sk-count" aria-label="Compte à rebours">
      <Reveal>
        <h2 className="sk-script sk-h2">{finished ? 'Merci' : 'Le grand jour approche'}</h2>
        {finished ? (
          <p className="sk-count__done">{longAgo ? `Nous avons célébré cette union le ${long}.` : "C'est aujourd'hui !"}</p>
        ) : (
          <>
            <p className="sk-sr">{`Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
            <ol className="sk-clock" aria-hidden="true">
              {UNITS.map(([k, l]) => <li key={k}><b>{pad2(p[k])}</b><span>{l}</span></li>)}
            </ol>
          </>
        )}
      </Reveal>
    </section>
  );
}
