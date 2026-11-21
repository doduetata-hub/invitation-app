import { useEffect, useState } from 'react';
import InvitationPage from '../../public/InvitationPage';
import { PREVIEW_MESSAGE, PREVIEW_READY } from '../previewMessages';

// Page d'aperçu chargée DANS UN <iframe> par l'éditeur d'invitation (InvitationEditorPage).
// Pourquoi un iframe : les templates adaptent leur mise en page à la largeur de la FENÊTRE (règles @media, unités vw/vh). Rendue directement dans un
// cadre de 360 px sur un écran de bureau, l'invitation recevait donc la mise en page « bureau » (aperçu Mobile cassé). Dans un iframe, le navigateur
// applique les vraies règles de la largeur du cadre, exactement comme sur un téléphone.
//
// Aucune donnée n'est chargée ici : l'invitation arrive par postMessage depuis la page parente de la MÊME origine (jamais d'une autre).
export default function PreviewFramePage() {
  const [invitation, setInvitation] = useState(null);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data;
      if (data && data.type === PREVIEW_MESSAGE && data.invitation && typeof data.invitation === 'object') setInvitation(data.invitation);
    };
    window.addEventListener('message', onMessage);
    // Prévient le parent que la page est prête à recevoir l'invitation (à chaque chargement du cadre).
    if (window.parent !== window) window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!invitation) {
    return <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: '#8a8171' }}>Chargement de l'aperçu...</div>;
  }
  return <InvitationPage invitation={invitation} />;
}
