import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
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
        <div className="login-tag">Mot de passe oublié</div>
        <div className="login-divider" />

        {done ? (
          <p style={{ fontSize: '0.9rem' }}>
            Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé
            (valable 15 minutes).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <label className="field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="input"
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? 'Envoi...' : 'Envoyer le lien'}
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
