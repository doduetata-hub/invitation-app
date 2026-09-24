// Aperçu compact de ce que le public verra réellement sur le mode écran, affiché dans le
// back-office (voir GuestMessageModal) — l'administrateur doit comprendre d'un coup d'œil le
// rendu final, pas déduire un rendu à partir d'une URL de fichier ou d'un bloc de données brutes.
// Volontairement indépendant des styles de GuestbookDisplayPage (page publique, injectés à part) :
// une version simplifiée et statique, pas une resimulation complète des animations/tailles
// adaptatives — juste de quoi juger l'équilibre photo/message avant d'approuver.
function orientationOf(photo) {
  if (!photo?.width || !photo?.height) return 'landscape';
  const ratio = photo.width / photo.height;
  if (ratio >= 1.2) return 'landscape';
  if (ratio <= 0.85) return 'portrait';
  return 'square';
}

export default function GuestbookLivePreview({ guestName, message, photo, tableNumber }) {
  const hasPhoto = Boolean(photo?.url);
  const orientation = orientationOf(photo);
  const frameSize = { landscape: { width: 132, height: 99 }, square: { width: 108, height: 108 }, portrait: { width: 96, height: 128 } }[orientation];

  return (
    <div style={styles.stage}>
      <p style={styles.stageLabel}>Aperçu — ce que verra la salle</p>
      <div style={{ ...styles.card, flexDirection: hasPhoto ? 'row' : 'column' }}>
        {hasPhoto && (
          <div style={{ ...styles.photoFrame, ...frameSize }}>
            <img src={photo.thumbUrl || photo.url} alt="" style={styles.photoImg} />
          </div>
        )}
        <div style={styles.textCol}>
          <p style={styles.quote} aria-hidden="true">"</p>
          <p style={styles.message}>{message}</p>
          <p style={styles.name}>— {guestName}</p>
          {tableNumber && <p style={styles.table}>Table {tableNumber}</p>}
        </div>
      </div>
    </div>
  );
}

const styles = {
  stage: { margin: '0 0 1.1rem' },
  stageLabel: {
    margin: '0 0 0.5rem',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#a89d8a',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.1rem',
    padding: '1.2rem',
    borderRadius: '10px',
    background: 'radial-gradient(circle at 30% 20%, #241d12 0%, #14110c 70%)',
    border: '1px solid rgba(184,138,50,0.4)',
  },
  photoFrame: {
    flexShrink: 0,
    padding: '4px',
    border: '1px solid rgba(214,181,109,0.65)',
    background: 'linear-gradient(145deg, rgba(38,30,17,0.92), rgba(10,9,8,0.92))',
    boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
  },
  photoImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  textCol: { flex: 1, minWidth: 0, textAlign: 'center' },
  quote: { margin: '0 0 -0.3rem', fontFamily: 'Georgia, serif', fontSize: '1.6rem', color: '#B8873F', opacity: 0.5 },
  message: {
    margin: '0 0 0.5rem',
    fontFamily: 'Georgia, serif',
    fontSize: '1.05rem',
    lineHeight: 1.45,
    color: '#FFFDF8',
    whiteSpace: 'pre-line',
    overflowWrap: 'break-word',
  },
  name: { margin: 0, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D6B56D' },
  table: { margin: '0.2rem 0 0', fontSize: '0.68rem', color: '#a89d8a' },
};
