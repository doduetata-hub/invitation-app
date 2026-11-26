import { useEffect, useSyncExternalStore } from 'react';

// Mode clair / sombre de l'administration (et des pages de service ouvertes par lien). Sombre par défaut, mémorisé sur l'appareil.
const KEY = 'admin:theme';

function readStored() {
  try {
    return window.localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

// La valeur courante vit ici pour que le bouton du haut de page et le menu « Plus » restent d'accord.
let current = null;
const listeners = new Set();

export function getTheme() {
  if (current === null) current = readStored();
  return current;
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function setTheme(theme) {
  current = theme;
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite seulement */
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}

/**
 * Applique le thème mémorisé tant que la page est affichée (les pages publiques d'invitation ne sont jamais touchées).
 * Active aussi `viewport-fit=cover` le même temps : sans lui, les marges de sécurité des téléphones
 * (encoche, barre de geste) valent zéro et la barre du bas passe dessous.
 */
export function useAppliedTheme() {
  useEffect(() => {
    applyTheme(getTheme());
    const viewport = document.querySelector('meta[name="viewport"]');
    const previous = viewport?.getAttribute('content');
    if (previous && !previous.includes('viewport-fit')) viewport.setAttribute('content', `${previous}, viewport-fit=cover`);
    return () => {
      delete document.documentElement.dataset.theme;
      if (previous) viewport.setAttribute('content', previous);
    };
  }, []);
}
