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
     recadrage, sinon "cover" + position centrée coupe le haut des visages sur un plan large).
     La photo du couple reste volontairement très sombre (opacity/brightness bas) : un simple
     décor discret derrière le message, jamais un élément qu'on éclaircit pour le mettre en avant. */
  .gb-photo-bg { position: absolute; inset: 0; background-size: cover; background-position: 50% 22%; opacity: 0.22; filter: saturate(0.7) brightness(0.75); animation: gbBgDrift 48s ease-in-out infinite alternate; }
  /* Dérive de cadrage extrêmement lente (imperceptible seconde par seconde, sensible sur la durée
     d'une soirée) : un très léger mouvement, jamais un zoom, pour que l'arrière-plan ne soit
     jamais totalement figé sans pour autant attirer l'œil. */
  @keyframes gbBgDrift { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.06) translate(-0.6%, -0.4%); } }
  .gb-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.75) 60%, rgba(10,9,8,0.92) 100%); }
  /* Halo doré diffus, très en dessous de l'overlay sombre : une lumière ambiante à peine
     perceptible plutôt qu'un vrai projecteur — la photo du couple doit rester sombre et discrète. */
  .gb-mist { position: absolute; inset: -10%; background: radial-gradient(ellipse at 50% 38%, rgba(216,181,109,0.10) 0%, rgba(216,181,109,0.04) 38%, transparent 72%); animation: gbMistBreathe 22s ease-in-out infinite; pointer-events: none; }
  @keyframes gbMistBreathe { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
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
  .gb-group-photo { max-width: 90vw; }
  .gb-card { display: flex; flex-direction: column; align-items: center; transition: opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease; }
  .gb-text { max-width: 80vw; }

  /* Message + photo : composition en deux colonnes sur un écran large (photo encadrée à gauche,
     message à droite), en pile sur un écran en portrait. Toutes les tailles sont en vw/vh : la
     composition est identique en 1366x768, 1080p et 4K. --gb-photo-scale réduit la photo quand
     le message est long, pour que le message reste TOUJOURS l'élément principal. La photo garde
     son ratio d'origine (largeur/hauteur auto + object-fit: contain) : jamais déformée ni
     recadrée, jamais agrandie au-delà de sa définition (pas de pixellisation inutile). */
  .gb-card-photo { flex-direction: row; justify-content: center; gap: clamp(28px, 4.2vw, 160px); }
  .gb-card-photo .gb-text { flex: 0 1 auto; min-width: 0; max-width: 44vw; }
  .gb-photo-frame { --gb-photo-scale: 1; margin: 0; flex: none; line-height: 0; padding: clamp(6px, 0.65vw, 24px); border: 1px solid rgba(214,181,109,0.65); background: linear-gradient(145deg, rgba(38,30,17,0.92), rgba(10,9,8,0.92)); box-shadow: 0 0 0 clamp(3px, 0.3vw, 12px) rgba(10,9,8,0.55), 0 0 5vw rgba(216,181,109,0.16), 0 2.4vh 6vh rgba(0,0,0,0.6); }
  .gb-photo-frame img { display: block; width: auto; height: auto; object-fit: contain; }
  .gb-photo-landscape img { max-width: calc(40vw * var(--gb-photo-scale)); max-height: calc(50vh * var(--gb-photo-scale)); }
  .gb-photo-square img { max-width: calc(32vw * var(--gb-photo-scale)); max-height: calc(54vh * var(--gb-photo-scale)); }
  .gb-photo-portrait img { max-width: calc(26vw * var(--gb-photo-scale)); max-height: calc(62vh * var(--gb-photo-scale)); }
  @media (max-aspect-ratio: 1/1) {
    .gb-card-photo { flex-direction: column; gap: 3vh; }
    .gb-card-photo .gb-text { max-width: 84vw; }
    .gb-photo-landscape img, .gb-photo-square img, .gb-photo-portrait img { max-width: calc(78vw * var(--gb-photo-scale)); max-height: calc(34vh * var(--gb-photo-scale)); }
  }

  .gb-card-hidden { opacity: 0; transform: translateY(18px); }
  .gb-card-visible { opacity: 1; transform: translateY(0); }

  /* Révélation cinématographique : le fondu du bloc entier (ci-dessus, sur .gb-card) est le
     mouvement de base ; ces animations, elles, jouent UNIQUEMENT sur les enfants et UNIQUEMENT
     à l'entrée (le sélecteur ne matche plus dès que la carte repasse en "hidden", donc la sortie
     reste un simple fondu d'ensemble, sans re-décomposer). Photo d'abord, message ensuite,
     signature enfin — jamais de zoom ni de rotation, juste un temps d'avance différent. */
  .gb-card-visible .gb-photo-frame { animation: gbEnterRise 1000ms ease both; }
  .gb-card-visible .gb-text > .gb-quote { animation: gbEnterRise 900ms ease both 120ms; }
  .gb-card-visible .gb-text > .gb-message { animation: gbEnterRise 900ms ease both 260ms; }
  .gb-card-visible .gb-text > .gb-name { animation: gbEnterRise 900ms ease both 480ms; }
  .gb-card-visible .gb-page-indicator { animation: gbEnterRise 900ms ease both 620ms; }
  @keyframes gbEnterRise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  /* Marge en vw (comme la taille du guillemet) et non en vh : identique en 16:9 (-2vh = -1.125vw), mais
     ne vient plus mordre sur la 1re ligne du message sur un écran vertical. Discret : présent sans
     jamais rivaliser avec le message, qui reste le seul élément fort de la composition. */
  .gb-quote { font-family: 'Playfair Display', serif; font-size: clamp(2.3rem, 3.2vw, 7.7rem); color: #B88A32; margin: 0 0 -1vw; opacity: 0.42; }
  /* font-size posée en JS (fitMessageFont) ; la valeur ci-dessous ne sert que de repli avant la mesure. */
  .gb-message { font-size: clamp(1.6rem, 2.5vw, 5rem); line-height: 1.35; color: #FFFDF8; margin: 0 0 3vh; font-weight: 600; text-wrap: balance; text-shadow: 0 2px 18px rgba(0,0,0,0.55); }
  /* Emojis conservés dans la donnée (jamais modifiés), juste neutralisés visuellement à l'écran :
     moins "confettis", plus proche d'une gravure sobre — cohérent avec l'ambiance Smoking & Doré.
     Désaturation marquée + légère réduction de taille : au premier coup d'œil sur grand écran,
     un simple opacity(0.75) restait presque aussi coloré qu'à l'origine. */
  .gb-emoji { filter: grayscale(0.85) opacity(0.6) brightness(0.9); font-size: 0.9em; }
  .gb-name { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.15em; font-size: clamp(1.05rem, 1.35vw, 3.2rem); font-weight: 500; color: #E3C57F; margin: 0; }
  /* Repère discret "1 / 2" pour un message présenté en deux temps (voir splitMessageForDisplay) :
     jamais assez visible pour concurrencer le nom, juste de quoi comprendre qu'une suite arrive.
     Marge généreuse : au ras du nom, il se lisait comme un indice de bas de page collé au texte. */
  .gb-page-indicator { font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.28em; font-size: clamp(0.6rem, 0.62vw, 1.4rem); color: #B88A32; opacity: 0.55; margin: 1.8vh 0 0; }

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
    .gb-glow, .gb-particle, .gb-photo-bg, .gb-mist { animation: none !important; }
    .gb-fade-rise { animation: gbFadeOnly 500ms ease both; }
    .gb-countdown-pop { animation: gbFadeOnly 400ms ease both; }
    .gb-card { transition: opacity 500ms ease; }
    .gb-card-hidden, .gb-card-visible { transform: none; }
    .gb-card-visible .gb-photo-frame,
    .gb-card-visible .gb-text > .gb-quote,
    .gb-card-visible .gb-text > .gb-message,
    .gb-card-visible .gb-text > .gb-name,
    .gb-card-visible .gb-page-indicator { animation: none !important; opacity: 1 !important; transform: none !important; }
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
function presentationForMessage(message, hasPhoto = false) {
  const len = message.length;
  // Avec une photo de l'invité, la photo du couple (cercle) est remplacée par la sienne, et le
  // guillemet décoratif disparaît plus tôt pour laisser la hauteur au texte.
  return {
    showPhoto: !hasPhoto && len <= 120,
    showQuote: len <= (hasPhoto ? 240 : 400),
    // Plus le message est long, plus la photo se fait discrète (le texte est le cœur du souvenir).
    photoScale: len <= 160 ? 1 : len <= 400 ? 0.8 : 0.6,
  };
}

// Au-delà de ce seuil, réduire encore la police finit par nuire à la lisibilité plus qu'elle ne
// rend service : mieux vaut deux écrans élégants, pleinement lisibles, qu'un seul écran écrasé
// (voir splitMessageForDisplay). En dessous, un message tient toujours sur un seul écran, quitte
// à s'approcher du plancher de fitMessageFont.
const LONG_MESSAGE_SPLIT_THRESHOLD = 460;

// Coupe un message très long en EXACTEMENT deux temps (jamais plus) : recherche la frontière de
// phrase (point/exclamation/interrogation suivi d'une espace) la plus proche du milieu dans une
// fenêtre de recherche, sinon la première espace la plus proche du milieu, jamais en plein mot.
function splitMessageForDisplay(message) {
  if (!message || message.length <= LONG_MESSAGE_SPLIT_THRESHOLD) return [message || ''];

  const mid = Math.floor(message.length / 2);
  const window = 140;
  const searchStart = Math.max(0, mid - window);
  const searchEnd = Math.min(message.length, mid + window);

  let cut = -1;
  let bestDistance = Infinity;
  const sentenceEnd = /[.!?]\s/g;
  sentenceEnd.lastIndex = searchStart;
  let match = sentenceEnd.exec(message);
  while (match && match.index < searchEnd) {
    const pos = match.index + 2;
    const distance = Math.abs(pos - mid);
    if (distance < bestDistance) {
      bestDistance = distance;
      cut = pos;
    }
    match = sentenceEnd.exec(message);
  }

  if (cut === -1) {
    for (let offset = 0; offset <= window; offset += 1) {
      if (message[mid + offset] === ' ') {
        cut = mid + offset + 1;
        break;
      }
      if (mid - offset >= 0 && message[mid - offset] === ' ') {
        cut = mid - offset + 1;
        break;
      }
    }
  }

  if (cut === -1) cut = mid;

  const first = message.slice(0, cut).trim();
  const second = message.slice(cut).trim();
  return first && second ? [first, second] : [message];
}

// Points de code "Extended_Pictographic" (emoji) éventuellement suivis d'un sélecteur de
// variation ou enchaînés par un joli caractère de liaison (ZWJ) — couvre la grande majorité des
// emojis simples et composés (❤️ 🥂 🎉 👩‍❤️‍👨...) sans bibliothèque de segmentation dédiée.
const EMOJI_SPLIT = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)/gu;
const EMOJI_TEST = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*$/u;

// Neutralise visuellement les emojis dans le mode écran (voir .gb-emoji : légère désaturation,
// jamais retirés) — le message d'origine, lui, n'est JAMAIS modifié, ni ici ni en base ; c'est
// une lecture d'affichage. Rendu en éléments React (jamais dangerouslySetInnerHTML) : le texte
// de l'invité, aussi inattendu soit-il, ne peut jamais devenir du HTML interprété.
function renderMessageWithSoberEmoji(text) {
  return text
    .split(EMOJI_SPLIT)
    .filter(Boolean)
    .map((part, i) => (EMOJI_TEST.test(part) ? <span key={i} className="gb-emoji">{part}</span> : part));
}

function photoOrientation(photo) {
  if (!photo?.width || !photo?.height) return 'landscape';
  const ratio = photo.width / photo.height;
  if (ratio >= 1.2) return 'landscape';
  if (ratio <= 0.85) return 'portrait';
  return 'square';
}

// Charge une image AVANT de l'afficher : le message n'apparaît pas avec un cadre vide, et sa
// mesure de mise en page (voir fitMessageFont) se fait sur la photo réellement dimensionnée.
// Résout dans tous les cas (erreur, délai dépassé) — une photo cassée ne doit jamais bloquer le
// diaporama, il continue simplement avec le message seul.
function preloadImage(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    setTimeout(done, timeoutMs);
    img.src = url;
  });
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

// Plafond réduit d'environ 17 % par rapport à la version précédente (4.2vw) : un message court
// respire davantage sans dominer l'écran. Ce plafond ne joue que pour les messages qui tiennent
// large — un message moyen ou long est déjà réduit en dessous par fitMessageFont, une simple
// baisse uniforme de TOUTES les tailles n'aurait rien changé pour eux. Plancher légèrement
// remonté : au-delà de LONG_MESSAGE_SPLIT_THRESHOLD un message est désormais scindé en deux
// écrans (voir splitMessageForDisplay) plutôt que réduit jusqu'à l'illisible, donc chaque écran
// a moins de texte à faire tenir qu'avant.
const MESSAGE_FONT_MAX_VW = 3.5;
const MESSAGE_FONT_MIN_VW = 1;

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
  // Page courante d'un message présenté en deux temps (voir splitMessageForDisplay) — toujours 0
  // pour un message qui tient sur un seul écran.
  const [pageIndex, setPageIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  // Photo qui n'a pas pu s'afficher (fichier supprimé entre-temps...) : on retombe sur le
  // message seul plutôt que d'afficher un cadre cassé.
  const [failedPhotoId, setFailedPhotoId] = useState(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef(null);
  const shownRef = useRef(null);
  if (shownRef.current === null) shownRef.current = loadShown(slug);
  const entriesRef = useRef([]);
  const presentingRef = useRef(false);
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
      a.every(
        (x, i) =>
          x.id === b[i].id &&
          x.message === b[i].message &&
          x.guestName === b[i].guestName &&
          (x.photo?.url || null) === (b[i].photo?.url || null)
      );

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
  // Le message est marqué "présenté" tout de suite, AVANT d'attendre sa photo : ainsi ni un
  // nouveau cycle de l'effet ci-dessous ni une actualisation de la liste ne peut le présenter
  // deux fois pendant le chargement (presentingRef bloque aussi toute présentation concurrente).
  // La carte est montée cachée (visible=false) : un changement de `key` remonte le nœud DOM, et
  // une transition CSS ne peut jamais s'interpoler dès le tout premier rendu d'un nœud — sans ce
  // détour, la nouvelle entrée apparaissait instantanément (fondu de sortie seulement, jamais
  // d'entrée). Le useEffect ci-dessous bascule ensuite sur "visible" au frame suivant.
  const present = async (entry) => {
    presentingRef.current = true;
    shownRef.current.add(entryKey(entry));
    saveShown(slug, shownRef.current);
    if (entry.photo?.url) await preloadImage(entry.photo.url);
    setFailedPhotoId(null);
    setPageIndex(0);
    setCurrentEntry(entry);
    setVisible(false);
    presentingRef.current = false;
  };

  // Révèle la carte tout juste montée (voir le commentaire de present() ci-dessus) — double
  // rAF pour garantir qu'un premier rendu "caché" a bien été peint avant de basculer, sinon le
  // navigateur peut fusionner les deux changements et sauter la transition.
  useEffect(() => {
    if (phase !== 'loop' || !currentEntry) return undefined;
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [phase, currentEntry?.id]);

  // Écran d'attente -> premier message non présenté dès qu'il y en a un (fin de l'intro, ou
  // nouvelle approbation arrivée pendant l'attente).
  useEffect(() => {
    if (phase !== 'loop' || currentEntry || presentingRef.current) return;
    const next = nextUnseen();
    if (next) present(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, entries, currentEntry]);

  // Rythme d'affichage : chaque page (un message tient dans une seule, sauf s'il est scindé en
  // deux, voir splitMessageForDisplay) reste LOOP_STEP_MS à l'écran, puis fondu sortant, puis la
  // page suivante du même message OU le message suivant non présenté, OU l'écran d'attente s'il
  // n'y en a plus. `entries` volontairement hors dépendances : une nouvelle approbation ne doit
  // pas relancer le minuteur de la page en cours d'affichage.
  useEffect(() => {
    if (phase !== 'loop' || !currentEntry) return undefined;
    const pages = splitMessageForDisplay(currentEntry.message);
    const isLastPage = pageIndex >= pages.length - 1;

    // Précharge la photo du PROCHAIN message seulement (jamais toute la liste), et seulement
    // quand on s'apprête réellement à en changer (pas entre deux pages du même message).
    if (isLastPage) {
      const upcoming = nextUnseen();
      if (upcoming?.photo?.url) preloadImage(upcoming.photo.url);
    }

    let fadeTimer;
    const t = setTimeout(() => {
      setVisible(false);
      fadeTimer = setTimeout(() => {
        if (!isLastPage) {
          // Page suivante du MÊME message : le nœud DOM ne change pas (clé inchangée), le
          // passage hidden -> visible s'anime donc normalement, sans détour par present().
          setPageIndex((p) => p + 1);
          setVisible(true);
          return;
        }
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
  }, [phase, currentEntry, pageIndex]);

  const pages = currentEntry ? splitMessageForDisplay(currentEntry.message) : [''];
  const pageText = pages[pageIndex] ?? currentEntry?.message ?? '';
  const isMultiPage = pages.length > 1;
  // La photo n'illustre que la première page d'un message scindé : la seconde page profite de
  // toute la largeur pour la suite du texte, plutôt que de répéter la photo à côté d'un
  // deuxième bloc de texte déjà dense.
  const entryPhoto = currentEntry?.photo && failedPhotoId !== currentEntry.id && pageIndex === 0 ? currentEntry.photo : null;
  const presentation = currentEntry ? presentationForMessage(pageText, Boolean(entryPhoto)) : DEFAULT_PRESENTATION;

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
  }, [phase, currentEntry?.id, pageText, entryPhoto?.url, presentation.showPhoto, presentation.showQuote, presentation.photoScale]);

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
      <div className="gb-mist" />
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
          <div className={`gb-group${entryPhoto ? ' gb-group-photo' : ''}`} ref={groupRef}>
            {data.coverUrl && presentation.showPhoto && <img src={data.coverUrl} className="gb-couple-photo" alt="" />}
            <p className="gb-eyebrow">Livre d'or — {data.namesLine || data.title}</p>

            {!currentEntry ? (
              <p className="gb-waiting gb-fade-rise">{shownRef.current.size > 0 ? "D'autres mots arrivent bientôt..." : 'Les premiers mots arrivent bientôt...'}</p>
            ) : (
              <div
                key={currentEntry.id}
                className={`gb-card${entryPhoto ? ' gb-card-photo' : ''} ${visible ? 'gb-card-visible' : 'gb-card-hidden'}`}
              >
                {entryPhoto && (
                  <figure
                    className={`gb-photo-frame gb-photo-${photoOrientation(entryPhoto)}`}
                    style={{ '--gb-photo-scale': presentation.photoScale }}
                  >
                    <img
                      src={entryPhoto.url}
                      width={entryPhoto.width || undefined}
                      height={entryPhoto.height || undefined}
                      alt={`Photo de ${currentEntry.guestName}`}
                      decoding="async"
                      onError={() => setFailedPhotoId(currentEntry.id)}
                    />
                  </figure>
                )}
                <div className="gb-text">
                  {presentation.showQuote && <p className="gb-quote" aria-hidden="true">"</p>}
                  <p className="gb-message" ref={messageRef}>{renderMessageWithSoberEmoji(pageText)}</p>
                  <p className="gb-name">— {currentEntry.guestName}</p>
                  {isMultiPage && <p className="gb-page-indicator">{pageIndex + 1} / {pages.length}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
