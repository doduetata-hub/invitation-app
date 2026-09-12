import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';

export default function LoginPage() {
  const { admin, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && admin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-root login-shell">
      <div className="login-card">
        <div className="login-mark">Invitations</div>
        <div className="login-tag">Espace administration</div>
        <div className="login-divider" />
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
          <label className="field">
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p style={{ fontSize: '0.85rem', marginTop: '1.25rem' }}>
          <Link to="/admin/forgot-password">Mot de passe oublié ?</Link>
        </p>
      </div>
    </div>
  );
}
