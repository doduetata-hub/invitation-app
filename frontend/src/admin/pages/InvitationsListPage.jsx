import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_OPTIONS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';

export default function InvitationsListPage() {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get('clientId') || '';

  const [invitations, setInvitations] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (clientId) params.set('clientId', clientId);
      const data = await api.get(`/invitations?${params.toString()}`);
      setInvitations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, clientId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <span className="admin-eyebrow">Créations</span>
          <h1>Invitations</h1>
        </div>
        <Link
          to={clientId ? `/admin/invitations/new?clientId=${clientId}` : '/admin/invitations/new'}
          className="btn btn-primary"
        >
          + Nouvelle invitation
        </Link>
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Rechercher par titre, noms..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input"
            style={{ maxWidth: '320px' }}
          />
          <button type="submit" className="btn btn-outline">Rechercher</button>
        </form>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input" style={{ width: 'auto' }}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="admin-muted">Chargement...</p>
      ) : invitations.length === 0 ? (
        <div className="empty-state">Aucune invitation pour le moment.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Client</th>
              <th>Template</th>
              <th>Date événement</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link to={`/admin/invitations/${inv.id}/edit`}>{inv.title}</Link>
                </td>
                <td>
                  <Link to={`/admin/clients/${inv.client.id}`}>
                    {inv.client.firstName} {inv.client.lastName}
                  </Link>
                </td>
                <td>{inv.template.name}</td>
                <td>
                  {inv.eventDate ? new Date(inv.eventDate).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td>
                  <span className={STATUS_BADGE_CLASS[inv.status]}>{STATUS_LABELS[inv.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
