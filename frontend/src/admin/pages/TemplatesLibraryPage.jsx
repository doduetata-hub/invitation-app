import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { isDesigned } from '../../public/templates/registry';
import TemplateShot from '../components/TemplateShot';
import DemoLinkActions from '../components/DemoLinkActions';
import PageHeader from '../components/ui/PageHeader';
import Loading from '../components/ui/Loading';
import Icon from '../components/ui/Icon';

export default function TemplatesLibraryPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/templates').then(setTemplates).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Templates" subtitle="Chaque modèle est montré tel que l'invité le verra, avec des données d'exemple." />
      {error && <p className="error-text">{error}</p>}
      {loading && <Loading />}
      <div className="tpl-grid">
        {templates.map((t) => (
          <article key={t.id} className="tpl-card">
            <TemplateShot tpl={t} designed={isDesigned(t.key)} />
            <div className="tpl-card__meta">
              <h3>{t.name}</h3>
              {isDesigned(t.key) ? <span>{t.category}</span> : <span className="badge">À concevoir</span>}
            </div>
            <div className="tpl-card__actions">
              <Link to={`/admin/templates/${t.key}/preview`} className="btn btn-outline btn-sm">
                <Icon name="eye" />
                Aperçu
              </Link>
              <Link to={`/admin/invitations/new?templateId=${t.id}`} className="btn btn-primary btn-sm" aria-label={`Utiliser le modèle ${t.name}`}>
                Utiliser
              </Link>
            </div>
            {isDesigned(t.key) && <DemoLinkActions tpl={t} />}
          </article>
        ))}
      </div>
    </div>
  );
}
