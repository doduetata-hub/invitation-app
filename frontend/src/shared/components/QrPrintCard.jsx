// Carte imprimable d'un QR code de livre d'or, factorisée pour être utilisée à la fois par
// l'impression à l'unité (GuestbookQrPrintPage) et par "Imprimer tout" (GuestbookQrPrintAllPage) :
// même design, déjà validé, dans les deux cas. Le ratio 148/210 correspond au format A5 portrait —
// c'est aussi, très précisément, une moitié de feuille A4 paysage coupée en deux dans le sens de la
// hauteur, ce qui permet à "Imprimer tout" de poser deux cartes identiques côte à côte sans aucune
// adaptation de mise en page.
export default function QrPrintCard({ invitation, token }) {
  return (
    <div className="gb-print-sheet" style={styles.sheet}>
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
  );
}

export const styles = {
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
