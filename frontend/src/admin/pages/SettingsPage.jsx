import { useState } from 'react';
import { api } from '../../shared/api/client';
import { useAuth } from '../../shared/auth/AuthContext';
import PageHeader from '../components/ui/PageHeader';

export default function SettingsPage() {
  const { admin } = useAuth();
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
    <div>
      <PageHeader title="Paramètres" subtitle={admin?.email ? `Compte connecté : ${admin.email}` : undefined} />
      <div className="settings-row">
        <div className="settings-row__intro">
          <h2>Changer le mot de passe</h2>
          <p>Saisissez votre mot de passe actuel, puis le nouveau (8 caractères au minimum) deux fois.</p>
        </div>
        <form onSubmit={handleSubmit} className="panel form-stack">
          <label className="field">
            Mot de passe actuel
            <input
              type="password"
              autoComplete="current-password"
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
              autoComplete="new-password"
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
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              minLength={8}
              className="input"
            />
          </label>

          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text" role="status">Mot de passe mis à jour avec succès.</p>}

          <div className="form-actions">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Enregistrement...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
