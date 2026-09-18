import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../shared/api/client';
import { getTemplate } from './templates/registry';
import { tokensToCssVars } from './theme/tokens';

const emptyForm = { guestName: '', message: '' };

// Page ouverte après un scan de QR code posé sur table (invité "papier", sans lien
// personnalisé ni compte) — reprend l'identité visuelle réelle de l'invitation (mêmes
// couleurs/police que son template, même photo de couverture déjà en base) plutôt qu'un
// habillage générique ou une photo re-générée.
export default function GuestbookQrPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/guestbook/${token}`)
      .then(setInfo)
      .catch(() => setNotFound(true));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.guestName.trim()) return setError('Votre nom est requis.');
    if (form.message.trim().length < 2) return setError('Votre message est un peu court.');

    setSubmitting(true);
    try {
      await api.post(`/guestbook/${token}`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue, veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) {
    return (
      <div style={styles.centerScreen}>
        <p style={styles.centerText}>Ce QR code n'est plus valide.</p>
      </div>
    );
  }

  if (!info) {
    return <div style={styles.centerScreen}><p style={styles.centerText}>Chargement...</p></div>;
  }

  const template = getTemplate(info.templateKey);
  const cssVars = tokensToCssVars(template.tokens);

  return (
    <div style={{ ...styles.page, ...cssVars }}>
      <div style={styles.card}>
        {info.coverUrl && <img src={info.coverUrl} alt="" style={styles.photo} />}

        {info.namesLine && <h1 style={styles.names}>{info.namesLine}</h1>}
        <p style={styles.eyebrow}>Livre d'or</p>
        {info.tableLabel && <p style={styles.tableBadge}>{info.tableLabel}</p>}

        {submitted ? (
          <div style={styles.confirmation}>
            <p style={styles.confirmationTitle}>Votre message a bien été déposé dans le livre d'or.</p>
            <p style={styles.confirmationSub}>Merci d'avoir partagé ce moment avec eux.</p>
          </div>
        ) : (
          <>
            <p style={styles.intro}>Laissez un mot{info.namesLine ? ` à ${info.namesLine}` : ' aux mariés'}.</p>
            <p style={styles.hint}>
              Votre message sera conservé dans leur livre d'or et pourra être découvert pendant la
              célébration.
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                Prénom / nom
                <input
                  value={form.guestName}
                  onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))}
                  maxLength={100}
                  required
                  style={styles.input}
                />
              </label>
              <label style={styles.label}>
                Votre message
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={5}
                  maxLength={1000}
                  required
                  placeholder="Écrivez ici quelques mots, un souvenir, une bénédiction ou vos vœux pour les mariés..."
                  style={styles.input}
                />
              </label>

              {error && <p style={styles.error}>{error}</p>}

              <button type="submit" disabled={submitting} style={styles.button}>
                {submitting ? 'Envoi...' : 'Déposer mon message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
  },
  centerScreen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111111',
    padding: '2rem',
  },
  centerText: { color: '#F7F1E5', fontFamily: 'sans-serif', textAlign: 'center' },
  card: {
    width: '100%',
    maxWidth: '440px',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    padding: '2rem 1.5rem 2.25rem',
    textAlign: 'center',
    boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
  },
  photo: {
    width: '128px',
    height: '128px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--color-secondary)',
    margin: '0 auto 1.25rem',
    display: 'block',
  },
  names: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '1.7rem', margin: '0 0 0.3rem' },
  eyebrow: {
    fontFamily: 'var(--font-body)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    fontSize: '0.75rem',
    color: 'var(--color-secondary)',
    fontWeight: 'bold',
    margin: '0 0 0.75rem',
  },
  tableBadge: {
    display: 'inline-block',
    fontFamily: 'var(--font-body)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-secondary)',
    borderRadius: '999px',
    padding: '0.2rem 0.8rem',
    margin: '0 0 1.25rem',
  },
  intro: { fontFamily: 'var(--font-body)', color: 'var(--color-text)', fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.5rem' },
  hint: { fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.35rem', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' },
  input: { padding: '0.7rem 0.8rem', border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text)', background: 'var(--color-surface)' },
  error: { color: '#dc2626', fontFamily: 'var(--font-body)', fontSize: '0.9rem', margin: 0 },
  button: {
    padding: '0.9rem',
    border: 'none',
    borderRadius: 'var(--radius)',
    background: 'var(--color-secondary)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontWeight: 'bold',
    fontSize: '1.05rem',
    cursor: 'pointer',
  },
  confirmation: { padding: '1rem 0' },
  confirmationTitle: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '1.3rem', margin: '0 0 0.6rem' },
  confirmationSub: { fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: 0 },
};
