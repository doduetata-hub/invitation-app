import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames } from '../soireeKit/utils';
import { getText } from './texts';
import { createFog } from './fog';
import { playDrop, playBirds, playLeaves } from './sound';
import bgPortraitUrl from './assets/bg-portrait.webp';
import bgLandscapeUrl from './assets/bg-landscape.webp';
import flowersLeftUrl from './assets/flowers-left.webp';
import flowersRightUrl from './assets/flowers-right.webp';
import dropletsUrl from './assets/droplets.webp';

// OUVERTURE : la serre est derrière une vitre couverte de buée. L'invité l'essuie du doigt ; la verrière apparaît avec les noms, puis les
// pivoines du premier plan s'écartent pour le laisser entrer.
// Phases : fog → clear → part → leaving. Toujours passable (bouton « Passer », touche Échap) et utilisable au clavier.
// Aucun texte n'est dans les images : noms, date, consigne et nom de l'invité sont en HTML.

const ENOUGH = 0.4; // part de la vitre à essuyer avant que la buée se dissipe d'elle-même

export default function Gate({ invitation, mode = 'page', onDone, replay = false }) {
  const [phase, setPhase] = useState('fog');
  const [ready, setReady] = useState(false);
  const [wide, setWide] = useState(null); // décor paysage ou portrait, selon la forme réelle du cadre
  const [touched, setTouched] = useState(false);
  const root = useRef(null);
  const canvas = useRef(null);
  const bg = useRef(null);
  const left = useRef(null);
  const right = useRef(null);
  const drops = useRef(null);
  const fog = useRef(null);
  const last = useRef(null);
  const lastDrop = useRef(0);
  const phaseRef = useRef('fog');
  const timers = useRef([]);
  const mainBtn = useRef(null);
  const enterBtn = useRef(null);
  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const tx = (k) => getText(invitation, k);

  const { namesLine, eventDate, eventTime, guest, title } = invitation;
  const names = splitNames(namesLine);
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const longest = Math.max(names.first.length, names.second ? names.second.length : 0, 5);

  const go = useCallback((next) => { phaseRef.current = next; setPhase(next); }, []);

  useEffect(() => {
    const el = root.current;
    setWide(el ? el.offsetWidth > el.offsetHeight : false);
  }, []);

  // La vitre n'est peinte qu'une fois le décor, les fleurs et les gouttes chargés : jamais de scène à moitié construite.
  useEffect(() => {
    if (wide === null) return undefined;
    let cancelled = false;
    const wait = (img) => new Promise((resolve) => {
      if (!img || (img.complete && img.naturalWidth)) { resolve(); return; }
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
    const texture = new Image();
    texture.src = dropletsUrl;
    drops.current = texture;
    const build = () => {
      if (cancelled || !canvas.current || !bg.current?.naturalWidth) return;
      if (fog.current) fog.current.destroy();
      fog.current = createFog(canvas.current, {
        background: bg.current,
        droplets: drops.current,
        layers: [left.current, right.current],
        onProgress: (p) => { if (p >= ENOUGH && phaseRef.current === 'fog') reveal(); },
      });
      setReady(true);
    };
    Promise.all([wait(bg.current), wait(left.current), wait(right.current), wait(texture)]).then(build);
    const safety = setTimeout(() => setReady(true), 12000); // réseau très lent : on ne bloque jamais l'invité
    // La barre d'adresse d'un téléphone change la hauteur en permanence : la buée n'est repeinte que si la largeur change vraiment.
    const onResize = () => {
      if (phaseRef.current === 'fog' && fog.current && canvas.current && Math.abs(canvas.current.offsetWidth - fog.current.width) > 40) build();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      clearTimeout(safety);
      window.removeEventListener('resize', onResize);
      if (fog.current) fog.current.destroy();
      fog.current = null;
    };
    // `reveal` est stable ; la vitre ne doit pas être repeinte à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Quelques gouttes coulent tant que l'invité n'a pas fini d'essuyer.
  useEffect(() => {
    if (phase !== 'fog' || !ready) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const first = setTimeout(() => fog.current?.drip(), 500);
    const every = setInterval(() => fog.current?.drip(), 1500);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [phase, ready]);

  const leave = useCallback((ms = 900) => {
    go('leaving');
    later(() => onDone && onDone(), ms);
  }, [go, later, onDone]);

  const part = useCallback(() => {
    if (phaseRef.current !== 'clear') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    playLeaves();
    go('part');
    later(() => leave(1000), 1500);
  }, [go, later, leave]);

  const partRef = useRef(part);
  partRef.current = part;
  const reveal = useCallback(() => {
    if (phaseRef.current !== 'fog') return;
    playBirds();
    go('clear');
    later(() => partRef.current(), 4600);
  }, [go, later]);

  // En page publique l'ouverture occupe tout l'écran : on fige le défilement le temps qu'elle dure.
  useEffect(() => {
    if (mode !== 'page') return undefined;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    return () => { html.style.overflow = prevHtml; document.body.style.overflow = prevBody; };
  }, [mode]);

  useEffect(() => {
    if (!ready || mode !== 'page') return;
    const target = phase === 'fog' ? mainBtn.current : phase === 'clear' ? enterBtn.current : null;
    if (target) target.focus({ preventScroll: true });
  }, [ready, mode, phase]);

  const skip = useCallback(() => {
    if (phaseRef.current === 'leaving') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    leave(560);
  }, [leave]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  // Position du doigt dans les pixels de la vitre (valable aussi quand l'aperçu de l'administration est mis à l'échelle).
  const point = (e) => {
    const el = canvas.current;
    const r = el.getBoundingClientRect();
    return [((e.clientX - r.left) * el.offsetWidth) / r.width, ((e.clientY - r.top) * el.offsetHeight) / r.height];
  };
  const stroke = (e) => {
    if (phaseRef.current !== 'fog' || !fog.current) return;
    const p = point(e);
    const from = last.current || p;
    last.current = p;
    if (!touched) setTouched(true);
    fog.current.wipe(from[0], from[1], p[0], p[1]);
    if (e.timeStamp - lastDrop.current > 420 && (e.pointerType !== 'mouse' || e.buttons)) { lastDrop.current = e.timeStamp; playDrop(); }
  };
  const onDown = (e) => { last.current = null; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sans effet */ } stroke(e); };
  const onMove = (e) => { if (e.pointerType === 'mouse' || e.buttons || e.pressure > 0) stroke(e); };
  const onUp = () => { last.current = null; };

  const auto = () => {
    if (phaseRef.current !== 'fog') return;
    setTouched(true);
    playDrop();
    if (fog.current) fog.current.autoWipe();
    else reveal();
  };

  return (
    <div ref={root} className={`ls-gate ls-gate--${mode}${ready ? ' is-ready' : ''}${touched ? ' is-touched' : ''}`} data-phase={phase} role="dialog" aria-modal={mode === 'page' ? 'true' : undefined} aria-label="Ouverture de l'invitation">
      <div className="ls-gate__scene">
        {wide !== null && <img ref={bg} className="ls-gate__bg" src={wide ? bgLandscapeUrl : bgPortraitUrl} alt="" decoding="async" fetchpriority="high" />}
        <span className="ls-gate__veil" aria-hidden="true" />
        <img ref={left} className="ls-gate__flower ls-gate__flower--l" src={flowersLeftUrl} alt="" decoding="async" />
        <img ref={right} className="ls-gate__flower ls-gate__flower--r" src={flowersRightUrl} alt="" decoding="async" />
        <div className="ls-gate__names" aria-live="polite">
          <p className="ls-gate__eyebrow">{tx('gateEyebrow')}</p>
          <p className="ls-gate__h" style={{ '--len': longest }}>
            <span>{names.first || title}</span>
            {names.second && (<><span className="ls-gate__amp">&amp;</span><span>{names.second}</span></>)}
          </p>
          {date && <p className="ls-gate__date">{date}</p>}
          {eventTime && <p className="ls-gate__time">{eventTime}</p>}
        </div>
      </div>

      <canvas ref={canvas} className="ls-gate__fog" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerCancel={onUp} aria-hidden="true" />

      <span className="ls-gate__finger" aria-hidden="true" />
      <div className="ls-gate__ui ls-gate__ui--fog">
        <p className="ls-gate__who">{guest?.name ? `Pour ${guest.name}` : 'Une invitation vous attend'}</p>
        <button type="button" ref={mainBtn} className="ls-gate__cta" onClick={auto} disabled={phase !== 'fog'}>{tx('gateWipe')}</button>
      </div>
      <div className="ls-gate__ui ls-gate__ui--clear">
        <button type="button" ref={enterBtn} className="ls-gate__cta" onClick={part} tabIndex={phase === 'clear' ? 0 : -1}>{tx('gateEnter')}</button>
      </div>

      <button type="button" className="ls-gate__skip" onClick={skip}>{replay ? 'Fermer' : tx('gateSkip')}</button>
    </div>
  );
}
