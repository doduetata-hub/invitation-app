import { useCallback, useEffect, useRef, useState } from 'react';
import { formatEventDate } from '../../../shared/utils/eventDateTime';
import { splitNames, initials } from '../soireeKit/utils';
import { getText } from './texts';
import { playDoor, playSeal, playBell } from './sound';

// OUVERTURE : un messager frappe à la porte de l'invité. Il ouvre (porte à deux battants qui s'écartent sur la lumière), le messager lui
// tend une enveloppe scellée qui glisse vers lui ; il touche le sceau, la lettre sort de l'enveloppe et l'invitation apparaît.
// Phases : door → opening → envelope → unseal → leaving. Purement décoratif et toujours passable (bouton « Passer », touche Échap).

/** Silhouette du messager : haut-de-forme, redingote, nœud papillon, une enveloppe tendue. Détourée à l'or par le contre-jour. */
function Courier() {
  return (
    <svg className="lp-courier" viewBox="0 0 140 210" aria-hidden="true" focusable="false">
      <g className="lp-courier__body">
        <path d="M45 124 L42 204 H58 L63 138 L69 204 H85 L82 124 Z" />
        <path d="M32 74 Q62 54 92 74 L100 154 Q62 166 26 154 Z" />
        <path d="M33 76 L22 128 L31 131 L42 84 Z" />
        <path d="M88 74 L108 100 L104 118 L94 113 L90 96 L80 82 Z" />
        <rect x="55" y="52" width="14" height="13" rx="3" />
        <ellipse cx="62" cy="40" rx="12" ry="14" />
        <rect x="47" y="7" width="30" height="26" rx="2.5" />
        <ellipse cx="62" cy="33" rx="22" ry="4.6" />
      </g>
      <rect className="lp-courier__band" x="47" y="26" width="30" height="3.4" />
      <path className="lp-courier__shirt" d="M55 62 L62 86 L69 62 Z" />
      <path className="lp-courier__bow" d="M62 63 L53 59 L53 68 Z M62 63 L71 59 L71 68 Z" />
      <g transform="rotate(-14 104 112)">
        <rect className="lp-courier__env" x="92" y="104" width="30" height="20" rx="1.6" />
        <path className="lp-courier__flap" d="M92 104 L107 116 L122 104" />
        <circle className="lp-courier__wax" cx="107" cy="116" r="3.2" />
      </g>
    </svg>
  );
}

/** Quincaillerie d'une poignée : platine en laiton, rosace, bec-de-cane (le levier s'abaisse à l'ouverture), trou de serrure. */
function Hardware() {
  return (
    <>
      <span className="lp-handle__plate" />
      <span className="lp-handle__rose" />
      <span className="lp-handle__lever" />
      <span className="lp-handle__key" />
    </>
  );
}

/** Cachet de cire : un disque bordeaux, gravé des initiales des hôtes. */
function SealArt({ label }) {
  return (
    <span className="lp-seal__art" aria-hidden="true">
      <span className="lp-seal__ring" />
      <span className="lp-seal__txt">{label}</span>
    </span>
  );
}

export default function Gate({ invitation, mode = 'page', onDone, replay = false }) {
  const [phase, setPhase] = useState('door');
  const [ringKey, setRingKey] = useState(0); // 0 = pas encore sonné ; chaque coup de sonnette relance les animations
  const timers = useRef([]);
  const mainBtn = useRef(null);
  const sealBtn = useRef(null);
  const later = useCallback((fn, ms) => { timers.current.push(setTimeout(fn, ms)); }, []);
  const tx = (k) => getText(invitation, k);

  const { namesLine, eventDate, eventTime, guest } = invitation;
  const names = splitNames(namesLine);
  const ini = initials(names);
  const monogram = `${ini.f}${ini.s ? ` & ${ini.s}` : ''}` || '✦';
  const who = names.second ? `${names.first} & ${names.second}` : names.first;
  const date = eventDate ? formatEventDate(eventDate, { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const guestName = guest?.name || '';

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Sonnette : quelqu'un sonne dès l'arrivée, puis RECOMMENCE toutes les quelques secondes tant que l'invité n'a pas ouvert.
  // Si le navigateur bloque le son avant un premier geste, la sonnette reste visible (et fait vibrer le téléphone) ; elle sonne
  // aussitôt que l'invité touche l'écran, sans qu'il ait à chercher quoi que ce soit.
  useEffect(() => {
    if (phase !== 'door') return undefined;
    let heard = false;
    const ring = () => {
      setRingKey((k) => k + 1);
      if (playBell()) heard = true;
      try { if (navigator.userActivation?.hasBeenActive && navigator.vibrate) navigator.vibrate([260, 140, 260]); } catch { /* sans effet */ }
    };
    const first = setTimeout(ring, 800);
    const again = setInterval(ring, 7500);
    const unlock = (e) => {
      if (e.target && e.target.closest && e.target.closest('.lp-handle--r, .lp-door, .lp-gate__skip')) { playBell(); return; }
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
  }, [phase]);

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
    if (mode === 'page' && mainBtn.current) mainBtn.current.focus({ preventScroll: true });
  }, [mode]);

  useEffect(() => {
    if (phase === 'envelope' && mode === 'page' && sealBtn.current) sealBtn.current.focus({ preventScroll: true });
  }, [phase, mode]);

  const leave = useCallback((ms = 900) => {
    setPhase('leaving');
    later(() => onDone && onDone(), ms);
  }, [later, onDone]);

  const open = () => {
    if (phase !== 'door') return;
    playDoor();
    setPhase('opening');
    later(() => setPhase((p) => (p === 'opening' ? 'envelope' : p)), 3600);
  };

  const unseal = () => {
    if (phase !== 'envelope') return;
    playSeal();
    setPhase('unseal');
    later(() => leave(1000), 1900);
  };

  const skip = useCallback(() => {
    if (phase === 'leaving') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    leave(520);
  }, [phase, leave]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [skip]);

  const fromLine = tx('gateFrom').replace('{noms}', who || 'vos hôtes');

  return (
    <div className={`lp-gate lp-gate--${mode}`} data-phase={phase} data-ring={ringKey === 0 ? '0' : ringKey % 2 ? 'a' : 'b'} role="dialog" aria-modal={mode === 'page' ? 'true' : undefined} aria-label="Ouverture de l'invitation">
      <div className="lp-gate__bg" aria-hidden="true">
        {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ '--x': `${(i * 37 + 11) % 100}%`, '--s': `${2 + (i % 4)}px`, '--d': `${7 + (i % 6) * 1.7}s`, '--w': `${-(i * 1.3)}s` }} />)}
      </div>

      <button type="button" className="lp-gate__skip" onClick={skip}>{replay ? 'Fermer' : tx('gateSkip')}</button>

      <div className="lp-doorwrap">
        <span className="lp-lamp lp-lamp--l" /><span className="lp-lamp lp-lamp--r" />
        <div className="lp-door" onClick={open}>
          <div className="lp-door__frame">
            <div className="lp-door__inner">
              <div className="lp-beyond">
                <span className="lp-beyond__rays" />
                <span className="lp-beyond__floor" />
                <Courier />
              </div>
              <div className="lp-transom"><i /><i /><i /></div>
              <div className="lp-leaves">
                <div className="lp-leaf lp-leaf--l">
                  <span className="lp-pn lp-pn--top" />
                  <span className="lp-pn lp-pn--mid" />
                  <span className="lp-pn lp-pn--low" />
                  <span className="lp-handle lp-handle--l" aria-hidden="true"><Hardware /></span>
                </div>
                <div className="lp-leaf lp-leaf--r">
                  <span className="lp-pn lp-pn--top" />
                  <span className="lp-pn lp-pn--mid" />
                  <span className="lp-pn lp-pn--low" />
                  <button type="button" ref={mainBtn} className="lp-handle lp-handle--r" onClick={(e) => { e.stopPropagation(); open(); }} disabled={phase !== 'door'} aria-label={tx('gateButton')}><Hardware /></button>
                  <span className="lp-knocker"><span className="lp-knocker__plate" /><span className="lp-knocker__ring" /></span>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-door__step" />
          <span className="lp-door__spill" /><span className="lp-door__cone" />
        </div>
        {ringKey > 0 && phase === 'door' && <div className="lp-toc" key={ringKey} aria-hidden="true"><b style={{ '--n': 0 }}>ding</b><b style={{ '--n': 1 }}>dong</b></div>}
        <span className="lp-bell" aria-hidden="true">{ringKey > 0 && phase === 'door' && <i key={ringKey} />}<b /></span>
      </div>

      <div className="lp-gate__ui lp-gate__ui--door">
        <p className="lp-gate__cta"><i aria-hidden="true" />{tx('gateButton')}</p>
        <p className="lp-gate__who">{guestName ? `Pour ${guestName}` : 'Une invitation vous attend'}</p>
        <h2 className="lp-gate__t">{tx('gateKnock')}</h2>
        <p className="lp-gate__p">{tx('gateHint')}</p>
      </div>

      <div className="lp-env" aria-hidden={phase === 'door' || phase === 'opening' ? 'true' : undefined}>
        <div className="lp-env__tilt">
          <div className="lp-env__back" />
          <div className="lp-env__letter">
            <span className="lp-env__l-eyebrow">Invitation</span>
            <span className="lp-env__l-names">{namesLine || invitation.title}</span>
            <span className="lp-env__l-rule" />
            <span className="lp-env__l-date">{[date, eventTime].filter(Boolean).join(' · ')}</span>
          </div>
          <div className="lp-env__front" />
          <div className="lp-env__to">
            <span>À l'attention de</span>
            <b>{guestName || 'nos invités'}</b>
          </div>
          <div className="lp-env__flap" />
          <button type="button" ref={sealBtn} className="lp-seal" onClick={unseal} tabIndex={phase === 'envelope' ? 0 : -1} aria-label={tx('gateSeal')}>
            <span className="lp-seal__half lp-seal__half--a"><SealArt label={monogram} /></span>
            <span className="lp-seal__half lp-seal__half--b"><SealArt label={monogram} /></span>
          </button>
        </div>
      </div>

      <div className="lp-gate__ui lp-gate__ui--env" aria-live="polite">
        <p className="lp-gate__who">{fromLine}</p>
        <p className="lp-gate__t lp-gate__t--sm">{tx('gateSeal')}</p>
      </div>

      <span className="lp-gate__flash" aria-hidden="true" />
    </div>
  );
}
