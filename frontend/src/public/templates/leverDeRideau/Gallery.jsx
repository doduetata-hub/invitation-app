import { useCallback, useEffect, useRef, useState } from 'react';
import Reveal from '../soireeKit/Reveal';
import Pic from '../soireeKit/Pic';
import { mediaOf, isVideo, focalOf, pad2 } from '../soireeKit/utils';
import { Head } from './Ornaments';
import { getText } from './texts';

const FIRST = 8;

// Galerie : des portraits dans leurs cadres dorés ; visionneuse plein écran au toucher (clavier, flèches, balayage).
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
    <section className="lr-gal lr-dark" aria-label="Galerie">
      <Reveal><Head eyebrow={getText(invitation, 'galEyebrow')} title={getText(invitation, 'galTitle')} prop="masks" /></Reveal>
      <ul className="lr-prints">
        {shown.map((m, i) => (
          <Reveal as="li" key={m.id || i} delay={(i % 2) * 90}>
            <button type="button" className="lr-print" onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }} aria-label={`Agrandir : ${alt(i)}`}>
              {isVideo(m) ? <video src={m.url} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} /> : <Pic m={m} sizes="(min-width: 800px) 340px, 44vw" />}
            </button>
          </Reveal>
        ))}
      </ul>
      {total > FIRST && !all && <div className="lr-center"><button type="button" className="lr-btn" onClick={() => setAll(true)}>Voir toutes les photos ({total})</button></div>}
      {cur && (
        <div className="lr-lb" role="dialog" aria-modal="true" aria-label={alt(open)} onClick={close} onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={onTouchEnd}>
          <button type="button" ref={closeBtn} className="lr-lb__x" onClick={close} aria-label="Fermer">×</button>
          {total > 1 && <button type="button" className="lr-lb__a lr-lb__a--p" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Photo précédente">‹</button>}
          {isVideo(cur) ? <video src={cur.url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} /> : <img src={cur.url} alt={alt(open)} style={{ objectPosition: focalOf(cur) }} onClick={(e) => e.stopPropagation()} />}
          {total > 1 && <button type="button" className="lr-lb__a lr-lb__a--n" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Photo suivante">›</button>}
          <p className="lr-lb__c" aria-hidden="true">{pad2(open + 1)} / {pad2(total)}</p>
        </div>
      )}
    </section>
  );
}
