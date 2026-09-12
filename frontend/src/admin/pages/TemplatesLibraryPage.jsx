import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { isDesigned } from '../../public/templates/registry';

export default function TemplatesLibraryPage() {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/templates').then(setTemplates).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <span className="admin-eyebrow">Bibliothèque</span>
      <h1>Templates</h1>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
        {templates.map((t) => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', margin: 0 }}>{t.name}</h3>
              {!isDesigned(t.key) && <span className="badge">À concevoir</span>}
            </div>
            <p className="admin-muted" style={{ fontSize: '0.85rem', textTransform: 'capitalize', margin: '0.35rem 0 1rem' }}>{t.category}</p>
            <Link to={`/admin/templates/${t.key}/preview`} className="btn btn-outline btn-sm">
              Aperçu →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
