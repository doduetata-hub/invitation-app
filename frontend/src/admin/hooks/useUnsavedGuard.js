import { useEffect } from 'react';

const MESSAGE = 'Des modifications ne sont pas enregistrées. Quitter sans les enregistrer ?';

// Évite de perdre une saisie : avertit à la fermeture ou au rechargement de l'onglet, et lorsqu'on touche un lien qui
// mène à une autre page de l'application (menu, barre du bas, onglets Invités / Check-in / Livre d'or).
// Limite : le bouton « retour » du navigateur n'est pas intercepté.
export function useUnsavedGuard(dirty) {
  useEffect(() => {
    if (!dirty) return undefined;
    const beforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Écouté avant React (phase de capture sur le document), pour pouvoir retenir la navigation.
    const click = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = e.target.closest?.('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.closest('.preview-frame')) return;
      if (link.origin !== window.location.origin || link.pathname === window.location.pathname) return;
      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
    };
  }, [dirty]);
}
