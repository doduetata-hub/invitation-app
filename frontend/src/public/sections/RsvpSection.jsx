import { useEffect, useState } from 'react';

const emptyForm = { name: '', answer: 'YES', numberOfPersons: 1, drink: '', message: '' };

// Carte du QR code d'entrée de l'invité : affichée dès que son lien personnalisé est ouvert,
// qu'il ait déjà répondu ou non, pour qu'il l'ait toujours sous la main le jour J sans que le
// client ait besoin de le lui envoyer séparément (voir QrCodeModal côté client/admin).
function GuestQrCard({ slug, guestInfo }) {
  if (!slug || !guestInfo?.code) return null;
  const qrUrl = `/api/public/invitations/${slug}/qrcode?guest=${guestInfo.code}`;
  return (
    <div style={styles.qrCard}>
      <img src={qrUrl} alt="Votre QR code d'entrée" style={styles.qrImage} />
      <p style={styles.qrHint}>Présentez ce QR code à l'entrée le jour J</p>
    </div>
  );
}

export default function RsvpSection({ onSubmit, guestInfo, slug }) {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (guestInfo?.name) {
      setForm((f) => ({ ...f, name: guestInfo.name }));
    }
  }, [guestInfo?.name]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (guestInfo?.maxPersons != null && Number(form.numberOfPersons) > guestInfo.maxPersons) {
      setError(`Le nombre de personnes ne peut pas dépasser ${guestInfo.maxPersons}.`);
      return;
    }

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(form);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (guestInfo?.alreadyAnswered && !submitted) {
    return (
      <section style={styles.section}>
        <h2 style={styles.title}>Merci {guestInfo.rsvp?.name || ''} !</h2>
        <p style={styles.confirmation}>
          Vous avez déjà confirmé : {guestInfo.rsvp?.answer === 'YES' ? 'présent(e)' : 'absent(e)'}.
        </p>
        <GuestQrCard slug={slug} guestInfo={guestInfo} />
      </section>
    );
  }

  if (submitted) {
    return (
      <section style={styles.section}>
        <h2 style={styles.title}>Merci !</h2>
        <p style={styles.confirmation}>Votre réponse a bien été enregistrée.</p>
        <GuestQrCard slug={slug} guestInfo={guestInfo} />
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <h2 style={styles.title}>Confirmez votre présence</h2>
      <GuestQrCard slug={slug} guestInfo={guestInfo} />
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Nom
          <input value={form.name} onChange={handleChange('name')} required style={styles.input} />
        </label>

        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input type="radio" name="answer" value="YES" checked={form.answer === 'YES'} onChange={handleChange('answer')} />
            Je serai présent
          </label>
          <label style={styles.radioLabel}>
            <input type="radio" name="answer" value="NO" checked={form.answer === 'NO'} onChange={handleChange('answer')} />
            Je ne pourrai pas venir
          </label>
        </div>

        {form.answer === 'YES' && (
          <>
            <label style={styles.label}>
              Nombre de personnes
              <input
                type="number"
                min="1"
                max={guestInfo?.maxPersons ?? undefined}
                value={form.numberOfPersons}
                onChange={handleChange('numberOfPersons')}
                style={styles.input}
              />
              {guestInfo?.maxPersons != null && (
                <span style={styles.hint}>Maximum {guestInfo.maxPersons} personne(s)</span>
              )}
            </label>
            <label style={styles.label}>
              Boisson
              <input value={form.drink} onChange={handleChange('drink')} style={styles.input} />
            </label>
          </>
        )}

        <label style={styles.label}>
          Message
          <textarea value={form.message} onChange={handleChange('message')} rows={2} style={styles.input} />
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Envoi...' : 'Confirmer'}
        </button>
      </form>
    </section>
  );
}

const styles = {
  section: { padding: '1.5rem 1.5rem 3rem', maxWidth: '420px', margin: '0 auto', textAlign: 'center' },
  title: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '1.6rem', marginBottom: '1rem' },
  confirmation: { fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' },
  qrCard: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    margin: '1rem auto 1.5rem',
    padding: '1rem',
    background: 'var(--color-surface, #fff)',
    border: '1px solid var(--color-secondary)',
    borderRadius: 'var(--radius)',
  },
  qrImage: { width: '180px', height: '180px', maxWidth: '100%' },
  qrHint: { fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0, maxWidth: '220px' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'var(--font-body)', fontSize: '0.95rem', color: 'var(--color-text)' },
  input: { padding: '0.55rem', border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-body)', fontSize: '1rem' },
  hint: { fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'var(--font-body)' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  error: { color: '#dc2626', fontFamily: 'var(--font-body)', fontSize: '0.9rem', margin: 0 },
  button: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    border: 'none',
    borderRadius: 'var(--radius)',
    background: 'var(--color-secondary)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
