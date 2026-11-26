import { useEffect, useState } from 'react';
import { drinkGroup } from '../../shared/constants/drinks';
import { useParams } from 'react-router-dom';
import { api } from '../../shared/api/client';
import QrCodeModal from '../../shared/components/QrCodeModal';
import GuestMessageModal from '../../shared/components/GuestMessageModal';
import InvitationTabs from '../components/InvitationTabs';
import PageHeader from '../components/ui/PageHeader';
import SearchField from '../components/ui/SearchField';
import StatCard from '../components/ui/StatCard';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';
import GuestCard from '../components/GuestCard';
import { useCompact } from '../hooks/useMediaQuery';
import { buildWhatsappShareUrl } from '../../shared/utils/whatsapp';
import { buildGuestDeleteWarning } from '../../shared/utils/guestWarnings';
import { buildInvitationMessage } from '../../shared/utils/invitationMessage';

const emptyForm = { name: '', phone: '', maxPersons: '', tableNumber: '' };

function AnswerBadge({ answer }) {
  if (answer === 'YES') return <span className="badge badge-success">Présent</span>;
  if (answer === 'NO') return <span className="badge badge-danger">Absent</span>;
  return <span className="badge">En attente</span>;
}

export default function GuestsPage() {
  const { id } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [qrGuest, setQrGuest] = useState(null);
  const [messageView, setMessageView] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [search, setSearch] = useState('');
  const [savingLock, setSavingLock] = useState(false);
  // Tri de la liste : null = ordre d'ajout ; sinon { key: 'table' | 'drink', dir: 'asc' | 'desc' }.
  const [sort, setSort] = useState(null);
  const [drinkFilter, setDrinkFilter] = useState('');
  const compact = useCompact();
  const [showCreate, setShowCreate] = useState(false);
  const sortDir = (key) => (sort && sort.key === key ? sort.dir : null);
  const toggleSort = (key) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' };
      return s.dir === 'asc' ? { key, dir: 'desc' } : null;
    });
  };

  const load = () => {
    api.get(`/invitations/${id}/guests`).then(setData).catch((err) => setError(err.message));
  };

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const guestUrl = (code) => `${window.location.origin}/i/${invitation?.slug}?guest=${code}`;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post(`/invitations/${id}/guests`, form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleImportFile = async (file) => {
    setImporting(true);
    setError('');
    setImportMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload(`/invitations/${id}/guests/import`, formData);
      setImportMessage(`${res.imported} invité(s) importé(s) avec succès.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const startEdit = (g) => {
    setEditingId(g.id);
    setEditForm({ name: g.name || '', phone: g.phone || '', maxPersons: g.maxPersons ?? '', tableNumber: g.tableNumber || '' });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (guestId) => {
    setSavingEdit(true);
    setError('');
    try {
      await api.patch(`/guests/${guestId}`, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (guestId) => {
    const guest = data?.guests.find((g) => g.id === guestId);
    if (!window.confirm(buildGuestDeleteWarning(guest))) return;
    try {
      await api.delete(`/guests/${guestId}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleRsvpLock = async () => {
    setSavingLock(true);
    setError('');
    try {
      const result = await api.patch(`/invitations/${id}/rsvp-settings`, { rsvpEditLocked: !invitation.rsvpEditLocked });
      setInvitation((inv) => ({ ...inv, rsvpEditLocked: result.rsvpEditLocked }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLock(false);
    }
  };

  const invitationMessage = (g) =>
    buildInvitationMessage({ guestName: g.name || g.rsvp?.name, namesLine: invitation?.namesLine, url: guestUrl(g.guestCode) });

  // « Copier » reprend le même message que WhatsApp ; le lien seul reste disponible dans la fenêtre du QR code.
  const handleCopy = (g) => {
    const code = g.guestCode;
    navigator.clipboard?.writeText(invitationMessage(g));
    setCopiedId(code);
    setTimeout(() => setCopiedId(''), 1500);
  };

  if (!data || !invitation) return error ? <p className="error-text">{error}</p> : <Loading />;

  const { guests, walkInRsvps, stats } = data;
  // Suggestions de table : derivees des tables deja saisies pour cette invitation, pas de
  // stockage a part -- des qu'un nom de table est utilise une fois, il reapparait ici.
  const tableSuggestions = [...new Set(guests.map((g) => g.tableNumber).filter(Boolean))].sort();
  const q = search.trim().toLowerCase();
  const searched = q
    ? guests.filter((g) =>
        [g.name || g.rsvp?.name, g.phone, g.tableNumber, g.rsvp?.drink]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      )
    : guests;
  // Boissons choisies (regroupées : toutes les réponses « Autre : … » comptent comme « Autre ») avec leur effectif, pour le filtre.
  const drinkCounts = guests.reduce((acc, g) => {
    const group = drinkGroup(g.rsvp?.drink);
    if (group) acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});
  const filteredGuests = drinkFilter ? searched.filter((g) => drinkGroup(g.rsvp?.drink) === drinkFilter) : searched;
  // Tri par table (ordre naturel : "Table 2" avant "Table 10") ou par boisson ; les invités sans valeur
  // restent en fin de liste quel que soit le sens du tri.
  const sortedGuests = sort
    ? [...filteredGuests].sort((a, b) => {
        const va = sort.key === 'table' ? a.tableNumber : a.rsvp?.drink;
        const vb = sort.key === 'table' ? b.tableNumber : b.rsvp?.drink;
        if (!va && !vb) return 0;
        if (!va) return 1;
        if (!vb) return -1;
        const cmp = va.localeCompare(vb, 'fr', { numeric: true, sensitivity: 'base' });
        return sort.dir === 'asc' ? cmp : -cmp;
      })
    : filteredGuests;

  const lockSection = (
      <div className="editor-section">
        <label className="check-row">
          <input
            type="checkbox"
            checked={Boolean(invitation.rsvpEditLocked)}
            onChange={toggleRsvpLock}
            disabled={savingLock}
          />
          <span>
            <strong>Verrouiller les modifications de réponse RSVP</strong>
            <span className="admin-muted">
              Une fois activé, un invité ayant déjà répondu ne peut plus changer sa présence, le nombre de
              personnes, la boisson ou son message depuis son lien — il est invité à vous contacter directement.
              Le nom reste dans tous les cas toujours réservé par vos soins, jamais modifiable par l'invité.
            </span>
          </span>
        </label>
      </div>
  );

  const shareUrl = (g) => (g.phone ? buildWhatsappShareUrl(g.phone, invitationMessage(g)) : null);
  const openMessage = (g) => setMessageView({ ...g.rsvp, name: g.name || g.rsvp?.name, maxPersons: g.maxPersons, tableNumber: g.tableNumber, phone: g.phone });
  // Sur téléphone, le formulaire de création se déplie à la demande pour laisser la liste en vue.
  const createOpen = !compact || showCreate || guests.length === 0;

  return (
    <div>
      <PageHeader title="Invités" back={{ to: `/admin/invitations/${id}/edit`, label: invitation.title }}>
        <a href={`/api/invitations/${id}/guests/export`} className="btn btn-outline">
          <Icon name="download" />
          Exporter CSV
        </a>
        <a href={`/api/invitations/${id}/guests/export.xlsx`} className="btn btn-primary">
          <Icon name="download" />
          Exporter Excel
        </a>
      </PageHeader>
      <InvitationTabs id={id} />

      {error && <p className="error-text">{error}</p>}

      <div className="stats-grid">
        <StatCard label="Invitations envoyées" value={stats.totalGuests} />
        <StatCard label="Confirmés" value={stats.confirmed} />
        <StatCard label="Refus" value={stats.declined} />
        <StatCard label="En attente" value={stats.pending} />
        <StatCard label="Personnes attendues" value={stats.totalPersons} />
        <StatCard label="Arrivés" value={stats.arrived} />
      </div>

      {!compact && lockSection}

      <div className="editor-section">
        <h2>Liens personnalisés</h2>
        {compact && guests.length > 0 && (
          <button type="button" className="btn btn-primary guest-new" onClick={() => setShowCreate((v) => !v)} aria-expanded={showCreate}>
            <Icon name={showCreate ? 'x' : 'plus'} />
            {showCreate ? 'Fermer' : 'Nouveau lien personnalisé'}
          </button>
        )}
        {createOpen && (
          <>
        <form onSubmit={handleCreate} className="guest-create">
          <input
            placeholder="Nom (optionnel)"
            aria-label="Nom"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Téléphone (optionnel)"
            aria-label="Téléphone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="input"
          />
          <input
            type="number"
            min="1"
            placeholder="Max personnes"
            aria-label="Nombre maximal de personnes"
            value={form.maxPersons}
            onChange={(e) => setForm((f) => ({ ...f, maxPersons: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Table (optionnel)"
            aria-label="Table"
            value={form.tableNumber}
            onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))}
            className="input"
            list="table-suggestions"
          />
          <button type="submit" disabled={creating} className="btn btn-primary">+ Générer un lien</button>
        </form>

        <div className="guest-tools">
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {importing ? 'Import en cours...' : 'Importer depuis Excel'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files[0] && handleImportFile(e.target.files[0])}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
          <a href={`/api/invitations/${id}/guests/import-template`} className="text-link">
            Télécharger le modèle
          </a>
          {importMessage && <span className="success-text">{importMessage}</span>}
        </div>
          </>
        )}

        {guests.length === 0 ? (
          <div className="empty-state">Aucun lien personnalisé pour le moment.</div>
        ) : (
          <div className="data-card">
          <div className="data-card__toolbar">
            <SearchField
              placeholder="Rechercher un invité (nom, téléphone, table)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {compact && (
              <select
                value={sort?.key || ''}
                onChange={(e) => setSort(e.target.value ? { key: e.target.value, dir: 'asc' } : null)}
                className="input"
                aria-label="Trier les invités"
              >
                <option value="">Ordre d'ajout</option>
                <option value="table">Par table</option>
                <option value="drink">Par boisson</option>
              </select>
            )}
            {Object.keys(drinkCounts).length > 0 && (
              <select
                value={drinkFilter}
                onChange={(e) => setDrinkFilter(e.target.value)}
                className="input"
                aria-label="Filtrer par boisson"
              >
                <option value="">Toutes les boissons</option>
                {Object.entries(drinkCounts).sort(([a], [b]) => a.localeCompare(b, 'fr')).map(([d, n]) => (
                  <option key={d} value={d}>{d} ({n})</option>
                ))}
              </select>
            )}
          </div>
          {filteredGuests.length === 0 ? (
            <div className="empty-state">Aucun invité ne correspond à votre recherche ou au filtre choisi.</div>
          ) : compact ? (
            <ul className="card-list">
              {sortedGuests.map((g) => (
                <GuestCard
                  key={g.id}
                  guest={g}
                  badge={<AnswerBadge answer={g.rsvp?.answer} />}
                  showDrink
                  editing={editingId === g.id}
                  editForm={editForm}
                  setEditForm={setEditForm}
                  saving={savingEdit}
                  onSave={() => saveEdit(g.id)}
                  onCancel={cancelEdit}
                  onEdit={() => startEdit(g)}
                  onCopy={() => handleCopy(g)}
                  copied={copiedId === g.guestCode}
                  onQr={() => setQrGuest(g)}
                  onDelete={() => handleDelete(g.id)}
                  whatsappUrl={shareUrl(g)}
                  onMessage={() => openMessage(g)}
                />
              ))}
            </ul>
          ) : (
          <div className="table-wrap">
          <table className="table table--sticky">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Max</th>
                <th>
                  <button type="button" className="table-sort-btn" onClick={() => toggleSort('table')}>
                    Table
                    <span className="table-sort-icon">{sortDir('table') === 'asc' ? '↑' : sortDir('table') === 'desc' ? '↓' : '⇅'}</span>
                  </button>
                </th>
                <th>Statut</th>
                <th>Personnes</th>
                <th>
                  <button type="button" className="table-sort-btn" onClick={() => toggleSort('drink')}>
                    Boisson
                    <span className="table-sort-icon">{sortDir('drink') === 'asc' ? '↑' : sortDir('drink') === 'desc' ? '↓' : '⇅'}</span>
                  </button>
                </th>
                <th>Message</th>
                <th>Arrivée</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedGuests.map((g) => {
                const isEditing = editingId === g.id;
                return (
                  <tr key={g.id}>
                    {isEditing ? (
                      <>
                        <td>
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                            className="input"
                            style={{ minWidth: '110px' }}
                          />
                        </td>
                        <td>
                          <input
                            value={editForm.phone}
                            onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                            className="input"
                            style={{ minWidth: '110px' }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={editForm.maxPersons}
                            onChange={(e) => setEditForm((f) => ({ ...f, maxPersons: e.target.value }))}
                            className="input"
                            style={{ width: '70px' }}
                          />
                        </td>
                        <td>
                          <input
                            value={editForm.tableNumber}
                            onChange={(e) => setEditForm((f) => ({ ...f, tableNumber: e.target.value }))}
                            className="input"
                            style={{ width: '90px' }}
                            list="table-suggestions"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{g.name || g.rsvp?.name || '—'}</td>
                        <td>{g.phone || '—'}</td>
                        <td>{g.maxPersons ?? '—'}</td>
                        <td>{g.tableNumber || '—'}</td>
                      </>
                    )}
                    <td><AnswerBadge answer={g.rsvp?.answer} /></td>
                    <td>{g.rsvp?.numberOfPersons ?? '—'}</td>
                    <td>{g.rsvp?.drink || '—'}</td>
                    <td className={g.rsvp?.message ? 'cell-message' : 'cell-muted'}>
                      {g.rsvp?.message ? (
                        <button type="button" className="cell-message-btn" onClick={() => setMessageView({ ...g.rsvp, name: g.name || g.rsvp?.name, maxPersons: g.maxPersons, tableNumber: g.tableNumber, phone: g.phone })}>
                          <span className="cell-message-btn-text">{g.rsvp.message}</span>
                        </button>
                      ) : '—'}
                    </td>
                    <td>{g.checkedInAt ? <span className="badge badge-success">Arrivé</span> : '—'}</td>
                    <td className="col-actions">
                      {isEditing ? (
                        <span className="inline-actions">
                          <button type="button" onClick={() => saveEdit(g.id)} disabled={savingEdit} className="btn btn-primary btn-sm">
                            Enregistrer
                          </button>
                          <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                            Annuler
                          </button>
                        </span>
                      ) : (
                        <span className="row-actions">
                          <button type="button" onClick={() => startEdit(g)} className="row-action" title="Modifier" aria-label="Modifier">
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(g)}
                            className={`row-action${copiedId === g.guestCode ? ' is-done' : ''}`}
                            title={copiedId === g.guestCode ? 'Copié !' : 'Copier'}
                            aria-label={copiedId === g.guestCode ? 'Copié !' : 'Copier'}
                          >
                            <Icon name={copiedId === g.guestCode ? 'check' : 'copy'} />
                          </button>
                          <button type="button" onClick={() => setQrGuest(g)} className="row-action" title="Afficher le QR code" aria-label="Afficher le QR code">
                            <Icon name="qr" />
                          </button>
                          {g.phone && (
                            <a
                              href={buildWhatsappShareUrl(
                                g.phone,
                                invitationMessage(g)
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="row-action"
                              title="Partager le lien par WhatsApp"
                              aria-label="Partager le lien par WhatsApp"
                            >
                              <Icon name="chat" />
                            </a>
                          )}
                          <button type="button" onClick={() => handleDelete(g.id)} className="row-action row-action--danger" title="Supprimer" aria-label="Supprimer">
                            <Icon name="trash" />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          )}
          </div>
        )}
      </div>

      <div className="editor-section">
        <h2>Réponses via le lien général</h2>
        {walkInRsvps.length === 0 ? (
          <div className="empty-state">Aucune réponse via le lien général pour le moment.</div>
        ) : compact ? (
          <ul className="card-list">
            {walkInRsvps.map((r) => (
              <li key={r.id} className="stack-card">
                <div className="stack-card__head">
                  <strong>{r.name}</strong>
                  <AnswerBadge answer={r.answer} />
                  {r.checkedInAt && <span className="badge badge-success">Arrivé</span>}
                </div>
                <p className="stack-card__facts">
                  <span>{r.numberOfPersons} personne{r.numberOfPersons > 1 ? 's' : ''}</span>
                  {r.drink && <span>{r.drink}</span>}
                  <span>Répondu le {new Date(r.respondedAt).toLocaleDateString('fr-FR')}</span>
                </p>
                {r.message && (
                  <button type="button" className="stack-card__quote" onClick={() => setMessageView(r)}>{r.message}</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Statut</th>
                <th>Personnes</th>
                <th>Boisson</th>
                <th>Message</th>
                <th>Arrivée</th>
                <th>Répondu le</th>
              </tr>
            </thead>
            <tbody>
              {walkInRsvps.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><AnswerBadge answer={r.answer} /></td>
                  <td>{r.numberOfPersons}</td>
                  <td>{r.drink || '—'}</td>
                  <td className="cell-message">
                    {r.message ? (
                      <button type="button" className="cell-message-btn" onClick={() => setMessageView(r)}>
                        <span className="cell-message-btn-text">{r.message}</span>
                      </button>
                    ) : '—'}
                  </td>
                  <td>{r.checkedInAt ? <span className="badge badge-success">Arrivé</span> : '—'}</td>
                  <td>{new Date(r.respondedAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {compact && lockSection}

      {qrGuest && (
        <QrCodeModal
          title={qrGuest.name || qrGuest.rsvp?.name || 'Lien invité'}
          link={guestUrl(qrGuest.guestCode)}
          qrUrl={`/api/guests/${qrGuest.id}/qrcode`}
          downloadName={`qrcode-${qrGuest.guestCode}.png`}
          onClose={() => setQrGuest(null)}
        />
      )}

      {messageView && (
        <GuestMessageModal
          {...messageView}
          onClose={() => setMessageView(null)}
        />
      )}

      <datalist id="table-suggestions">
        {tableSuggestions.map((t) => <option key={t} value={t} />)}
      </datalist>
    </div>
  );
}
