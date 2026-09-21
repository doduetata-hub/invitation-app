import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectStylesOnce } from './utils/injectStyles';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const COUNTDOWN_START = 5;
const COUNTDOWN_STEP_MS = 1000;
const INTRO_STEP_MS = 2600;
const LOOP_STEP_MS = 8000;
const FADE_MS = 700;
const POLL_INTERVAL_MS = 2000;

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

  /* Le groupe (photo + intitulé + message) garde sa hauteur naturelle : c'est lui qu'on mesure
     pour caler la taille du message (voir fitMessageFont), et .gb-loop le centre à l'écran. */
  .gb-group { display: flex; flex-direction: column; align-items: center; max-width: 80vw; }
  .gb-card { transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease; }
  .gb-card-hidden { opacity: 0; transform: translateY(18px); }
  .gb-card-visible { opacity: 1; transform: translateY(0); }
  .gb-quote { font-family: 'Playfair Display', serif; font-size: clamp(3rem, 4.17vw, 10rem); color: #B88A32; margin: 0 0 -2vh; opacity: 0.6; }
  /* font-size posée en JS (fitMessageFont) ; la valeur ci-dessous ne sert que de repli avant la mesure. */
  .gb-message { font-size: clamp(1.8rem, 3vw, 6rem); line-height: 1.35; color: #FFFDF8; margin: 0 0 3vh; font-weight: 600; text-wrap: balance; text-shadow: 0 2px 18px rgba(0,0,0,0.55); }
  .gb-name { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.15em; font-size: clamp(1.05rem, 1.35vw, 3.2rem); font-weight: 500; color: #E3C57F; margin: 0; }

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

// Un message va de quelques mots à 1000 caractères (limite du formulaire). La taille de police
// n'est plus choisie par paliers de longueur (les paliers rétrécissaient le texte bien avant que
// la place ne manque : un message de ~190 caractères s'affichait en petit avec l'écran quasi
// vide autour) : fitMessageFont mesure le rendu réel et prend la plus grande taille qui tient à
// l'écran, quelle que soit sa résolution (1080p comme 4K). Seuls les éléments décoratifs restent
// conditionnés à la longueur, pour rendre la place verticale au texte quand il est long.
function presentationForMessage(message) {
  const len = message.length;
  return { showPhoto: len <= 120, showQuote: len <= 400 };
}

const DEFAULT_PRESENTATION = presentationForMessage('');

// Mémoire des messages déjà présentés, gardée dans le navigateur de l'écran : sans elle, un
// simple rechargement de la page en pleine soirée (écran qui se met en veille, onglet fermé par
// erreur...) refaisait repasser tous les messages depuis le début. Ajouter `?reset=1` à
// l'adresse de l'écran l'efface une fois (puis retire le paramètre de l'adresse, pour qu'un
// rechargement suivant ne la réinitialise pas encore) : c'est le moyen de tout rejouer pour un
// essai. Ne concerne que le navigateur qui ouvre cette adresse. localStorage peut être
// indisponible (navigation privée, stockage bloqué) : dans ce cas on retombe sur une mémoire
// vide, valable jusqu'au prochain rechargement.
const shownStorageKey = (slug) => `guestbook-shown:${slug}`;

function loadShown(slug) {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('reset')) {
      window.localStorage.removeItem(shownStorageKey(slug));
      params.delete('reset');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      return new Set();
    }
    return new Set(JSON.parse(window.localStorage.getItem(shownStorageKey(slug)) || '[]'));
  } catch {
    return new Set();
  }
}

function saveShown(slug, shown) {
  try {
    window.localStorage.setItem(shownStorageKey(slug), JSON.stringify([...shown]));
  } catch {
    // stockage indisponible : la mémoire reste valable jusqu'au rechargement
  }
}

// Empreinte courte du texte (djb2) : la clé d'un message présenté contient son texte pour qu'une
// correction repasse à l'écran, sans stocker jusqu'à 1000 caractères par message.
function hashText(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Plafond : au-delà, un message très court (« Félicitations ! ») devient ridiculement énorme et
// la lecture se fait plus difficile, pas plus facile. Plancher : ne jamais descendre sous une
// taille lisible à distance, même si un message de 1000 caractères devait alors déborder.
const MESSAGE_FONT_MAX_VW = 4.2;
const MESSAGE_FONT_MIN_VW = 0.75;

function fitMessageFont(loopEl, groupEl, messageEl) {
  if (!loopEl || !groupEl || !messageEl) return;
  const style = window.getComputedStyle(loopEl);
  const available = loopEl.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const fits = (px) => {
    messageEl.style.fontSize = `${px}px`;
    return groupEl.offsetHeight <= available;
  };

  let hi = (window.innerWidth * MESSAGE_FONT_MAX_VW) / 100;
  let lo = Math.max(12, (window.innerWidth * MESSAGE_FONT_MIN_VW) / 100);
  if (fits(hi)) return;
  while (hi - lo > 0.5) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  messageEl.style.fontSize = `${lo}px`;
}

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
  const [currentEntry, setCurrentEntry] = useState(null);
  const [visible, setVisible] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef(null);
  const shownRef = useRef(null);
  if (shownRef.current === null) shownRef.current = loadShown(slug);
  const entriesRef = useRef([]);
  const loopRef = useRef(null);
  const groupRef = useRef(null);
  const messageRef = useRef(null);

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

  // Mise à jour de la liste par interrogation régulière plutôt que par flux SSE : le backend
  // tourne sur Vercel (fonctions serverless, coupées après 30 s, chaque requête pouvant tomber
  // sur une instance différente), donc un flux ouvert en continu et un registre de connexions
  // en mémoire n'y sont pas fiables — l'approbation faite dans l'admin n'atteignait l'écran que
  // par hasard, et chaque coupure de 30 s remplissait les logs d'erreurs de timeout. Redemander
  // la liste toutes les POLL_INTERVAL_MS marche partout et rattrape aussi tout seul n'importe
  // quelle coupure réseau. On ne remplace l'état que si la liste a réellement changé, pour ne pas
  // relancer le minuteur de rotation des messages à chaque interrogation.
  useEffect(() => {
    if (!data) return undefined;
    let stopped = false;

    const sameList = (a, b) =>
      a.length === b.length &&
      a.every((x, i) => x.id === b[i].id && x.message === b[i].message && x.guestName === b[i].guestName);

    const poll = () => {
      fetch(`${API_BASE}/guestbook/display/${slug}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stopped || !d?.entries) return;
          setEntries((prev) => (sameList(prev, d.entries) ? prev : d.entries));
        })
        .catch(() => {});
    };

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
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

  // Chaque message n'est présenté qu'UNE fois (un invité = un passage, pour que tout le monde
  // ait sa chance) : plus de boucle une fois la liste épuisée. Les messages approuvés arrivent
  // dans l'ordre d'approbation ; on prend toujours le premier pas encore présenté, donc un
  // message approuvé pendant un passage passe juste après le message en cours, sans attendre la
  // fin de quoi que ce soit. Plus rien à présenter : l'écran d'attente reste affiché jusqu'à la
  // prochaine approbation. La clé inclut le texte, pour qu'un message corrigé par son auteur
  // puis ré-approuvé soit bien présenté à nouveau.
  // entriesRef : les minuteurs ci-dessous durent plusieurs secondes, ils doivent lire la liste
  // la plus récente et non celle capturée au moment où ils ont été lancés.
  entriesRef.current = entries;
  const entryKey = (e) => `${e.id}:${hashText(e.message)}`;
  const nextUnseen = () => entriesRef.current.find((e) => !shownRef.current.has(entryKey(e))) || null;
  const present = (entry) => {
    shownRef.current.add(entryKey(entry));
    saveShown(slug, shownRef.current);
    setCurrentEntry(entry);
    setVisible(true);
  };

  // Écran d'attente -> premier message non présenté dès qu'il y en a un (fin de l'intro, ou
  // nouvelle approbation arrivée pendant l'attente).
  useEffect(() => {
    if (phase !== 'loop' || currentEntry) return;
    const next = nextUnseen();
    if (next) present(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, entries, currentEntry]);

  // Message affiché : fondu sortant après LOOP_STEP_MS, puis le suivant non présenté, ou
  // l'écran d'attente s'il n'y en a plus. `entries` volontairement hors dépendances : une
  // nouvelle approbation ne doit pas relancer le minuteur du message en cours d'affichage.
  useEffect(() => {
    if (phase !== 'loop' || !currentEntry) return undefined;
    let fadeTimer;
    const t = setTimeout(() => {
      setVisible(false);
      fadeTimer = setTimeout(() => {
        const next = nextUnseen();
        if (next) present(next);
        else setCurrentEntry(null);
      }, FADE_MS);
    }, LOOP_STEP_MS);
    return () => {
      clearTimeout(t);
      clearTimeout(fadeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentEntry]);

  const presentation = currentEntry ? presentationForMessage(currentEntry.message) : DEFAULT_PRESENTATION;

  // Avant la peinture, pour qu'on ne voie jamais le message à une taille provisoire. Refait
  // quand la fenêtre change de taille et une fois les polices chargées (leurs métriques
  // changent la hauteur du texte, donc la taille qui tient).
  useLayoutEffect(() => {
    if (phase !== 'loop' || !currentEntry) return undefined;
    const run = () => fitMessageFont(loopRef.current, groupRef.current, messageRef.current);
    run();
    window.addEventListener('resize', run);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) run();
    });
    return () => {
      cancelled = true;
      window.removeEventListener('resize', run);
    };
  }, [phase, currentEntry?.id, currentEntry?.message, presentation.showPhoto, presentation.showQuote]);

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
        <div className="gb-loop" ref={loopRef}>
          <div className="gb-group" ref={groupRef}>
            {data.coverUrl && presentation.showPhoto && <img src={data.coverUrl} className="gb-couple-photo" alt="" />}
            <p className="gb-eyebrow">Livre d'or — {data.namesLine || data.title}</p>

            {!currentEntry ? (
              <p className="gb-waiting gb-fade-rise">{shownRef.current.size > 0 ? "D'autres mots arrivent bientôt..." : 'Les premiers mots arrivent bientôt...'}</p>
            ) : (
              <div key={currentEntry.id} className={`gb-card ${visible ? 'gb-card-visible' : 'gb-card-hidden'}`}>
                {presentation.showQuote && <p className="gb-quote" aria-hidden="true">"</p>}
                <p className="gb-message" ref={messageRef}>{currentEntry.message}</p>
                <p className="gb-name">— {currentEntry.guestName}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
