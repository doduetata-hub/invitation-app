import { useCallback, useSyncExternalStore } from 'react';

// Paliers de l'administration (les mêmes que dans responsive.css) :
//   - « compact » (téléphone et tablette) : barre du bas, fiches à la place des tableaux, cibles tactiles ;
//   - « aperçu à part » : en dessous de 1220 px, l'aperçu de l'invitation s'ouvre en plein écran.
export const COMPACT_QUERY = '(max-width: 1023px)';
export const PREVIEW_APART_QUERY = '(max-width: 1219px)';

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export const useCompact = () => useMediaQuery(COMPACT_QUERY);
export const usePreviewApart = () => useMediaQuery(PREVIEW_APART_QUERY);
