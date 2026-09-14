import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (search) => {
    setLoading(true);
    setError('');
    try {
      const query = search ? `?q=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/clients${query}`);
      setClients(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load('');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load(q);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="admin-eyebrow">Carnet</span>
          <h1>Clients</h1>
        </div>
        <Link to="/admin/clients/new" className="btn btn-primary">
          + Nouveau client
        </Link>
      </div>

      <form onSubmit={handleSearchSubmit} className="toolbar">
        <input
          type="text"
          placeholder="Rechercher par nom, email, téléphone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input"
          style={{ maxWidth: '360px' }}
        />
        <button type="submit" className="btn btn-outline">Rechercher</button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="admin-muted">Chargement...</p>
      ) : clients.length === 0 ? (
        <div className="empty-state">Aucun client pour le moment.</div>
      ) : (
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Invitations</th>
              <th>Créé le</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/admin/clients/${c.id}`}>{c.firstName} {c.lastName}</Link>
                </td>
                <td>{c.phone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{c._count?.invitations ?? 0}</td>
                <td>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
