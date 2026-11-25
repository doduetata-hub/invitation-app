import Reveal from '../soireeKit/Reveal';
import { Head } from './Ornaments';
import { getText } from './texts';

// Programme : chaque moment est une plaque de laiton vissée (l'heure gravée), suivie de son intitulé — comme les plaques d'une porte d'hôtel.
// Une seule colonne, rien n'est jamais coupé. Les moments viennent uniquement du programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  return (
    <section className="lp-prog lp-light" aria-label="Programme">
      <Reveal><Head eyebrow={getText(invitation, 'progEyebrow')} title={getText(invitation, 'progTitle')} sub={getText(invitation, 'progText')} /></Reveal>
      <ol className="lp-plates">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} className="lp-plate" delay={Math.min(i, 3) * 70}>
            <span className="lp-plate__t">{ev.time || '—'}</span>
            <div className="lp-plate__body">
              <span className="lp-plate__h">{ev.title}</span>
              {ev.location && <span className="lp-plate__w">{ev.location}</span>}
              {ev.description && <span className="lp-plate__d">{ev.description}</span>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
