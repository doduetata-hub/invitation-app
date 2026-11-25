import { useEffect, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { pad2 } from '../soireeKit/utils';
import { Divider } from './Ornaments';
import { getText } from './texts';

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
    <section className="lp-count" aria-label="Compte à rebours">
      <Reveal>
        <p className="lp-eyebrow">{finished ? 'Merci' : getText(invitation, 'countEyebrow')}</p>
        <h2 className="lp-h2 lp-h2--plain">
          {finished ? <>Une journée<br /><em>inoubliable.</em></> : <>{getText(invitation, 'countTitle1')}<br /><em>{getText(invitation, 'countTitle2')}</em></>}
        </h2>
        <Divider />
        {finished ? (
          <p className="lp-count__done">{longAgo ? `Nous avons célébré ce moment le ${long}.` : "C'est aujourd'hui !"}</p>
        ) : (
          <>
            <p className="lp-sr">{`Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
            <ol className="lp-clock" aria-hidden="true">
              {UNITS.map(([u, l]) => (
                <li key={u}>
                  <b>{pad2(p[u])}</b>
                  <span>{l}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </Reveal>
    </section>
  );
}
