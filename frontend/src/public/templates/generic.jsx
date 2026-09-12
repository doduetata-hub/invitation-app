import { DEFAULT_TOKENS } from '../theme/tokens';

function Wrapper({ children }) {
  return (
    <div style={styles.outer}>
      <div style={styles.card}>{children}</div>
    </div>
  );
}

const styles = {
  outer: { background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '2.5rem 1rem' },
  card: {
    width: '100%',
    maxWidth: '480px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
};

export default { key: 'generic', name: 'Générique', tokens: DEFAULT_TOKENS, Wrapper };
