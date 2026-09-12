export default function GallerySection({ invitation }) {
  const gallery = (invitation.media || []).filter((m) => m.type === 'gallery');
  if (gallery.length === 0) return null;

  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Galerie</h2>
      <div style={styles.grid}>
        {gallery.map((m) =>
          m.mimeType?.startsWith('video/') ? (
            <video
              key={m.id || m.url}
              src={m.url}
              controls
              preload="metadata"
              playsInline
              style={styles.thumb}
            />
          ) : (
            <img
              key={m.id || m.url}
              src={m.url}
              alt=""
              loading="lazy"
              decoding="async"
              style={styles.thumb}
            />
          )
        )}
      </div>
    </section>
  );
}

const styles = {
  section: { padding: '1.5rem 1.5rem 3rem' },
  title: {
    fontFamily: 'var(--font-heading)',
    textAlign: 'center',
    color: 'var(--color-text)',
    fontSize: '1.6rem',
    marginBottom: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '0.5rem',
    maxWidth: '520px',
    margin: '0 auto',
  },
  thumb: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    borderRadius: 'var(--radius)',
    display: 'block',
    background: '#000',
  },
};
