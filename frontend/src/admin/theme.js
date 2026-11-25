import { useEffect } from 'react';

// Mode clair / sombre de l'administration (et des pages de service ouvertes par lien). Sombre par défaut, mémorisé sur l'appareil.
const KEY = 'admin:theme';

export function getTheme() {
  try {
    return window.localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function storeTheme(theme) {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite seulement */
  }
}

/** Applique le thème mémorisé tant que la page est affichée (les pages publiques d'invitation ne sont jamais touchées). */
export function useAppliedTheme() {
  useEffect(() => {
    applyTheme(getTheme());
    return () => { delete document.documentElement.dataset.theme; };
  }, []);
}
