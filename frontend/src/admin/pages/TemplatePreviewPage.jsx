import { useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import InvitationPage from '../../public/InvitationPage';
import { buildSampleInvitation } from '../../public/sampleInvitation';
import { OpeningPreview } from '../../public/templates/soireeKit/opening';

export default function TemplatePreviewPage() {
  const { key } = useParams();
  const [search] = useSearchParams();
  const embed = Boolean(search.get('embed'));
  const sample = buildSampleInvitation(key);
  // Vignette : seule la couverture est rendue (pas de galerie ni de carte, donc beaucoup moins d'images et de calculs).
  const invitation = embed ? { ...sample, theme: { ...(sample.theme || {}), disabledSections: ['countdown', 'program', 'gallery', 'map', 'rsvp', 'contact'] } } : sample;
  useEffect(() => {
    if (!embed) return undefined;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden'; // vignette : pas de barre de défilement
    return () => { html.style.overflow = prev; };
  }, [embed]);
  // ?embed=1 : la page est une vignette dans la bibliothèque des templates, sans barre ni explication.
  if (embed) {
    return (
      <div className="tpl-embed">
        <OpeningPreview.Provider value="thumbnail">
          <InvitationPage invitation={invitation} />
        </OpeningPreview.Provider>
      </div>
    );
  }

  return (
    <div className="tpl-visit">
      <div style={styles.bar}>
        <Link to="/admin/templates" style={styles.back}>← Retour aux templates</Link>
      </div>
      {/* Ouvrir un modèle, c'est le voir comme l'invité : il commence par son ouverture. */}
      <OpeningPreview.Provider key={key} value="visit">
        <InvitationPage invitation={invitation} />
      </OpeningPreview.Provider>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    padding: 'calc(0.5rem + env(safe-area-inset-top, 0px)) 1rem 0.5rem',
    background: '#1c1a17',
    color: '#faf8f4',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
  },
  back: { color: '#faf8f4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: '44px', fontWeight: 600 },
};
