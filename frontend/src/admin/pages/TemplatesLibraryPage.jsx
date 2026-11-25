import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api/client';
import { isDesigned } from '../../public/templates/registry';

// File d'attente des vignettes : deux pages d'aperçu à la fois au maximum (treize chargées ensemble saturent le navigateur et le serveur).
const MAX_PARALLEL = 2;
const queue = [];
let active = 0;
function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    const job = queue.shift();
    active += 1;
    job();
  }
}
function release() {
  active = Math.max(0, active - 1);
  pump();
}

// Vignette vivante : la couverture du template, chargée quand la carte apparaît à l'écran et quand la file le permet.
function LiveShot({ tpl }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  const slot = useRef({ held: false, timer: null });
  const free = () => {
    const s = slot.current;
    if (s.held) { s.held = false; clearTimeout(s.timer); release(); }
  };
  useEffect(() => {
    const el = ref.current;
    let job;
    const start = () => {
      job = () => {
        slot.current.held = true;
        slot.current.timer = setTimeout(free, 9000); // filet : une page lente ne bloque pas la file
        setOn(true);
      };
      queue.push(job);
      pump();
    };
    let io;
    if (!el || typeof IntersectionObserver === 'undefined') start();
    else {
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { threshold: 0.2 });
      io.observe(el);
    }
    return () => {
      if (io) io.disconnect();
      const i = queue.indexOf(job);
      if (i >= 0) queue.splice(i, 1);
      free();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Link ref={ref} to={`/admin/templates/${tpl.key}/preview`} className="tpl-card__shot" aria-label={`Voir le modèle ${tpl.name} en grand`}>
      {on && isDesigned(tpl.key) ? <iframe src={`/admin/templates/${tpl.key}/preview?embed=1`} title={`Aperçu de ${tpl.name}`} tabIndex={-1} onLoad={free} onError={free} /> : null}
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
