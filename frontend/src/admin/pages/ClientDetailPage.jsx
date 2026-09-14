import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get(`/clients/${id}`)
      .then(setClient)
      .catch((err) => setError(err.message));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce client ? Cette action est irréversible.')) return;
    setDeleting(true);
    try {
      await api.delete(`/clients/${id}`);
      navigate('/admin/clients');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  if (error && !client) return <p className="error-text">{error}</p>;
  if (!client) return <p className="admin-muted">Chargement...</p>;

  return (
    <div style={{ maxWidth: '660px' }}>
      <div className="page-header">
        <div>
          <span className="admin-eyebrow">Client</span>
          <h1>{client.firstName} {client.lastName}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/admin/clients/${id}/edit`} className="btn btn-outline">Modifier</Link>
          <button onClick={handleDelete} disabled={deleting} className="btn btn-danger-outline">
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <dl className="detail-grid card" style={{ marginTop: '1rem' }}>
        <dt>Téléphone</dt>
        <dd>{client.phone || '—'}</dd>
        <dt>WhatsApp</dt>
        <dd>{client.whatsapp || '—'}</dd>
        <dt>Email</dt>
        <dd>{client.email || '—'}</dd>
        <dt>Adresse</dt>
        <dd>{client.address || '—'}</dd>
        <dt>Notes</dt>
        <dd>{client.notes || '—'}</dd>
        <dt>Client depuis</dt>
        <dd>{new Date(client.createdAt).toLocaleDateString('fr-FR')}</dd>
      </dl>

      <div className="page-header" style={{ marginTop: '2.25rem' }}>
        <h2 style={{ border: 'none', margin: 0, padding: 0 }}>Invitations</h2>
        <Link to={`/admin/invitations/new?clientId=${id}`} className="btn btn-outline btn-sm">
          + Nouvelle invitation
        </Link>
      </div>
      {client.invitations.length === 0 ? (
        <div className="empty-state">Aucune invitation pour le moment.</div>
      ) : (
        <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
        <table className="table">
          <tbody>
            {client.invitations.map((inv) => (
              <tr key={inv.id}>
                <td><Link to={`/admin/invitations/${inv.id}/edit`}>{inv.title}</Link></td>
                <td><span className={STATUS_BADGE_CLASS[inv.status]}>{STATUS_LABELS[inv.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
