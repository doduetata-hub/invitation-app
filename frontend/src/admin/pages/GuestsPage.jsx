import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import QrCodeModal from '../../shared/components/QrCodeModal';
import GuestMessageModal from '../../shared/components/GuestMessageModal';
import { buildWhatsappShareUrl } from '../../shared/utils/whatsapp';
import { buildGuestDeleteWarning } from '../../shared/utils/guestWarnings';

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

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(guestUrl(code));
    setCopiedId(code);
    setTimeout(() => setCopiedId(''), 1500);
  };

  if (!data || !invitation) return <p className="admin-muted">Chargement...</p>;

  const { guests, walkInRsvps, stats } = data;
  const q = search.trim().toLowerCase();
  const filteredGuests = q
    ? guests.filter((g) =>
        [g.rsvp?.name || g.name, g.phone, g.tableNumber]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
      )
    : guests;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={`/admin/invitations/${id}/edit`} className="admin-eyebrow" style={{ textDecoration: 'none' }}>← {invitation.title}</Link>
          <h1 style={{ margin: '0.3rem 0 0' }}>Invités</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/admin/invitations/${id}/checkin`} className="btn btn-accent">
            Check-in Jour J →
          </Link>
          <a href={`/api/invitations/${id}/guests/export`} className="btn btn-outline">
            Exporter CSV
          </a>
          <a href={`/api/invitations/${id}/guests/export.xlsx`} className="btn btn-primary">
            Exporter Excel
          </a>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
        <StatCard label="Invitations envoyées" value={stats.totalGuests} />
        <StatCard label="Confirmés" value={stats.confirmed} />
        <StatCard label="Refus" value={stats.declined} />
        <StatCard label="En attente" value={stats.pending} />
        <StatCard label="Personnes attendues" value={stats.totalPersons} />
        <StatCard label="Arrivés" value={stats.arrived} />
      </div>

      <div className="editor-section">
        <h2>Liens personnalisés</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Nom (optionnel)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Téléphone (optionnel)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="input"
          />
          <input
            type="number"
            min="1"
            placeholder="Max personnes"
            value={form.maxPersons}
            onChange={(e) => setForm((f) => ({ ...f, maxPersons: e.target.value }))}
            className="input"
            style={{ width: '130px', flex: 'none' }}
          />
          <input
            placeholder="Table (optionnel)"
            value={form.tableNumber}
            onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))}
            className="input"
            style={{ width: '130px', flex: 'none' }}
          />
          <button type="submit" disabled={creating} className="btn btn-outline" style={{ flexShrink: 0 }}>+ Générer un lien</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.1rem' }}>
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {importing ? 'Import en cours...' : '📄 Importer depuis Excel'}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files[0] && handleImportFile(e.target.files[0])}
              disabled={importing}
              style={{ display: 'none' }}
            />
          </label>
          <a href={`/api/invitations/${id}/guests/import-template`} className="admin-muted" style={{ fontSize: '0.82rem' }}>
            Télécharger le modèle
          </a>
          {importMessage && <span className="success-text">{importMessage}</span>}
        </div>

        {guests.length === 0 ? (
          <div className="empty-state">Aucun lien personnalisé pour le moment.</div>
        ) : (
          <>
          <input
            type="text"
            placeholder="Rechercher un invité (nom, téléphone, table)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
            style={{ maxWidth: '340px', marginBottom: '1rem' }}
          />
          {filteredGuests.length === 0 ? (
            <div className="empty-state">Aucun invité ne correspond à "{search}".</div>
          ) : (
          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Max</th>
                <th>Table</th>
                <th>Statut</th>
                <th>Personnes</th>
                <th>Boisson</th>
                <th>Message</th>
                <th>Arrivée</th>
                <th>Lien</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g) => {
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
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{g.rsvp?.name || g.name || '—'}</td>
                        <td>{g.phone || '—'}</td>
                        <td>{g.maxPersons ?? '—'}</td>
                        <td>{g.tableNumber || '—'}</td>
                      </>
                    )}
                    <td><AnswerBadge answer={g.rsvp?.answer} /></td>
                    <td>{g.rsvp?.numberOfPersons ?? '—'}</td>
                    <td>{g.rsvp?.drink || '—'}</td>
                    <td className="cell-message">
                      {g.rsvp?.message ? (
                        <button type="button" className="cell-message-btn" onClick={() => setMessageView({ ...g.rsvp, name: g.rsvp?.name || g.name, maxPersons: g.maxPersons, tableNumber: g.tableNumber, phone: g.phone })}>
                          <span className="cell-message-btn-text">{g.rsvp.message}</span>
                        </button>
                      ) : '—'}
                    </td>
                    <td>{g.checkedInAt ? <span className="badge badge-success">Arrivé</span> : '—'}</td>
                    {isEditing ? (
                      <td colSpan={2} style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" onClick={() => saveEdit(g.id)} disabled={savingEdit} className="btn btn-primary btn-sm">
                          Enregistrer
                        </button>
                        <button type="button" onClick={cancelEdit} className="btn btn-ghost btn-sm">
                          Annuler
                        </button>
                      </td>
                    ) : (
                      <>
                        <td style={{ display: 'flex', gap: '0.4rem' }}>
                          <button type="button" onClick={() => startEdit(g)} className="btn btn-outline btn-sm">
                            Modifier
                          </button>
                          <button type="button" onClick={() => handleCopy(g.guestCode)} className="btn btn-outline btn-sm">
                            {copiedId === g.guestCode ? 'Copié !' : 'Copier'}
                          </button>
                          <button type="button" onClick={() => setQrGuest(g)} className="btn btn-outline btn-sm">
                            Afficher le QR code
                          </button>
                          {g.phone && (
                            <a
                              href={buildWhatsappShareUrl(
                                g.phone,
                                `Bonjour${g.rsvp?.name || g.name ? ' ' + (g.rsvp?.name || g.name) : ''}, voici votre invitation : ${guestUrl(g.guestCode)}`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-outline btn-sm"
                              title="Partager le lien par WhatsApp"
                            >
                              WhatsApp
                            </a>
                          )}
                        </td>
                        <td>
                          <button type="button" onClick={() => handleDelete(g.id)} className="btn btn-danger-outline btn-icon">✕</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          )}
          </>
        )}
      </div>

      <div className="editor-section">
        <h2>Réponses via le lien général</h2>
        {walkInRsvps.length === 0 ? (
          <div className="empty-state">Aucune réponse via le lien général pour le moment.</div>
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

      {qrGuest && (
        <QrCodeModal
          title={qrGuest.rsvp?.name || qrGuest.name || 'Lien invité'}
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
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
