import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../shared/api/client';
import QrCodeModal from '../shared/components/QrCodeModal';
import GuestMessageModal from '../shared/components/GuestMessageModal';
import { buildWhatsappShareUrl } from '../shared/utils/whatsapp';
import { buildGuestDeleteWarning } from '../shared/utils/guestWarnings';

const emptyForm = { name: '', phone: '', maxPersons: '', tableNumber: '' };

function AnswerBadge({ answer }) {
  if (answer === 'YES') return <span className="badge badge-success">Présent</span>;
  if (answer === 'NO') return <span className="badge badge-danger">Absent</span>;
  return <span className="badge">En attente</span>;
}

// Page publique (aucune connexion admin) scopée par un token secret propre à une seule
// invitation : elle ne donne accès qu'à la création/gestion de SES liens d'invités, jamais
// aux autres invitations, à l'édition, aux templates ou au reste de l'admin.
//
// Volontairement SANS check-in (voir CheckinAccessPage.jsx, token et lien séparés) : si le
// client délègue le contrôle d'entrée jour J à une tierce personne, elle ne doit jamais
// pouvoir créer/modifier/supprimer un invité avec ce même lien.
export default function ClientAccessPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [qrGuest, setQrGuest] = useState(null);
  const [messageView, setMessageView] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const load = () => {
    api
      .get(`/client-access/${token}`)
      .then(setData)
      .catch(() => setNotFound(true));
  };

  useEffect(load, [token]);

  const guestUrl = (code) => `${window.location.origin}/i/${data?.invitation?.slug}?guest=${code}`;

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post(`/client-access/${token}/guests`, form);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
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
      await api.patch(`/client-access/${token}/guests/${guestId}`, editForm);
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
      await api.delete(`/client-access/${token}/guests/${guestId}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleImportFile = async (file) => {
    setImporting(true);
    setError('');
    setImportMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload(`/client-access/${token}/guests/import`, formData);
      setImportMessage(`${res.imported} invité(s) importé(s) avec succès.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard?.writeText(guestUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 1500);
  };

  if (notFound) {
    return (
      <div style={styles.center}>
        <p>Ce lien n'est plus valide. Demande un nouveau lien à l'organisateur.</p>
      </div>
    );
  }

  if (!data) {
    return <div style={styles.center}>Chargement...</div>;
  }

  const { guests, stats, invitation } = data;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <p className="admin-eyebrow">{invitation.title}</p>
        <h1 style={{ margin: '0.3rem 0 1.25rem' }}>{invitation.namesLine || 'Liens d\'invités'}</h1>

        {error && <p className="error-text">{error}</p>}

        <div className="stats-grid">
          <StatCard label="Invitations envoyées" value={stats.totalGuests} />
          <StatCard label="Confirmés" value={stats.confirmed} />
          <StatCard label="Refus" value={stats.declined} />
          <StatCard label="En attente" value={stats.pending} />
          <StatCard label="Personnes attendues" value={stats.totalPersons} />
        </div>

        <div className="editor-section">
          <h2>Créer un lien personnalisé</h2>
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
            <button type="submit" disabled={creating} className="btn btn-outline" style={{ flexShrink: 0 }}>
              + Générer un lien
            </button>
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
            <a href={`/api/client-access/${token}/guests/import-template`} className="admin-muted" style={{ fontSize: '0.82rem' }}>
              Télécharger le modèle
            </a>
            {importMessage && <span className="success-text">{importMessage}</span>}
          </div>

          {guests.length === 0 ? (
            <div className="empty-state">Aucun lien personnalisé pour le moment.</div>
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
                  <th>Message</th>
                  <th>Lien</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => {
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
                      <td className="cell-message">
                        {g.rsvp?.message ? (
                          <button type="button" className="cell-message-btn" onClick={() => setMessageView({ ...g.rsvp, name: g.rsvp?.name || g.name, maxPersons: g.maxPersons, tableNumber: g.tableNumber, phone: g.phone })}>
                            <span className="cell-message-btn-text">{g.rsvp.message}</span>
                          </button>
                        ) : '—'}
                      </td>
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
                              {copiedCode === g.guestCode ? 'Copié !' : 'Copier'}
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
        </div>
      </div>

      {qrGuest && (
        <QrCodeModal
          title={qrGuest.rsvp?.name || qrGuest.name || 'Lien invité'}
          link={guestUrl(qrGuest.guestCode)}
          qrUrl={`/api/client-access/${token}/guests/${qrGuest.id}/qrcode`}
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

const styles = {
  page: { minHeight: '100vh', background: 'var(--color-bg, #faf7f2)', padding: '2rem 1rem' },
  container: { maxWidth: '900px', margin: '0 auto' },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
    color: '#6b7280',
    textAlign: 'center',
    padding: '2rem',
  },
};
