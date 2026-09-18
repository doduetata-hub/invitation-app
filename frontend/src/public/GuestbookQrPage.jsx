import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../shared/api/client';
import { getTemplate } from './templates/registry';
import { tokensToCssVars } from './theme/tokens';

const emptyForm = { guestName: '', message: '' };

// Un invité papier n'a pas de compte : impossible de savoir côté serveur qu'il a déjà déposé
// un message. On se souvient localement (par appareil/navigateur, scopé à L'INVITATION —
// pas au QR d'une table précise, pour qu'un même invité passant par deux QR différents reste
// quand même reconnu) de l'entrée déjà créée, pour proposer de la MODIFIER plutôt que d'en
// créer une nouvelle à chaque revisite — "un invité = un message", même sans identité serveur.
function storageKey(invitationId) {
  return `gb_entry_${invitationId}`;
}

function loadRemembered(invitationId) {
  try {
    const raw = localStorage.getItem(storageKey(invitationId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRemembered(invitationId, record) {
  try {
    localStorage.setItem(storageKey(invitationId), JSON.stringify(record));
  } catch {
    // Stockage indisponible (navigation privée, quota) : tant pis, l'invité pourra toujours
    // renvoyer un message, juste sans se faire reconnaître à la prochaine visite.
  }
}

// Page ouverte après un scan de QR code posé sur table (invité "papier", sans lien
// personnalisé ni compte) — reprend l'identité visuelle réelle de l'invitation (mêmes
// couleurs/police que son template, même photo de couverture déjà en base) plutôt qu'un
// habillage générique ou une photo re-générée.
export default function GuestbookQrPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [existingEntryId, setExistingEntryId] = useState(null);
  const [locked, setLocked] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/guestbook/${token}`)
      .then((data) => {
        setInfo(data);
        const remembered = loadRemembered(data.invitationId);
        if (!remembered) return;

        // Vérifie le statut réel côté serveur : un message déjà approuvé (donc déjà diffusé au
        // diaporama) n'est plus modifiable — on affiche alors un état verrouillé plutôt que le
        // formulaire d'édition. Si l'entrée n'existe plus (supprimée côté admin), on oublie
        // simplement ce souvenir local et l'invité repart d'un formulaire vierge.
        setCheckingExisting(true);
        api
          .get(`/guestbook/${token}/entry/${remembered.entryId}`)
          .then((entry) => {
            setExistingEntryId(entry.id);
            setForm({ guestName: entry.guestName, message: entry.message });
            if (entry.status === 'APPROVED') setLocked(true);
          })
          .catch(() => {
            try {
              localStorage.removeItem(storageKey(data.invitationId));
            } catch {
              // rien à faire de plus si le stockage local n'est pas accessible
            }
          })
          .finally(() => setCheckingExisting(false));
      })
      .catch(() => setNotFound(true));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.guestName.trim()) return setError('Votre nom est requis.');
    if (form.message.trim().length < 2) return setError('Votre message est un peu court.');

    setSubmitting(true);
    try {
      const result = existingEntryId
        ? await api.patch(`/guestbook/${token}/${existingEntryId}`, form)
        : await api.post(`/guestbook/${token}`, form);
      setExistingEntryId(result.id);
      saveRemembered(result.invitationId, { entryId: result.id, guestName: form.guestName, message: form.message });
      setSubmitted(true);
      setEditing(false);
      // Approbation automatique activée par l'organisateur : le message est déjà diffusé,
      // inutile d'afficher un bouton "Modifier" qui échouerait de toute façon côté serveur.
      if (result.status === 'APPROVED') setLocked(true);
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

  if (!info || checkingExisting) {
    return <div style={styles.centerScreen}><p style={styles.centerText}>Chargement...</p></div>;
  }

  const template = getTemplate(info.templateKey);
  const cssVars = tokensToCssVars(template.tokens);
  const showForm = !locked && (!submitted || editing);

  return (
    <div style={{ ...styles.page, ...cssVars }}>
      <div style={styles.card}>
        {info.coverUrl && <img src={info.coverUrl} alt="" style={styles.photo} />}

        {info.namesLine && <h1 style={styles.names}>{info.namesLine}</h1>}
        <p style={styles.eyebrow}>Livre d'or</p>
        {info.tableLabel && <p style={styles.tableBadge}>{info.tableLabel}</p>}

        {locked && (
          <div style={styles.confirmation}>
            <p style={styles.confirmationTitle}>Votre message a déjà été approuvé et diffusé.</p>
            <p style={styles.confirmationSub}>
              « {form.message} » — {form.guestName}
            </p>
            <p style={{ ...styles.hint, margin: '1rem 0 0' }}>
              Il fait maintenant partie du livre d'or et n'est plus modifiable. Merci encore
              d'avoir partagé ce moment.
            </p>
          </div>
        )}

        {!locked && submitted && !editing && (
          <div style={styles.confirmation}>
            <p style={styles.confirmationTitle}>Votre message a bien été déposé dans le livre d'or.</p>
            <p style={styles.confirmationSub}>Merci d'avoir partagé ce moment avec eux.</p>
            <button type="button" onClick={() => setEditing(true)} style={styles.linkButton}>
              Modifier mon message
            </button>
          </div>
        )}

        {!locked && !submitted && existingEntryId && (
          <p style={styles.hint}>
            Vous avez déjà laissé un mot depuis cet appareil — vous pouvez le modifier ci-dessous.
          </p>
        )}

        {showForm && (
          <>
            {!submitted && (
              <>
                <p style={styles.intro}>Laissez un mot{info.namesLine ? ` à ${info.namesLine}` : ' aux mariés'}.</p>
                <p style={styles.hint}>
                  Votre message sera conservé dans leur livre d'or et pourra être découvert pendant la
                  célébration.
                </p>
              </>
            )}

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
                {submitting ? 'Envoi...' : existingEntryId ? 'Mettre à jour mon message' : 'Déposer mon message'}
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(false)} style={styles.linkButton}>
                  Annuler
                </button>
              )}
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
    // Même cadrage que LuxuryGoldCoverSection pour cette même photo : "cover" centré coupait
    // le haut du visage sur une photo de couple prise en plan large.
    objectPosition: '50% 22%',
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
  linkButton: {
    marginTop: '0.75rem',
    padding: 0,
    border: 'none',
    background: 'none',
    color: 'var(--color-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  confirmation: { padding: '1rem 0' },
  confirmationTitle: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '1.3rem', margin: '0 0 0.6rem' },
  confirmationSub: { fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)', fontSize: '0.95rem', margin: 0 },
};
