import { useEffect, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { pad2 } from '../soireeKit/utils';
import { Head } from './Ornaments';
import { getText } from './texts';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60), diff };
}
const UNITS = [['days', 'Jours'], ['hours', 'Heures'], ['minutes', 'Minutes'], ['seconds', 'Secondes']];

// Compte à rebours jusqu'à l'instant réel de l'événement : quatre lanternes qui flottent. Sans date, rien n'est affiché.
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
    <section className="ll-count ll-dark" aria-label="Compte à rebours">
      <Reveal>
        <Head eyebrow={finished ? 'Merci' : getText(invitation, 'countEyebrow')} title={finished ? 'Quelle belle nuit' : getText(invitation, 'countTitle')} />
        {finished ? (
          <p className="ll-count__done">{longAgo ? `Nous avons célébré ce moment le ${long}.` : "C'est ce soir !"}</p>
        ) : (
          <>
            <p className="ll-sr">{`Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
            <ol className="ll-glow-row" aria-hidden="true">
              {UNITS.map(([u, l], i) => (
                <li key={u} style={{ '--n': i }}>
                  <span className="ll-glow"><b>{pad2(p[u])}</b></span>
                  <span className="ll-glow__l">{l}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Reveal>
    </section>
  );
}
