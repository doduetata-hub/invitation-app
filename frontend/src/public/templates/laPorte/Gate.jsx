import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials } from '../soireeKit/utils';
import { getText } from './texts';
import { lockBehind } from '../soireeKit/opening';
import { playDoor, playSeal, playBell, stopBell } from './sound';
import plateUrl from './assets/gate/plate.webp';
import leafLeftUrl from './assets/gate/leaf-left.webp';
import leafRightUrl from './assets/gate/leaf-right.webp';
import visitorUrl from './assets/gate/visitor.webp';
import envClosedUrl from './assets/gate/envelope-closed.webp';
import envOpenUrl from './assets/gate/envelope-open.webp';
import sealUrl from './assets/gate/seal.webp';

// OUVERTURE : le hall, une double porte en noyer. Quelqu'un sonne ; l'invité touche la poignée, les battants s'ouvrent sur un visiteur
// qui lui tend une enveloppe scellée ; il touche le sceau, la lettre sort de l'enveloppe et l'invitation apparaît.
// Phases : door → opening → envelope → unseal → leaving. Ouverture obligatoire pour l'invité : ni bouton pour passer, ni touche Échap
// (seul l'aperçu de l'administration peut la fermer).
//
// Le décor est composé de CALQUES PHOTOGRAPHIQUES séparés (voir ASSETS.md) : le hall avec l'ouverture vide, deux battants détourés, le
// visiteur, l'enveloppe fermée / ouverte et le sceau. Aucun texte n'est dans les images : monogramme, noms, consigne et nom du destinataire
// sont en HTML. Seules des transformations et des opacités sont animées.

export default function Gate({ invitation, mode = 'page', onDone, preview = false }) {
  const closable = mode === 'inline'; // seul le rejeu pendant la saisie (administration) peut être fermé
  const [phase, setPhase] = useState('door');
  const [ringKey, setRingKey] = useState(0); // 0 = pas encore sonné ; chaque coup de sonnette relance les animations
  const [ready, setReady] = useState(false); // décor et battants chargés : la scène n'apparaît pas à moitié construite
  const timers = useRef([]);
  const mainBtn = useRef(null);
  const sealBtn = useRef(null);
  const loaded = useRef(0);
  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const tx = (k) => getText(invitation, k);

  const { namesLine, eventDate, eventTime, guest } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const monogram = `${ini.f}${ini.s ? ` & ${ini.s}` : ''}` || '✦';
  const who = names.second ? `${names.first} & ${names.second}` : names.first;
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const guestName = guest?.name || '';

  useEffect(() => () => { timers.current.forEach(clearTimeout); stopBell(); }, []);

  // Trois images indispensables à la première vue (décor + deux battants) ; filet de sécurité à 12 s (réseau très lent).
  const onImg = useCallback(() => { loaded.current += 1; if (loaded.current >= 3) setReady(true); }, []);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // Sonnette : quelqu'un sonne dès l'arrivée, puis RECOMMENCE toutes les quelques secondes tant que l'invité n'a pas ouvert.
  // Si le navigateur bloque le son avant un premier geste, la sonnette reste visible (et fait vibrer le téléphone) ; elle sonne
  // aussitôt que l'invité touche l'écran, sans qu'il ait à chercher quoi que ce soit.
  useEffect(() => {
    if (phase !== 'door' || !ready) return undefined;
    let heard = false;
    const ring = () => {
      setRingKey((k) => k + 1);
      if (playBell()) heard = true;
      try { if (navigator.userActivation?.hasBeenActive && navigator.vibrate) navigator.vibrate([260, 140, 260]); } catch { /* sans effet */ }
    };
    const first = setTimeout(ring, 800);
    const again = setInterval(ring, 7500);
    const unlock = (e) => {
      if (e.target && e.target.closest && e.target.closest('.pg-handle, .pg-door')) { playBell(); return; }
      if (!heard) ring();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      clearTimeout(first);
      clearInterval(again);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [phase, ready]);

  const shell = useRef(null);
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
    window.scrollTo(0, 0);
    return () => { html.style.overflow = prevHtml; document.body.style.overflow = prevBody; };
  }, [mode]);

  useEffect(() => {
    if (ready && mode === 'page' && mainBtn.current) mainBtn.current.focus({ preventScroll: true });
  }, [ready, mode]);

  useEffect(() => {
    if (phase === 'envelope' && mode === 'page' && sealBtn.current) sealBtn.current.focus({ preventScroll: true });
  }, [phase, mode]);

  const leave = useCallback((ms = 900) => {
    setPhase('leaving');
    later(() => onDone && onDone(), ms);
  }, [later, onDone]);

  const open = () => {
    if (phase !== 'door') return;
    stopBell(); // la sonnerie s'arrête dès que la porte s'ouvre
    playDoor();
    setPhase('opening');
    later(() => setPhase((p) => (p === 'opening' ? 'envelope' : p)), 3700);
  };

  const unseal = () => {
    if (phase !== 'envelope') return;
    playSeal();
    setPhase('unseal');
    later(() => leave(1000), 2300);
  };

  const skip = useCallback(() => {
    if (phase === 'leaving') return;
    stopBell();
    timers.current.forEach(clearTimeout);
    timers.current = [];
    leave(520);
  }, [phase, leave]);

  useEffect(() => {
    if (!closable) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closable, skip]);

  const fromLine = tx('gateFrom').replace('{noms}', who || 'vos hôtes');
  const ringing = ringKey === 0 ? '0' : ringKey % 2 ? 'a' : 'b';

  return (
    <div ref={shell} className={`lp-gate lp-gate--${mode}${preview ? ' is-preview' : ''}${ready ? ' is-ready' : ''}`} data-phase={phase} data-ring={ringing} role="dialog" aria-modal={mode === 'page' ? 'true' : undefined} aria-label="Ouverture de l'invitation">
      <img className="pg-backdrop" src={plateUrl} alt="" aria-hidden="true" decoding="async" />
      {closable && <button type="button" className="lp-gate__skip" onClick={skip}>Fermer</button>}

      <div className="pg-stage">
        <img className="pg-plate" src={plateUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />

        {/* Monogramme et noms des hôtes sur le panneau du linteau : du texte, jamais une image */}
        <div className="pg-lintel" aria-hidden="true">
          <span className="pg-mono">{monogram}</span>
          {namesLine && <span className="pg-names">{namesLine}</span>}
        </div>

        <img className="pg-visitor" src={visitorUrl} alt="" decoding="async" />

        {/* La double porte : deux battants qui pivotent autour de leurs gonds, vers le visiteur de l'invité */}
        <div className="pg-door" onClick={open}>
          <div className="pg-leaf pg-leaf--l">
            <img src={leafLeftUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />
            <i className="pg-shade" />
          </div>
          <div className="pg-leaf pg-leaf--r">
            <img src={leafRightUrl} alt="" decoding="async" fetchpriority="high" onLoad={onImg} onError={onImg} />
            <i className="pg-shade" />
          </div>
        </div>
        <span className="pg-floorlight" aria-hidden="true" />

        {/* Sonnette murale et onomatopée du carillon */}
        <span className="pg-bell" aria-hidden="true">{ringKey > 0 && phase === 'door' && <i key={ringKey} />}<b /></span>
        {ringKey > 0 && phase === 'door' && <div className="lp-toc" key={ringKey} aria-hidden="true"><b style={{ '--n': 0 }}>ding</b><b style={{ '--n': 1 }}>dong</b></div>}

        {/* LA poignée : c'est elle qui ouvre. Zone tactile généreuse centrée sur les deux poignées en laiton. */}
        <button type="button" ref={mainBtn} className="pg-handle" onClick={open} disabled={phase !== 'door'} aria-label={tx('gateButton')}>
          <span className="pg-handle__ping" aria-hidden="true" />
        </button>

        {/* Consigne sur le tapis */}
        <div className="pg-ui pg-ui--door">
          <p className="pg-ui__cta"><i aria-hidden="true" />{tx('gateButton')}</p>
          <p className="pg-ui__who">{guestName ? `Pour ${guestName}` : 'Une invitation vous attend'}</p>
          <h2 className="pg-ui__t">{tx('gateKnock')}</h2>
        </div>

        <span className="pg-dim" aria-hidden="true" />

        {/* L'enveloppe : papier fermé, papier ouvert, lettre, sceau de cire ; nom du destinataire et monogramme en HTML */}
        <div className="pg-env" aria-hidden={phase === 'door' || phase === 'opening' ? 'true' : undefined}>
          <div className="pg-env__box">
            <img className="pg-env__open" src={envOpenUrl} alt="" decoding="async" />
            <div className="pg-env__slot">
              <div className="pg-env__letter">
                <span className="pg-env__l-eyebrow">Invitation</span>
                <span className="pg-env__l-names">{namesLine || invitation.title}</span>
                <span className="pg-env__l-rule" />
                <span className="pg-env__l-date">{[date, eventTime].filter(Boolean).join(' · ')}</span>
              </div>
            </div>
            <img className="pg-env__open pg-env__open--front" src={envOpenUrl} alt="" decoding="async" />
            <img className="pg-env__closed" src={envClosedUrl} alt="" decoding="async" />
            <div className="pg-env__to">
              <span>À l'attention de</span>
              <b>{guestName || 'nos invités'}</b>
            </div>
            <button type="button" ref={sealBtn} className="pg-seal" onClick={unseal} tabIndex={phase === 'envelope' ? 0 : -1} aria-label={tx('gateSeal')}>
              <span className="pg-seal__half pg-seal__half--a" style={{ backgroundImage: `url(${sealUrl})` }} />
              <span className="pg-seal__half pg-seal__half--b" style={{ backgroundImage: `url(${sealUrl})` }} />
              <span className="pg-seal__mono" aria-hidden="true">{monogram}</span>
            </button>
          </div>
        </div>

        <div className="pg-ui pg-ui--env" aria-live="polite">
          <p className="pg-ui__who">{fromLine}</p>
          <p className="pg-ui__t pg-ui__t--sm">{tx('gateSeal')}</p>
        </div>

        <span className="lp-gate__flash" aria-hidden="true" />
      </div>
    </div>
  );
}
