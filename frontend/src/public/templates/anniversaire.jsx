const tokens = {
  colorBg: '#fff8f0',
  colorSurface: '#ffffff',
  colorPrimary: '#ff6b6b',
  colorSecondary: '#ff9f1c',
  colorText: '#2b2926',
  colorTextMuted: '#8a7f70',
  colorAccent: '#ffd93d',
  fontHeading: "'Quicksand', sans-serif",
  fontBody: "'Quicksand', sans-serif",
  radius: '28px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={{ ...styles.blob, top: '-60px', left: '-60px', background: 'var(--color-accent)' }} />
      <div style={{ ...styles.blob, top: '10%', right: '-80px', background: 'var(--color-primary)', opacity: 0.25 }} />
      <div style={{ ...styles.blob, bottom: '-70px', left: '20%', background: 'var(--color-secondary)', opacity: 0.3 }} />
      <div style={styles.card}>{children}</div>
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
  blob: { position: 'absolute', width: '220px', height: '220px', borderRadius: '50%', filter: 'blur(2px)', opacity: 0.35 },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 20px 40px rgba(255,107,107,0.15)',
    overflow: 'hidden',
  },
};

export default { key: 'anniversaire', name: 'Anniversaire', tokens, Wrapper };
