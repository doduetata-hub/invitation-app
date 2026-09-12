const tokens = {
  colorBg: '#fdf2f4',
  colorSurface: '#fffbfc',
  colorPrimary: '#b8607a',
  colorSecondary: '#d98da3',
  colorText: '#4a2f36',
  colorTextMuted: '#a67c87',
  colorAccent: '#d98da3',
  fontHeading: "'Dancing Script', cursive",
  fontBody: "'Cormorant Garamond', serif",
  radius: '20px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={{ ...styles.bloom, top: '-40px', left: '-40px' }} />
      <div style={{ ...styles.bloom, bottom: '-60px', right: '-30px' }} />
      <div style={styles.frame}>
        <span style={styles.flourish}>❀</span>
        <div style={styles.card}>{children}</div>
        <span style={styles.flourish}>❀</span>
      </div>
    </div>
  );
}

const styles = {
  outer: {
    background: 'var(--color-bg)',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
  },
  bloom: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(217,141,163,0.35), transparent 70%)',
  },
  frame: { position: 'relative', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  flourish: { fontSize: '1.3rem', color: 'var(--color-secondary)', margin: '0.75rem 0' },
  card: {
    position: 'relative',
    width: '100%',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid rgba(217,141,163,0.4)',
    boxShadow: '0 20px 40px rgba(184,96,122,0.12)',
    overflow: 'hidden',
  },
};

export default { key: 'mariage-romantique', name: 'Mariage Romantique', tokens, Wrapper };
