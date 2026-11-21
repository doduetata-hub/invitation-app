import { useEffect, useState } from 'react';
import Reveal from '../royalEditorial/Reveal';
import { getEventTimestamp, formatEventDate } from '../../../shared/utils/eventDateTime';
import { monthGrid, WEEKDAYS, mediaOf, pad2 } from './utils';
import Pic from './Pic';

function parts(target) {
  const diff = Math.max(0, target - Date.now());
  return { days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24), minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60) };
}
// Anneaux : la part de chaque unité (jours : sur 100, au-delà l'anneau est plein).
const UNITS = [['days', 'jours', 100], ['hours', 'heures', 24], ['minutes', 'minutes', 60], ['seconds', 'secondes', 60]];
const R = 26;
const C = 2 * Math.PI * R;

function Ring({ value, max, label }) {
  const frac = Math.min(1, value / max);
  return (
    <div className="ng-ring">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="ng-ring__bg" cx="32" cy="32" r={R} />
        <circle className="ng-ring__fg" cx="32" cy="32" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <b>{pad2(value)}</b>
      <span>{label}</span>
    </div>
  );
}

// « Save the date » : calendrier du mois posé contre une photo en arche, jour cerclé d'or, anneaux de compte à rebours,
// et le numéro du jour en relief ton sur ton derrière le tout.
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

  const { gallery } = mediaOf(invitation);
  const photo = gallery.find((m, i) => i >= 2 && !(m.mimeType || '').startsWith('video/')) || gallery[2] || null;
  const { cells, day } = monthGrid(eventDate);
  const month = formatEventDate(eventDate, { month: 'long', year: 'numeric' });
  const finished = p.days === 0 && p.hours === 0 && p.minutes === 0 && p.seconds === 0;

  return (
    <section className="ng-std" aria-label="Save the date">
      <span className="ng-std__ghost" aria-hidden="true">{pad2(day)}</span>
      <div className="ng-std__in">
        <Reveal><h2 className="ng-script ng-foil ng-script--lg">Save the date</h2></Reveal>
        <div className={`ng-std__duo${photo ? ' has-photo' : ''}`}>
          {photo && (
            <Reveal className="ng-std__photo" delay={60}>
              <figure className="ng-arch"><Pic m={photo} sizes="(min-width: 700px) 300px, 60vw" /></figure>
            </Reveal>
          )}
          <Reveal className="ng-cal" delay={120}>
            <div role="img" aria-label={`Calendrier : ${formatEventDate(eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`}>
              <p className="ng-cal__month">{month}</p>
              <div className="ng-cal__grid" aria-hidden="true">
                {WEEKDAYS.map((w, i) => <span className="ng-cal__wd" key={`w${i}`}>{w}</span>)}
                {cells.map((c, i) => (
                  <span key={i} className={`ng-cal__d${c === day ? ' is-day' : ''}`}>
                    {c}
                    {c === day && <svg viewBox="0 0 48 48" className="ng-cal__ring"><circle cx="24" cy="24" r="21" pathLength="1" /></svg>}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <p className="ng-sr">{finished ? "L'événement a lieu maintenant." : `Il reste ${p.days} jours, ${p.hours} heures et ${p.minutes} minutes.`}</p>
        <Reveal delay={100}>
          <p className="ng-label ng-std__lead">{finished ? "C'est aujourd'hui" : 'Le grand jour approche'}</p>
          <div className="ng-rings4" aria-hidden="true">
            {UNITS.map(([k, l, max]) => <Ring key={k} value={p[k]} max={max} label={l} />)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
