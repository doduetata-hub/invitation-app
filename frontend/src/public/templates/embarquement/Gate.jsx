import { useCallback, useEffect, useRef, useState } from 'react';
import { getText } from './texts';
import { flightOf } from './flight';
import { playNotch, playChime, playPaper, playTakeoff } from './sound';
import cabinUrl from './assets/cabin.webp';
import shadeUrl from './assets/shade.webp';
import skyUrl from './assets/sky-wing.webp';

// OUVERTURE : l'invité est assis près du hublot, volet fermé. Il le fait glisser vers le haut ; le soleil se lève sur les nuages, le signal
// de cabine retentit et sa carte d'embarquement vient se poser. Il embarque : la vue emplit l'écran et l'invitation apparaît.
// Phases : closed → open → board → leaving. Toujours passable (bouton « Passer », touche Échap) et utilisable au clavier.
// Le décor est composé de calques (assets/) : ciel, volet, puis la cabine dont le hublot est transparent. Tout le texte est en HTML.

const ENOUGH = 0.42; // au-delà, le volet termine seul sa course
const clamp = (v) => Math.max(0, Math.min(1, v));

export default function Gate({ invitation, mode = 'page', onDone, replay = false }) {
  const [phase, setPhase] = useState('closed');
  const [p, setP] = useState(0); // ouverture du volet, de 0 (fermé) à 1
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const phaseRef = useRef('closed');
  const drag = useRef(null);
  const timers = useRef([]);
  const loaded = useRef(0);
  const mainBtn = useRef(null);
  const boardBtn = useRef(null);
  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const tx = (k) => getText(invitation, k);
  const flight = flightOf(invitation);
  const { names } = flight;
  const who = names.second ? `${names.first} & ${names.second}` : names.first || invitation.title;

  const go = useCallback((next) => { phaseRef.current = next; setPhase(next); }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Cabine, volet et ciel chargés avant d'afficher la scène ; filet de sécurité à 12 s (réseau très lent).
  const onImg = useCallback(() => { loaded.current += 1; if (loaded.current >= 3) setReady(true); }, []);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 12000);
    return () => clearTimeout(t);
  }, []);

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
    if (!ready || mode !== 'page') return undefined;
    // Le bouton « Embarquer » est encore en train d'arriver : on lui donne le temps d'être visible.
    const t = setTimeout(() => {
      const target = phaseRef.current === 'closed' ? mainBtn.current : phaseRef.current === 'open' ? boardBtn.current : null;
      if (target) target.focus({ preventScroll: true });
    }, phase === 'open' ? 1500 : 0);
    return () => clearTimeout(t);
  }, [ready, mode, phase]);

  const leave = useCallback((ms = 900) => {
    go('leaving');
    later(() => onDone && onDone(), ms);
  }, [go, later, onDone]);

  const board = useCallback(() => {
    if (phaseRef.current !== 'open') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    playTakeoff();
    go('board');
    later(() => leave(900), 1500);
  }, [go, later, leave]);

  const boardRef = useRef(board);
  boardRef.current = board;
  const finish = useCallback(() => {
    if (phaseRef.current !== 'closed') return;
    drag.current = null;
    setDragging(false);
    setP(1);
    go('open');
    playChime();
    playPaper();
    later(() => boardRef.current(), 12000); // l'invité a le temps de lire sa carte ; ensuite on embarque
  }, [go, later]);

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

  // Le volet suit le doigt (ou la souris). La course utile est proportionnelle à la hauteur réelle du hublot à l'écran.
  const onDown = (e) => {
    if (phaseRef.current !== 'closed') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sans effet */ }
    drag.current = { y: e.clientY, from: p, travel: e.currentTarget.getBoundingClientRect().height * 0.8, value: p, moved: 0, notch: 0 };
    setDragging(true);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    d.moved = Math.max(d.moved, Math.abs(dy));
    d.value = clamp(d.from + dy / (d.travel || 1));
    const notch = Math.floor(d.value * 9);
    if (notch !== d.notch) { d.notch = notch; playNotch(); }
    setP(d.value);
    if (d.value >= 0.97) finish();
  };
  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    // Un simple toucher ouvre aussi le volet : personne ne reste bloqué devant le hublot.
    if (d.value > ENOUGH || d.moved < 6) finish();
    else setP(0);
  };
  const onCancel = () => { if (drag.current) { drag.current = null; setDragging(false); setP(0); } };

  return (
    <div className={`em-gate em-gate--${mode}${ready ? ' is-ready' : ''}${dragging ? ' is-dragging' : ''}`} data-phase={phase} style={{ '--p': p }} role="dialog" aria-modal={mode === 'page' ? 'true' : undefined} aria-label="Ouverture de l'invitation">
      <img className="em-gate__backdrop" src={cabinUrl} alt="" aria-hidden="true" decoding="async" />

      <div className="em-stage">
        <img className="em-stage__sky" src={skyUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />
        <div className="em-stage__shade"><img src={shadeUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} /></div>
        <img className="em-stage__cabin" src={cabinUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />
        <span className="em-stage__dim" aria-hidden="true" />
        <span className="em-stage__glow" aria-hidden="true" />
        <p className="em-stage__head">{tx('gateEyebrow')}</p>
        {/* La zone du hublot : c'est elle que l'on fait glisser */}
        <div className="em-stage__grip" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel} aria-hidden="true">
          <span className="em-stage__arrows"><i /><i /><i /></span>
        </div>
      </div>

      <div className="em-gate__ui">
        <p className="em-gate__who">{flight.passenger ? `Siège réservé pour ${flight.passenger}` : 'Un siège vous est réservé'}</p>
        <button type="button" ref={mainBtn} className="em-gate__cta" onClick={finish} disabled={phase !== 'closed'}>{tx('gateDrag')}</button>
      </div>

      {/* La carte d'embarquement */}
      <div className="em-pass" aria-live="polite" aria-hidden={phase === 'closed' ? 'true' : undefined}>
        <p className="em-pass__top"><span>{tx('gatePass')}</span><b>{flight.code}</b></p>
        <p className={`em-pass__names${(who || '').length > 22 ? ' is-long' : ''}`}>{who}</p>
        <dl className="em-pass__grid">
          {flight.day && <div><dt>Date</dt><dd>{flight.day}</dd></div>}
          {flight.time && <div><dt>Heure</dt><dd>{flight.time}</dd></div>}
          {flight.seat && <div><dt>Table</dt><dd>{flight.seat}</dd></div>}
        </dl>
        <dl className="em-pass__route">
          <div><dt>Passager</dt><dd>{flight.passenger || 'Notre invité(e)'}</dd></div>
          {flight.destination && <div><dt>Destination</dt><dd>{flight.destination}</dd></div>}
        </dl>
        <button type="button" ref={boardBtn} className="em-pass__go" onClick={board} tabIndex={phase === 'open' ? 0 : -1}>{tx('gateBoard')}<span aria-hidden="true"> →</span></button>
      </div>

      <button type="button" className="em-gate__skip" onClick={skip}>{replay ? 'Fermer' : tx('gateSkip')}</button>
    </div>
  );
}
