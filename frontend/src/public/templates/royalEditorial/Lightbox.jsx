import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isVideo } from './utils';

// Lightbox tactile et accessible : dialogue modal, focus piégé puis restitué, Échap, flèches, balayage horizontal,
// compteur annoncé, défilement de la page verrouillé. Les médias gardent leur proportion d'origine (object-fit: contain).
export default function Lightbox({ items, index, onIndex, onClose }) {
  const total = items.length;
  const item = items[index];
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  const drag = useRef({ x: 0, y: 0, active: false, dx: 0, moved: false });
  const [dx, setDx] = useState(0);

  const go = useCallback((delta) => onIndex((index + delta + total) % total), [index, total, onIndex]);

  // Focus, verrouillage du défilement, restitution du focus
  useEffect(() => {
    openerRef.current = document.activeElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      openerRef.current?.focus?.();
    };
  }, []);

  // Bouton Retour (Android, geste « retour », Alt+←) : la lightbox ajoute UNE entrée d'historique (même adresse, même état de routeur : on
  // conserve history.state tel quel, le routeur ne voit aucun changement de page) ; Retour la retire et ferme la lightbox, l'utilisateur reste
  // sur l'invitation. Fermée autrement (croix, Échap, fond), la lightbox retire elle-même son entrée pour ne laisser aucune entrée parasite.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const MARK = 'reLightbox';
    try { window.history.pushState({ ...(window.history.state || {}), [MARK]: true }, '', window.location.href); } catch { return undefined; }
    const onPop = () => {
      // Seule une entrée qui n'est plus la nôtre signifie « Retour » (en développement, React rejoue les effets : l'écho de notre propre retrait est ignoré)
      if (!window.history.state?.[MARK]) onCloseRef.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.[MARK]) {
        // Le retrait de notre entrée est une navigation d'historique : Chromium efface alors le focus (« focusout » juste APRÈS le popstate), ce
        // qui annulerait la restitution faite à la fermeture. On la rejoue donc une fois la traversée terminée (popstate, puis image suivante).
        const opener = openerRef.current;
        const restore = () => {
          window.removeEventListener('popstate', restore);
          requestAnimationFrame(() => {
            const a = document.activeElement;
            if (opener?.isConnected && (!a || a === document.body)) opener.focus?.();
          });
        };
        window.addEventListener('popstate', restore);
        window.history.back();
      }
    };
  }, []);

  // Clavier : Échap, flèches, piège à focus
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab') {
        const nodes = dialogRef.current?.querySelectorAll('button, video[controls]');
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // Précharge les voisines
  useEffect(() => {
    [index - 1, index + 1].forEach((i) => {
      const m = items[(i + total) % total];
      if (m && !isVideo(m)) { const im = new Image(); im.src = m.url; }
    });
  }, [index, items, total]);

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, active: true, dx: 0, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const mx = e.clientX - d.x;
    if (Math.abs(mx) > 10) d.moved = true;
    if (Math.abs(mx) > Math.abs(e.clientY - d.y)) { d.dx = mx; setDx(mx); }
  };
  const endDrag = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (Math.abs(d.dx) > 50 && total > 1) go(d.dx < 0 ? 1 : -1);
    setDx(0);
  };

  return createPortal(
    <div className="re-lb" role="dialog" aria-modal="true" aria-label="Galerie photographique" ref={dialogRef}>
      <div className="re-lb__bar">
        <span className="re-lb__count" aria-live="polite">{index + 1} / {total}</span>
        {/* onPointerUp (tactile uniquement) : en émulation, un toucher survenant moins d'une seconde après un balayage ne produit pas de « click »
            (heuristique du navigateur) ; le pointerup, lui, est bien livré. Le clic reste géré (clavier, souris, lecteurs d'écran). */}
        <button type="button" className="re-lb__btn" onClick={onClose} onPointerUp={(e) => { if (e.pointerType === 'touch') onClose(); }} ref={closeRef} aria-label="Fermer la galerie">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div
        className="re-lb__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        // Toucher le fond (hors photographie et hors boutons) ferme la lightbox ; un balayage qui finit sur le fond ne la ferme pas.
        onClick={(e) => { if (e.target === e.currentTarget && !drag.current.moved) onClose(); }}
      >
        {total > 1 && (
          <button type="button" className="re-lb__btn re-lb__nav re-lb__nav--prev" onClick={() => go(-1)} aria-label="Photographie précédente">
            <span aria-hidden="true">&#8249;</span>
          </button>
        )}
        {isVideo(item) ? (
          <video key={item.url} className="re-lb__media" src={item.url} controls playsInline preload="metadata" aria-label={item.alt} />
        ) : (
          <img
            key={item.url}
            className="re-lb__media"
            src={item.url}
            alt={item.alt}
            draggable="false"
            style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform 200ms ease' }}
          />
        )}
        {total > 1 && (
          <button type="button" className="re-lb__btn re-lb__nav re-lb__nav--next" onClick={() => go(1)} aria-label="Photographie suivante">
            <span aria-hidden="true">&#8250;</span>
          </button>
        )}
      </div>
      <p className="re-lb__cap">{item.alt}</p>
    </div>,
    document.body
  );
}
