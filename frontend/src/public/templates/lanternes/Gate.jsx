import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames } from '../soireeKit/utils';
import { lockBehind } from '../soireeKit/opening';
import { getText } from './texts';
import { playStrike, playIgnite, playRise, playChimes } from './sound';
import bgPortraitUrl from './assets/bg-portrait.webp';
import bgWideUrl from './assets/bg-wide.webp';
import lanternOffUrl from './assets/lantern-off.webp';
import lanternOnUrl from './assets/lantern-on.webp';
import flightUrl from './assets/flight.webp';

// OUVERTURE : la nuit sur la lagune, une lanterne de papier éteinte au bout du ponton. L'invité maintient son doigt pour l'allumer, puis
// la fait glisser vers le haut pour la lâcher ; des dizaines d'autres s'élèvent et les noms apparaissent.
// Phases : dark → lit → rise → sky → leaving. Ouverture obligatoire : rien n'avance sans son geste et seul le bouton final donne accès à
// l'invitation. Au clavier ou au lecteur d'écran, la consigne fait le geste à sa place. Seul le rejeu de l'administration peut la fermer.

const HOLD = 1600; // durée d'appui qui allume la lanterne
const ENOUGH = 0.45; // au-delà, la lanterne s'envole
const IDLE = 6000; // sans geste pendant ce temps, l'aide devient plus visible
const clamp = (v) => Math.max(0, Math.min(1, v));

export default function Gate({ invitation, mode = 'page', onDone, preview = false }) {
  const closable = mode === 'inline';
  const [phase, setPhase] = useState('dark');
  const [holding, setHolding] = useState(false);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [wide, setWide] = useState(null);
  const [help, setHelp] = useState(false);
  const shell = useRef(null);
  const phaseRef = useRef('dark');
  const press = useRef(null);
  const holdTimer = useRef(0);
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
  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(holdTimer.current); }, []);

  useEffect(() => {
    const el = shell.current;
    setWide(el ? el.offsetWidth > el.offsetHeight : false);
  }, []);

  // Décor et lanternes chargés avant d'afficher la scène ; filet de sécurité à 12 s (réseau très lent).
  const onImg = useCallback(() => { loaded.current += 1; if (loaded.current >= 3) setReady(true); }, []);
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
      const target = p === 'dark' || p === 'lit' ? mainBtn.current : p === 'sky' ? enterBtn.current : null;
      if (target) target.focus({ preventScroll: true });
    }, phase === 'sky' ? 1900 : 0);
    return () => clearTimeout(t);
  }, [ready, mode, phase]);

  // Aide : après un moment sans geste, l'indication grandit et la consigne bat.
  const waitForHelp = useCallback(() => {
    clearTimeout(idle.current);
    setHelp(false);
    idle.current = setTimeout(() => setHelp(true), IDLE);
  }, []);
  useEffect(() => {
    if (ready && (phase === 'dark' || phase === 'lit')) waitForHelp();
    else setHelp(false);
    return () => clearTimeout(idle.current);
  }, [phase, ready, waitForHelp]);

  const ignite = useCallback(() => {
    if (phaseRef.current !== 'dark') return;
    clearTimeout(holdTimer.current);
    setHolding(false);
    // Le doigt est peut-être encore posé : le glissement repart de là où il se trouve.
    if (press.current) { press.current.origin = press.current.y; press.current.moved = 0; }
    playIgnite();
    go('lit');
  }, [go]);

  const release = useCallback(() => {
    if (phaseRef.current !== 'lit') return;
    press.current = null;
    setDragging(false);
    setDrag(1);
    playRise();
    go('rise');
    later(() => { playChimes(); go('sky'); }, 2600);
  }, [go, later]);

  const enter = () => {
    if (phaseRef.current !== 'sky') return;
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

  // Un geste trop court ne fait que montrer ce qu'il faut faire.
  const hint = () => {
    clearTimeout(idle.current);
    setHelp(true);
    if (phaseRef.current !== 'lit') return;
    setDrag(0.14);
    later(() => { if (phaseRef.current === 'lit' && !press.current) setDrag(0); }, 650);
  };

  const onDown = (e) => {
    const p = phaseRef.current;
    if (p !== 'dark' && p !== 'lit') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sans effet */ }
    const travel = (shell.current?.offsetHeight || 700) * 0.3;
    press.current = { y: e.clientY, origin: e.clientY, moved: 0, value: 0, travel };
    waitForHelp();
    if (p === 'dark') {
      setHolding(true);
      playStrike();
      holdTimer.current = setTimeout(ignite, HOLD);
    } else {
      setDragging(true);
    }
  };
  const onMove = (e) => {
    const d = press.current;
    if (!d) return;
    d.y = e.clientY;
    if (phaseRef.current !== 'lit') return;
    d.moved = Math.max(d.moved, Math.abs(d.origin - e.clientY));
    d.value = clamp((d.origin - e.clientY) / d.travel);
    setDragging(true);
    setDrag(d.value);
    if (d.value >= 0.98) release();
  };
  const onUp = () => {
    const d = press.current;
    if (!d) return;
    press.current = null;
    setDragging(false);
    if (phaseRef.current === 'dark') {
      clearTimeout(holdTimer.current);
      setHolding(false);
      hint();
    } else if (phaseRef.current === 'lit') {
      if (d.value > ENOUGH) release();
      else if (d.moved < 6) hint();
      else setDrag(0);
    }
  };
  const onCancel = () => {
    if (!press.current) return;
    press.current = null;
    clearTimeout(holdTimer.current);
    setHolding(false);
    setDragging(false);
    if (phaseRef.current === 'lit') setDrag(0);
  };
  const gestures = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onCancel, onContextMenu: (e) => e.preventDefault() };
  // La consigne : au clavier ou au lecteur d'écran (clic sans pointeur) elle fait le geste ; au doigt, on la maintient ou on la glisse.
  const onCta = (e) => {
    if (e.detail !== 0) return;
    if (phaseRef.current === 'dark') ignite();
    else release();
  };

  return (
    <div ref={shell} className={`ll-gate ll-gate--${mode}${preview ? ' is-preview' : ''}${ready ? ' is-ready' : ''}${holding ? ' is-holding' : ''}${dragging ? ' is-dragging' : ''}${help ? ' is-help' : ''}`} data-phase={phase} style={{ '--drag': drag }} role="dialog" aria-modal={mode === 'page' ? 'true' : undefined} aria-label="Ouverture de l'invitation">
      {wide !== null && <img className="ll-gate__bg" src={wide ? bgWideUrl : bgPortraitUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />}
      <span className="ll-gate__night" aria-hidden="true" />
      <img className="ll-gate__flight ll-gate__flight--far" src={flightUrl} alt="" aria-hidden="true" decoding="async" />
      <img className="ll-gate__flight ll-gate__flight--near" src={flightUrl} alt="" aria-hidden="true" decoding="async" />

      <p className="ll-gate__head">{tx('gateEyebrow')}</p>

      <div className="ll-lantern" aria-hidden="true">
        <span className="ll-lantern__glow" />
        <img className="ll-lantern__off" src={lanternOffUrl} alt="" decoding="async" onLoad={onImg} onError={onImg} />
        <img className="ll-lantern__on" src={lanternOnUrl} alt="" decoding="async" onLoad={onImg} onError={onImg} />
        <svg className="ll-lantern__ring" viewBox="0 0 100 100" focusable="false"><circle cx="50" cy="50" r="46" pathLength="100" /></svg>
        <span className="ll-lantern__arrows"><i /><i /><i /></span>
      </div>

      {/* Toute la surface répond à l'appui et au glissement */}
      <div className="ll-gate__grip" {...gestures} aria-hidden="true" />

      <div className="ll-gate__ui">
        <p className="ll-gate__who">{guest?.name ? `Pour ${guest.name}` : 'Une lanterne vous attend'}</p>
        <button type="button" ref={mainBtn} className="ll-gate__cta" {...gestures} onClick={onCta} disabled={phase !== 'dark' && phase !== 'lit'}>{tx(phase === 'dark' ? 'gateHold' : 'gateSwipe')}</button>
      </div>

      <div className="ll-gate__names" aria-live="polite">
        <p className="ll-gate__eyebrow">{tx('gateEyebrow')}</p>
        <p className="ll-gate__h" style={{ '--len': longest }}>
          <span>{names.first || title}</span>
          {names.second && (<><span className="ll-gate__amp">&amp;</span><span>{names.second}</span></>)}
        </p>
        {date && <p className="ll-gate__date">{date}</p>}
        {eventTime && <p className="ll-gate__time">{eventTime}</p>}
      </div>
      <div className="ll-gate__enter">
        <button type="button" ref={enterBtn} className="ll-gate__cta" onClick={enter} tabIndex={phase === 'sky' ? 0 : -1}>{tx('gateEnter')}</button>
      </div>

      {closable && <button type="button" className="ll-gate__skip" onClick={skip}>Fermer</button>}
    </div>
  );
}
