import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames } from '../soireeKit/utils';
import { lockBehind } from '../soireeKit/opening';
import { getText } from './texts';
import { playKnock, playCord, playRise, playApplause } from './sound';
import frameUrl from './assets/frame.webp';
import stageUrl from './assets/stage.webp';
import curtainUrl from './assets/curtain.webp';
import cordUrl from './assets/cord.webp';

// OUVERTURE : le théâtre, rideau fermé. L'invité frappe les trois coups sur la scène, puis tire le cordon doré ; le rideau se lève, le
// projecteur s'allume et les noms apparaissent. Phases : knock → cord → rise → stage → leaving. Ouverture obligatoire : rien n'avance sans
// son geste et seul le bouton final donne accès à l'invitation. Au clavier ou au lecteur d'écran, la consigne fait le geste à sa place.
// Seul le rejeu de l'administration peut la fermer.

const ENOUGH = 0.5; // au-delà, le cordon est tiré
const BETWEEN = 170; // écart minimal entre deux coups (un double événement ne compte qu'une fois)
const IDLE = 6000; // sans geste pendant ce temps, l'aide devient plus visible
const clamp = (v) => Math.max(0, Math.min(1, v));

export default function Gate({ invitation, mode = 'page', onDone, preview = false }) {
  const closable = mode === 'inline';
  const [phase, setPhase] = useState('knock');
  const [knocks, setKnocks] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(false);
  const shell = useRef(null);
  const phaseRef = useRef('knock');
  const count = useRef(0);
  const lastKnock = useRef(0);
  const press = useRef(null);
  const idle = useRef(0);
  const timers = useRef([]);
  const loaded = useRef(0);
  const mainBtn = useRef(null);
  const enterBtn = useRef(null);
  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const tx = (k) => getText(invitation, k);

  const { namesLine, eventDate, eventTime, guest, title } = invitation;
  const names = splitNames(namesLine);
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const longest = Math.max(names.first.length, names.second ? names.second.length : 0, 5);

  const go = useCallback((next) => { phaseRef.current = next; setPhase(next); }, []);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  // Décor, rideau et cordon chargés avant d'afficher la scène ; filet de sécurité à 12 s (réseau très lent).
  const onImg = useCallback(() => { loaded.current += 1; if (loaded.current >= 4) setReady(true); }, []);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // Rien d'autre n'est accessible avant la fin de l'ouverture.
  useEffect(() => (mode === 'page' ? lockBehind(shell.current) : undefined), [mode]);

  // En page publique l'ouverture occupe tout l'écran : on fige le défilement le temps qu'elle dure.
  useEffect(() => {
    if (mode !== 'page') return undefined;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.scrollTo({ top: 0, behavior: 'instant' });
    return () => { html.style.overflow = prevHtml; document.body.style.overflow = prevBody; };
  }, [mode]);

  useEffect(() => {
    if (!ready || mode !== 'page') return undefined;
    // Le bouton final n'apparaît qu'après les noms : on attend qu'il soit visible avant de lui donner le focus.
    const t = setTimeout(() => {
      const p = phaseRef.current;
      const target = p === 'knock' || p === 'cord' ? mainBtn.current : p === 'stage' ? enterBtn.current : null;
      if (target) target.focus({ preventScroll: true });
    }, phase === 'stage' ? 1700 : 0);
    return () => clearTimeout(t);
  }, [ready, mode, phase]);

  // Aide : après un moment sans geste, la consigne bat et le geste est montré plus nettement.
  const waitForHelp = useCallback(() => {
    clearTimeout(idle.current);
    setHelp(false);
    idle.current = setTimeout(() => setHelp(true), IDLE);
  }, []);
  useEffect(() => {
    if (ready && (phase === 'knock' || phase === 'cord')) waitForHelp();
    else setHelp(false);
    return () => clearTimeout(idle.current);
  }, [phase, ready, knocks, waitForHelp]);

  const knock = useCallback(() => {
    if (phaseRef.current !== 'knock' || count.current >= 3) return;
    const now = Date.now();
    if (now - lastKnock.current < BETWEEN) return;
    lastKnock.current = now;
    count.current += 1;
    setKnocks(count.current);
    playKnock(count.current);
    try { if (navigator.vibrate) navigator.vibrate(count.current === 3 ? 60 : 30); } catch { /* sans effet */ }
    if (count.current === 3) later(() => go('cord'), 750);
  }, [go, later]);

  const raise = useCallback(() => {
    if (phaseRef.current !== 'cord') return;
    press.current = null;
    setDragging(false);
    setDrag(1);
    playCord();
    go('rise');
    later(playRise, 250);
    later(() => { playApplause(); go('stage'); }, 2900);
  }, [go, later]);

  const enter = () => {
    if (phaseRef.current !== 'stage') return;
    go('leaving');
    later(() => onDone && onDone(), 900);
  };

  const skip = useCallback(() => {
    if (phaseRef.current === 'leaving') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    go('leaving');
    later(() => onDone && onDone(), 560);
  }, [go, later, onDone]);

  useEffect(() => {
    if (!closable) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closable, skip]);

  // Un simple toucher sur le cordon montre le mouvement à faire.
  const hint = () => {
    clearTimeout(idle.current);
    setHelp(true);
    setDrag(0.3);
    later(() => { if (phaseRef.current === 'cord' && !press.current) setDrag(0); }, 650);
  };

  const onDown = (e) => {
    const p = phaseRef.current;
    if (p === 'knock') { knock(); return; }
    if (p !== 'cord') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sans effet */ }
    const travel = Math.min(220, (shell.current?.offsetHeight || 700) * 0.22);
    press.current = { y: e.clientY, moved: 0, value: 0, travel };
    setDragging(true);
    waitForHelp();
  };
  const onMove = (e) => {
    const d = press.current;
    if (!d || phaseRef.current !== 'cord') return;
    d.moved = Math.max(d.moved, Math.abs(e.clientY - d.y));
    d.value = clamp((e.clientY - d.y) / d.travel);
    setDrag(d.value);
    if (d.value >= 0.98) raise();
  };
  const onUp = () => {
    const d = press.current;
    if (!d) return;
    press.current = null;
    setDragging(false);
    if (phaseRef.current !== 'cord') return;
    if (d.value > ENOUGH) raise();
    else if (d.moved < 6) hint();
    else setDrag(0);
  };
  const onCancel = () => {
    if (!press.current) return;
    press.current = null;
    setDragging(false);
    if (phaseRef.current === 'cord') setDrag(0);
  };
  const gestures = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel, onContextMenu: (e) => e.preventDefault() };
  // La consigne : un toucher dessus compte comme un coup ; pour le cordon, au clavier ou au lecteur d'écran (clic sans pointeur) elle le
  // tire, au doigt on la fait glisser vers le bas.
  const onCta = (e) => {
    if (phaseRef.current === 'knock') knock();
    else if (e.detail === 0) raise();
  };
  const ctaGestures = phase === 'cord' ? gestures : {};

  return (
    <div ref={shell} className={`lr-gate lr-gate--${mode}${preview ? ' is-preview' : ''}${ready ? ' is-ready' : ''}${dragging ? ' is-dragging' : ''}${help ? ' is-help' : ''}`} data-phase={phase} data-knocks={knocks} style={{ '--drag': drag }} role="dialog" aria-modal={mode === 'page' ? 'true' : undefined} aria-label="Ouverture de l'invitation">
      <span className="lr-gate__house" aria-hidden="true" />

      {/* Le décor est recomposé à chaque coup (la clé relance la secousse) */}
      <div className="lr-theatre">
        <div className={`lr-theatre__set${knocks ? ` is-knock${knocks % 2 ? '-a' : '-b'}` : ''}`}>
          <img className="lr-theatre__stage" src={stageUrl} alt="" aria-hidden="true" decoding="async" onLoad={onImg} onError={onImg} />
          <span className="lr-theatre__spot" aria-hidden="true" />
          <div className="lr-theatre__names" aria-live="polite">
            <p className="lr-theatre__eyebrow">{tx('gateEyebrow')}</p>
            <p className="lr-theatre__h" style={{ '--len': longest }}>
              <span>{names.first || title}</span>
              {names.second && (<><span className="lr-theatre__amp">&amp;</span><span>{names.second}</span></>)}
            </p>
            {date && <p className="lr-theatre__date">{date}</p>}
            {eventTime && <p className="lr-theatre__time">{eventTime}</p>}
          </div>
          <div className="lr-theatre__opening" aria-hidden="true">
            <div className="lr-theatre__curtain">
              <img src={curtainUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />
              <p className="lr-theatre__announce">{tx('gateEyebrow')}</p>
            </div>
          </div>
          <img className="lr-theatre__frame" src={frameUrl} alt="" aria-hidden="true" decoding="async" onLoad={onImg} onError={onImg} />
          <span className="lr-theatre__dark" aria-hidden="true" />
          <span className="lr-theatre__foot" aria-hidden="true" />
          {knocks > 0 && knocks <= 3 && phase === 'knock' && <span key={knocks} className="lr-theatre__ripple" style={{ '--x': `${[34, 66, 50][knocks - 1]}%` }} aria-hidden="true" />}
        </div>
      </div>

      <div className="lr-cord" aria-hidden="true">
        <img src={cordUrl} alt="" decoding="async" onLoad={onImg} onError={onImg} />
        <span className="lr-cord__arrows"><i /><i /><i /></span>
      </div>

      {/* Toute la surface reçoit les coups, puis le mouvement vers le bas */}
      <div className="lr-gate__grip" {...gestures} aria-hidden="true" />

      <div className="lr-gate__ui">
        <p className="lr-gate__who">{guest?.name ? `Pour ${guest.name}` : 'Votre place vous attend'}</p>
        <span className="lr-gate__knocks" aria-hidden="true"><i /><i /><i /></span>
        <button type="button" ref={mainBtn} className="lr-gate__cta" {...ctaGestures} onClick={onCta} disabled={phase !== 'knock' && phase !== 'cord'}>
          {phase === 'knock' ? tx('gateKnock') : tx('gateCord')}
        </button>
        <span className="lr-sr" aria-live="polite">{phase === 'knock' && knocks > 0 ? `Coup ${knocks} sur 3` : ''}</span>
      </div>

      <div className="lr-gate__enter">
        <button type="button" ref={enterBtn} className="lr-gate__cta" onClick={enter} tabIndex={phase === 'stage' ? 0 : -1}>{tx('gateEnter')}</button>
      </div>

      {closable && <button type="button" className="lr-gate__skip" onClick={skip}>Fermer</button>}
    </div>
  );
}
