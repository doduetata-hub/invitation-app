import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';

// Programme : frise verticale dorée, un point par moment.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  const date = invitation.eventDate ? formatEventDate(invitation.eventDate, { weekday: 'long', day: 'numeric', month: 'long' }) : null;
  return (
    <section className="ng-band ng-prog" aria-label="Programme">
      <Reveal>
        <p className="ng-kicker">Le déroulé</p>
        <h2 className="ng-h2 ng-h2--solo">Programme</h2>
        {date && <p className="ng-muted ng-cap">{date}</p>}
      </Reveal>
      <ol className="ng-tl">
        {events.map((ev, i) => (
          <Reveal as="li" className="ng-tl__i" key={ev.id || `${ev.title}-${i}`} delay={Math.min(i, 3) * 70}>
            <span className="ng-tl__dot" aria-hidden="true" />
            <span className="ng-tl__time">{ev.time || '—'}</span>
            <h3 className="ng-tl__t">{ev.title}</h3>
            {ev.location && <p className="ng-tl__w">{ev.location}</p>}
            {ev.description && <p className="ng-tl__d">{ev.description}</p>}
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
