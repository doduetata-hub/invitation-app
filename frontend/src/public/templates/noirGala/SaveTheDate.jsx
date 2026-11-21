import { useEffect, useState } from 'react';
import Reveal from '../royalEditorial/Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { monthGrid, WEEKDAYS, pad2 } from './utils';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60) };
}
const UNITS = [['days', 'Jours'], ['hours', 'Heures'], ['minutes', 'Min'], ['seconds', 'Sec']];

// « Save the date » : vrai calendrier du mois (jour cerclé d'or qui se dessine) + compte à rebours.
export default function SaveTheDate({ invitation }) {
  const { eventDate, eventTime } = invitation;
  const target = getEventTimestamp(eventDate, eventTime);
  const [p, setP] = useState(() => (target === null ? null : parts(target)));
  useEffect(() => {
    if (target === null) return undefined;
    setP(parts(target));
    const t = setInterval(() => setP(parts(target)), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (target === null || !p || !eventDate) return null;

  const { cells, day } = monthGrid(eventDate);
  const month = formatEventDate(eventDate, { month: 'long', year: 'numeric' });
  const finished = p.days === 0 && p.hours === 0 && p.minutes === 0 && p.seconds === 0;

  return (
    <section className="ng-band ng-std" aria-label="Save the date">
      <Reveal><h2 className="ng-h2"><span>Save</span> the date</h2></Reveal>
      <Reveal delay={80}>
        <div className="ng-cal" role="img" aria-label={`Calendrier : ${formatEventDate(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
          <p className="ng-cal__month">{month}</p>
          <div className="ng-cal__grid" aria-hidden="true">
            {WEEKDAYS.map((w, i) => <span className="ng-cal__wd" key={`w${i}`}>{w}</span>)}
            {cells.map((c, i) => (
              <span key={i} className={`ng-cal__d${c === day ? ' is-day' : ''}`}>
                {c}
                {c === day && (
                  <svg viewBox="0 0 48 48" className="ng-cal__ring"><circle cx="24" cy="24" r="21" pathLength="1" /></svg>
                )}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
      <p className="ng-sr">{finished ? "L'événement a lieu maintenant." : `Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
      <Reveal delay={120}>
        <p className="ng-kicker ng-std__lead">{finished ? "C'est aujourd'hui" : 'Le compte à rebours'}</p>
        <div className="ng-count" aria-hidden="true">
          {UNITS.map(([k, l]) => (
            <div className="ng-count__c" key={k}><b>{pad2(p[k])}</b><span>{l}</span></div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
