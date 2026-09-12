export default function ContactSection({ invitation }) {
  const { contactPhone, contactWhatsapp } = invitation;
  if (!contactPhone && !contactWhatsapp) return null;

  return (
    <section style={styles.section}>
      <div style={styles.buttons}>
        {contactWhatsapp && (
          <a
            href={`https://wa.me/${contactWhatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...styles.button, background: '#25D366' }}
          >
            WhatsApp
          </a>
        )}
        {contactPhone && (
          <a href={`tel:${contactPhone}`} style={{ ...styles.button, background: 'var(--color-primary)' }}>
            Appeler
          </a>
        )}
      </div>
    </section>
  );
}

const styles = {
  section: { padding: '1rem 1.5rem 3rem', textAlign: 'center' },
  buttons: { display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  button: {
    padding: '0.6rem 1.2rem',
    borderRadius: '999px',
    color: '#fff',
    textDecoration: 'none',
    fontFamily: 'var(--font-body)',
    fontWeight: 'bold',
  },
};
