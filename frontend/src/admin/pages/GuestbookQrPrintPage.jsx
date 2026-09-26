import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import QrPrintCard from '../../shared/components/QrPrintCard';

// Présentation imprimable du QR code du livre d'or — une page dédiée avec sa propre feuille de
// style plutôt qu'un PDF généré : ce projet n'a aucun moteur PDF côté backend (contrairement au
// coeur invitations), et une page print CSS bien conçue couvre le besoin sans dépendance
// supplémentaire. Fond clair volontairement (pas noir profond comme le mode écran) : l'impression
// gaspillerait de l'encre et un QR sur fond sombre imprime moins bien qu'un QR classique noir/blanc.
export default function GuestbookQrPrintPage() {
  const { id, tokenId } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
    api
      .get(`/invitations/${id}/guestbook/qr-tokens`)
      .then((tokens) => {
        const t = tokens.find((x) => x.id === tokenId);
        if (!t) setError("Ce QR code n'existe plus.");
        else setToken(t);
      })
      .catch((err) => setError(err.message));
  }, [id, tokenId]);

  if (error) return <p className="error-text" style={{ padding: '2rem' }}>{error}</p>;
  if (!invitation || !token) return <p className="admin-muted" style={{ padding: '2rem' }}>Chargement...</p>;

  return (
    <div className="gb-print-page" style={styles.page}>
      <div className="no-print" style={styles.toolbar}>
        <Link to={`/admin/invitations/${id}/guestbook`} className="btn btn-outline btn-sm">← Retour au livre d'or</Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
          Imprimer
        </button>
      </div>

      <QrPrintCard invitation={invitation} token={token} />

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A5 portrait; margin: 0; }
          body { margin: 0; }
          /* Sans ça, le fond beige et le padding de la page (pensés pour l'écran, où ils
             centrent joliment la carte) impriment autour d'elle sur le papier — un
             gaspillage d'encre que le fond clair de la carte elle-même cherche justement
             à éviter (voir le commentaire d'en-tête du fichier). */
          .gb-print-page { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .gb-print-sheet { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: none !important; width: 100%; height: 100vh; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#e9e2d0', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  toolbar: { display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', width: '100%', maxWidth: '420px', justifyContent: 'space-between' },
};
