import { useRef, useState } from 'react';
import { api } from '../../shared/api/client';

export default function MusicUploader({ invitationId, musicUrl, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.upload(`/invitations/${invitationId}/music`, formData);
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Supprimer la musique de fond ?')) return;
    try {
      await api.delete(`/invitations/${invitationId}/music`);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {musicUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <audio src={musicUrl} controls style={{ height: '32px' }} />
          <button type="button" onClick={handleRemove} className="btn btn-danger-outline btn-sm">Supprimer</button>
        </div>
      )}
      <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
        {uploading ? 'Envoi...' : musicUrl ? 'Remplacer la musique' : '+ Ajouter une musique'}
        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/ogg,audio/wav,audio/mp4,audio/aac"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </label>
      {error && <p className="error-text" style={{ marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
