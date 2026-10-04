import { useState } from 'react';
import { api } from '../../shared/api/client';
import { avatarObjectPosition, hasFaceFocus } from '../../shared/utils/avatarFocus';

// Réglage du cadrage de l'avatar rond d'une photo du livre d'or. Le serveur détecte le visage tout seul
// à l'envoi de la photo ; ici, on corrige à la main quand la détection se trompe (visage de profil,
// lunettes de soleil, photo de groupe...) : un clic sur le visage, l'aperçu rond se recentre tout de
// suite, « Enregistrer » le garde (écran de la salle et PDF). « Détection automatique » annule le
// réglage manuel et relance la détection.
const SOURCE_TEXT = {
  auto: 'Visage détecté automatiquement.',
  manual: 'Cadrage réglé à la main.',
  none: 'Aucun visage détecté : cadrage par défaut. Cliquez sur le visage pour le centrer.',
};

export default function PhotoFocusEditor({ entryId, photo, onSaved }) {
  const [point, setPoint] = useState(() => (hasFaceFocus(photo) ? { focusX: photo.focusX, focusY: photo.focusY } : null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const savedPoint = hasFaceFocus(photo) ? { focusX: photo.focusX, focusY: photo.focusY } : null;
  const dirty = point && (!savedPoint || point.focusX !== savedPoint.focusX || point.focusY !== savedPoint.focusY);
  const previewPhoto = { ...photo, ...(point || { focusX: null, focusY: null }) };

  const handleClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const round = (value) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
    setPoint({
      focusX: round(((event.clientX - rect.left) / rect.width) * 100),
      focusY: round(((event.clientY - rect.top) / rect.height) * 100),
    });
    setError('');
  };

  const run = async (body) => {
    setBusy(true);
    setError('');
    try {
      const result = await api.patch(`/guestbook-entries/${entryId}/photo-focus`, body);
      setPoint(hasFaceFocus(result) ? { focusX: result.focusX, focusY: result.focusY } : null);
      onSaved(result);
    } catch (err) {
      setError(err.message || "Le cadrage n'a pas pu être enregistré");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.box}>
      <p style={styles.label}>Cadrage de l'avatar</p>
      <div style={styles.row}>
        <div style={styles.photoWrap} onClick={handleClick} title="Cliquez sur le visage">
          <img src={photo.url} alt="Photo à cadrer" style={styles.photo} draggable="false" />
          {point && <span style={{ ...styles.marker, left: `${point.focusX}%`, top: `${point.focusY}%` }} />}
        </div>
        <div style={styles.previewCol}>
          <div style={styles.avatar}>
            <img src={photo.thumbUrl || photo.url} alt="" style={{ ...styles.avatarImg, objectPosition: avatarObjectPosition(previewPhoto) }} />
          </div>
          <span style={styles.hint}>Aperçu de l'avatar</span>
        </div>
      </div>
      <p style={styles.status}>{dirty ? 'Modifié : pensez à enregistrer.' : SOURCE_TEXT[photo.focusSource] || "Cadrage par défaut (pas encore analysée). Cliquez sur le visage pour le centrer."}</p>
      {error && <p className="error-text" style={{ margin: '0.3rem 0' }}>{error}</p>}
      <div style={styles.actions}>
        <button type="button" className="btn btn-accent btn-sm" disabled={busy || !dirty} onClick={() => run({ focusX: point.focusX, focusY: point.focusY })}>
          {busy ? '...' : 'Enregistrer le cadrage'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run({ reset: true })} title="Relance la détection automatique du visage">
          ↺ Détection automatique
        </button>
      </div>
    </div>
  );
}

const styles = {
  box: { margin: '0 0 1rem', padding: '0.8rem', borderRadius: '10px', border: '1px solid rgba(184,138,50,0.35)', background: 'rgba(20,17,12,0.04)' },
  label: { margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#8a7a5c' },
  row: { display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  photoWrap: { position: 'relative', display: 'inline-block', lineHeight: 0, cursor: 'crosshair', maxWidth: '100%', userSelect: 'none' },
  photo: { display: 'block', maxWidth: '100%', maxHeight: '260px', borderRadius: '6px' },
  marker: { position: 'absolute', width: '26px', height: '26px', marginLeft: '-13px', marginTop: '-13px', borderRadius: '50%', border: '2px solid #F2D28C', boxShadow: '0 0 0 2px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.4)', pointerEvents: 'none' },
  previewCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' },
  avatar: { width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #D9AE62', background: '#14110c', boxShadow: '0 0 12px rgba(228,182,94,0.4)' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  hint: { fontSize: '0.72rem', color: '#8a7a5c' },
  status: { margin: '0.6rem 0 0.5rem', fontSize: '0.85rem' },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
};
