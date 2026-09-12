const tokens = {
  colorBg: '#f7f4ec',
  colorSurface: '#fffdf7',
  colorPrimary: '#5c1f2e',
  colorSecondary: '#8a6d3b',
  colorText: '#2b2420',
  colorTextMuted: '#7a6f5f',
  colorAccent: '#5c1f2e',
  fontHeading: "'Libre Baskerville', serif",
  fontBody: "'Cormorant Garamond', serif",
  radius: '0px',
};

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={styles.outerFrame}>
        <div style={styles.innerFrame}>
          <span style={{ ...styles.corner, top: '-1px', left: '-1px', borderRight: 'none', borderBottom: 'none' }} />
          <span style={{ ...styles.corner, top: '-1px', right: '-1px', borderLeft: 'none', borderBottom: 'none' }} />
          <span style={{ ...styles.corner, bottom: '-1px', left: '-1px', borderRight: 'none', borderTop: 'none' }} />
          <span style={{ ...styles.corner, bottom: '-1px', right: '-1px', borderLeft: 'none', borderTop: 'none' }} />
          <div style={styles.card}>{children}</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  outer: { background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '2.5rem 1.25rem' },
  outerFrame: { width: '100%', maxWidth: '520px', border: '1px solid var(--color-secondary)', padding: '10px' },
  innerFrame: { position: 'relative', border: '1px solid var(--color-secondary)', padding: '8px' },
  corner: { position: 'absolute', width: '16px', height: '16px', border: '2px solid var(--color-primary)' },
  card: { background: 'var(--color-surface)' },
};

export default { key: 'mariage-traditionnel', name: 'Mariage Traditionnel', tokens, Wrapper };
