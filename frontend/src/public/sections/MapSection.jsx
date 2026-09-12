import { buildMapsUrl, buildMapsEmbedUrl } from '../utils/mapsUrl';

export default function MapSection({ invitation }) {
  const { venueName, address } = invitation;
  if (!venueName && !address) return null;

  const mapsUrl = buildMapsUrl(invitation);
  const embedUrl = buildMapsEmbedUrl(invitation);

  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Lieu</h2>
      {venueName && <p style={styles.venue}>{venueName}</p>}
      {address && <p style={styles.address}>{address}</p>}

      <div style={styles.mapFrame}>
        <iframe
          title="Carte du lieu"
          src={embedUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <a href={mapsUrl} target="_blank" rel="noreferrer" style={styles.link}>
        Ouvrir dans Google Maps
      </a>
    </section>
  );
}

const styles = {
  section: { padding: '1.5rem 1.5rem 3rem', textAlign: 'center' },
  title: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '1.6rem', marginBottom: '0.75rem' },
  venue: { fontFamily: 'var(--font-body)', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--color-text)', margin: '0.25rem 0' },
  address: { fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', margin: '0.25rem 0' },
  mapFrame: {
    marginTop: '1rem',
    width: '100%',
    maxWidth: '440px',
    height: '220px',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  link: {
    display: 'inline-block',
    marginTop: '0.75rem',
    color: 'var(--color-secondary)',
    fontFamily: 'var(--font-body)',
    fontWeight: 'bold',
    textDecoration: 'none',
    borderBottom: '1px solid var(--color-secondary)',
  },
};
