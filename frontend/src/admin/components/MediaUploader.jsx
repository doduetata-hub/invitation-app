import { useRef, useState } from 'react';
import { api } from '../../shared/api/client';
import Icon from './ui/Icon';
import { useCompact } from '../hooks/useMediaQuery';

const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime';

export default function MediaUploader({ invitationId, type, media, onChange }) {
  const [progress, setProgress] = useState(null); // { done, total } pendant l'envoi
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(null);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const compact = useCompact();

  const items = media.filter((m) => m.type === type).sort((a, b) => a.order - b.order);
  const acceptVideo = type === 'gallery';
  const uploading = progress !== null;
  // La couverture est unique : un nouvel envoi remplace la photo en place (règle du serveur).
  const addLabel = type === 'cover' && items.length > 0 ? 'Remplacer' : 'Ajouter';

  // En stockage S3 (production), le fichier est déposé directement dans le bucket depuis le
  // navigateur (URL signée), sans passer par le backend — les fonctions serverless Vercel
  // refusent toute requête entrante au-delà de 4,5 Mo, bien en dessous d'une photo/vidéo réelle.
  // En stockage local (Docker), le presign répond { supported:false } et on garde l'ancien flux.
  const uploadOne = async (file) => {
    const presign = await api.post(`/invitations/${invitationId}/media/presign`, {
      contentType: file.type,
    });

    if (!presign.supported) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      await api.upload(`/invitations/${invitationId}/media`, formData);
      return;
    }

    const putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    if (!putRes.ok) {
      throw new Error("Échec de l'envoi du fichier vers le stockage");
    }

    await api.post(`/invitations/${invitationId}/media/finalize`, {
      rawKey: presign.rawKey,
      mimeType: file.type,
      type,
    });
  };

  const handleFiles = async (files) => {
    setError('');
    let done = 0;
    try {
      for (const file of files) {
        setProgress({ done, total: files.length });
        await uploadOne(file);
        done += 1;
      }
    } catch (err) {
      setError(files.length > 1 ? `${err.message} (${done} fichier(s) sur ${files.length} envoyé(s))` : err.message);
    } finally {
      if (done > 0) onChange(); // les fichiers déjà envoyés apparaissent même si un suivant a échoué
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  const handleDelete = async (item) => {
    const kind = item.mimeType?.startsWith('video/') ? 'cette vidéo' : 'cette photo';
    if (!window.confirm(`Supprimer ${kind} ?`)) return;
    try {
      await api.delete(`/media/${item.id}`);
      setViewing(null);
      onChange();
    } catch (err) {
      setViewing(null);
      setError(err.message);
    }
  };

  const onPick = (e) => e.target.files.length && handleFiles(Array.from(e.target.files));

  return (
    <div>
      <div className="media-grid">
        {items.map((m, index) => {
          const isVideo = m.mimeType?.startsWith('video/');
          return (
            <div key={m.id} className="media-tile">
              {isVideo ? (
                <video src={m.url} className="media-tile__img" muted playsInline />
              ) : (
                <div className="media-tile__img" style={{ backgroundImage: `url(${m.url})` }} />
              )}
              <button type="button" onClick={() => setViewing(m)} className="media-tile__open" aria-label={`Voir ${isVideo ? 'la vidéo' : 'la photo'} ${index + 1}`} />
              <button type="button" onClick={() => handleDelete(m)} className="media-tile__delete" aria-label="Supprimer ce média" title="Supprimer">
                <Icon name="x" />
              </button>
            </div>
          );
        })}
        <label className="media-add">
          <Icon name={compact ? 'image' : 'plus'} />
          {uploading ? '...' : addLabel}
          <input
            ref={inputRef}
            type="file"
            accept={acceptVideo ? `${IMAGE_TYPES},${VIDEO_TYPES}` : IMAGE_TYPES}
            multiple={type === 'gallery'}
            onChange={onPick}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
        {compact && (
          <label className="media-add">
            <Icon name="camera" />
            Prendre une photo
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onPick} disabled={uploading} style={{ display: 'none' }} />
          </label>
        )}
      </div>

      {uploading && (
        <p className="upload-status" role="status">
          Envoi {progress.total > 1 ? `${progress.done + 1} sur ${progress.total}` : 'en cours'}... Gardez cette page ouverte.
        </p>
      )}
      {acceptVideo && (
        <p className="admin-muted" style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>
          Photos et vidéos (MP4/WEBM/MOV, 60 Mo max, non compressées).
        </p>
      )}
      {error && <p className="error-text" style={{ marginTop: '0.5rem' }} role="alert">{error}</p>}

      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal-card modal-card--wide media-viewer" role="dialog" aria-modal="true" aria-label="Média" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setViewing(null)} className="modal-close" aria-label="Fermer">✕</button>
            <h3>{type === 'cover' ? 'Photo de couverture' : 'Galerie'}</h3>
            {viewing.mimeType?.startsWith('video/') ? (
              <video src={viewing.url} controls playsInline />
            ) : (
              <img src={viewing.url} alt="" />
            )}
            <div className="modal-actions inline-actions" style={{ marginTop: 'var(--space-4)' }}>
              <button type="button" className="btn btn-danger-outline" onClick={() => handleDelete(viewing)}>
                <Icon name="trash" />
                Supprimer
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setViewing(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
