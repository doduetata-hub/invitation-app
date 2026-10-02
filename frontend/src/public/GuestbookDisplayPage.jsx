import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectStylesOnce } from './utils/injectStyles';
import { durationForText } from '../shared/utils/guestbookTiming';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const COUNTDOWN_START = 5;
const COUNTDOWN_STEP_MS = 1000;
const INTRO_STEP_MS = 2600;
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

  /* ===== Mode conversation ==========================================================
     Les témoignages forment un fil vivant : des bulles sobres, alternées à gauche et à droite,
     empilées par le bas ; les plus anciennes quittent l'écran quand la place manque.
     --u est l'unité de composition : 1vw sur un écran 16:9, ramenée à la hauteur sur un écran
     moins large (1.7778vh = 1vw en 16:9). Tout est dimensionné en multiples de --u et SANS
     plafond en pixels : la composition est la même en 1366x768, 1080p et 4K, qui profite de sa
     résolution au lieu de rester minuscule. */
  .gb-display { --u: min(1vw, 1.7778vh); }

  .gb-thread-head { position: absolute; z-index: 1; top: calc(var(--u) * 2.6); left: 0; right: 0; margin: 0; text-align: center; font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.3em; font-size: calc(var(--u) * 0.95); color: #B88A32; }

  .gb-thread { position: absolute; z-index: 1; left: calc(var(--u) * 6); right: calc(var(--u) * 6); top: calc(var(--u) * 7); bottom: calc(var(--u) * 1.6); padding-bottom: calc(var(--u) * 2.4); box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-end; gap: calc(var(--u) * 1.7); overflow: hidden; }
  .gb-thread-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .gb-thread-empty .gb-waiting { font-size: calc(var(--u) * 2); animation: gbWaitingPulse 4200ms ease-in-out infinite; }
  @keyframes gbWaitingPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }
  .gb-waiting { font-size: clamp(1.4rem, 2.4vw, 2rem); color: #F7F1E5; opacity: 0.75; }

  .gb-row { display: flex; flex: none; width: 100%; }
  .gb-row-left { justify-content: flex-start; }
  .gb-row-right { justify-content: flex-end; }

  /* Bulle : contour fin, verre sombre légèrement teinté (ivoire à gauche, champagne à droite),
     jamais de vert/vif, pas d'ombre appuyée. Un seul coin resserré côté parole, discrète allusion
     à la bulle sans copier une messagerie. */
  .gb-bubble {
    position: relative; display: flex; align-items: center; gap: calc(var(--u) * 2);
    box-sizing: border-box; max-width: calc(var(--u) * 58);
    padding: calc(var(--u) * 1.5) calc(var(--u) * 2.1);
    border-radius: calc(var(--u) * 1.7);
    border: max(1px, calc(var(--u) * 0.07)) solid rgba(214,181,109,0.34);
    background: linear-gradient(150deg, rgba(247,241,229,0.085) 0%, rgba(14,12,9,0.62) 62%);
    animation: gbBubbleIn 1000ms cubic-bezier(0.2, 0.7, 0.2, 1) both, gbBubbleGlow 3200ms ease-out both;
    animation-delay: var(--gb-delay, 0ms), var(--gb-delay, 0ms);
  }
  .gb-bubble-left { border-bottom-left-radius: calc(var(--u) * 0.45); }
  .gb-bubble-right { flex-direction: row-reverse; border-bottom-right-radius: calc(var(--u) * 0.45); background: linear-gradient(210deg, rgba(227,197,127,0.11) 0%, rgba(14,12,9,0.62) 62%); }
  /* Témoignage particulièrement long : plus large, plus d'air, sans halo — présentation posée. */
  .gb-bubble.gb-featured { max-width: calc(var(--u) * 76); padding: calc(var(--u) * 2) calc(var(--u) * 2.8); animation: gbBubbleIn 1000ms cubic-bezier(0.2, 0.7, 0.2, 1) both var(--gb-delay, 0ms); }
  .gb-bubble.gb-leaving { animation: gbBubbleOut 800ms ease both; }
  .gb-probe { position: absolute; left: 0; top: 0; width: 100%; visibility: hidden; pointer-events: none; }
  .gb-probe-bubble { animation: none !important; width: calc(var(--u) * 58); }
  .gb-probe-bubble.gb-featured { width: calc(var(--u) * 76); }

  @keyframes gbBubbleIn { from { opacity: 0; transform: translateY(calc(var(--u) * 2.2)); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gbBubbleOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(calc(var(--u) * -1.2)); } }
  @keyframes gbBubbleGlow { from { box-shadow: 0 0 calc(var(--u) * 2.6) rgba(216,181,109,0.26); } to { box-shadow: 0 0 0 rgba(216,181,109,0); } }
  @keyframes gbPartIn { from { opacity: 0; transform: translateY(calc(var(--u) * 0.6)); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gbFadeOut { from { opacity: 1; } to { opacity: 0; } }

  /* Photo de l'invité : ratio d'origine conservé (jamais recadré ni déformé), cadre fin doré. */
  /* Photo d'invité : cercle parfait (largeur = hauteur, border-radius 50 %, overflow hidden), contour
     doré fin, halo à peine perceptible. L'image remplit le cercle (object-fit: cover, jamais déformée) ;
     son point de cadrage (object-position) est posé en ligne par photo. Épaisseurs et rayon du halo en
     unités --u : le cercle reste rond et proportionné en 1080p comme en 4K. */
  .gb-bphoto { margin: 0; flex: none; align-self: flex-start; box-sizing: border-box; width: calc(var(--u) * 8); height: calc(var(--u) * 8); aspect-ratio: 1 / 1; border-radius: 50%; overflow: hidden; line-height: 0; background: #14110c; border: max(1px, calc(var(--u) * 0.09)) solid rgba(214,181,109,0.78); box-shadow: 0 0 calc(var(--u) * 1.5) rgba(216,181,109,0.18); animation: gbPartIn 900ms ease both calc(var(--gb-delay, 0ms) + 250ms); }
  .gb-bphoto img { display: block; width: 100%; height: 100%; object-fit: cover; }

  .gb-bbody { flex: 1 1 auto; min-width: 0; align-self: center; }
  .gb-bname { margin: 0 0 calc(var(--u) * 0.5); font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.15em; font-size: calc(var(--u) * 1.1); font-weight: 500; color: #E3C57F; animation: gbPartIn 800ms ease both calc(var(--gb-delay, 0ms) + 450ms); }
  /* white-space: pre-line : les paragraphes tapés par l'invité sont conservés. dir="auto" (posé
     dans le JSX) : un message en arabe ou autre écriture RTL se lit dans le bon sens. */
  .gb-btext { margin: 0; font-size: calc(var(--u) * 2.3); line-height: 1.35; color: #FFFDF8; font-weight: 600; text-shadow: 0 2px 18px rgba(0,0,0,0.55); white-space: pre-line; overflow-wrap: break-word; text-wrap: pretty; animation: gbPartIn 900ms ease both calc(var(--gb-delay, 0ms) + 150ms); }
  /* Écritures arabes/RTL : pas d'espacement de lettres (il casserait leur liaison) ni de capitales, et
     une taille un peu plus grande (la police latine n'a pas ces glyphes, le repli est plus petit). */
  .gb-bname:dir(rtl) { letter-spacing: 0; text-transform: none; font-size: calc(var(--u) * 1.4); }
  .gb-featured .gb-btext { line-height: 1.42; }
  /* Écriture progressive : chaque mot est présent dans la mise en page mais invisible, puis se révèle
     (classe .gb-on posée par TypedText) avec un fondu court et une légère teinte champagne qui
     s'éteint vers l'ivoire. Le curseur doré est positionné en absolu après le dernier mot révélé :
     il ne change jamais la largeur de la ligne, donc jamais les retours à la ligne. */
  .gb-w { opacity: 0; color: #E3C57F; transition: opacity 260ms ease, color 900ms ease; }
  .gb-w.gb-on { opacity: 1; color: #FFFDF8; }
  .gb-w-last { position: relative; }
  .gb-w-last::after { content: ''; position: absolute; inset-inline-end: calc(var(--u) * -0.25); top: 14%; bottom: 8%; width: max(2px, calc(var(--u) * 0.11)); background: #D6B56D; box-shadow: 0 0 calc(var(--u) * 0.6) rgba(216,181,109,0.65); animation: gbCaretBlink 1050ms steps(1) infinite; }
  @keyframes gbCaretBlink { 0%, 58% { opacity: 1; } 59%, 100% { opacity: 0; } }
  .gb-bpage { margin: calc(var(--u) * 0.9) 0 0; font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.28em; font-size: calc(var(--u) * 0.7); color: #B88A32; opacity: 0.6; }
  /* Emojis conservés dans la donnée (jamais modifiés), juste neutralisés visuellement. */
  .gb-emoji { filter: grayscale(0.85) opacity(0.6) brightness(0.9); font-size: 0.9em; }

  /* Écran en hauteur (portrait) : unité plus généreuse et bulles pleine largeur. */
  @media (max-aspect-ratio: 1/1) {
    .gb-display { --u: 2.6vw; }
    .gb-thread { left: 4vw; right: 4vw; }
    .gb-bubble, .gb-bubble.gb-featured { max-width: 100%; }
    .gb-probe-bubble, .gb-probe-bubble.gb-featured { width: 100%; }
  }

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

  /* Écran "Prêt" du mode régie (voir ?regie=1) : un seul gros bouton, impossible à manquer. */
  .gb-start-btn {
    font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.2em;
    font-size: clamp(1rem, 1.3vw, 2.4rem); padding: 1.1em 2.6em; margin-top: 4vh;
    border-radius: 999px; border: 1px solid #D6B56D; background: rgba(216,181,109,0.14);
    color: #F7F1E5; cursor: pointer; backdrop-filter: blur(4px);
  }
  .gb-start-btn:hover, .gb-start-btn:focus-visible { background: rgba(216,181,109,0.3); outline: none; }
  .gb-ready-hint { font-family: 'Inter', sans-serif; font-size: clamp(0.8rem, 0.9vw, 1.6rem); color: #F7F1E5; opacity: 0.55; margin: 2.5vh 0 0; }

  @media (prefers-reduced-motion: reduce) {
    .gb-glow, .gb-particle, .gb-photo-bg, .gb-mist { animation: none !important; }
    .gb-fade-rise { animation: gbFadeOnly 500ms ease both; }
    .gb-countdown-pop { animation: gbFadeOnly 400ms ease both; }
    .gb-thread-empty .gb-waiting { animation: none; }
    .gb-bubble:not(.gb-leaving), .gb-bphoto, .gb-bname, .gb-btext { animation: gbFadeOnly 500ms ease both !important; }
    .gb-bubble.gb-leaving { animation: gbFadeOut 500ms ease both !important; }
  }
  @keyframes gbFadeOnly { from { opacity: 0; } to { opacity: 1; } }
  `
);

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

// Charge une image AVANT de l'afficher : le message n'apparaît pas avec un cadre vide, et sa
// mesure de mise en page (voir planBubble) se fait sur la photo réellement dimensionnée.
// Résout dans tous les cas (erreur, délai dépassé) — une photo cassée ne doit jamais bloquer
// l'affichage, il continue simplement avec le message seul.
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

// ===== Mode conversation : paramètres de rythme et de composition ===============================
// Temps (ms) de la sortie d'une bulle qui quitte le fil, et du glissement vers le haut des bulles
// restantes quand une nouvelle arrive. La nouvelle bulle n'apparaît qu'une fois ce glissement
// terminé (voir --gb-delay) : deux bulles ne se chevauchent jamais, même pendant une transition.
const LEAVE_MS = 900;
const MOVE_MS = 700;
// durationForText plafonne à 14 s dès 280 caractères : un témoignage de 600 ou 900 caractères doit
// pourtant rester proportionnellement plus longtemps (on ne le coupe plus en deux écrans de 14 s
// comme avant, il est présenté d'un seul tenant quand il tient, voir planBubble). Au-delà de 280
// caractères, chaque caractère ajoute ce temps de lecture (≈ 25 caractères par seconde).
const LONG_TEXT_CHARS = 280;
const EXTRA_MS_PER_CHAR = 40;
function readingTime(text) {
  return durationForText(text) + Math.max(0, (text || '').length - LONG_TEXT_CHARS) * EXTRA_MS_PER_CHAR;
}
// Une photo se regarde en plus de se lire : temps ajouté à la première page d'un témoignage illustré.
const PHOTO_DWELL_BONUS_MS = 3000;
// Au-delà de ce temps (messages moyens et longs, voir durationForText), deux témoignages
// consécutifs ralentissent la cadence : le suivant garde LONG_SLOWDOWN fois son temps habituel.
const LONG_DWELL_MS = 11000;
const LONG_SLOWDOWN = 1.2;
// Un témoignage dont la bulle normale occuperait plus de cette part de la hauteur du fil passe en
// présentation "large" (voir .gb-featured).
const FEATURED_FRACTION = 0.42;
// Garde-fou : un message ne dépasse jamais 1000 caractères (limite du formulaire), donc quelques
// pages au plus ; au-delà de ce nombre la mise en page n'est de toute façon plus pertinente.
const MAX_PAGES = 6;

// ===== Écriture progressive (révélation mot après mot) =========================================
// Pure mise en scène visuelle d'un témoignage DÉJÀ soumis et approuvé : le texte affiché à la fin
// est strictement celui de la base, jamais modifié ; rien n'indique qu'un invité écrit en direct.
// Vitesse initiale en mots par seconde ; `?wps=5` dans l'adresse de l'écran la remplace (1 à 12), pour
// l'ajuster sur place sans redéployer.
const TYPING_WORDS_PER_SECOND = 4;
// Avant le premier mot : la bulle, le nom et la photo se révèlent d'abord (voir --gb-delay et les
// animations .gb-bphoto / .gb-bname). Deuxième page d'un long message : reprise plus courte.
const TYPING_LEAD_MS = 1300;
const TYPING_LEAD_NEXT_PAGE_MS = 350;
// Pauses naturelles, ajoutées APRÈS le mot concerné : fin de phrase, virgule, saut de ligne. Jamais
// après chaque mot, jamais aléatoires : le rythme reste prévisible et ne ressemble pas à un blocage.
const TYPING_PAUSE_STRONG_MS = 380;
const TYPING_PAUSE_SOFT_MS = 140;
const TYPING_PAUSE_PARAGRAPH_MS = 520;
// Temps laissé au dernier mot pour finir de se révéler avant que le texte soit considéré comme terminé.
const TYPING_SETTLE_MS = 300;
// Une fois le texte entièrement écrit, il reste lisible au moins HOLD_MIN_MS, ou cette part de son
// temps de lecture (voir readingTime) s'il est long, avant que la conversation évolue.
const HOLD_MIN_MS = 3000;
const HOLD_READING_SHARE = 0.4;

function readTypingSpeed() {
  const raw = Number(new URLSearchParams(window.location.search).get('wps'));
  return Number.isFinite(raw) && raw >= 1 && raw <= 12 ? raw : TYPING_WORDS_PER_SECOND;
}

let wordSegmenter;
function getWordSegmenter() {
  if (wordSegmenter === undefined) {
    wordSegmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;
  }
  return wordSegmenter;
}

// Découpe un texte en "mots" à révéler : chaque unité = un mot suivi de ce qui le sépare du suivant
// (espaces, ponctuation, emojis, sauts de ligne). Segmentation Unicode (Intl.Segmenter) : les emojis
// composés, les caractères combinés, l'arabe et les autres écritures ne sont jamais coupés en plein
// symbole. Navigateur sans Intl.Segmenter : repli sur les espaces. Garantie : la concaténation des
// unités redonne EXACTEMENT le texte d'origine (sinon, une seule unité).
function splitIntoUnits(text) {
  if (!text) return [''];
  let units = null;
  const segmenter = getWordSegmenter();
  if (segmenter) {
    units = [];
    let hasWord = false;
    for (const part of segmenter.segment(text)) {
      if (part.isWordLike && hasWord) {
        units.push(part.segment);
      } else {
        if (!units.length) units.push('');
        units[units.length - 1] += part.segment;
        if (part.isWordLike) hasWord = true;
      }
    }
  } else {
    units = text.match(/\S+\s*|\s+/g);
  }
  return units && units.join('') === text ? units : [text];
}

const STRONG_END = /[.!?…؟。！？]["'»”’)\]]*(?:\s|\p{Extended_Pictographic}|️|‍)*$/u;
const SOFT_END = /[,;:،؛，]["'»”’)\]]*\s*$/u;

// Instant (ms depuis le début de l'écriture) où chaque unité apparaît. Durée de base = 1 / vitesse,
// légèrement modulée par la longueur du mot et par une variation fixe (±10 %, périodique : le rythme
// "respire" mais reste identique d'un passage à l'autre), plus les pauses de ponctuation.
function buildTypingSchedule(text, wordsPerSecond) {
  const units = splitIntoUnits(text);
  const base = 1000 / wordsPerSecond;
  const times = [];
  let at = 0;
  units.forEach((unit, i) => {
    times.push(Math.round(at));
    const trimmed = unit.trim();
    const length = Math.min(trimmed.length, 12);
    let delay = base * (0.8 + 0.03 * length) * (1 + (((i * 37) % 21) - 10) / 100);
    if (STRONG_END.test(unit)) delay += TYPING_PAUSE_STRONG_MS;
    else if (SOFT_END.test(unit)) delay += TYPING_PAUSE_SOFT_MS;
    if (unit.includes('\n')) delay += TYPING_PAUSE_PARAGRAPH_MS;
    at += delay;
  });
  return { units, times, total: times[times.length - 1] + TYPING_SETTLE_MS };
}

const typingCache = new Map();
function getTyping(text, wordsPerSecond) {
  const key = `${wordsPerSecond}|${text}`;
  let typing = typingCache.get(key);
  if (!typing) {
    if (typingCache.size > 300) typingCache.clear();
    typing = buildTypingSchedule(text, wordsPerSecond);
    typingCache.set(key, typing);
  }
  return typing;
}

// Cherche, près de la position idéale, la frontière de phrase (ou de paragraphe) la plus proche,
// sinon la plus proche espace — jamais en plein mot. Retourne la position où commence la page
// suivante.
// Cadrage de la photo d'un invité dans son cercle (object-fit: cover remplit le cercle sans jamais
// déformer l'image). Les visages sont statistiquement dans la moitié haute d'un portrait : le point
// de cadrage par défaut remonte donc un peu (22 % en portrait, 32 % sinon) pour ne pas couper le
// haut de la tête. Si les données fournissent un point de cadrage (photo.focusX / photo.focusY, en
// %), il est utilisé tel quel — le serveur n'en envoie pas aujourd'hui.
function photoObjectPosition(photo) {
  const portrait = photo?.width && photo?.height && photo.width / photo.height < 0.85;
  const x = Number.isFinite(photo?.focusX) ? photo.focusX : 50;
  const y = Number.isFinite(photo?.focusY) ? photo.focusY : portrait ? 22 : 32;
  return `${x}% ${y}%`;
}

// Hauteur utile du fil : sans la marge interne basse (réservée au glissement d'entrée des bulles).
function threadInnerHeight(el) {
  const style = window.getComputedStyle(el);
  return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
}

function findCut(message, ideal, from) {
  const radius = Math.max(60, Math.floor(message.length * 0.12));
  const lo = Math.max(from + 1, ideal - radius);
  const hi = Math.min(message.length - 1, ideal + radius);

  let cut = -1;
  let bestDistance = Infinity;
  const boundary = /[.!?…]\s|\n/g;
  boundary.lastIndex = lo;
  let match = boundary.exec(message);
  while (match && match.index < hi) {
    const pos = match.index + match[0].length;
    const distance = Math.abs(pos - ideal);
    if (distance < bestDistance) {
      bestDistance = distance;
      cut = pos;
    }
    match = boundary.exec(message);
  }
  if (cut !== -1) return cut;

  for (let offset = 0; offset <= radius; offset += 1) {
    if (ideal + offset < message.length && message[ideal + offset] === ' ') return ideal + offset + 1;
    if (ideal - offset > from && message[ideal - offset] === ' ') return ideal - offset + 1;
  }
  return Math.max(from + 1, ideal);
}

// Coupe un message en `count` pages d'à peu près la même longueur. Rien n'est jamais supprimé :
// la concaténation des pages redonne tout le texte (aux espaces de coupe près).
function splitMessageIntoPages(message, count) {
  if (!message || count < 2) return [message || ''];
  const pages = [];
  let start = 0;
  for (let k = 1; k < count; k += 1) {
    const cut = findCut(message, Math.round((message.length * k) / count), start);
    pages.push(message.slice(start, cut).trim());
    start = cut;
  }
  pages.push(message.slice(start).trim());
  const nonEmpty = pages.filter(Boolean);
  return nonEmpty.length ? nonEmpty : [message];
}

// Mesure la hauteur réelle qu'aurait une bulle (mêmes classes, donc mêmes polices et mêmes
// largeurs que l'affichage) en la construisant hors-champ dans le fil. Éléments créés un à un avec
// textContent (jamais innerHTML) : le texte de l'invité ne peut jamais être interprété comme du HTML.
function measureBubble(threadEl, { guestName, text, photo, featured }) {
  const probe = document.createElement('div');
  probe.className = 'gb-probe';
  const bubble = document.createElement('div');
  bubble.className = `gb-bubble gb-bubble-left gb-probe-bubble${featured ? ' gb-featured' : ''}`;
  if (photo?.url) {
    // Cercle de taille fixe (en unités --u) : inutile d'y charger l'image pour mesurer la bulle.
    const figure = document.createElement('figure');
    figure.className = 'gb-bphoto';
    bubble.appendChild(figure);
  }
  const body = document.createElement('div');
  body.className = 'gb-bbody';
  const name = document.createElement('p');
  name.className = 'gb-bname';
  name.textContent = guestName;
  const message = document.createElement('p');
  message.className = 'gb-btext';
  message.dir = 'auto';
  message.textContent = text;
  body.append(name, message);
  bubble.appendChild(body);
  probe.appendChild(bubble);
  threadEl.appendChild(probe);
  const height = probe.offsetHeight;
  threadEl.removeChild(probe);
  return height;
}

// Décide de la présentation d'un témoignage d'après la place RÉELLEMENT disponible : bulle normale,
// bulle large s'il est long, et seulement si même la bulle large ne tient pas dans la hauteur du
// fil, découpage en pages (jamais de police réduite, jamais de texte tronqué).
function planBubble(threadEl, entry) {
  const photo = entry.photo?.url ? entry.photo : null;
  const available = threadInnerHeight(threadEl);
  const base = { guestName: entry.guestName, photo };

  const normalHeight = measureBubble(threadEl, { ...base, text: entry.message, featured: false });
  if (normalHeight <= available * FEATURED_FRACTION) return { featured: false, pages: [entry.message] };

  const wideHeight = measureBubble(threadEl, { ...base, text: entry.message, featured: true });
  if (wideHeight <= available) return { featured: true, pages: [entry.message] };

  let pages = [entry.message];
  for (let count = 2; count <= MAX_PAGES; count += 1) {
    pages = splitMessageIntoPages(entry.message, count);
    // La photo n'illustre que la première page (comme dans l'ancien affichage) : les suivantes
    // gagnent sa place pour le texte.
    const fits = pages.every(
      (text, i) => measureBubble(threadEl, { ...base, photo: i === 0 ? photo : null, text, featured: true }) <= available
    );
    if (fits) break;
  }
  return { featured: true, pages };
}

// Texte d'un témoignage révélé mot après mot. TOUT le texte est rendu dès le départ, invisible
// (opacity 0, voir .gb-w) : la bulle a donc sa taille définitive dès son apparition et la mise en
// page ne bouge jamais pendant l'écriture (pas de recalcul, les bulles plus anciennes ne sont pas
// repoussées à chaque mot). Les mots sont ensuite révélés dans l'ordre d'origine en ajoutant une
// classe directement sur les éléments : React ne refait aucun rendu à chaque mot.
// startsRef (clé = bulle + page) mémorise l'instant de départ : si le composant est remonté en cours
// d'écriture (remontage React, événement dupliqué), l'écriture reprend là où elle en était au lieu
// de se relancer depuis le début. Le calendrier se lit sur l'horloge (performance.now) : chaque réveil
// est calculé pour tomber à l'instant du mot suivant (aucune dérive qui s'accumule), un onglet
// ralenti rattrape le temps écoulé en révélant les mots dus, et — contrairement à
// requestAnimationFrame — rien ne se fige si la fenêtre est masquée ou recouverte, tout en réveillant
// la page seulement 4 fois par seconde environ au lieu de 60.
const TypedText = memo(function TypedText({ text, stampKey, startsRef, leadMs, wordsPerSecond }) {
  const rootRef = useRef(null);
  const typing = getTyping(text, wordsPerSecond);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const words = root.querySelectorAll('.gb-w');
    let start = startsRef.current.get(stampKey);
    if (start === undefined) {
      start = performance.now() + leadMs;
      startsRef.current.set(stampKey, start);
    }

    let timer = 0;
    let revealed = -1;
    const step = () => {
      const elapsed = performance.now() - start;
      let latest = revealed;
      while (latest + 1 < words.length && typing.times[latest + 1] <= elapsed) latest += 1;
      if (latest !== revealed) {
        if (revealed >= 0) words[revealed].classList.remove('gb-w-last');
        for (let i = revealed + 1; i <= latest; i += 1) words[i].classList.add('gb-on');
        words[latest].classList.add('gb-w-last');
        revealed = latest;
      }
      if (revealed < words.length - 1) {
        // Prochain réveil exactement à l'instant du mot suivant (calculé sur l'horloge, pas additionné).
        timer = setTimeout(step, Math.max(0, typing.times[revealed + 1] - (performance.now() - start)));
      } else {
        // Dernier mot révélé : le curseur doré disparaît une fois le mot posé.
        timer = setTimeout(() => words[revealed]?.classList.remove('gb-w-last'), TYPING_SETTLE_MS);
      }
    };
    timer = setTimeout(step, Math.max(0, start - performance.now()));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, stampKey, wordsPerSecond]);

  return (
    <p ref={rootRef} className="gb-btext" dir="auto">
      {typing.units.map((unit, i) => (
        <span key={i} className="gb-w">{renderMessageWithSoberEmoji(unit)}</span>
      ))}
    </p>
  );
});

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
  // Le fil de conversation : les bulles actuellement à l'écran, de la plus ancienne (en haut) à la
  // plus récente (en bas). Chaque élément : { key, entry, side, featured, pages, pageIndex, photo,
  // photoFailed, leaving }.
  const [thread, setThread] = useState([]);
  const [layoutTick, setLayoutTick] = useState(0);
  const [tick, setTick] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const audioRef = useRef(null);
  // Mode régie (?regie=1) : la page s'ouvre sur un écran "Prêt" et ne démarre qu'au clic sur
  // "Lancer" (la régie de la salle choisit le bon moment). Le clic efface aussi la mémoire des
  // messages déjà présentés : chaque lancement rejoue donc tout depuis le début, et un essai fait
  // plus tôt dans la soirée ne "consomme" rien. Lu une seule fois : l'adresse ne change pas ensuite.
  const [regieMode] = useState(() => new URLSearchParams(window.location.search).has('regie'));
  const shownRef = useRef(null);
  if (shownRef.current === null) shownRef.current = loadShown(slug);
  const entriesRef = useRef([]);
  const presentingRef = useRef(false);
  const dwellingRef = useRef(false);
  const dwellTimerRef = useRef(null);
  const lastDwellRef = useRef(0);
  const presentedCountRef = useRef(0);
  const runIdRef = useRef(0);
  const threadRef = useRef(null);
  const threadStateRef = useRef([]);
  const rowRefs = useRef(new Map());
  const prevTopsRef = useRef(new Map());
  // Instant de départ de l'écriture de chaque page (voir TypedText) et vitesse d'écriture (mots/s).
  const typingStartsRef = useRef(new Map());
  const [typingWps] = useState(readTypingSpeed);
  threadStateRef.current = thread;

  useEffect(() => {
    fetch(`${API_BASE}/guestbook/display/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => {
        setData(d);
        setEntries(d.entries || []);
        setPhase(regieMode ? 'ready' : 'countdown');
      })
      .catch(() => setNotFound(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const startFromReady = () => {
    // Plein écran : un navigateur ne l'accorde que suite à un geste de l'utilisateur, d'où ce
    // clic (et pas l'ouverture de la page). Appelé en premier, de façon synchrone, pour rester
    // dans le geste. Refus ou navigateur sans API (Safari ancien...) : on démarre quand même, la
    // régie peut toujours passer en plein écran avec F11.
    try {
      const el = document.documentElement;
      const request = el.requestFullscreen || el.webkitRequestFullscreen;
      if (request && !document.fullscreenElement) {
        Promise.resolve(request.call(el)).catch(() => {});
      }
    } catch {
      // ignoré : le plein écran est un confort, pas un prérequis
    }
    shownRef.current = new Set();
    saveShown(slug, shownRef.current);
    // Repart d'un fil vide : annule tout minuteur ou présentation en cours (runIdRef invalide une
    // présentation qui attendait encore sa photo).
    runIdRef.current += 1;
    clearTimeout(dwellTimerRef.current);
    dwellingRef.current = false;
    presentingRef.current = false;
    lastDwellRef.current = 0;
    presentedCountRef.current = 0;
    prevTopsRef.current = new Map();
    typingStartsRef.current = new Map();
    setThread([]);
    setIntroStep(0);
    setCountdownValue(COUNTDOWN_START);
    // Ce clic est un geste de l'utilisateur : le navigateur autorise donc la musique, contrairement
    // à un démarrage automatique à l'ouverture de la page.
    audioRef.current?.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    setPhase('countdown');
  };

  // Cet écran tourne seul, sans personne pour cliquer "Jouer" — on tente donc le démarrage
  // automatique dès que possible. Si le navigateur le bloque (politique anti-autoplay tant
  // qu'aucune interaction n'a eu lieu sur la page), le bouton musical reste affiché et permet
  // de démarrer manuellement d'un seul clic ; une fois lancée, la musique boucle sans y retoucher.
  useEffect(() => {
    if (!data?.musicUrl || !audioRef.current || regieMode) return;
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

  // Séquence d'introduction : un pas toutes les ~2.6s, puis bascule vers la conversation.
  useEffect(() => {
    if (phase !== 'intro') return undefined;
    if (introStep >= 3) {
      const t = setTimeout(() => setPhase('loop'), INTRO_STEP_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIntroStep((s) => s + 1), INTRO_STEP_MS);
    return () => clearTimeout(t);
  }, [phase, introStep]);

  // Chaque message n'est présenté qu'UNE fois (un invité = un passage) : il rejoint le fil en bas,
  // puis y reste jusqu'à ce que la place manque. Les messages approuvés arrivent dans l'ordre
  // d'approbation ; on prend toujours le premier pas encore présenté. La clé inclut le texte, pour
  // qu'un message corrigé par son auteur puis ré-approuvé soit bien présenté à nouveau.
  // entriesRef : les minuteurs durent plusieurs secondes, ils doivent lire la liste la plus récente.
  entriesRef.current = entries;
  const entryKey = (e) => `${e.id}:${hashText(e.message)}`;
  const nextUnseen = () => entriesRef.current.find((e) => !shownRef.current.has(entryKey(e))) || null;

  // Délai avant le premier mot d'une page : une bulle qui arrive attend d'abord la fin du glissement
  // des anciennes (MOVE_MS), puis la révélation de la bulle, du nom et de la photo (TYPING_LEAD_MS).
  const typingLead = (item) =>
    item.pageIndex === 0 ? (item.afterMove ? MOVE_MS : 0) + TYPING_LEAD_MS : TYPING_LEAD_NEXT_PAGE_MS;

  // Temps pendant lequel la dernière bulle (ou page) reste seule "en tête" avant que la suivante
  // arrive : délai d'entrée + durée d'écriture (proportionnelle à la longueur) + temps de lecture une
  // fois le texte complet (au moins HOLD_MIN_MS, plus pour un texte long ou une photo). Les bulles
  // plus anciennes restent à l'écran tant que la place le permet — elles ont donc toujours eu au
  // moins ce temps complet. Deux messages ne s'écrivent jamais en même temps : le suivant n'est
  // lancé qu'à la fin de ce délai.
  const pageTimeline = (item) => {
    const text = item.pages[item.pageIndex];
    const reading = readingTime(text);
    const hold =
      Math.max(HOLD_MIN_MS, Math.round(HOLD_READING_SHARE * reading)) + (item.pageIndex === 0 && item.photo ? PHOTO_DWELL_BONUS_MS : 0);
    const slowedHold = reading >= LONG_DWELL_MS && lastDwellRef.current >= LONG_DWELL_MS ? Math.round(hold * LONG_SLOWDOWN) : hold;
    lastDwellRef.current = reading;
    return typingLead(item) + getTyping(text, typingWps).total + slowedHold;
  };

  const startDwell = (item) => {
    dwellingRef.current = true;
    clearTimeout(dwellTimerRef.current);
    dwellTimerRef.current = setTimeout(() => {
      dwellingRef.current = false;
      setTick((t) => t + 1);
    }, pageTimeline(item));
  };

  // Le message est marqué "présenté" tout de suite, AVANT d'attendre sa photo : ainsi ni un
  // nouveau cycle de l'effet ci-dessous ni une actualisation de la liste ne peut le présenter
  // deux fois pendant le chargement (presentingRef bloque aussi toute présentation concurrente).
  const present = async (entry) => {
    const runId = runIdRef.current;
    presentingRef.current = true;
    shownRef.current.add(entryKey(entry));
    saveShown(slug, shownRef.current);
    if (entry.photo?.url) await preloadImage(entry.photo.url);
    // Remise à zéro (voir startFromReady) pendant le chargement de la photo : cette présentation
    // est périmée, elle ne doit rien ajouter au nouveau fil.
    if (runId !== runIdRef.current) return;
    if (!threadRef.current) {
      presentingRef.current = false;
      return;
    }

    const { featured, pages } = planBubble(threadRef.current, entry);
    // Alternance gauche/droite selon l'ordre de passage : un simple rythme visuel, jamais une
    // réponse entre deux personnes (chaque bulle est un témoignage indépendant).
    const side = presentedCountRef.current % 2 === 0 ? 'left' : 'right';
    presentedCountRef.current += 1;
    const item = {
      key: entryKey(entry),
      entry,
      side,
      featured,
      pages,
      pageIndex: 0,
      photo: entry.photo?.url ? entry.photo : null,
      photoFailed: false,
      leaving: false,
      // Des bulles sont déjà à l'écran et vont glisser vers le haut : celle-ci patiente.
      afterMove: threadStateRef.current.some((i) => !i.leaving),
    };
    setThread((current) => [...current, item]);
    presentingRef.current = false;
    startDwell(item);
  };

  // Chef d'orchestre : à chaque fin de temps de lecture (tick) ou nouvelle liste (entries), soit
  // la dernière bulle passe à la page suivante de son message, soit le prochain message non
  // présenté rejoint le fil, soit on attend (fil laissé tel quel, jamais de conclusion automatique
  // : d'autres témoignages peuvent encore arriver pendant toute la réception).
  useEffect(() => {
    if (phase !== 'loop' || presentingRef.current || dwellingRef.current) return;
    const current = threadStateRef.current;
    const last = current[current.length - 1];
    if (last && last.pageIndex < last.pages.length - 1) {
      const advanced = { ...last, pageIndex: last.pageIndex + 1 };
      setThread((items) => items.map((i) => (i.key === last.key ? advanced : i)));
      startDwell(advanced);
      return;
    }
    const next = nextUnseen();
    if (next) present(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, entries, tick]);

  // Modération : un message qui n'est plus approuvé (rejeté ou repassé en attente depuis l'admin
  // pendant qu'il est à l'écran) quitte le fil tout de suite. Le fil reste donc fidèle à la liste
  // des messages approuvés, comme l'écran l'a toujours été.
  useEffect(() => {
    if (phase !== 'loop') return;
    const approvedIds = new Set(entries.map((e) => e.id));
    setThread((items) => {
      const kept = items.filter((i) => approvedIds.has(i.entry.id));
      return kept.length === items.length ? items : kept;
    });
  }, [entries, phase]);

  // Libère les minuteurs à la fermeture de la page.
  useEffect(() => () => clearTimeout(dwellTimerRef.current), []);

  // Mise en page du fil (avant la peinture, pour ne jamais montrer un état intermédiaire) :
  // 1. les bulles déjà présentes glissent doucement vers le haut quand une nouvelle arrive ;
  // 2. on garde les bulles les plus récentes qui tiennent dans la hauteur du fil, les plus
  //    anciennes sont marquées "leaving" (fondu de sortie) — jamais de chevauchement ni de texte
  //    coupé. La plus récente est toujours conservée (sa mise en page, au besoin en pages, a déjà
  //    été décidée à son arrivée, voir planBubble). Le nombre de bulles visibles n'est donc pas une
  //    constante : il dépend de la place et de la longueur réelle des textes.
  useLayoutEffect(() => {
    if (phase !== 'loop') return;
    const root = threadRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const previous = prevTopsRef.current;
    const tops = new Map();
    rowRefs.current.forEach((el, key) => {
      const top = el.offsetTop;
      tops.set(key, top);
      const before = previous.get(key);
      if (!reduceMotion && before !== undefined && Math.abs(before - top) > 1) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${before - top}px)`;
        void el.offsetHeight; // fige la position de départ avant d'animer
        el.style.transition = `transform ${MOVE_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1)`;
        el.style.transform = '';
      }
    });
    prevTopsRef.current = tops;

    const live = thread.filter((i) => !i.leaving);
    const available = threadInnerHeight(root);
    const gap = parseFloat(window.getComputedStyle(root).rowGap) || 0;
    let used = 0;
    let cutoff = -1;
    for (let i = live.length - 1; i >= 0; i -= 1) {
      const el = rowRefs.current.get(live[i].key);
      if (!el) continue;
      const needed = used + (used ? gap : 0) + el.offsetHeight;
      if (i !== live.length - 1 && needed > available) {
        cutoff = i;
        break;
      }
      used = needed;
    }
    if (cutoff >= 0) {
      const leavingKeys = new Set(live.slice(0, cutoff + 1).map((i) => i.key));
      setThread((items) => items.map((i) => (leavingKeys.has(i.key) ? { ...i, leaving: true } : i)));
    }
  }, [thread, phase, layoutTick]);

  // Retire du fil les bulles dont le fondu de sortie est terminé.
  useEffect(() => {
    if (!thread.some((i) => i.leaving)) return undefined;
    const t = setTimeout(() => setThread((items) => items.filter((i) => !i.leaving)), LEAVE_MS + 150);
    return () => clearTimeout(t);
  }, [thread]);

  // Redimensionnement de la fenêtre / polices chargées : leurs métriques changent la hauteur du
  // texte, donc ce qui tient dans le fil.
  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setLayoutTick((n) => n + 1), 150);
    };
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => setLayoutTick((n) => n + 1));
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

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

      {phase === 'ready' && (
        <div className="gb-intro">
          <p className="gb-countdown-caption gb-fade-rise">Livre d'or — {data.namesLine || data.title}</p>
          <button type="button" className="gb-start-btn" onClick={startFromReady} autoFocus>
            ▶ Lancer le livre d'or
          </button>
          <p className="gb-ready-hint">
            {entries.length} message{entries.length > 1 ? 's' : ''} prêt{entries.length > 1 ? 's' : ''}
            {data.musicUrl ? ' · musique incluse' : ''} · tout démarre au clic
          </p>
        </div>
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
        <>
          <p className="gb-thread-head">Livre d'or — {data.namesLine || data.title}</p>
          <div className="gb-thread" ref={threadRef}>
            {thread.map((item) => {
              const showPhoto = item.photo && !item.photoFailed && item.pageIndex === 0;
              return (
                <div
                  key={item.key}
                  className={`gb-row gb-row-${item.side}`}
                  ref={(el) => {
                    if (el) rowRefs.current.set(item.key, el);
                    else rowRefs.current.delete(item.key);
                  }}
                >
                  <div
                    className={`gb-bubble gb-bubble-${item.side}${item.featured ? ' gb-featured' : ''}${item.leaving ? ' gb-leaving' : ''}`}
                    style={item.afterMove && item.pageIndex === 0 ? { '--gb-delay': `${MOVE_MS}ms` } : undefined}
                  >
                    {showPhoto && (
                      <figure className="gb-bphoto">
                        <img
                          src={item.photo.url}
                          style={{ objectPosition: photoObjectPosition(item.photo) }}
                          alt={`Photo de ${item.entry.guestName}`}
                          decoding="async"
                          onError={() =>
                            setThread((items) => items.map((i) => (i.key === item.key ? { ...i, photoFailed: true } : i)))
                          }
                        />
                      </figure>
                    )}
                    <div className="gb-bbody">
                      <p className="gb-bname" dir="auto">{item.entry.guestName}</p>
                      {/* key = bulle + page : chaque page est écrite une seule fois, et un texte différent
                          remonte toujours un composant neuf (jamais de mots déjà révélés d'un autre texte). */}
                      <TypedText
                        key={`${item.key}#${item.pageIndex}`}
                        text={item.pages[item.pageIndex]}
                        stampKey={`${item.key}#${item.pageIndex}`}
                        startsRef={typingStartsRef}
                        leadMs={typingLead(item)}
                        wordsPerSecond={typingWps}
                      />
                      {item.pages.length > 1 && (
                        <p className="gb-bpage">{item.pageIndex + 1} / {item.pages.length}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {thread.length === 0 && (
              <div className="gb-thread-empty">
                <p className="gb-waiting">
                  {shownRef.current.size > 0 ? "D'autres mots arrivent bientôt..." : 'Les premiers mots arrivent bientôt...'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
