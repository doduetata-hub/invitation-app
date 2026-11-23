import { useEffect, useState } from 'react';
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
            <ol className="nv-clock" aria-hidden="true">
              {UNITS.map(([k, l]) => <li key={k}><b>{pad2(p[k])}</b><span>{l}</span></li>)}
            </ol>
          </>
        )}
      </Reveal>
    </section>
  );
}
