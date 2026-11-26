import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { api } from '../../shared/api/client';
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../../shared/constants/invitations';
import TemplateShot from '../components/TemplateShot';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';
import InvitationActions from '../components/InvitationActions';
import InvitationCard from '../components/InvitationCard';
import { useCompact } from '../hooks/useMediaQuery';

export default function DashboardPage() {
  const { admin } = useAuth();
  const [summary, setSummary] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const compact = useCompact();

  useEffect(() => {
    api.get('/dashboard').then(setSummary).catch((err) => setError(err.message));
    // Sert seulement à l'aperçu du modèle : s'il manque, le tableau de bord reste complet.
    api.get('/templates').then(setTemplates).catch(() => {});
  }, []);

  const latest = summary?.recentInvitations[0];
  // L'aperçu du modèle est réservé au grand écran : sur téléphone il chargerait une page entière pour rien.
  const latestTemplate = latest && !compact ? templates.find((t) => t.name === latest.templateName) : null;

  return (
    <div>
      <PageHeader
        title={compact ? 'Bonjour' : 'Tableau de bord'}
        subtitle={compact ? 'Voici un aperçu de votre activité' : `Bon retour, ${admin?.email || ''}`}
      >
        {!compact && (
          <Link to="/admin/invitations/new" className="btn btn-primary">
            <Icon name="plus" />
            Nouvelle invitation
          </Link>
        )}
      </PageHeader>

      {error && <p className="error-text">{error}</p>}
      {!summary ? (
        !error && <Loading />
      ) : (
        <>
          <section className="kpi-grid" aria-label="Chiffres clés">
            <KpiCard
              featured
              to="/admin/invitations"
              icon="mail"
              label="Invitations"
              value={summary.invitations.total}
              note={`Archivées : ${summary.invitations.byStatus.ARCHIVED}`}
            />
            <KpiCard to="/admin/invitations?status=DRAFT" icon="draft" label="Brouillons" value={summary.invitations.byStatus.DRAFT} />
            <KpiCard to="/admin/invitations?status=PUBLISHED" icon="checkCircle" label="Publiées" value={summary.invitations.byStatus.PUBLISHED} />
            <KpiCard to="/admin/clients" icon="users" label="Clients" value={summary.clients.total} />
          </section>

          {compact && (
            <nav className="dashboard-section quick-actions" aria-label="Actions rapides">
              <Link to="/admin/invitations/new" className="btn btn-primary">
                <Icon name="plus" />
                Nouvelle invitation
              </Link>
              <Link to="/admin/clients/new" className="btn btn-outline">
                <Icon name="users" />
                Nouveau client
              </Link>
              <Link to="/admin/invitations" className="btn btn-outline">
                <Icon name="mail" />
                Gérer les invitations
              </Link>
              <Link to="/admin/templates" className="btn btn-outline">
                <Icon name="templates" />
                Templates
              </Link>
            </nav>
          )}

          <section className="dashboard-section">
            <h2>Invitations personnalisées et réponses</h2>
            <div className="stats-grid">
              <StatCard label="Liens envoyés" value={summary.guests.total} />
              <StatCard label="Confirmées" value={summary.rsvp.confirmed} />
              <StatCard label="Refusées" value={summary.rsvp.declined} />
              <StatCard label="En attente" value={summary.rsvp.pending} />
              <StatCard label="Personnes attendues" value={summary.rsvp.personsConfirmed} />
            </div>
          </section>

          <div className="dashboard-section dashboard-columns">
            <section className="data-card">
              <div className="data-card__head">
                <h2>Invitations récentes</h2>
                <Link to="/admin/invitations" className="text-link">
                  Voir toutes
                  <Icon name="arrowRight" />
                </Link>
              </div>
              {summary.recentInvitations.length === 0 ? (
                <div className="empty-state">Aucune invitation pour le moment.</div>
              ) : compact ? (
                <ul className="card-list">
                  {summary.recentInvitations.map((inv) => (
                    <InvitationCard
                      key={inv.id}
                      id={inv.id}
                      title={inv.title}
                      client={inv.clientName}
                      template={inv.templateName}
                      status={inv.status}
                      dateLabel="Créée le"
                      date={new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                    />
                  ))}
                </ul>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invitation</th>
                        <th>Modèle</th>
                        <th>Statut</th>
                        <th>Créée le</th>
                        <th className="col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.recentInvitations.map((inv) => (
                        <tr key={inv.id}>
                          <td>
                            <span className="cell-stack">
                              <Link to={`/admin/invitations/${inv.id}/edit`}>{inv.title}</Link>
                              <span className="cell-sub">{inv.clientName}</span>
                            </span>
                          </td>
                          <td>{inv.templateName}</td>
                          <td><span className={STATUS_BADGE_CLASS[inv.status]}>{STATUS_LABELS[inv.status]}</span></td>
                          <td>{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className="col-actions"><InvitationActions id={inv.id} title={inv.title} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {latestTemplate && (
              <aside className="spotlight">
                <h2>Aperçu du modèle</h2>
                <p className="spotlight__caption">
                  {latestTemplate.name}, modèle de la dernière invitation (données d'exemple).
                </p>
                <TemplateShot key={latestTemplate.key} tpl={latestTemplate} />
                <Link to={`/admin/templates/${latestTemplate.key}/preview`} className="btn btn-outline">
                  Voir le modèle
                  <Icon name="arrowRight" />
                </Link>
              </aside>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ to, icon, label, value, note, featured }) {
  return (
    <Link to={to} className={`kpi${featured ? ' kpi--featured' : ''}`}>
      <span className="kpi__icon"><Icon name={icon} /></span>
      <span className="kpi__body">
        <span className="kpi__value">{value}</span>
        <span className="kpi__label">{label}</span>
        {note && <span className="kpi__note">{note}</span>}
      </span>
      <span className="kpi__arrow"><Icon name="arrowRight" /></span>
    </Link>
  );
}
