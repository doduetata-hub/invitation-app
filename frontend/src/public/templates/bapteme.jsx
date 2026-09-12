const tokens = {
  colorBg: '#eef5f7',
  colorSurface: '#ffffff',
  colorPrimary: '#4a7a8c',
  colorSecondary: '#c9a86a',
  colorText: '#2c3e42',
  colorTextMuted: '#7a95a0',
  colorAccent: '#c9a86a',
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Quicksand', sans-serif",
  radius: '18px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        <span style={styles.starTop}>✧</span>
        {children}
        <span style={styles.starBottom}>✧</span>
      </div>
    </div>
  );
}

const styles = {
  outer: {
    background:
      'radial-gradient(circle at 50% 0%, rgba(74,122,140,0.10), transparent 55%), var(--color-bg)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '2.75rem 1.25rem',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '460px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-secondary)',
    boxShadow: '0 16px 36px rgba(74,122,140,0.12)',
  },
  starTop: { position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', color: 'var(--color-secondary)', fontSize: '1.1rem' },
  starBottom: { position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', color: 'var(--color-secondary)', fontSize: '1.1rem' },
};

export default { key: 'bapteme', name: 'Baptême', tokens, Wrapper };
