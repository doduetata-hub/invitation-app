import { useState } from 'react';
import { api } from '../../shared/api/client';

export default function SettingsPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '420px' }}>
      <span className="admin-eyebrow">Compte</span>
      <h1>Paramètres</h1>
      <div className="panel" style={{ marginTop: '1.25rem' }}>
        <h2>Changer le mot de passe</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <label className="field">
            Mot de passe actuel
            <input
              type="password"
              value={form.currentPassword}
              onChange={handleChange('currentPassword')}
              required
              className="input"
            />
          </label>
          <label className="field">
            Nouveau mot de passe
            <input
              type="password"
              value={form.newPassword}
              onChange={handleChange('newPassword')}
              required
              minLength={8}
              className="input"
            />
          </label>
          <label className="field">
            Confirmer le nouveau mot de passe
            <input
              type="password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              minLength={8}
              className="input"
            />
          </label>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">Mot de passe mis à jour avec succès.</p>}

          <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  );
}
