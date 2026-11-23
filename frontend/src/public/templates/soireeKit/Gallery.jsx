import { useCallback, useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import { mediaOf, isVideo, focalOf, tearPoints } from './utils';
import { Flourish } from './icons';
import Pic from './Pic';

const FIRST = 8;
// Découpes déchirées déterministes : une par position, pour un collage « papier déchiré » qui ne change jamais d'un rendu à l'autre.
const CLIPS = [11, 23, 37, 51].map((seed) => {
  const a = tearPoints(seed, 10, 2.2);
  const b = tearPoints(seed + 3, 10, 2.2);
  const top = a.map(([x, d]) => `${x}% ${Math.max(0, 2 + d)}%`).join(', ');
  const bottom = b.map(([x, d]) => `${100 - x}% ${100 - 2 + d}%`).join(', ');
  return `polygon(${top}, ${bottom})`;
});

// Collage de photos aux bords déchirés (deux colonnes, la première pleine largeur) + visionneuse plein écran.
export default function Gallery({ invitation }) {
  const { gallery } = mediaOf(invitation);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(null);
  const opener = useRef(null);
  const closeBtn = useRef(null);
  const touchX = useRef(null);
  const total = gallery.length;
  const shown = all ? gallery : gallery.slice(0, FIRST);
  const go = useCallback((d) => setOpen((i) => (i === null ? i : (i + d + total) % total)), [total]);
  const close = useCallback(() => { setOpen(null); if (opener.current) opener.current.focus(); }, []);

  useEffect(() => {
    if (open === null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    if (closeBtn.current) closeBtn.current.focus();
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, go, close]);

  if (total === 0) return null;
  const alt = (i) => `Photographie ${i + 1} sur ${total}${invitation.namesLine ? ` de ${invitation.namesLine}` : ''}`;
  const cur = open === null ? null : gallery[open];
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <section className="sk-gal" aria-label="Galerie">
      <Reveal><h2 className="sk-script sk-h2">Nos souvenirs</h2><Flourish /></Reveal>
      <ul className="sk-gal__grid">
        {shown.map((m, i) => (
          <Reveal as="li" key={m.id || i} className={i % 3 === 0 ? 'is-full' : ''} delay={(i % 2) * 60}>
            <button type="button" className="sk-gal__b" style={{ clipPath: CLIPS[i % CLIPS.length] }} onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={`Agrandir : ${alt(i)}`}>
              {isVideo(m) ? <video src={m.url} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} /> : <Pic m={m} sizes={i % 3 === 0 ? '(min-width: 800px) 420px, 92vw' : '(min-width: 800px) 420px, 46vw'} />}
            </button>
          </Reveal>
        ))}
      </ul>
      {total > FIRST && !all && (
        <div className="sk-center"><button type="button" className="sk-btn" onClick={() => setAll(true)}>Voir toutes les photos ({total})</button></div>
      )}
      {cur && (
        <div className="sk-lb" role="dialog" aria-modal="true" aria-label={alt(open)} onClick={close} onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={onTouchEnd}>
          <button type="button" ref={closeBtn} className="sk-lb__x" onClick={close} aria-label="Fermer">×</button>
          {total > 1 && <button type="button" className="sk-lb__a sk-lb__a--p" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente">‹</button>}
          {isVideo(cur) ? <video src={cur.url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} /> : <img src={cur.url} alt={alt(open)} style={{ objectPosition: focalOf(cur) }} onClick={(e) => e.stopPropagation()} />}
          {total > 1 && <button type="button" className="sk-lb__a sk-lb__a--n" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante">›</button>}
          <p className="sk-lb__c" aria-hidden="true">{open + 1} / {total}</p>
        </div>
      )}
    </section>
  );
}
