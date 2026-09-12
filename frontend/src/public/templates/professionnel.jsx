const tokens = {
  colorBg: '#f4f6f8',
  colorSurface: '#ffffff',
  colorPrimary: '#1e293b',
  colorSecondary: '#0f766e',
  colorText: '#1e293b',
  colorTextMuted: '#64748b',
  colorAccent: '#0f766e',
  fontHeading: "'Inter', sans-serif",
  fontBody: "'Inter', sans-serif",
  radius: '4px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={styles.card}>
        <div style={styles.topBar} />
        {children}
      </div>
    </div>
  );
}

const styles = {
  outer: { background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '2.5rem 1.25rem' },
  card: {
    width: '100%',
    maxWidth: '520px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 16px rgba(15,23,42,0.06)',
    overflow: 'hidden',
  },
  topBar: { height: '6px', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' },
};

export default { key: 'professionnel', name: 'Événement professionnel', tokens, Wrapper };
