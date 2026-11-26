import { useEffect, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import { getEventTimestamp } from '../../../shared/utils/eventDateTime';
import { pad2 } from '../soireeKit/utils';
import { Head } from './Ornaments';
import { getText } from './texts';
import { flightOf } from './flight';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60), diff };
}
const UNITS = [['days', 'Jours'], ['hours', 'Heures'], ['minutes', 'Minutes'], ['seconds', 'Secondes']];

// Compte à rebours : un panneau des départs à volets tournants (chaque chiffre bascule quand il change). Sans date, rien n'est affiché.
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
  const flight = flightOf(invitation);
  return (
    <section className="em-count em-dark" aria-label="Compte à rebours">
      <Reveal>
        <Head eyebrow={finished ? 'Merci' : getText(invitation, 'countEyebrow')} title={finished ? 'Quel beau voyage' : getText(invitation, 'countTitle')} />
      </Reveal>
      <Reveal delay={80}>
        <div className="em-board">
          <p className="em-board__top"><span>{getText(invitation, 'countBoard')}</span><b>{flight.code}</b></p>
          {flight.destination && <p className="em-board__dest">{flight.destination}</p>}
          {finished ? (
            <p className="em-board__done">{longAgo ? `Arrivés à destination le ${flight.long}.` : "C'est aujourd'hui !"}</p>
          ) : (
            <>
              <p className="em-sr">{`Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
              <ol className="em-flaps" aria-hidden="true">
                {UNITS.map(([u, l]) => (
                  <li key={u}>
                    <span className="em-flaps__digits">
                      {pad2(p[u]).split('').map((c, i, all) => <b key={`${all.length - i}-${c}`}>{c}</b>)}
                    </span>
                    <span className="em-flaps__l">{l}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </Reveal>
    </section>
  );
}
