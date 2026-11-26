import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

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

// Largeur à laquelle la page d'aperçu est rendue avant d'être réduite à la taille de la carte (voir admin.css).
const PAGE_WIDTH = 390;

// Vignette vivante : la couverture du template, chargée quand la carte apparaît à l'écran et quand la file le permet.
export default function TemplateShot({ tpl, designed = true }) {
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
  // La carte est fluide : l'échelle de la vignette suit sa largeur réelle.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => el.style.setProperty('--shot-scale', String(el.clientWidth / PAGE_WIDTH));
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <Link ref={ref} to={`/admin/templates/${tpl.key}/preview`} className="tpl-card__shot" aria-label={`Voir le modèle ${tpl.name} en grand`}>
      {on && designed ? <iframe src={`/admin/templates/${tpl.key}/preview?embed=1`} title={`Aperçu de ${tpl.name}`} tabIndex={-1} onLoad={free} onError={free} /> : null}
    </Link>
  );
}
