// Ouverture d'invitation obligatoire (La Porte, La Serre, L'Embarquement, Les Lanternes, Le Lever de rideau) : l'invité fait le geste à chaque visite, et chaque retour
// sur l'invitation recommence par elle. Un lien qui vise une partie de la page (/i/slug#rsvp, #billet) ne la contourne pas : on rejoint
// cette partie une fois l'ouverture terminée.
import { createContext, useEffect, useRef } from 'react';

// Contexte des aperçus de l'administration : « visit » (on ouvre le modèle ou l'aperçu : il commence par l'ouverture, obligatoire comme
// pour l'invité), « thumbnail » (vignette de la bibliothèque : ni ouverture ni bouton). Sans contexte (aperçu pendant la saisie) : bouton seul.
export const OpeningPreview = createContext(null);

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

/**
 * Rend inactif tout le reste de l'invitation tant que l'ouverture est affichée : seul son dernier bouton y donne accès. Les sections qui
 * se chargent entre-temps sont bloquées à leur arrivée. Ce qui est hors de l'invitation (barre « Retour » d'un aperçu) reste utilisable.
 * Renvoie la fonction qui libère la page.
 */
export function lockBehind(gate) {
  const root = gate?.closest('.lp-root, .ls-root, .em-root, .ll-root, .lr-root');
  if (!root) return () => {};
  const locked = new Set();
  const apply = () => {
    // L'observateur peut se déclencher après le retrait de l'ouverture, avant sa désactivation : il n'y a alors plus de parent.
    for (let node = gate; node && node !== root && node.parentElement; node = node.parentElement) {
      Array.from(node.parentElement.children).forEach((other) => {
        if (other !== node && !other.inert) { other.inert = true; locked.add(other); }
      });
    }
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    locked.forEach((el) => { el.inert = false; });
  };
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
