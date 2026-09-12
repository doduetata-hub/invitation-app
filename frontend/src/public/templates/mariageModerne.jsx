const tokens = {
  colorBg: '#ffffff',
  colorSurface: '#f4f4f5',
  colorPrimary: '#111827',
  colorSecondary: '#e11d48',
  colorText: '#111827',
  colorTextMuted: '#6b7280',
  colorAccent: '#e11d48',
  fontHeading: "'Poppins', sans-serif",
  fontBody: "'Poppins', sans-serif",
  radius: '0px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={styles.topBar} />
      <div style={styles.content}>{children}</div>
      <div style={styles.bottomBar} />
    </div>
  );
}

const styles = {
  outer: { background: 'var(--color-bg)', minHeight: '100vh' },
  topBar: { height: '10px', background: 'var(--color-secondary)' },
  bottomBar: { height: '10px', background: 'var(--color-primary)' },
  content: { maxWidth: '560px', margin: '0 auto' },
};

export default { key: 'mariage-moderne', name: 'Mariage Moderne', tokens, Wrapper };
