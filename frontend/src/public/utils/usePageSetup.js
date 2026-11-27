import { useEffect } from 'react';

// Réglages communs aux pages vues par l'invité (vraie invitation et démonstration) : titre et description de la page, et visite
// qui commence toujours en haut.
export function usePageSetup(invitation) {
  useEffect(() => {
    if (!invitation) return;

    const previousTitle = document.title;
    document.title = invitation.namesLine
      ? `${invitation.namesLine} — ${invitation.title}`
      : invitation.title;

    const description = invitation.invitationText || invitation.personalMessage || '';
    let meta = document.querySelector('meta[name="description"]');
    const createdMeta = !meta;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const previousContent = meta.getAttribute('content');
    meta.setAttribute('content', description);

    return () => {
      document.title = previousTitle;
      if (createdMeta) {
        meta.remove();
      } else if (previousContent !== null) {
        meta.setAttribute('content', previousContent);
      }
    };
  }, [invitation]);

  // Chaque visite commence en haut (sur l'ouverture ou la couverture) : le navigateur ne reprend pas l'ancien défilement.
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => { window.history.scrollRestoration = previous; };
  }, []);
}
