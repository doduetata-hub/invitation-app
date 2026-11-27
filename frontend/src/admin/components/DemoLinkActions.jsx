import { useEffect, useState } from 'react';
import Icon from './ui/Icon';
import ShareButton from '../../shared/components/ShareButton';

// Un seul bouton « Partager » pour envoyer à un client le lien de démonstration d'un modèle. Il ouvre le menu de partage de
// l'appareil (qui permet aussi de copier le lien) ; quand l'appareil n'en a pas, le même bouton copie le lien.
export default function DemoLinkActions({ tpl }) {
  const url = `${window.location.origin}/demo/${tpl.key}`;
  const [state, setState] = useState(''); // '' | 'copied' | 'manual'

  useEffect(() => {
    if (state !== 'copied') return undefined;
    const timer = setTimeout(() => setState(''), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('manual'); // copie refusée ou indisponible (page sans HTTPS) : le lien est affiché pour être copié à la main
    }
  };

  return (
    <>
      <div className="tpl-card__actions tpl-card__actions--demo">
        {typeof navigator.share === 'function' ? (
          <ShareButton title={`Modèle d'invitation « ${tpl.name} »`} url={url} />
        ) : (
          <button type="button" className="btn btn-outline btn-sm" onClick={copy}>
            <Icon name={state === 'copied' ? 'check' : 'share'} />
            {state === 'copied' ? 'Lien copié' : 'Partager'}
          </button>
        )}
      </div>
      {state === 'manual' && (
        <input className="tpl-card__link" value={url} readOnly autoFocus onFocus={(e) => e.target.select()} aria-label={`Lien de démonstration du modèle ${tpl.name}`} />
      )}
    </>
  );
}
