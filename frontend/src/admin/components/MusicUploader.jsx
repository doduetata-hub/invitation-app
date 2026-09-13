import { useRef, useState } from 'react';
import { api } from '../../shared/api/client';

export default function MusicUploader({ invitationId, musicUrl, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Même principe que MediaUploader : dépôt direct dans R2 depuis le navigateur en stockage
  // S3 (contourne la limite de 4,5 Mo des fonctions serverless Vercel), ancien flux inchangé
  // en stockage local (Docker).
  const handleFile = async (file) => {
    setError('');
    setUploading(true);
    try {
      const presign = await api.post(`/invitations/${invitationId}/music/presign`, {
        contentType: file.type,
      });

      if (!presign.supported) {
        const formData = new FormData();
        formData.append('file', file);
        await api.upload(`/invitations/${invitationId}/music`, formData);
      } else {
        const putRes = await fetch(presign.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });
        if (!putRes.ok) {
          throw new Error("Échec de l'envoi du fichier vers le stockage");
        }
        await api.post(`/invitations/${invitationId}/music/finalize`, { rawKey: presign.rawKey });
      }
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
