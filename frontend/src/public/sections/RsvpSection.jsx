import { useEffect, useState } from 'react';
import GuestbookPhotoPicker from '../../shared/components/GuestbookPhotoPicker';

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
      {guestInfo.tableNumber && <p style={styles.tableInfo}>Votre table : {guestInfo.tableNumber}</p>}
      <p style={styles.qrHint}>Présentez ce QR code à l'entrée le jour J</p>
    </div>
  );
}

// Coordonnées de contact affichées quand une modification n'est plus possible (verrou admin)
// ou pour signaler une erreur sur le nom, qui reste toujours imposé par l'admin (voir
// submitRsvp côté serveur) et jamais modifiable par l'invité lui-même.
function ContactHint({ invitation, children }) {
  const whatsapp = invitation?.contactWhatsapp;
  const phone = invitation?.contactPhone;
  if (!whatsapp && !phone) return null;
  return (
    <p style={styles.hint}>
      {children}{' '}
      {whatsapp && (
        <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={styles.link}>
          Contactez-nous sur WhatsApp
        </a>
      )}
      {!whatsapp && phone && (
        <a href={`tel:${phone}`} style={styles.link}>Contactez-nous par téléphone</a>
      )}
    </p>
  );
}

export default function RsvpSection({ onSubmit, guestInfo, slug, namesLine, invitation }) {
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Photo facultative du mot du livre d'or : `photo` = nouvelle photo choisie ;
  // `removeExistingPhoto` = l'invité a retiré celle déjà jointe à sa réponse précédente.
  const [photo, setPhoto] = useState(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Photo déjà enregistrée pour CET invité (lien personnalisé) et son statut : une fois le mot
  // approuvé, il est figé côté serveur (voir syncGuestbookEntry) — on ne propose donc plus de
  // changer la photo, pour ne pas laisser croire qu'elle serait prise en compte.
  const guestbookLocked = guestInfo?.guestbook?.status === 'APPROVED';
  const existingPhotoUrl = photoRemoved ? null : guestInfo?.guestbook?.photoUrl || null;

  useEffect(() => {
    if (guestInfo?.name) {
      setForm((f) => ({ ...f, name: guestInfo.name }));
    }
  }, [guestInfo?.name]);

  const handleChange = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const startEdit = () => {
    setForm({
      name: guestInfo?.name || guestInfo?.rsvp?.name || '',
      answer: guestInfo?.rsvp?.answer || 'YES',
      numberOfPersons: guestInfo?.rsvp?.numberOfPersons || 1,
      drink: guestInfo?.rsvp?.drink || '',
      message: guestInfo?.rsvp?.message || '',
    });
    setError('');
    setPhoto(null);
    setRemoveExistingPhoto(false);
    setPhotoRemoved(false);
    setEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (guestInfo?.maxPersons != null && Number(form.numberOfPersons) > guestInfo.maxPersons) {
      setError(`Le nombre de personnes ne peut pas dépasser ${guestInfo.maxPersons}.`);
      return;
    }

    if (photo && !form.message.trim()) {
      setError('Ajoutez un message pour accompagner votre photo.');
      return;
    }

    setSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(form, { photo: photo?.file || null, removePhoto: removeExistingPhoto && !photo });
      }
      setEditing(false);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  if (guestInfo?.alreadyAnswered && !submitted && !editing) {
    return (
      <section style={styles.section}>
        <h2 style={styles.title}>Merci {guestInfo.name || guestInfo.rsvp?.name || ''} !</h2>
        <p style={styles.confirmation}>
          Vous avez déjà confirmé : {guestInfo.rsvp?.answer === 'YES' ? 'présent(e)' : 'absent(e)'}.
        </p>
        {invitation?.rsvpEditLocked ? (
          <ContactHint invitation={invitation}>
            Les modifications ne sont plus possibles depuis ce lien.
          </ContactHint>
        ) : (
          <button type="button" onClick={startEdit} style={styles.linkButton}>
            Modifier ma réponse
          </button>
        )}
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
      <h2 style={styles.title}>{editing ? 'Modifiez votre réponse' : 'Confirmez votre présence'}</h2>
      <GuestQrCard slug={slug} guestInfo={guestInfo} />
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Nom
          <input
            value={form.name}
            onChange={handleChange('name')}
            required
            readOnly={Boolean(guestInfo?.name)}
            style={guestInfo?.name ? { ...styles.input, ...styles.inputLocked } : styles.input}
          />
          {guestInfo?.name && (
            <ContactHint invitation={invitation}>
              Ce lien vous est réservé personnellement. Une erreur sur votre nom ?
            </ContactHint>
          )}
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
          Laisser un mot{namesLine ? ` à ${namesLine}` : ' aux mariés'}
          <textarea
            value={form.message}
            onChange={handleChange('message')}
            rows={3}
            placeholder={`Écrivez quelques mots pour ${namesLine || 'les mariés'}...`}
            style={styles.input}
          />
          <span style={styles.hint}>Votre mot sera conservé dans leur livre d'or.</span>
        </label>

        {!guestbookLocked && (
          <GuestbookPhotoPicker
            photo={photo}
            existingUrl={existingPhotoUrl}
            onChange={(prepared) => {
              setPhoto(prepared);
              setRemoveExistingPhoto(false);
            }}
            onRemove={() => {
              // Retirer la photo choisie ; s'il n'y en a plus, retirer celle déjà enregistrée.
              if (photo) setPhoto(null);
              else {
                setPhotoRemoved(true);
                setRemoveExistingPhoto(true);
              }
            }}
            onBusyChange={setPhotoBusy}
            disabled={submitting}
          />
        )}

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={submitting || photoBusy} style={styles.button}>
          {submitting ? 'Envoi...' : editing ? 'Enregistrer les modifications' : 'Confirmer'}
        </button>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} style={styles.linkButton}>
            Annuler
          </button>
        )}
      </form>
    </section>
  );
}

const styles = {
  section: { padding: '1.5rem 1.5rem 3rem', maxWidth: '420px', margin: '0 auto', textAlign: 'center' },
  title: { fontFamily: 'var(--font-heading)', color: 'var(--color-text)', fontSize: '1.6rem', marginBottom: '1rem' },
  confirmation: { fontFamily: 'var(--font-body)', color: 'var(--color-text)' },
  qrCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    width: 'fit-content',
    margin: '1rem auto 1.5rem',
    padding: '1rem',
    background: 'var(--color-surface, #fff)',
    border: '1px solid var(--color-secondary)',
    borderRadius: 'var(--radius)',
  },
  qrImage: { width: '180px', height: '180px', maxWidth: '100%' },
  tableInfo: { fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--color-text)', margin: 0 },
  qrHint: { fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: 'var(--color-text)', margin: 0, maxWidth: '220px' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' },
  input: { padding: '0.55rem', border: '1px solid var(--color-secondary)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text)' },
  inputLocked: { background: 'var(--color-bg)', color: 'var(--color-text)', cursor: 'not-allowed' },
  hint: { fontSize: '0.75rem', color: 'var(--color-text)', fontFamily: 'var(--font-body)' },
  link: { color: 'var(--color-secondary)', fontWeight: 600 },
  linkButton: {
    background: 'none',
    border: 'none',
    color: 'var(--color-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    marginTop: '0.75rem',
    padding: 0,
  },
  radioGroup: { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontFamily: 'var(--font-body)', color: 'var(--color-text)' },
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
