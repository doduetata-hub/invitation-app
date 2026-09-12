export default function CoverSection({ invitation }) {
  const { title, namesLine, eventDate } = invitation;
  const coverUrl = (invitation.media || []).find((m) => m.type === 'cover')?.url;

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <section style={styles.section}>
      {coverUrl && (
        <div style={{ ...styles.coverImage, backgroundImage: `url(${coverUrl})` }} />
      )}
      <p style={styles.eyebrow}>{title}</p>
      {namesLine && <h1 style={styles.names}>{namesLine}</h1>}
      {formattedDate && <p style={styles.date}>{formattedDate}</p>}
    </section>
  );
}

const styles = {
  section: {
    textAlign: 'center',
    padding: '4rem 1.5rem 3rem',
  },
  coverImage: {
    width: '100%',
    aspectRatio: '4 / 3',
    borderRadius: 'var(--radius)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    marginBottom: '2rem',
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    fontSize: '0.8rem',
    color: 'var(--color-text-muted)',
    margin: 0,
  },
  names: {
    fontFamily: 'var(--font-heading)',
    fontSize: 'clamp(2.2rem, 6vw, 3.5rem)',
    color: 'var(--color-text)',
    margin: '0.5rem 0',
  },
  date: {
    fontFamily: 'var(--font-body)',
    fontSize: '1.2rem',
    color: 'var(--color-secondary)',
    margin: 0,
  },
};
