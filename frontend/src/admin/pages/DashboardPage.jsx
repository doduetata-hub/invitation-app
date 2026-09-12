import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';

export default function DashboardPage() {
  const { admin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then(setSummary).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <span className="admin-eyebrow">Aujourd'hui</span>
        <h1>Tableau de bord</h1>
        <p className="dashboard-greeting">Bon retour, {admin?.email}</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {!summary ? (
        <p className="admin-muted">Chargement...</p>
      ) : (
        <>
          <section className="dashboard-section">
            <h2>Invitations</h2>
            <div className="stats-grid">
              <StatCard label="Total" value={summary.invitations.total} />
              <StatCard label="Brouillons" value={summary.invitations.byStatus.DRAFT} />
              <StatCard label="Publiées" value={summary.invitations.byStatus.PUBLISHED} />
              <StatCard label="Archivées" value={summary.invitations.byStatus.ARCHIVED} />
            </div>
          </section>

          <section className="dashboard-section">
            <h2>Clients</h2>
            <div className="stats-grid">
              <StatCard label="Total" value={summary.clients.total} />
            </div>
          </section>

          <section className="dashboard-section">
            <h2>RSVP</h2>
            <div className="stats-grid">
              <StatCard label="Confirmés" value={summary.rsvp.confirmed} />
              <StatCard label="Refus" value={summary.rsvp.declined} />
              <StatCard label="En attente" value={summary.rsvp.pending} />
            </div>
          </section>

          <section className="dashboard-section">
            <h2>Invitations récentes</h2>
            {summary.recentInvitations.length === 0 ? (
              <div className="empty-state">Aucune invitation pour le moment.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Client</th>
                    <th>Template</th>
                    <th>Statut</th>
                    <th>Créée le</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentInvitations.map((inv) => (
                    <tr key={inv.id}>
                      <td><Link to={`/admin/invitations/${inv.id}/edit`}>{inv.title}</Link></td>
                      <td>{inv.clientName}</td>
                      <td>{inv.templateName}</td>
                      <td><span className={STATUS_BADGE_CLASS[inv.status]}>{STATUS_LABELS[inv.status]}</span></td>
                      <td>{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
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
