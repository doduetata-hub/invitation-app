import Reveal from '../soireeKit/Reveal';
import { TwoLines } from './Ornaments';
import { getText } from './texts';

// Ordre de la cérémonie, présenté comme le feuillet d'une célébration : intitulé, points de conduite, heure.
// Les moments viennent uniquement du programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  return (
    <section className="nv-prog" aria-label="Programme">
      <Reveal>
        <p className="nv-eyebrow">{getText(invitation, 'progEyebrow')}</p>
        <h2 className="nv-h2 nv-h2--light"><TwoLines a={getText(invitation, 'progTitle1')} b={getText(invitation, 'progTitle2')} /></h2>
      </Reveal>
      <ol className="nv-order">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} delay={Math.min(i, 4) * 60}>
            <div className="nv-order__row">
              <span className="nv-order__t">{ev.title}</span>
              {ev.time && <><span className="nv-order__dots" aria-hidden="true" /><b className="nv-order__time">{ev.time}</b></>}
            </div>
            {(ev.location || ev.description) && <p className="nv-order__sub">{[ev.location, ev.description].filter(Boolean).join(' — ')}</p>}
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
