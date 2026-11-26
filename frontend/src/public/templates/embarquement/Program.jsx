import Reveal from '../soireeKit/Reveal';
import { Head } from './Ornaments';
import { getText } from './texts';
import ringsUrl from './assets/stamp-rings.webp';
import heartUrl from './assets/stamp-heart.webp';
import sunUrl from './assets/stamp-sun.webp';
import compassUrl from './assets/stamp-compass.webp';
import palmUrl from './assets/stamp-palm.webp';
import planeUrl from './assets/stamp-plane.webp';

const STAMPS = [planeUrl, ringsUrl, palmUrl, heartUrl, sunUrl, compassUrl];

// Programme : un itinéraire sur la carte du monde, chaque moment est une escale marquée d'un tampon.
// Les moments viennent uniquement du programme enregistré dans l'administration.
export default function Program({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;
  const stop = getText(invitation, 'progStop');
  return (
    <section className="em-prog em-light" aria-label="Programme">
      <Reveal><Head eyebrow={getText(invitation, 'progEyebrow')} title={getText(invitation, 'progTitle')} sub={getText(invitation, 'progText')} /></Reveal>
      <ol className="em-route">
        {events.map((ev, i) => (
          <Reveal as="li" key={ev.id || `${ev.title}-${i}`} className="em-leg" delay={Math.min(i, 3) * 60}>
            <span className="em-leg__stamp" aria-hidden="true"><img src={STAMPS[i % STAMPS.length]} alt="" loading="lazy" /></span>
            <div className="em-leg__card">
              <p className="em-leg__top"><span>{stop} {i + 1}</span>{ev.time && <b>{ev.time}</b>}</p>
              <p className="em-leg__h">{ev.title}</p>
              {ev.location && <p className="em-leg__w">{ev.location}</p>}
              {ev.description && <p className="em-leg__d">{ev.description}</p>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
