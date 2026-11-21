import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { Icon, iconKeyFor } from './ornaments';

// Programme : frise verticale dorée, un pictogramme dessiné par moment (reconnu d'après son intitulé).
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  const date = invitation.eventDate ? formatEventDate(invitation.eventDate, { weekday: 'long', day: 'numeric', month: 'long' }) : null;
  return (
    <section className="ng-prog" aria-label="Programme">
      <div className="ng-prog__in">
        <Reveal>
          <h2 className="ng-script ng-foil ng-script--lg">Programme</h2>
          {date && <p className="ng-label ng-cap">{date}</p>}
        </Reveal>
        <ol className="ng-tl">
          {events.map((ev, i) => (
            <Reveal as="li" className="ng-tl__i" key={ev.id || `${ev.title}-${i}`} delay={Math.min(i, 3) * 70}>
              <span className="ng-tl__badge"><Icon name={iconKeyFor(ev.title)} /></span>
              <div className="ng-tl__body">
                <span className="ng-tl__time">{ev.time || '—'}</span>
                <h3 className="ng-tl__t">{ev.title}</h3>
                {ev.location && <p className="ng-tl__w">{ev.location}</p>}
                {ev.description && <p className="ng-tl__d">{ev.description}</p>}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
