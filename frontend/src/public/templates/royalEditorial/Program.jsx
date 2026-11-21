import Reveal from './Reveal';
import { formatEventDate } from '../../../shared/utils/eventDateTime';

// Chronologie : colonne d'intitulé (fixe sur grand écran) + liste des moments séparés par des filets.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  const date = invitation.eventDate ? formatEventDate(invitation.eventDate, { weekday: 'long', day: 'numeric', month: 'long' }) : null;

  return (
    <div className="re-band">
      <div className="re-wrap re-prog">
        <Reveal className="re-prog__side">
          <span className="re-kicker re-kicker--gold">Le déroulé</span>
          <h2 className="re-h2">Le programme</h2>
          {date && <p className="re-muted" style={{ textTransform: 'capitalize' }}>{date}</p>}
        </Reveal>
        <ol className="re-prog__list" aria-label="Programme de la journée">
          {events.map((ev, i) => (
            <Reveal as="li" className="re-prog__item" key={ev.id || `${ev.title}-${i}`} delay={Math.min(i, 3) * 60}>
              <span className="re-prog__time">{ev.time || '—'}</span>
              <div>
                <h3 className="re-prog__title">{ev.title}</h3>
                {ev.location && <p className="re-prog__where">{ev.location}</p>}
                {ev.description && <p className="re-prog__desc">{ev.description}</p>}
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </div>
  );
}
