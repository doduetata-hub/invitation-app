import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';
import PageHeader from '../components/ui/PageHeader';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';
import InvitationActions from '../components/InvitationActions';
import InvitationCard from '../components/InvitationCard';
import { useCompact } from '../hooks/useMediaQuery';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const compact = useCompact();

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
  if (!client) return <Loading />;

  const fields = [
    { label: 'Téléphone', value: client.phone },
    { label: 'WhatsApp', value: client.whatsapp },
    { label: 'Email', value: client.email },
    { label: 'Adresse', value: client.address },
    { label: 'Client depuis', value: new Date(client.createdAt).toLocaleDateString('fr-FR') },
    { label: 'Notes', value: client.notes, wide: true },
  ];

  return (
    <div className="page--narrow">
      <PageHeader title={`${client.firstName} ${client.lastName}`} back={{ to: '/admin/clients', label: 'Clients' }}>
        <Link to={`/admin/clients/${id}/edit`} className="btn btn-outline">
          <Icon name="edit" />
          Modifier
        </Link>
        <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger-outline">
          <Icon name="trash" />
          {deleting ? 'Suppression...' : 'Supprimer'}
        </button>
      </PageHeader>

      {error && <p className="error-text">{error}</p>}

      <div className="card">
        <dl className="detail-grid">
          {fields.map((f) => (
            <div key={f.label} className={f.wide ? 'is-wide' : undefined}>
              <dt>{f.label}</dt>
              <dd className={f.value ? undefined : 'cell-muted'}>{f.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>

      <section className="data-card dashboard-section">
        <div className="data-card__head">
          <h2>Invitations</h2>
          <Link to={`/admin/invitations/new?clientId=${id}`} className="btn btn-outline btn-sm">
            <Icon name="plus" />
            Nouvelle invitation
          </Link>
        </div>
        {client.invitations.length === 0 ? (
          <div className="empty-state">Aucune invitation pour le moment.</div>
        ) : compact ? (
          <ul className="card-list">
            {client.invitations.map((inv) => (
              <InvitationCard
                key={inv.id}
                id={inv.id}
                title={inv.title}
                status={inv.status}
                date={inv.eventDate ? new Date(inv.eventDate).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : ''}
                publicSlug={inv.status === 'PUBLISHED' ? inv.slug : undefined}
              />
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Titre</th>
                  <th>Date événement</th>
                  <th>Statut</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {client.invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td><Link to={`/admin/invitations/${inv.id}/edit`}>{inv.title}</Link></td>
                    <td className={inv.eventDate ? undefined : 'cell-muted'}>
                      {inv.eventDate ? new Date(inv.eventDate).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—'}
                    </td>
                    <td><span className={STATUS_BADGE_CLASS[inv.status]}>{STATUS_LABELS[inv.status]}</span></td>
                    <td className="col-actions">
                      <InvitationActions id={inv.id} title={inv.title} publicSlug={inv.status === 'PUBLISHED' ? inv.slug : undefined} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
