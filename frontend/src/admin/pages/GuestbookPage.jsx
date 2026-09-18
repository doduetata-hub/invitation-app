import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import QrCodeModal from '../../shared/components/QrCodeModal';
import GuestMessageModal from '../../shared/components/GuestMessageModal';

const SOURCE_LABELS = { DIGITAL: 'Invitation numérique', QR: 'QR code' };
const STATUS_BADGE = {
  PENDING: <span className="badge">En attente</span>,
  APPROVED: <span className="badge badge-success">Approuvé</span>,
  REJECTED: <span className="badge badge-danger">Rejeté</span>,
};

export default function GuestbookPage() {
  const { id } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [data, setData] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [messageView, setMessageView] = useState(null);
  const [qrView, setQrView] = useState(null);
  const [tokenForm, setTokenForm] = useState({ label: '', tableNumber: '' });
  const [creatingToken, setCreatingToken] = useState(false);
  const [busyIds, setBusyIds] = useState(new Set());
  const [savingAutoApprove, setSavingAutoApprove] = useState(false);

  const loadEntries = () => api.get(`/invitations/${id}/guestbook`).then(setData).catch((err) => setError(err.message));
  const loadTokens = () => api.get(`/invitations/${id}/guestbook/qr-tokens`).then(setTokens).catch((err) => setError(err.message));

  useEffect(() => {
    api.get(`/invitations/${id}`).then(setInvitation).catch((err) => setError(err.message));
    loadEntries();
    loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleSelected = (entryId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const withBusy = async (entryId, fn) => {
    setBusyIds((prev) => new Set(prev).add(entryId));
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const setStatus = (entryId, status) =>
    withBusy(entryId, async () => {
      await api.patch(`/guestbook-entries/${entryId}`, { status });
      await loadEntries();
    });

  const removeEntry = (entryId) =>
    withBusy(entryId, async () => {
      if (!window.confirm('Supprimer définitivement ce message du livre d\'or ?')) return;
      await api.delete(`/guestbook-entries/${entryId}`);
      await loadEntries();
    });

  const approveSelection = async () => {
    if (selected.size === 0) return;
    setError('');
    try {
      await api.post('/guestbook-entries/bulk-approve', { ids: Array.from(selected) });
      setSelected(new Set());
      await loadEntries();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    setCreatingToken(true);
    setError('');
    try {
      await api.post(`/invitations/${id}/guestbook/qr-tokens`, tokenForm);
      setTokenForm({ label: '', tableNumber: '' });
      await loadTokens();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingToken(false);
    }
  };

  const toggleAutoApprove = async () => {
    setSavingAutoApprove(true);
    setError('');
    try {
      const result = await api.patch(`/invitations/${id}/guestbook/settings`, { autoApprove: !invitation.guestbookAutoApprove });
      setInvitation((inv) => ({ ...inv, guestbookAutoApprove: result.guestbookAutoApprove }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingAutoApprove(false);
    }
  };

  const toggleTokenActive = async (token) => {
    try {
      await api.patch(`/guestbook-qr-tokens/${token.id}`, { active: !token.active });
      await loadTokens();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeToken = async (token) => {
    if (!window.confirm('Supprimer ce QR code ? Le lien imprimé cessera de fonctionner.')) return;
    try {
      await api.delete(`/guestbook-qr-tokens/${token.id}`);
      await loadTokens();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!invitation || !data || !tokens) return <p className="admin-muted">Chargement...</p>;

  const { entries, stats } = data;
  const guestbookUrl = (token) => `${window.location.origin}/guestbook/${token}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={`/admin/invitations/${id}/edit`} className="admin-eyebrow" style={{ textDecoration: 'none' }}>
            ← {invitation.title}
          </Link>
          <h1 style={{ margin: '0.3rem 0 0' }}>Livre d'or</h1>
        </div>
        {invitation.status === 'PUBLISHED' && (
          <a
            href={`/guestbook/${invitation.slug}/display`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-accent"
          >
            Ouvrir le mode écran →
          </a>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
        <StatCard label="Messages reçus" value={stats.total} />
        <StatCard label="En attente" value={stats.pending} />
        <StatCard label="Approuvés" value={stats.approved} />
        <StatCard label="Rejetés" value={stats.rejected} />
        <StatCard label="Via invitation numérique" value={stats.bySource.DIGITAL || 0} />
        <StatCard label="Via QR code" value={stats.bySource.QR || 0} />
      </div>

      <div className="editor-section">
        <h2>Modération</h2>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={invitation.guestbookAutoApprove}
            onChange={toggleAutoApprove}
            disabled={savingAutoApprove}
            style={{ marginTop: '0.2rem' }}
          />
          <span>
            <strong>Approuver automatiquement les nouveaux messages</strong>
            <br />
            <span className="admin-muted">
              Désactivé par défaut : chaque message (numérique ou QR) attend ta validation avant
              d'apparaître au diaporama. À activer seulement si tu es en confiance sur le
              contexte (mariage entre proches, faible risque) — les messages passeront alors
              directement au diaporama, sans relecture de ta part.
            </span>
          </span>
        </label>
      </div>

      <div className="editor-section">
        <h2>QR codes</h2>
        <p className="admin-muted" style={{ marginTop: 0 }}>
          À imprimer et poser sur les tables (ou à l'accueil pour un QR unique) — un invité qui
          scanne arrive directement sur une page "Laisser un mot", sans avoir reçu d'invitation
          numérique.
        </p>

        <form onSubmit={handleCreateToken} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Étiquette (ex. Accueil, Table 3)"
            value={tokenForm.label}
            onChange={(e) => setTokenForm((f) => ({ ...f, label: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Numéro de table (optionnel)"
            value={tokenForm.tableNumber}
            onChange={(e) => setTokenForm((f) => ({ ...f, tableNumber: e.target.value }))}
            className="input"
            style={{ width: '180px', flex: 'none' }}
          />
          <button type="submit" disabled={creatingToken} className="btn btn-outline">
            + Générer un QR code
          </button>
        </form>

        {tokens.length === 0 ? (
          <div className="empty-state">Aucun QR code pour le moment.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Étiquette</th>
                  <th>Table</th>
                  <th>Messages reçus</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id}>
                    <td>{t.label || '—'}</td>
                    <td>{t.tableNumber || '—'}</td>
                    <td>{t._count.entries}</td>
                    <td>{t.active ? <span className="badge badge-success">Actif</span> : <span className="badge">Désactivé</span>}</td>
                    <td style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="button" onClick={() => setQrView(t)} className="btn btn-outline btn-sm">
                        Voir le QR
                      </button>
                      <Link to={`/admin/invitations/${id}/guestbook/print/${t.id}`} target="_blank" className="btn btn-outline btn-sm">
                        Imprimer
                      </Link>
                      <button type="button" onClick={() => toggleTokenActive(t)} className="btn btn-outline btn-sm">
                        {t.active ? 'Désactiver' : 'Réactiver'}
                      </button>
                      <button type="button" onClick={() => removeToken(t)} className="btn btn-danger-outline btn-icon">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="editor-section">
        <h2>Messages</h2>

        {selected.size > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <button type="button" onClick={approveSelection} className="btn btn-primary btn-sm">
              Approuver la sélection ({selected.size})
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <div className="empty-state">Aucun message pour le moment.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Nom</th>
                  <th>Message</th>
                  <th>Origine</th>
                  <th>Table</th>
                  <th>Statut</th>
                  <th>Reçu le</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isBusy = busyIds.has(entry.id);
                  return (
                    <tr key={entry.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(entry.id)}
                          onChange={() => toggleSelected(entry.id)}
                        />
                      </td>
                      <td>{entry.guestName}</td>
                      <td className="cell-message">
                        <button
                          type="button"
                          className="cell-message-btn"
                          onClick={() => setMessageView({ name: entry.guestName, message: entry.message, tableNumber: entry.tableNumber, respondedAt: entry.createdAt })}
                        >
                          <span className="cell-message-btn-text">{entry.message}</span>
                        </button>
                      </td>
                      <td>{SOURCE_LABELS[entry.source]}</td>
                      <td>{entry.tableNumber || '—'}</td>
                      <td>{STATUS_BADGE[entry.status]}</td>
                      <td>{new Date(entry.createdAt).toLocaleString('fr-FR')}</td>
                      <td style={{ display: 'flex', gap: '0.4rem' }}>
                        {entry.status !== 'APPROVED' && (
                          <button type="button" disabled={isBusy} onClick={() => setStatus(entry.id, 'APPROVED')} className="btn btn-outline btn-sm">
                            ✓ Approuver
                          </button>
                        )}
                        {entry.status !== 'REJECTED' && (
                          <button type="button" disabled={isBusy} onClick={() => setStatus(entry.id, 'REJECTED')} className="btn btn-outline btn-sm">
                            ✕ Rejeter
                          </button>
                        )}
                        <button type="button" disabled={isBusy} onClick={() => removeEntry(entry.id)} className="btn btn-danger-outline btn-icon">
                          🗑
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {qrView && (
        <QrCodeModal
          title={qrView.label || qrView.tableNumber || 'QR code du livre d\'or'}
          link={guestbookUrl(qrView.token)}
          qrUrl={`/api/guestbook-qr-tokens/${qrView.id}/qrcode`}
          downloadName={`livre-or-${qrView.label || qrView.id}.png`}
          onClose={() => setQrView(null)}
        />
      )}

      {messageView && <GuestMessageModal {...messageView} onClose={() => setMessageView(null)} />}
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
