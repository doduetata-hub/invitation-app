import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import QrPrintCard from '../../shared/components/QrPrintCard';

// Impression groupée de tous les QR codes actifs du livre d'or, deux par feuille A4 paysage — à
// découper au massicot après impression pour retrouver deux cartes A5 identiques à celles
// imprimées à l'unité (voir QrPrintCard : son ratio 148/210 est justement une moitié de feuille
// A4 paysage coupée en deux, donc aucune adaptation de mise en page n'est nécessaire). Les QR
// codes désactivés sont exclus : les imprimer serait trompeur puisqu'ils ne mènent plus nulle
// part une fois scannés.
export default function GuestbookQrPrintAllPage() {
  const { id } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
    api.get(`/invitations/${id}/guestbook/qr-tokens`).then(setTokens).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="error-text" style={{ padding: '2rem' }}>{error}</p>;
  if (!invitation || !tokens) return <p className="admin-muted" style={{ padding: '2rem' }}>Chargement...</p>;

  const activeTokens = tokens.filter((t) => t.active);

  if (activeTokens.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <p className="admin-muted">Aucun QR code actif à imprimer.</p>
        <Link to={`/admin/invitations/${id}/guestbook`} className="btn btn-outline btn-sm">← Retour au livre d'or</Link>
      </div>
    );
  }

  const pairs = [];
  for (let i = 0; i < activeTokens.length; i += 2) {
    pairs.push(activeTokens.slice(i, i + 2));
  }

  return (
    <div className="gb-print-all-page" style={styles.page}>
      <div className="no-print" style={styles.toolbar}>
        <Link to={`/admin/invitations/${id}/guestbook`} className="btn btn-outline btn-sm">← Retour au livre d'or</Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
          Imprimer tout ({activeTokens.length} QR code{activeTokens.length > 1 ? 's' : ''})
        </button>
      </div>

      {pairs.map((pair) => (
        <div className="gb-print-all-sheet" style={styles.sheet} key={pair.map((t) => t.id).join('-')}>
          {pair.map((t) => (
            <div className="gb-print-all-cell" style={styles.cell} key={t.id}>
              <QrPrintCard invitation={invitation} token={t} />
            </div>
          ))}
          {pair.length === 1 && <div className="gb-print-all-cell" style={styles.cell} />}
        </div>
      ))}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; }
          .gb-print-all-page { background: #fff !important; padding: 0 !important; gap: 0 !important; }
          .gb-print-all-sheet {
            width: 100% !important;
            max-width: none !important;
            height: 100vh !important;
            aspect-ratio: auto !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
          }
          .gb-print-all-sheet:last-child { page-break-after: auto; }
          .gb-print-all-cell { padding: 0 !important; }
          .gb-print-all-sheet .gb-print-sheet {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            max-width: none !important;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#e9e2d0', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' },
  toolbar: { display: 'flex', gap: '0.6rem', marginBottom: '0.5rem', width: '100%', maxWidth: '900px', justifyContent: 'space-between' },
  sheet: {
    width: '100%',
    maxWidth: '900px',
    aspectRatio: '297 / 210',
    background: '#fff',
    border: '1px solid #d8cba3',
    boxShadow: '0 8px 24px rgba(20,16,10,0.12)',
    display: 'flex',
    boxSizing: 'border-box',
  },
  cell: { flex: '1 1 50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', boxSizing: 'border-box', minWidth: 0 },
};
