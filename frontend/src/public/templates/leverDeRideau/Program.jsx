import Reveal from '../soireeKit/Reveal';
import { Head, Prop } from './Ornaments';
import { getText } from './texts';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

// Le programme comme à l'affiche : chaque moment est un acte, sur le papier du programme. Les moments viennent uniquement du
// programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  const act = getText(invitation, 'actLabel');
  return (
    <section className="lr-prog lr-dark" aria-label="Programme">
      <div className="lr-programme lr-programme--acts">
        <Reveal><Head eyebrow={getText(invitation, 'progEyebrow')} title={getText(invitation, 'progTitle')} prop="lyre" /></Reveal>
        <ol className="lr-acts">
          {events.map((ev, i) => (
            <Reveal as="li" key={ev.id || `${ev.title}-${i}`} className="lr-act" delay={Math.min(i, 3) * 70}>
              <span className="lr-act__n">{act} {ROMAN[i] || i + 1}</span>
              {ev.time && <span className="lr-act__t">{ev.time}</span>}
              <span className="lr-act__h">{ev.title}</span>
              {ev.location && <span className="lr-act__w">{ev.location}</span>}
              {ev.description && <span className="lr-act__d">{ev.description}</span>}
            </Reveal>
          ))}
        </ol>
        <Prop name="laurel" className="lr-acts__end" />
      </div>
    </section>
  );
}
