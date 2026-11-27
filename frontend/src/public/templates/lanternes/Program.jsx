import Reveal from '../soireeKit/Reveal';
import { Head } from './Ornaments';
import { getText } from './texts';
import lilyUrl from './assets/lily.webp';
import candleUrl from './assets/candle.webp';
import budUrl from './assets/bud.webp';
import lanternUrl from './assets/lantern-small.webp';
import frangipaniUrl from './assets/frangipani.webp';
import padUrl from './assets/pad.webp';

const FLOATS = [lilyUrl, candleUrl, budUrl, lanternUrl, frangipaniUrl, padUrl];

// Programme « au fil de l'eau » : chaque moment dérive sur la lagune, à côté d'un nénuphar ou d'une lumière.
// Les moments viennent uniquement du programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  return (
    <section className="ll-prog ll-dark" aria-label="Programme">
      <Reveal><Head eyebrow={getText(invitation, 'progEyebrow')} title={getText(invitation, 'progTitle')} sub={getText(invitation, 'progText')} /></Reveal>
      <ol className="ll-river">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} className="ll-drift" delay={Math.min(i, 3) * 70}>
            <span className="ll-drift__float" aria-hidden="true"><img src={FLOATS[i % FLOATS.length]} alt="" loading="lazy" style={{ '--n': i }} /></span>
            <div className="ll-drift__card">
              {ev.time && <span className="ll-drift__t">{ev.time}</span>}
              <span className="ll-drift__h">{ev.title}</span>
              {ev.location && <span className="ll-drift__w">{ev.location}</span>}
              {ev.description && <span className="ll-drift__d">{ev.description}</span>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
