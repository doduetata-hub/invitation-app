import { useCallback, useEffect, useState } from 'react';
import Reveal from '../royalEditorial/Reveal';
import { mediaOf, isVideo } from './utils';
import Pic from './Pic';

// Galerie : arches défilantes (aimantées, une à une sur mobile) + visionneuse plein écran au toucher.
export default function Gallery({ invitation }) {
  const { gallery } = mediaOf(invitation);
  const [open, setOpen] = useState(null);
  const total = gallery.length;
  const go = useCallback((d) => setOpen((i) => (i === null ? i : (i + d + total) % total)), [total]);

  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, go]);

  if (total === 0) return null;
  const alt = (i) => `Photographie ${i + 1} sur ${total}${invitation.namesLine ? ` de ${invitation.namesLine}` : ''}`;
  const cur = open === null ? null : gallery[open];

  return (
    <section className="ng-gal" aria-label="Galerie">
      <Reveal className="ng-gal__head">
        <h2 className="ng-script ng-foil ng-script--lg">Nos souvenirs</h2>
        <p className="ng-label">Faites glisser pour parcourir</p>
      </Reveal>
      <ul className="ng-gal__row">
        {gallery.map((m, i) => (
          <li key={m.id || i}>
            <button type="button" className="ng-gal__b ng-arch" onClick={() => setOpen(i)} aria-label={`Agrandir : ${alt(i)}`}>
              {isVideo(m)
                ? <video src={m.url} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
                : <Pic m={m} sizes="(min-width: 700px) 300px, 72vw" />}
            </button>
          </li>
        ))}
      </ul>
      {cur && (
        <div className="ng-lb" role="dialog" aria-modal="true" aria-label={alt(open)} onClick={() => setOpen(null)}>
          <button type="button" className="ng-lb__x" onClick={() => setOpen(null)} aria-label="Fermer">×</button>
          {total > 1 && <button type="button" className="ng-lb__a ng-lb__a--p" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Précédente">‹</button>}
          {isVideo(cur)
            ? <video src={cur.url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
            : <img src={cur.url} alt={alt(open)} onClick={(e) => e.stopPropagation()} />}
          {total > 1 && <button type="button" className="ng-lb__a ng-lb__a--n" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Suivante">›</button>}
        </div>
      )}
    </section>
  );
}
