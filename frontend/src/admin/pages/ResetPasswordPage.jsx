import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../shared/api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Lien invalide ou incomplet.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/admin/login'), 2000);
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-root login-shell">
      <div className="login-card">
        <div className="login-mark">Invitations</div>
        <div className="login-tag">Nouveau mot de passe</div>
        <div className="login-divider" />

        {done ? (
          <p className="success-text">Mot de passe mis à jour. Redirection vers la connexion...</p>
        ) : !token ? (
          <p className="error-text">Ce lien est invalide ou incomplet.</p>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <label className="field">
              Nouveau mot de passe
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
                className="input"
              />
            </label>
            <label className="field">
              Confirmer le nouveau mot de passe
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="input"
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Enregistrement...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}

        <p style={{ fontSize: '0.85rem', marginTop: '1.25rem' }}>
          <Link to="/admin/login">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
