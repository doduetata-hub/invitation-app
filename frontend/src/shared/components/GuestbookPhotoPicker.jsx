import { useRef, useState, useEffect } from 'react';
import { PHOTO_ACCEPT, prepareGuestbookPhoto } from '../utils/guestbookPhoto';

// Sélecteur de photo facultative pour le livre d'or, partagé par l'invitation numérique
// (RsvpSection) et la page QR papier (GuestbookQrPage). Un seul <input type="file"> sans
// attribut `capture` : sur smartphone, le navigateur propose lui-même « Prendre une photo »,
// « Photothèque » ou « Fichiers » ; sur ordinateur, l'explorateur de fichiers. Aucune caméra
// maison à maintenir. Thème : uniquement les variables CSS de l'invitation (--color-*, --font-*).
// Le ✕ de suppression est un médaillon posé SUR l'aperçu (coin supérieur droit), comme une photo
// qu'on retire d'un album — pas un lien administratif sous l'image : ce composant doit se sentir
// comme une fonctionnalité native du livre d'or, jamais comme un formulaire d'upload back-office.
//
// Contrôlé par le parent : `photo` = { file, previewUrl } de la photo choisie, `existingUrl` =
// miniature d'une photo déjà enregistrée (mode modification). `onChange(photo)` reçoit la
// nouvelle photo préparée ; `onRemove()` la retire — la photo choisie OU l'existante.
// `onBusyChange(true)` pendant la préparation (réduction/compression, quelques centaines de ms) :
// le parent doit désactiver l'envoi tant qu'elle dure, sinon un envoi très rapide partirait SANS
// la photo qu'on vient de choisir.
export default function GuestbookPhotoPicker({ photo, existingUrl, onChange, onRemove, onBusyChange, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    onBusyChange?.(busy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const previewUrl = photo?.previewUrl ?? (photo ? null : existingUrl) ?? null;
  const hasPhoto = Boolean(photo || existingUrl);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-choisir le même fichier après l'avoir retiré
    if (!file) return;

    setError('');
    setBusy(true);
    try {
      const prepared = await prepareGuestbookPhoto(file);
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      onChange(prepared);
    } catch (err) {
      setError(err.userMessage || "Cette photo n'a pas pu être lue. Essayez-en une autre.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
    setError('');
    onRemove();
  };

  return (
    <div style={styles.wrap} data-testid="guestbook-photo-picker">
      {!hasPhoto ? (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || busy} style={styles.addButton}>
          <span style={styles.addIcon} aria-hidden="true">📷</span>
          {busy ? 'Préparation de la photo...' : 'Ajouter ma photo'}
        </button>
      ) : (
        <div style={styles.previewBox}>
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu de votre photo" style={styles.preview} data-testid="guestbook-photo-preview" />
          ) : (
            <p style={styles.noPreview}>📷 Photo sélectionnée (aperçu indisponible sur ce navigateur)</p>
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            style={styles.removeBadge}
            aria-label="Retirer la photo"
            title="Retirer la photo"
          >
            ✕
          </button>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || busy} style={styles.replaceLink}>
            {busy ? 'Préparation...' : '📷 Remplacer ma photo'}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        onChange={handleFile}
        style={{ display: 'none' }}
        data-testid="guestbook-photo-input"
      />

      {error && <p style={styles.error} role="alert">{error}</p>}
      {!error && !hasPhoto && <span style={styles.hint}>JPEG, PNG ou WebP · 10 Mo maximum</span>}
    </div>
  );
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' },
  // Discret, jamais plus visible que le champ message : bordure fine, fond transparent, aucun
  // aplat de couleur pleine qui attirerait l'œil avant le texte.
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px dashed var(--color-secondary)',
    borderRadius: 'var(--radius)',
    background: 'transparent',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    justifyContent: 'center',
  },
  addIcon: { fontSize: '1.05em' },
  previewBox: {
    position: 'relative',
    width: '100%',
    padding: '0.35rem',
    border: '1px solid var(--color-secondary)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-surface, #fff)',
  },
  preview: { display: 'block', width: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: 'calc(var(--radius) / 2)' },
  noPreview: { margin: 0, padding: '0.5rem', lineHeight: 1.4, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text)' },
  // Médaillon posé sur le coin de la photo, comme on retirerait un tirage d'un album — jamais un
  // simple lien texte en dessous, qui ferait plus "formulaire" que "souvenir".
  removeBadge: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(20, 16, 12, 0.72)',
    color: '#fff',
    fontSize: '0.85rem',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(2px)',
  },
  replaceLink: {
    display: 'block',
    margin: '0.5rem auto 0.15rem',
    padding: 0,
    border: 'none',
    background: 'none',
    color: 'var(--color-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  hint: { fontSize: '0.75rem', color: 'var(--color-text)', fontFamily: 'var(--font-body)', opacity: 0.8 },
  error: { margin: 0, color: '#dc2626', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
};
