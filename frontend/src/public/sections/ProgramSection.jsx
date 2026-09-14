export default function ProgramSection({ invitation }) {
  const events = invitation.events || [];
  if (events.length === 0) return null;

  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Programme</h2>
      <ol style={styles.list}>
        {events.map((ev) => (
          <li key={ev.id || ev.title} style={styles.item}>
            {ev.time && <span style={styles.time}>{ev.time}</span>}
            <div>
              <div style={styles.eventTitle}>{ev.title}</div>
              {ev.location && <div style={styles.location}>{ev.location}</div>}
              {ev.description && <div style={styles.description}>{ev.description}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const styles = {
  section: { padding: '1.5rem 1.5rem 3rem', maxWidth: '480px', margin: '0 auto' },
  title: {
    fontFamily: 'var(--font-heading)',
    textAlign: 'center',
    color: 'var(--color-text)',
    fontSize: '1.6rem',
    marginBottom: '1.5rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.1rem',
    borderLeft: '2px solid var(--color-secondary)',
  },
  item: { display: 'flex', gap: '1rem', paddingLeft: '1rem' },
  time: {
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-secondary)',
    fontWeight: 'bold',
    minWidth: '52px',
  },
  eventTitle: { fontFamily: 'var(--font-body)', fontWeight: 'bold', color: 'var(--color-text)', fontSize: '1.1rem' },
  location: { fontFamily: 'var(--font-body)', color: 'var(--color-text)' },
  description: { fontFamily: 'var(--font-body)', color: 'var(--color-text)', fontSize: '0.9rem' },
};
