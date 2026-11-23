import { useCallback, useEffect, useRef, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { mediaOf, isVideo, focalOf, pad2 } from '../soireeKit/utils';

const FIRST = 9;

// Galerie « pile de tirages » : chaque photo reste collée en haut de l'écran puis la suivante vient la recouvrir en glissant.
// Défilement vertical uniquement (aucun défilement horizontal) ; visionneuse plein écran au toucher (clavier, flèches, balayage).
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
    <section className="nv-gal" aria-label="Galerie">
      <Reveal>
        <p className="nv-eyebrow nv-eyebrow--ink">Quelques instants à deux</p>
        <h2 className="nv-h2">Notre histoire,<br /><em>en images.</em></h2>
      </Reveal>
      <ul className="nv-stack">
        {shown.map((m, i) => (
          <li key={m.id || i} style={{ '--i': i }}>
            <button type="button" className="nv-card" data-n={`${pad2(i + 1)} / ${pad2(total)}`} onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={`Agrandir : ${alt(i)}`}>
              {isVideo(m) ? <video src={m.url} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} /> : <Pic m={m} sizes="(min-width: 800px) 520px, 92vw" />}
            </button>
          </li>
        ))}
      </ul>
      {total > FIRST && !all && <div className="nv-center"><button type="button" className="nv-btn" onClick={() => setAll(true)}>Voir toutes les photos ({total})</button></div>}
      {cur && (
        <div className="nv-lb" role="dialog" aria-modal="true" aria-label={alt(open)} onClick={close} onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={onTouchEnd}>
          <button type="button" ref={closeBtn} className="nv-lb__x" onClick={close} aria-label="Fermer">×</button>
          {total > 1 && <button type="button" className="nv-lb__a nv-lb__a--p" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente">‹</button>}
          {isVideo(cur) ? <video src={cur.url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} /> : <img src={cur.url} alt={alt(open)} style={{ objectPosition: focalOf(cur) }} onClick={(e) => e.stopPropagation()} />}
          {total > 1 && <button type="button" className="nv-lb__a nv-lb__a--n" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante">›</button>}
          <p className="nv-lb__c" aria-hidden="true">{pad2(open + 1)} / {pad2(total)}</p>
        </div>
      )}
    </section>
  );
}
