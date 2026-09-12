import { useEffect, useState } from 'react';

function getTimeParts(targetDate) {
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function CountdownSection({ invitation }) {
  const { eventDate } = invitation;
  const [parts, setParts] = useState(() => (eventDate ? getTimeParts(eventDate) : null));

  useEffect(() => {
    if (!eventDate) return;
    const interval = setInterval(() => setParts(getTimeParts(eventDate)), 1000);
    return () => clearInterval(interval);
  }, [eventDate]);

  if (!eventDate || !parts) return null;

  const units = [
    { label: 'Jours', value: parts.days },
    { label: 'Heures', value: parts.hours },
    { label: 'Minutes', value: parts.minutes },
    { label: 'Secondes', value: parts.seconds },
  ];

  return (
    <section style={styles.section}>
      <div style={styles.grid}>
        {units.map((u) => (
          <div key={u.label} style={styles.card}>
            <div style={styles.value}>{String(u.value).padStart(2, '0')}</div>
            <div style={styles.label}>{u.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const styles = {
  section: { padding: '1rem 1.5rem 3rem', textAlign: 'center' },
  grid: { display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    padding: '0.9rem 1rem',
    minWidth: '70px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  value: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.6rem',
    color: 'var(--color-primary)',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-text-muted)',
  },
};
