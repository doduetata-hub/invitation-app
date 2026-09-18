import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectStylesOnce } from './utils/injectStyles';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const INTRO_STEP_MS = 2600;
const LOOP_STEP_MS = 8000;
const FADE_MS = 700;

injectStylesOnce(
  'guestbook-display',
  `
  .gb-display { position: fixed; inset: 0; overflow: hidden; background: radial-gradient(circle at 50% 20%, #201a10 0%, #111111 55%, #0a0908 100%); font-family: 'Cormorant Garamond', Georgia, serif; }
  .gb-photo-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.22; filter: saturate(0.7) brightness(0.75); }
  .gb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.75) 60%, rgba(10,9,8,0.92) 100%); }
  .gb-glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
  .gb-glow-a { width: 46vw; height: 46vw; top: -14vw; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(216,181,109,0.28), transparent 70%); animation: gbPulse 9s ease-in-out infinite; }
  .gb-glow-b { width: 32vw; height: 32vw; bottom: -10vw; right: -6vw; background: radial-gradient(circle, rgba(184,138,50,0.22), transparent 70%); animation: gbPulse 11s ease-in-out infinite reverse; }
  @keyframes gbPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  .gb-particles { position: absolute; inset: 0; pointer-events: none; }
  .gb-particle { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #D6B56D; opacity: 0; animation: gbDrift linear infinite; }
  @keyframes gbDrift { 0% { opacity: 0; transform: translateY(0); } 10% { opacity: 0.7; } 90% { opacity: 0.4; } 100% { opacity: 0; transform: translateY(-90vh); } }

  .gb-intro, .gb-loop { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4vh 6vw; box-sizing: border-box; }
  .gb-intro-line { font-size: clamp(1.4rem, 2.6vw, 2.2rem); color: #F7F1E5; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }
  .gb-intro-names { font-family: 'Playfair Display', serif; font-size: clamp(3rem, 7vw, 6rem); color: #D6B56D; margin: 0; }
  .gb-intro-title { font-family: 'Playfair Display', serif; font-size: clamp(2.6rem, 5.5vw, 4.5rem); letter-spacing: 0.2em; text-transform: uppercase; color: #F7F1E5; margin: 0; }

  .gb-couple-photo { width: clamp(96px, 11vw, 160px); height: clamp(96px, 11vw, 160px); border-radius: 50%; object-fit: cover; border: 2px solid #B88A32; margin-bottom: 2.2vh; box-shadow: 0 0 40px rgba(184,138,50,0.35); }
  .gb-eyebrow { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.3em; font-size: clamp(0.75rem, 1vw, 1rem); color: #B88A32; margin: 0 0 5vh; }
  .gb-waiting { font-size: clamp(1.4rem, 2.4vw, 2rem); color: #F7F1E5; opacity: 0.75; }

  .gb-card { max-width: 62vw; transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease; }
  .gb-card-hidden { opacity: 0; transform: translateY(18px); }
  .gb-card-visible { opacity: 1; transform: translateY(0); }
  .gb-quote { font-family: 'Playfair Display', serif; font-size: clamp(3rem, 6vw, 5rem); color: #B88A32; margin: 0 0 -2vh; opacity: 0.6; }
  .gb-message { font-size: clamp(1.8rem, 3.4vw, 3.2rem); line-height: 1.45; color: #FFFDF8; margin: 0 0 3vh; font-weight: 500; }
  .gb-name { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.15em; font-size: clamp(0.95rem, 1.3vw, 1.3rem); color: #D6B56D; margin: 0; }

  .gb-fade-rise { animation: gbFadeRise 900ms ease both; }
  @keyframes gbFadeRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  @media (prefers-reduced-motion: reduce) {
    .gb-glow, .gb-particle { animation: none !important; }
    .gb-fade-rise { animation: gbFadeOnly 500ms ease both; }
    .gb-card { transition: opacity 500ms ease; }
    .gb-card-hidden, .gb-card-visible { transform: none; }
  }
  @keyframes gbFadeOnly { from { opacity: 0; } to { opacity: 1; } }
  `
);

function Particles() {
  const specs = useRef(
    Array.from({ length: 14 }, () => ({
      left: `${Math.round(Math.random() * 100)}%`,
      delay: `${(Math.random() * 10).toFixed(1)}s`,
      duration: `${(10 + Math.random() * 8).toFixed(1)}s`,
    }))
  ).current;

  return (
    <div className="gb-particles" aria-hidden="true">
      {specs.map((s, i) => (
        <span key={i} className="gb-particle" style={{ left: s.left, bottom: 0, animationDelay: s.delay, animationDuration: s.duration }} />
      ))}
    </div>
  );
}

export default function GuestbookDisplayPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [entries, setEntries] = useState([]);
  const [phase, setPhase] = useState('loading');
  const [introStep, setIntroStep] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/guestbook/display/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setEntries(d.entries || []);
        setPhase('intro');
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Flux temps réel : un message approuvé depuis l'admin arrive ici sans recharger la page.
  useEffect(() => {
    if (!data) return undefined;
    const es = new EventSource(`${API_BASE}/guestbook/display/${slug}/stream`);
    es.addEventListener('entry', (e) => {
      const entry = JSON.parse(e.data);
      setEntries((prev) => {
        const exists = prev.some((x) => x.id === entry.id);
        return exists ? prev.map((x) => (x.id === entry.id ? entry : x)) : [...prev, entry];
      });
    });
    return () => es.close();
  }, [data, slug]);

  // Séquence d'introduction : un pas toutes les ~2.6s, puis bascule vers la boucle des messages.
  useEffect(() => {
    if (phase !== 'intro') return undefined;
    if (introStep >= 3) {
      const t = setTimeout(() => setPhase('loop'), INTRO_STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIntroStep((s) => s + 1), INTRO_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, introStep]);

  // Boucle : fondu sortant, changement de message, fondu entrant, toutes les LOOP_STEP_MS —
  // redémarre automatiquement dès qu'un nouveau message approuvé arrive (entries change).
  useEffect(() => {
    if (phase !== 'loop' || entries.length === 0) return undefined;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIndex((i) => (i + 1) % entries.length);
        setVisible(true);
      }, FADE_MS);
    }, LOOP_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, entries, activeIndex]);

  if (notFound) {
    return (
      <div className="gb-display">
        <div className="gb-loop"><p className="gb-waiting">Cette page n'est plus disponible.</p></div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="gb-display">
        <div className="gb-loop"><p className="gb-waiting">Chargement...</p></div>
      </div>
    );
  }

  const currentEntry = entries[activeIndex] || null;

  return (
    <div className="gb-display">
      {data.coverUrl && <div className="gb-photo-bg" style={{ backgroundImage: `url(${data.coverUrl})` }} />}
      <div className="gb-overlay" />
      <div className="gb-glow gb-glow-a" />
      <div className="gb-glow gb-glow-b" />
      <Particles />

      {phase === 'intro' && (
        <div className="gb-intro">
          {introStep === 0 && <p className="gb-intro-line gb-fade-rise">Une surprise pour vous...</p>}
          {introStep === 1 && <h1 className="gb-intro-names gb-fade-rise">{data.namesLine || data.title}</h1>}
          {introStep === 2 && (
            <p className="gb-intro-line gb-fade-rise">Les mots de ceux qui partagent votre bonheur</p>
          )}
          {introStep >= 3 && <h1 className="gb-intro-title gb-fade-rise">Livre d'or</h1>}
        </div>
      )}

      {phase === 'loop' && (
        <div className="gb-loop">
          {data.coverUrl && <img src={data.coverUrl} className="gb-couple-photo" alt="" />}
          <p className="gb-eyebrow">Livre d'or — {data.namesLine || data.title}</p>

          {!currentEntry ? (
            <p className="gb-waiting gb-fade-rise">Les premiers mots arrivent bientôt...</p>
          ) : (
            <div key={currentEntry.id} className={`gb-card ${visible ? 'gb-card-visible' : 'gb-card-hidden'}`}>
              <p className="gb-quote" aria-hidden="true">"</p>
              <p className="gb-message">{currentEntry.message}</p>
              <p className="gb-name">— {currentEntry.guestName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
