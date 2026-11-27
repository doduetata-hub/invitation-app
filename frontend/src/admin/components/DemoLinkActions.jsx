import { useEffect, useState } from 'react';
import Icon from './ui/Icon';
import ShareButton from '../../shared/components/ShareButton';

// Lien de démonstration d'un modèle, à envoyer à un client : copie, et partage direct quand l'appareil le propose.
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
        <button type="button" className="btn btn-outline btn-sm" onClick={copy} aria-label={`Copier le lien client du modèle ${tpl.name}`}>
          <Icon name={state === 'copied' ? 'check' : 'copy'} />
          {state === 'copied' ? 'Lien copié' : 'Lien client'}
        </button>
        <ShareButton title={`Modèle d'invitation « ${tpl.name} »`} url={url} />
      </div>
      {state === 'manual' && (
        <input className="tpl-card__link" value={url} readOnly autoFocus onFocus={(e) => e.target.select()} aria-label={`Lien client du modèle ${tpl.name}`} />
      )}
    </>
  );
}
