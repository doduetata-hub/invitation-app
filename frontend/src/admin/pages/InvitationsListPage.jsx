import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_OPTIONS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';
import PageHeader from '../components/ui/PageHeader';
import SearchField from '../components/ui/SearchField';
import TableFooter, { usePagination } from '../components/ui/Pagination';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';
import InvitationActions from '../components/InvitationActions';
import InvitationCard from '../components/InvitationCard';
import { useCompact } from '../hooks/useMediaQuery';

const eventDay = (inv) => (inv.eventDate ? new Date(inv.eventDate).toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '');
const byText = (get) => (a, b) => get(a).localeCompare(get(b), 'fr', { sensitivity: 'base' });

const SORTS = {
  recent: { label: 'Plus récentes' }, // ordre renvoyé par le serveur
  date: {
    label: 'Date de l’événement',
    // Les invitations sans date restent à la fin.
    compare: (a, b) => (a.eventDate || '9999').localeCompare(b.eventDate || '9999'),
  },
  title: { label: 'Titre (A → Z)', compare: byText((i) => i.title) },
  client: { label: 'Client (A → Z)', compare: byText((i) => `${i.client.firstName} ${i.client.lastName}`) },
};

export default function InvitationsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get('clientId') || '';
  // Le filtre de statut vit dans l'adresse : les cartes du tableau de bord ouvrent la liste déjà filtrée.
  const statusParam = searchParams.get('status') || '';
  const status = STATUS_OPTIONS.includes(statusParam) ? statusParam : '';

  const [invitations, setInvitations] = useState([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState(''); // recherche réellement envoyée
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('recent');
  const compact = useCompact();
  const sorted = useMemo(() => (SORTS[sort].compare ? [...invitations].sort(SORTS[sort].compare) : invitations), [invitations, sort]);
  const pagination = usePagination(sorted, `${search}|${status}|${clientId}|${sort}`);

  const load = async () => {
    setLoading(true);
    setError('');
    setSearch(q);
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

  const handleStatusFilter = (e) => {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set('status', e.target.value);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Invitations" subtitle="Toutes vos créations, de la première ébauche à la publication.">
        <Link
          to={clientId ? `/admin/invitations/new?clientId=${clientId}` : '/admin/invitations/new'}
          className="btn btn-primary"
        >
          <Icon name="plus" />
          Nouvelle invitation
        </Link>
      </PageHeader>

      {error && <p className="error-text">{error}</p>}

      <section className="data-card">
        <div className="data-card__toolbar">
          <form onSubmit={handleSearchSubmit} role="search">
            <SearchField placeholder="Rechercher par titre, noms..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className="btn btn-outline">Rechercher</button>
          </form>
          <select value={status} onChange={handleStatusFilter} className="input" aria-label="Filtrer par statut">
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Trier les invitations">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : invitations.length === 0 ? (
          <div className="empty-state">{search || status ? 'Aucune invitation ne correspond à votre recherche ou au filtre choisi.' : 'Aucune invitation pour le moment.'}</div>
        ) : (
          <>
            {compact ? (
              <ul className="card-list">
                {pagination.pageItems.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    id={inv.id}
                    title={inv.title}
                    client={`${inv.client.firstName} ${inv.client.lastName}`}
                    template={inv.template.name}
                    status={inv.status}
                    date={eventDay(inv)}
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
                      <th>Client</th>
                      <th>Template</th>
                      <th>Date événement</th>
                      <th>Statut</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageItems.map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className="cell-stack">
                            <Link to={`/admin/invitations/${inv.id}/edit`}>{inv.title}</Link>
                            {inv.namesLine && <span className="cell-sub">{inv.namesLine}</span>}
                          </span>
                        </td>
                        <td>
                          <Link to={`/admin/clients/${inv.client.id}`} className="cell-link-soft">
                            {inv.client.firstName} {inv.client.lastName}
                          </Link>
                        </td>
                        <td>{inv.template.name}</td>
                        <td className={inv.eventDate ? undefined : 'cell-muted'}>{eventDay(inv) || '—'}</td>
                        <td>
                          <span className={STATUS_BADGE_CLASS[inv.status]}>{STATUS_LABELS[inv.status]}</span>
                        </td>
                        <td className="col-actions">
                          <InvitationActions id={inv.id} title={inv.title} publicSlug={inv.status === 'PUBLISHED' ? inv.slug : undefined} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <TableFooter pagination={pagination} singular="invitation" plural="invitations" />
          </>
        )}
      </section>
    </div>
  );
}
