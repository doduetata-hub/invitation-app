import Reveal from '../royalEditorial/Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { Icon, iconKeyFor } from './icons';
import { upFirst } from './utils';

// Programme : frise verticale, un pictogramme par moment. Les moments viennent uniquement du programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  const date = invitation.eventDate ? upFirst(formatEventDate(invitation.eventDate, { weekday: 'long', day: 'numeric', month: 'long' })) : null;
  return (
    <section className="bge-prog" aria-label="Programme">
      <Reveal>
        <h2 className="bge-h2">Notre programme</h2>
        {date && <p className="bge-sub">{date}</p>}
      </Reveal>
      <ol className="bge-tl">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} delay={Math.min(i, 3) * 70}>
            <span className="bge-tl__ico"><Icon name={iconKeyFor(ev.title)} /></span>
            <div>
              {ev.time && <span className="bge-label bge-tl__time">{ev.time}</span>}
              <h3 className="bge-tl__t">{ev.title}</h3>
              {ev.location && <p className="bge-tl__w">{ev.location}</p>}
              {ev.description && <p className="bge-tl__d">{ev.description}</p>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
