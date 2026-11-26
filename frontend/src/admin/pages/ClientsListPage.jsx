import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import PageHeader from '../components/ui/PageHeader';
import SearchField from '../components/ui/SearchField';
import TableFooter, { usePagination } from '../components/ui/Pagination';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';
import RowActions from '../components/ui/RowActions';
import { useCompact } from '../hooks/useMediaQuery';

// Deux initiales au plus, en ignorant les signes (« Kade & Sephora » donne « KS »).
const initials = (c) =>
  `${c.firstName} ${c.lastName}`
    .split(/\s+/)
    .map((word) => word.match(/^\p{L}/u)?.[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');

const SORTS = {
  recent: { label: 'Plus récents' }, // ordre renvoyé par le serveur
  name: { label: 'Nom (A → Z)', compare: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'fr', { sensitivity: 'base' }) },
};

export default function ClientsListPage() {
  const [clients, setClients] = useState([]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState(''); // recherche réellement envoyée
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('recent');
  const compact = useCompact();
  const sorted = useMemo(() => (SORTS[sort].compare ? [...clients].sort(SORTS[sort].compare) : clients), [clients, sort]);
  const pagination = usePagination(sorted, `${search}|${sort}`);

  const load = async (term) => {
    setLoading(true);
    setError('');
    setSearch(term);
    try {
      const query = term ? `?q=${encodeURIComponent(term)}` : '';
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

  const handleDelete = async (client) => {
    if (!window.confirm(`Supprimer le client ${client.firstName} ${client.lastName} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/clients/${client.id}`);
      await load(search);
    } catch (err) {
      setError(err.message); // le serveur refuse de supprimer un client qui a des invitations
    }
  };

  const actionsFor = (c) => [
    { to: `/admin/clients/${c.id}`, icon: 'eye', label: compact ? 'Consulter' : 'Voir la fiche' },
    { to: `/admin/clients/${c.id}/edit`, icon: 'edit', label: 'Modifier' },
    { to: `/admin/invitations/new?clientId=${c.id}`, icon: 'plus', label: 'Nouvelle invitation' },
    c.phone && { href: `tel:${c.phone.replace(/\s+/g, '')}`, icon: 'phone', label: 'Appeler', compactOnly: true },
    { onClick: () => handleDelete(c), icon: 'trash', label: 'Supprimer', danger: true, compactOnly: true },
  ];

  return (
    <div>
      <PageHeader title="Clients" subtitle="Les personnes pour qui vous créez des invitations.">
        <Link to="/admin/clients/new" className="btn btn-primary">
          <Icon name="plus" />
          Nouveau client
        </Link>
      </PageHeader>

      {error && <p className="error-text">{error}</p>}

      <section className="data-card">
        <div className="data-card__toolbar">
          <form onSubmit={handleSearchSubmit} role="search">
            <SearchField placeholder="Rechercher par nom, email, téléphone..." value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className="btn btn-outline">Rechercher</button>
          </form>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input" aria-label="Trier les clients">
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>{s.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <Loading />
        ) : clients.length === 0 ? (
          <div className="empty-state">{search ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client pour le moment.'}</div>
        ) : (
          <>
            {compact ? (
              <ul className="card-list">
                {pagination.pageItems.map((c) => {
                  const fullName = `${c.firstName} ${c.lastName}`;
                  const count = c._count?.invitations ?? 0;
                  return (
                    <li className="list-card" key={c.id}>
                      <span className="monogram" aria-hidden="true">{initials(c)}</span>
                      <div className="list-card__main">
                        <Link to={`/admin/clients/${c.id}`} className="list-card__title">{fullName}</Link>
                        <span className="list-card__sub">{c.phone || c.email || 'Aucune coordonnée'}</span>
                        {c.phone && c.email && <span className="list-card__sub">{c.email}</span>}
                        <span className="list-card__meta">
                          <span>{count} invitation{count > 1 ? 's' : ''}</span>
                          <span>Depuis le {new Date(c.createdAt).toLocaleDateString('fr-FR')}</span>
                        </span>
                      </div>
                      <div className="list-card__side">
                        <RowActions title={fullName} actions={actionsFor(c)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Téléphone</th>
                      <th>Email</th>
                      <th className="col-num">Invitations</th>
                      <th>Créé le</th>
                      <th className="col-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagination.pageItems.map((c) => {
                      const fullName = `${c.firstName} ${c.lastName}`;
                      return (
                        <tr key={c.id}>
                          <td>
                            <span className="cell-person">
                              <span className="monogram" aria-hidden="true">{initials(c)}</span>
                              <Link to={`/admin/clients/${c.id}`}>{fullName}</Link>
                            </span>
                          </td>
                          <td className={c.phone ? undefined : 'cell-muted'}>{c.phone || '—'}</td>
                          <td className={c.email ? undefined : 'cell-muted'}>{c.email || '—'}</td>
                          <td className="col-num">{c._count?.invitations ?? 0}</td>
                          <td>{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className="col-actions">
                            <RowActions title={fullName} actions={actionsFor(c)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <TableFooter pagination={pagination} singular="client" plural="clients" />
          </>
        )}
      </section>
    </div>
  );
}
