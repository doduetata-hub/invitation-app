import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectStylesOnce } from './utils/injectStyles';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const COUNTDOWN_START = 5;
const COUNTDOWN_STEP_MS = 1000;
const INTRO_STEP_MS = 2600;
const LOOP_STEP_MS = 8000;
const FADE_MS = 700;

injectStylesOnce(
  'guestbook-display',
  `
  .gb-display { position: fixed; inset: 0; overflow: hidden; background: radial-gradient(circle at 50% 20%, #201a10 0%, #111111 55%, #0a0908 100%); font-family: 'Cormorant Garamond', Georgia, serif; }
  /* 50% 22% : même cadrage que LuxuryGoldCoverSection pour cette photo (remonte le point de
     recadrage, sinon "cover" + position centrée coupe le haut des visages sur un plan large). */
  .gb-photo-bg { position: absolute; inset: 0; background-size: cover; background-position: 50% 22%; opacity: 0.22; filter: saturate(0.7) brightness(0.75); }
  .gb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.75) 60%, rgba(10,9,8,0.92) 100%); }
  .gb-glow { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
  .gb-glow-a { width: 46vw; height: 46vw; top: -14vw; left: 50%; transform: translateX(-50%); background: radial-gradient(circle, rgba(216,181,109,0.28), transparent 70%); animation: gbPulse 9s ease-in-out infinite; }
  .gb-glow-b { width: 32vw; height: 32vw; bottom: -10vw; right: -6vw; background: radial-gradient(circle, rgba(184,138,50,0.22), transparent 70%); animation: gbPulse 11s ease-in-out infinite reverse; }
  @keyframes gbPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  .gb-particles { position: absolute; inset: 0; pointer-events: none; }
  .gb-particle { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #D6B56D; opacity: 0; animation: gbDrift linear infinite; }
  @keyframes gbDrift { 0% { opacity: 0; transform: translateY(0); } 10% { opacity: 0.7; } 90% { opacity: 0.4; } 100% { opacity: 0; transform: translateY(-90vh); } }

  .gb-intro, .gb-loop { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4vh 6vw; box-sizing: border-box; }
  /* Chaque clamp() ici est calé pour reproduire EXACTEMENT le rendu 1080p déjà validé (le vw
     du milieu atteint le plafond pile à 1920px), puis continue de grossir linéairement au-delà
     — sans ce plafond relevé, tout restait bloqué à sa taille 1080p en pixels, donc paraissait
     deux fois plus petit à l'écran une fois monté en 4K (3840px = 2x1920px). */
  .gb-intro-line { font-size: clamp(1.4rem, 1.83vw, 4.4rem); color: #F7F1E5; letter-spacing: 0.08em; text-transform: uppercase; margin: 0; }
  .gb-intro-names { font-family: 'Playfair Display', serif; font-size: clamp(3rem, 5vw, 12rem); color: #D6B56D; margin: 0; }
  .gb-intro-title { font-family: 'Playfair Display', serif; font-size: clamp(2.6rem, 3.75vw, 9rem); letter-spacing: 0.2em; text-transform: uppercase; color: #F7F1E5; margin: 0; }

  .gb-couple-photo { width: clamp(96px, 8.33vw, 320px); height: clamp(96px, 8.33vw, 320px); border-radius: 50%; object-fit: cover; object-position: 50% 22%; border: 2px solid #B88A32; margin-bottom: 2.2vh; box-shadow: 0 0 40px rgba(184,138,50,0.35); }
  .gb-eyebrow { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.3em; font-size: clamp(0.75rem, 0.83vw, 2rem); color: #B88A32; margin: 0 0 5vh; }
  .gb-waiting { font-size: clamp(1.4rem, 2.4vw, 2rem); color: #F7F1E5; opacity: 0.75; }

  .gb-card { max-width: 62vw; transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease; }
  .gb-card-hidden { opacity: 0; transform: translateY(18px); }
  .gb-card-visible { opacity: 1; transform: translateY(0); }
  .gb-quote { font-family: 'Playfair Display', serif; font-size: clamp(3rem, 4.17vw, 10rem); color: #B88A32; margin: 0 0 -2vh; opacity: 0.6; }
  .gb-message { font-size: clamp(1.8rem, 3.4vw, 3.2rem); line-height: 1.45; color: #FFFDF8; margin: 0 0 3vh; font-weight: 500; }
  .gb-name { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.15em; font-size: clamp(0.95rem, 1.08vw, 2.6rem); color: #D6B56D; margin: 0; }

  .gb-fade-rise { animation: gbFadeRise 900ms ease both; }
  @keyframes gbFadeRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  /* Premier écran, avant même l'intro : capte l'attention de la salle tout de suite, pour que
     personne ne rate le début du diaporama en train de discuter/manger. */
  .gb-countdown-caption { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.25em; font-size: clamp(0.85rem, 0.92vw, 2.2rem); color: #F7F1E5; opacity: 0.8; margin: 0 0 1.5vh; }
  .gb-countdown-number { font-family: 'Playfair Display', serif; font-size: clamp(6rem, 10.83vw, 26rem); color: #D6B56D; margin: 0; line-height: 1; text-shadow: 0 0 60px rgba(216,181,109,0.5); }
  .gb-countdown-pop { animation: gbCountdownPop 1000ms ease both; }
  @keyframes gbCountdownPop { 0% { opacity: 0; transform: scale(1.5); } 40% { opacity: 1; transform: scale(1); } 100% { opacity: 1; transform: scale(1); } }

  .gb-music-btn {
    position: absolute; z-index: 2; bottom: 2.5vh; right: 2.5vh;
    width: 48px; height: 48px;
    border-radius: 50%; border: 1px solid rgba(216,181,109,0.5);
    background: rgba(17,17,17,0.55); color: #D6B56D;
    font-size: 1.2rem; display: flex; align-items: center; justify-content: center;
    cursor: pointer; backdrop-filter: blur(4px);
  }
  .gb-music-btn:hover { background: rgba(17,17,17,0.8); }

  @media (prefers-reduced-motion: reduce) {
    .gb-glow, .gb-particle { animation: none !important; }
    .gb-fade-rise { animation: gbFadeOnly 500ms ease both; }
    .gb-countdown-pop { animation: gbFadeOnly 400ms ease both; }
    .gb-card { transition: opacity 500ms ease; }
    .gb-card-hidden, .gb-card-visible { transform: none; }
  }
  @keyframes gbFadeOnly { from { opacity: 0; } to { opacity: 1; } }
  `
);

// Un message va de quelques mots à 1000 caractères (limite du formulaire) : une taille de
// police fixe déborde du plein écran pour les plus longs (overflow: hidden sur .gb-display les
// coupait purement et simplement, illisibles). Plus le message est long, plus on réduit la
// police ET on retire les éléments décoratifs (photo, guillemet) pour rendre la place
// verticale au texte — jamais l'inverse (jamais de police agrandie au point de dépasser).
// Chaque plafond est calé pour reproduire le rendu 1080p déjà validé (le vw du milieu atteint
// le plafond pile à 1920px) puis continue de grossir linéairement jusqu'en 4K — sinon le texte
// reste bloqué à sa taille 1080p en pixels et paraît deux fois plus petit sur un écran 3840px.
function presentationForMessage(message) {
  const len = message.length;
  if (len <= 70) return { fontSize: 'clamp(2rem, 2.83vw, 6.8rem)', lineHeight: 1.4, maxWidth: '58vw', showPhoto: true, showQuote: true, showEyebrow: true };
  if (len <= 160) return { fontSize: 'clamp(1.55rem, 2.08vw, 5rem)', lineHeight: 1.4, maxWidth: '64vw', showPhoto: true, showQuote: true, showEyebrow: true };
  if (len <= 320) return { fontSize: 'clamp(1.2rem, 1.54vw, 3.7rem)', lineHeight: 1.35, maxWidth: '70vw', showPhoto: false, showQuote: true, showEyebrow: true };
  if (len <= 560) return { fontSize: 'clamp(1.02rem, 1.21vw, 2.9rem)', lineHeight: 1.3, maxWidth: '76vw', showPhoto: false, showQuote: false, showEyebrow: true };
  return { fontSize: 'clamp(0.88rem, 0.98vw, 2.36rem)', lineHeight: 1.25, maxWidth: '82vw', showPhoto: false, showQuote: false, showEyebrow: false };
}

const DEFAULT_PRESENTATION = presentationForMessage('');

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
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [introStep, setIntroStep] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/guestbook/display/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setEntries(d.entries || []);
        setPhase('countdown');
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  // Cet écran tourne seul, sans personne pour cliquer "Jouer" — on tente donc le démarrage
  // automatique dès que possible. Si le navigateur le bloque (politique anti-autoplay tant
  // qu'aucune interaction n'a eu lieu sur la page), le bouton musical reste affiché et permet
  // de démarrer manuellement d'un seul clic ; une fois lancée, la musique boucle sans y retoucher.
  useEffect(() => {
    if (!data?.musicUrl || !audioRef.current) return;
    audioRef.current
      .play()
      .then(() => setMusicPlaying(true))
      .catch(() => setMusicPlaying(false));
  }, [data?.musicUrl]);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.play().then(() => setMusicPlaying(true)).catch(() => {});
    }
  };

  // Compte à rebours d'ouverture (5, 4, 3, 2, 1) : premier écran affiché, pour attirer l'œil
  // avant même le début de la séquence d'intro — personne ne doit rater le tout premier écran.
  useEffect(() => {
    if (phase !== 'countdown') return undefined;
    if (countdownValue <= 0) {
      setPhase('intro');
      return undefined;
    }
    const t = setTimeout(() => setCountdownValue((v) => v - 1), COUNTDOWN_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, countdownValue]);

  // Flux temps réel : un message approuvé depuis l'admin arrive ici sans recharger la page.
  // Reconnexion manuelle en secours : le navigateur ne retente indéfiniment que si une
  // connexion déjà ouverte est coupée en cours de route. Si la toute PROCHAINE tentative de
  // reconnexion tombe pendant que le backend est encore en train de redémarrer (nginx renvoie
  // alors une erreur, pas juste une coupure), le navigateur considère ça comme un échec de
  // connexion et abandonne pour de bon (readyState CLOSED) sans jamais réessayer — vérifié en
  // coupant le backend en plein direct. Cet écran tourne sans personne pour recharger la page
  // de la soirée, donc on reprend nous-mêmes la main dans ce cas précis.
  //
  // Testé en coupant/relançant un serveur en direct (Phase 3) : la reconnexion NATIVE
  // d'EventSource (sur une simple perte de connexion, sans réponse d'erreur nginx) se rétablit
  // souvent d'elle-même SANS jamais passer par readyState CLOSED ni par connect() ci-dessous —
  // elle reste juste en CONNECTING et réessaie seule. Se resynchroniser uniquement dans le
  // retry manuel (sur CLOSED) manque donc ce cas très courant. D'où l'écoute de 'open', qui se
  // déclenche après CHAQUE reconnexion réussie, native ou manuelle, pour rattraper les messages
  // approuvés pendant n'importe quelle coupure, aussi brève soit-elle.
  useEffect(() => {
    if (!data) return undefined;
    let es;
    let retryTimer;
    let stopped = false;
    let hasConnectedOnce = false;

    const mergeEntry = (entry) => {
      setEntries((prev) => {
        const exists = prev.some((x) => x.id === entry.id);
        return exists ? prev.map((x) => (x.id === entry.id ? entry : x)) : [...prev, entry];
      });
    };

    const connect = () => {
      es = new EventSource(`${API_BASE}/guestbook/display/${slug}/stream`);
      es.addEventListener('open', () => {
        // Jamais au tout premier chargement (l'instantané REST initial est déjà à jour) —
        // seulement à partir de la 2e connexion, qu'elle vienne d'ici ou du retry natif.
        if (!hasConnectedOnce) {
          hasConnectedOnce = true;
          return;
        }
        fetch(`${API_BASE}/guestbook/display/${slug}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.entries?.forEach(mergeEntry))
          .catch(() => {});
      });
      es.addEventListener('entry', (e) => mergeEntry(JSON.parse(e.data)));
      es.addEventListener('error', () => {
        if (stopped) return;
        if (es.readyState === EventSource.CLOSED) {
          retryTimer = setTimeout(connect, 3000);
        }
      });
    };
    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      es?.close();
    };
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
  const presentation = currentEntry ? presentationForMessage(currentEntry.message) : DEFAULT_PRESENTATION;

  return (
    <div className="gb-display">
      {data.coverUrl && <div className="gb-photo-bg" style={{ backgroundImage: `url(${data.coverUrl})` }} />}
      <div className="gb-overlay" />
      <div className="gb-glow gb-glow-a" />
      <div className="gb-glow gb-glow-b" />
      <Particles />

      {data.musicUrl && (
        <>
          <audio ref={audioRef} src={data.musicUrl} loop />
          <button
            type="button"
            onClick={toggleMusic}
            className="gb-music-btn"
            aria-label={musicPlaying ? 'Couper la musique' : 'Jouer la musique'}
          >
            {musicPlaying ? '♪' : '🔇'}
          </button>
        </>
      )}

      {phase === 'countdown' && (
        <div className="gb-intro">
          <p className="gb-countdown-caption gb-fade-rise">Regardez l'écran...</p>
          <p key={countdownValue} className="gb-countdown-number gb-countdown-pop">{countdownValue}</p>
        </div>
      )}

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
          {data.coverUrl && presentation.showPhoto && <img src={data.coverUrl} className="gb-couple-photo" alt="" />}
          {presentation.showEyebrow && <p className="gb-eyebrow">Livre d'or — {data.namesLine || data.title}</p>}

          {!currentEntry ? (
            <p className="gb-waiting gb-fade-rise">Les premiers mots arrivent bientôt...</p>
          ) : (
            <div
              key={currentEntry.id}
              className={`gb-card ${visible ? 'gb-card-visible' : 'gb-card-hidden'}`}
              style={{ maxWidth: presentation.maxWidth }}
            >
              {presentation.showQuote && <p className="gb-quote" aria-hidden="true">"</p>}
              <p className="gb-message" style={{ fontSize: presentation.fontSize, lineHeight: presentation.lineHeight }}>
                {currentEntry.message}
              </p>
              <p className="gb-name">— {currentEntry.guestName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
