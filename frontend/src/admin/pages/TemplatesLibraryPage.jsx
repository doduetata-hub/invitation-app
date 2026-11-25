import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { isDesigned } from '../../public/templates/registry';

// Vignette vivante : la page du template ne se charge que lorsque la carte apparaît à l'écran (13 pages complètes d'un coup surchargeraient le serveur).
function LiveShot({ tpl }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Link ref={ref} to={`/admin/templates/${tpl.key}/preview`} className="tpl-card__shot" aria-label={`Voir le modèle ${tpl.name} en grand`}>
      {on && isDesigned(tpl.key) ? <iframe src={`/admin/templates/${tpl.key}/preview?embed=1`} title={`Aperçu de ${tpl.name}`} tabIndex={-1} /> : null}
    </Link>
  );
}

export default function TemplatesLibraryPage() {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/templates').then(setTemplates).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>Templates</h1>
      <p className="admin-muted" style={{ margin: 0 }}>Chaque modèle est montré tel que l'invité le verra, avec des données d'exemple.</p>
      {error && <p className="error-text">{error}</p>}
      <div className="tpl-grid">
        {templates.map((t) => (
          <article key={t.id} className="tpl-card">
            <LiveShot tpl={t} />
            <div className="tpl-card__meta">
              <h3>{t.name}</h3>
              {isDesigned(t.key) ? <span>{t.category}</span> : <span className="badge">À concevoir</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
