const tokens = {
  colorBg: '#f7f2ea',
  colorSurface: '#fffdf9',
  colorPrimary: '#7d6a52',
  colorSecondary: '#b8873f',
  colorText: '#2b2622',
  colorTextMuted: '#8a7f6f',
  colorAccent: '#b8873f',
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Cormorant Garamond', serif",
  radius: '2px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={styles.frame}>
        <span style={styles.ornamentTop}>⚜</span>
        <div style={styles.card}>{children}</div>
        <span style={styles.ornamentBottom}>⚜</span>
      </div>
    </div>
  );
}

const styles = {
  outer: {
    background: 'var(--color-bg)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
  },
  frame: { width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  ornamentTop: { fontSize: '1.5rem', color: 'var(--color-secondary)', marginBottom: '1rem' },
  ornamentBottom: { fontSize: '1.5rem', color: 'var(--color-secondary)', marginTop: '1rem' },
  card: {
    width: '100%',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-secondary)',
    outline: '1px solid var(--color-secondary)',
    outlineOffset: '6px',
  },
};

export default { key: 'mariage-elegant', name: 'Mariage Élégant', tokens, Wrapper };
