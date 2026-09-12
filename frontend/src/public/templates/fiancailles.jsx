const tokens = {
  colorBg: '#fff8f3',
  colorSurface: '#ffffff',
  colorPrimary: '#c98a4b',
  colorSecondary: '#e6b98f',
  colorText: '#3a2b1f',
  colorTextMuted: '#9c8368',
  colorAccent: '#c98a4b',
  fontHeading: "'Playfair Display', serif",
  fontBody: "'Poppins', sans-serif",
  radius: '10px',
};

const SPARKLES = [
  { top: '8%', left: '12%', size: '0.7rem' },
  { top: '18%', left: '85%', size: '0.5rem' },
  { top: '75%', left: '8%', size: '0.55rem' },
  { top: '88%', left: '80%', size: '0.7rem' },
  { top: '45%', left: '92%', size: '0.5rem' },
];

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      {SPARKLES.map((s, i) => (
        <span key={i} style={{ ...styles.sparkle, top: s.top, left: s.left, fontSize: s.size }}>✦</span>
      ))}
      <div style={styles.card}>{children}</div>
    </div>
  );
}

const styles = {
  outer: {
    position: 'relative',
    overflow: 'hidden',
    background:
      'radial-gradient(circle at 15% 15%, rgba(201,138,75,0.14), transparent 40%), radial-gradient(circle at 85% 85%, rgba(230,185,143,0.18), transparent 45%), var(--color-bg)',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    padding: '2.5rem 1.25rem',
  },
  sparkle: { position: 'absolute', color: 'var(--color-secondary)' },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '460px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-secondary)',
    boxShadow: '0 18px 40px rgba(201,138,75,0.16)',
  },
};

export default { key: 'fiancailles', name: 'Fiançailles', tokens, Wrapper };
