import Reveal from './Reveal';
import { Icon, iconKeyFor, Flourish } from './icons';

// Programme de la soirée : frise centrale, un moment à gauche puis un à droite, pictogramme au trait sur la ligne.
// Les moments viennent uniquement du programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  return (
    <section className="sk-prog" aria-label="Programme">
      <Reveal>
        <p className="sk-kicker">Programme</p>
        <h2 className="sk-script sk-h2">de la soirée</h2>
        <Flourish />
      </Reveal>
      <ol className="sk-tl">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} className={i % 2 ? 'is-r' : 'is-l'} delay={Math.min(i, 3) * 60}>
            <div className="sk-tl__txt">
              {ev.time && <b className="sk-tl__time">{ev.time}</b>}
              <span className="sk-tl__t">{ev.title}</span>
              {ev.location && <span className="sk-tl__w">{ev.location}</span>}
              {ev.description && <span className="sk-tl__d">{ev.description}</span>}
            </div>
            <span className="sk-tl__ico"><Icon name={iconKeyFor(ev.title)} /></span>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
