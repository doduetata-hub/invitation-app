import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';

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
    <div style={styles.page}>
      <div className="no-print" style={styles.toolbar}>
        <Link to={`/admin/invitations/${id}/guestbook`} className="btn btn-outline btn-sm">← Retour au livre d'or</Link>
        <button type="button" onClick={() => window.print()} className="btn btn-primary btn-sm">
          Imprimer
        </button>
      </div>

      <div style={styles.sheet}>
        <p style={styles.eyebrow}>{invitation.namesLine || invitation.title}</p>
        <h1 style={styles.title}>Livre d'or</h1>
        <p style={styles.subtitle}>Laissez un mot aux mariés</p>

        <img
          src={`/api/guestbook-qr-tokens/${token.id}/qrcode`}
          alt="QR code du livre d'or"
          style={styles.qr}
        />

        <p style={styles.instructions}>
          Scannez ce QR code
          <br />
          pour déposer votre message
          <br />
          dans leur livre d'or.
        </p>

        {(token.label || token.tableNumber) && (
          <p style={styles.tableLabel}>{token.label || token.tableNumber}</p>
        )}

        {invitation.dressCode && <p style={styles.theme}>Thème : {invitation.dressCode}</p>}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A5 portrait; margin: 0; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#e9e2d0', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  toolbar: { display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', width: '100%', maxWidth: '420px', justifyContent: 'space-between' },
  sheet: {
    width: '100%',
    maxWidth: '420px',
    aspectRatio: '148 / 210',
    background: '#FFFDF8',
    border: '1px solid #B88A32',
    borderRadius: '4px',
    boxShadow: '0 12px 32px rgba(20,16,10,0.15)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.75rem',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  eyebrow: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '1.6rem',
    color: '#2e2013',
    margin: '0 0 1.5rem',
  },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    textTransform: 'uppercase',
    letterSpacing: '0.25em',
    fontSize: '1.3rem',
    color: '#B88A32',
    margin: '0 0 0.5rem',
  },
  subtitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '1.1rem',
    color: '#2e2013',
    margin: '0 0 1.75rem',
  },
  qr: { width: '65%', maxWidth: '220px', height: 'auto', display: 'block', margin: '0 0 1.75rem' },
  instructions: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.85rem',
    lineHeight: 1.6,
    color: '#7a6a4f',
    margin: '0 0 1.25rem',
  },
  tableLabel: {
    display: 'inline-block',
    fontFamily: "'Inter', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#2e2013',
    border: '1px solid #B88A32',
    borderRadius: '999px',
    padding: '0.25rem 1rem',
    margin: '0 0 1rem',
  },
  theme: { fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#B88A32', margin: 0 },
};
