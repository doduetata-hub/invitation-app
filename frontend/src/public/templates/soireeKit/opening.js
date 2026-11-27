// Ouverture d'invitation obligatoire (La Porte, La Serre, L'Embarquement) : l'invité fait le geste à chaque visite, et chaque retour
// sur l'invitation recommence par elle. Un lien qui vise une partie de la page (/i/slug#rsvp, #billet) ne la contourne pas : on rejoint
// cette partie une fois l'ouverture terminée.
import { useEffect, useRef } from 'react';

// Absence à partir de laquelle un onglet retrouvé compte comme une nouvelle visite. En dessous, l'invité n'a fait qu'un aller-retour
// (choisir une photo pour sa réponse, regarder l'itinéraire, répondre à un message) : on ne le renvoie pas au début.
export const AWAY_MS = 2 * 60 * 1000;

/** Appelle `replay` quand l'invité revient : page restaurée par le bouton retour, ou onglet retrouvé après une absence. */
export function useRevisit(active, replay) {
  const latest = useRef(replay);
  latest.current = replay;
  useEffect(() => {
    if (!active) return undefined;
    let hiddenAt = document.visibilityState === 'hidden' ? Date.now() : 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      if (away >= AWAY_MS) latest.current();
    };
    const onShow = (e) => { if (e.persisted) latest.current(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onShow);
    };
  }, [active]);
}

/** Après l'ouverture : en haut de l'invitation, ou sur la partie que le lien visait. */
export function afterOpening() {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  // « #invitation » vient de la flèche « Faites défiler » de la couverture : au retour, on reprend au début.
  const wanted = /^[a-z-]+$/.test(id) && id !== 'invitation' && id !== 'top';
  // Laisse le temps à la page de reprendre son défilement après la disparition de l'ouverture.
  setTimeout(() => {
    const el = wanted ? document.getElementById(id) : null;
    if (el) el.scrollIntoView({ block: 'start', behavior: 'instant' });
    else window.scrollTo({ top: 0, behavior: 'instant' });
  }, 80);
}
