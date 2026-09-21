import { useEffect, useRef, useState } from 'react';
import { PHOTO_ACCEPT, prepareGuestbookPhoto } from '../utils/guestbookPhoto';

// Sélecteur de photo facultative pour le livre d'or, partagé par l'invitation numérique
// (RsvpSection) et la page QR papier (GuestbookQrPage). Un seul <input type="file"> sans
// attribut `capture` : sur smartphone, le navigateur propose lui-même « Prendre une photo »,
// « Photothèque » ou « Fichiers » ; sur ordinateur, l'explorateur de fichiers. Aucune caméra
// maison à maintenir. Thème : uniquement les variables CSS de l'invitation (--color-*, --font-*).
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
      <span style={styles.label}>Photo (facultatif)</span>

      {hasPhoto && (
        <div style={styles.previewBox}>
          {previewUrl ? (
            <img src={previewUrl} alt="Aperçu de votre photo" style={styles.preview} data-testid="guestbook-photo-preview" />
          ) : (
            <p style={styles.noPreview}>📷 Photo sélectionnée (aperçu indisponible sur ce navigateur)</p>
          )}
        </div>
      )}

      <div style={styles.actions}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled || busy} style={styles.addButton}>
          {busy ? 'Préparation de la photo...' : hasPhoto ? '📷 Remplacer la photo' : '📷 Ajouter une photo'}
        </button>
        {hasPhoto && !busy && (
          <button type="button" onClick={handleRemove} disabled={disabled} style={styles.removeButton}>
            ✕ Retirer
          </button>
        )}
      </div>

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
  label: { fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)' },
  previewBox: {
    padding: '0.35rem',
    border: '1px solid var(--color-secondary)',
    borderRadius: 'var(--radius)',
    background: 'var(--color-surface, #fff)',
    lineHeight: 0,
    maxWidth: '100%',
  },
  preview: { display: 'block', maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: 'calc(var(--radius) / 2)' },
  noPreview: { margin: 0, padding: '0.5rem', lineHeight: 1.4, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text)' },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  addButton: {
    padding: '0.6rem 0.95rem',
    border: '1px solid var(--color-secondary)',
    borderRadius: 'var(--radius)',
    background: 'transparent',
    color: 'var(--color-secondary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  removeButton: {
    padding: 0,
    border: 'none',
    background: 'none',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  hint: { fontSize: '0.75rem', color: 'var(--color-text)', fontFamily: 'var(--font-body)', opacity: 0.8 },
  error: { margin: 0, color: '#dc2626', fontFamily: 'var(--font-body)', fontSize: '0.9rem' },
};
