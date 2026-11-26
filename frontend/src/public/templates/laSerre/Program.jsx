import Reveal from '../soireeKit/Reveal';
import { Head } from './Ornaments';
import { getText } from './texts';
import budUrl from './assets/bud.webp';
import halfUrl from './assets/bloom-half.webp';
import bloomUrl from './assets/bloom.webp';

// Programme : une tige unique, et la pivoine qui s'ouvre au fil de la journée (bouton, éclosion, pleine fleur).
// Les moments viennent uniquement du programme enregistré dans l'administration.
function stageOf(i, total) {
  if (total === 1) return bloomUrl;
  const p = i / (total - 1);
  if (p < 0.34) return budUrl;
  return p < 0.67 ? halfUrl : bloomUrl;
}

export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  return (
    <section className="ls-prog ls-light" aria-label="Programme">
      <Reveal><Head eyebrow={getText(invitation, 'progEyebrow')} title={getText(invitation, 'progTitle')} sub={getText(invitation, 'progText')} /></Reveal>
      <ol className="ls-stem">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} className="ls-step" delay={Math.min(i, 3) * 60}>
            <span className="ls-step__flower" aria-hidden="true"><img src={stageOf(i, events.length)} alt="" loading="lazy" /></span>
            <div className="ls-step__body">
              {ev.time && <span className="ls-step__t">{ev.time}</span>}
              <span className="ls-step__h">{ev.title}</span>
              {ev.location && <span className="ls-step__w">{ev.location}</span>}
              {ev.description && <span className="ls-step__d">{ev.description}</span>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
