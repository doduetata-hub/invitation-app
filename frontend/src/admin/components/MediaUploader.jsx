import { useRef, useState } from 'react';
import { api } from '../../shared/api/client';

export default function MediaUploader({ invitationId, type, media, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const items = media.filter((m) => m.type === type).sort((a, b) => a.order - b.order);
  const acceptVideo = type === 'gallery';

  const handleFiles = async (files) => {
    setError('');
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        await api.upload(`/invitations/${invitationId}/media`, formData);
      }
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (mediaId) => {
    try {
      await api.delete(`/media/${mediaId}`);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div style={styles.grid}>
        {items.map((m) => (
          <div key={m.id} style={styles.thumbWrapper}>
            {m.mimeType?.startsWith('video/') ? (
              <video src={m.url} style={styles.thumb} muted playsInline />
            ) : (
              <div style={{ ...styles.thumb, backgroundImage: `url(${m.url})` }} />
            )}
            <button type="button" onClick={() => handleDelete(m.id)} style={styles.deleteButton}>✕</button>
          </div>
        ))}
        <label style={styles.addTile}>
          {uploading ? '...' : '+ Ajouter'}
          <input
            ref={inputRef}
            type="file"
            accept={
              acceptVideo
                ? 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime'
                : 'image/jpeg,image/png,image/webp,image/heic,image/heif'
            }
            multiple={type === 'gallery'}
            onChange={(e) => e.target.files.length && handleFiles(Array.from(e.target.files))}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>
      {acceptVideo && (
        <p className="admin-muted" style={{ fontSize: '0.75rem', marginTop: '0.4rem' }}>
          Photos et vidéos (MP4/WEBM/MOV, 60 Mo max, non compressées).
        </p>
      )}
      {error && <p className="error-text" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}

const styles = {
  grid: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.5rem' },
  thumbWrapper: { position: 'relative', width: '90px', height: '90px' },
  thumb: {
    width: '100%', height: '100%', objectFit: 'cover', backgroundSize: 'cover', backgroundPosition: 'center',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)',
  },
  deleteButton: {
    position: 'absolute', top: '-7px', right: '-7px', width: '22px', height: '22px',
    borderRadius: '50%', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', background: '#fff',
    cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1,
  },
  addTile: {
    width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px dashed var(--color-border-strong)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem',
    color: 'var(--color-ink-faint)', cursor: 'pointer', textAlign: 'center', padding: '0.3rem',
    transition: 'border-color 160ms ease, color 160ms ease',
  },
};
