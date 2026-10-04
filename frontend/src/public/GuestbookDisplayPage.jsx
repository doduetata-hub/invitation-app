import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectStylesOnce } from './utils/injectStyles';
import { durationForText } from '../shared/utils/guestbookTiming';
import { avatarObjectPosition } from '../shared/utils/avatarFocus';
import { getTyping, TYPING_SETTLE_MS } from '../shared/utils/guestbookTyping';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const COUNTDOWN_START = 5;
const COUNTDOWN_STEP_MS = 1000;
const INTRO_STEP_MS = 2600;
const FADE_MS = 700;
const POLL_INTERVAL_MS = 2000;
injectStylesOnce(
  'guestbook-display',
  `
  .gb-display { position: fixed; inset: 0; overflow: hidden; overflow: clip; background: radial-gradient(circle at 50% 20%, #201a10 0%, #111111 55%, #0a0908 100%); font-family: 'Cormorant Garamond', Georgia, serif; }
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

  /* ===== Mode "Livre d'Or" (maquette) ==================================================
     Titre en script doré ; liste de témoignages SANS bulle : avatar rond à anneau doré, nom, heure
     relative, puis le message directement sur le fond. Le plus récent EN HAUT. Photo des mariés à
     droite, feuilles dorées, bokeh, pied de page. --u est l'unité de composition : 1vw sur un écran
     16:9, ramenée à la hauteur sur un écran moins large (1.7778vh = 1vw en 16:9). Toutes les mesures
     sont des multiples de --u, SANS plafond en pixels : même composition en 1366x768, 1080p et 4K. */
  .gb-display { --u: min(1vw, 1.7778vh); }

  /* Décor propre à ce mode (classe .gb-live posée pendant la boucle seulement) : la photo des mariés
     passe à droite, teintée sépia, fondue vers le noir ; le voile plein écran de l'intro est remplacé
     par de simples ombres en haut et en bas. */
  .gb-live { background: radial-gradient(ellipse at 24% 18%, #1b140c 0%, #0c0a07 52%, #060504 100%); }
  .gb-live .gb-photo-bg { inset: 0 0 0 auto; width: 38%; background-position: 62% 16%; opacity: 0.92; filter: sepia(0.5) saturate(1.2) brightness(0.8) contrast(1.06); -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 52%); mask-image: linear-gradient(90deg, transparent 0%, #000 52%); animation: none; }
  .gb-live .gb-overlay { background: linear-gradient(0deg, rgba(6,5,4,0.7) 0%, rgba(6,5,4,0) 24%), linear-gradient(180deg, rgba(6,5,4,0.35) 0%, rgba(6,5,4,0) 20%); }
  .gb-live .gb-glow-a { left: 32%; opacity: 0.5; }

  .gb-bokeh { position: absolute; z-index: 0; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(240,196,110,0.7) 0%, rgba(240,196,110,0.28) 50%, transparent 72%); filter: blur(calc(var(--u) * 0.5)); transform-origin: center; animation: gbBokeh 9s ease-in-out infinite alternate; }
  @keyframes gbBokeh { from { opacity: 0.5; transform: scale(0.94); } to { opacity: 1; transform: scale(1.07); } }
  .gb-leaf { position: absolute; z-index: 1; pointer-events: none; overflow: visible; filter: drop-shadow(0 0 calc(var(--u) * 0.6) rgba(226,172,84,0.4)); }
  .gb-leaf-tl { left: calc(var(--u) * -0.6); top: calc(var(--u) * -0.7); width: calc(var(--u) * 8.4); transform: rotate(-24deg); }
  .gb-leaf-bl { left: calc(var(--u) * -2.4); bottom: calc(var(--u) * -3.4); width: calc(var(--u) * 13); opacity: 0.6; filter: blur(calc(var(--u) * 0.14)) drop-shadow(0 0 calc(var(--u) * 0.8) rgba(226,172,84,0.3)); transform: rotate(18deg); }
  .gb-leaf-br { right: calc(var(--u) * -1.4); bottom: calc(var(--u) * 0.1); width: calc(var(--u) * 11); transform: scaleX(-1) rotate(-62deg); }

  /* Titre */
  .gb-title { position: absolute; z-index: 2; top: calc(var(--u) * 0.8); left: 0; right: 0; text-align: center; pointer-events: none; }
  .gb-title-script { padding: 0.16em 0.14em 0.2em; margin: -0.16em -0.14em -0.2em; font-family: 'Great Vibes', 'Dancing Script', cursive; font-weight: 400; font-size: calc(var(--u) * 6); line-height: 1.1; background: linear-gradient(180deg, #FFF1C6 0%, #F2CB78 46%, #C98F3A 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 calc(var(--u) * 0.7) rgba(226,170,80,0.35)); }
  .gb-divider { display: flex; align-items: center; justify-content: center; gap: calc(var(--u) * 1); }
  .gb-divider-line { display: block; height: max(1px, calc(var(--u) * 0.07)); width: calc(var(--u) * 17); background: linear-gradient(90deg, transparent, #D9AE62); }
  .gb-divider-line:last-child { background: linear-gradient(90deg, #D9AE62, transparent); }
  .gb-heart { width: calc(var(--u) * 1.6); height: calc(var(--u) * 1.6); display: block; filter: drop-shadow(0 0 calc(var(--u) * 0.4) rgba(226,172,84,0.5)); }
  .gb-title-sub { margin: calc(var(--u) * 0.45) 0 0; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: calc(var(--u) * 1); line-height: 1.15; letter-spacing: 0.18em; text-transform: uppercase; color: #EBCF93; }

  /* Liste : de haut en bas, le plus récent EN HAUT. Les 2.4u de marge interne haute laissent la place
     au glissement d'entrée sans que rien soit rogné ; le masque estompe cette marge, de sorte qu'un
     long message qui remonte en s'écrivant (voir keepWordVisible) disparaît en fondu sous le titre. */
  .gb-thread { position: absolute; z-index: 2; left: calc(var(--u) * 7); right: calc(var(--u) * 36); top: calc(var(--u) * 8.7); bottom: calc(var(--u) * 6.1); padding-top: calc(var(--u) * 2.4); box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; gap: calc(var(--u) * 3); overflow: hidden; overflow: clip; -webkit-mask-image: linear-gradient(180deg, transparent calc(var(--u) * 1.8), #000 calc(var(--u) * 2.4)); mask-image: linear-gradient(180deg, transparent calc(var(--u) * 1.8), #000 calc(var(--u) * 2.4)); }
  .gb-thread-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-start; padding-left: calc(var(--u) * 8); }
  .gb-thread-empty .gb-waiting { font-size: calc(var(--u) * 2.5); font-style: italic; animation: gbWaitingPulse 4200ms ease-in-out infinite; }
  @keyframes gbWaitingPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.85; } }
  .gb-waiting { font-size: clamp(1.4rem, 2.4vw, 2rem); color: #F7F1E5; opacity: 0.75; }

  .gb-row { display: flex; flex: none; width: 100%; }
  .gb-msg { display: flex; align-items: flex-start; gap: calc(var(--u) * 2.2); min-width: 0; max-width: calc(var(--u) * 54.6); animation: gbMsgIn 900ms cubic-bezier(0.2, 0.7, 0.2, 1) both var(--gb-delay, 0ms); transition: margin-top 800ms cubic-bezier(0.3, 0.6, 0.2, 1); }
  .gb-msg.gb-leaving { animation: gbMsgOut 800ms ease both; }
  .gb-mcol { flex: 1 1 auto; min-width: 0; padding-top: calc(var(--u) * 0.1); }

  /* Avatar : cercle parfait (largeur = hauteur, border-radius 50 %, overflow hidden), anneau doré,
     filet sombre intérieur et halo doré. object-fit: cover : jamais déformé ; point de cadrage
     (object-position) posé en ligne par photo. */
  .gb-bphoto { position: relative; margin: 0; flex: none; box-sizing: border-box; width: calc(var(--u) * 8.4); height: calc(var(--u) * 8.4); aspect-ratio: 1 / 1; border-radius: 50%; overflow: hidden; line-height: 0; background: #14110c; border: calc(var(--u) * 0.2) solid #D9AE62; box-shadow: 0 0 calc(var(--u) * 1.5) rgba(228,182,94,0.5); animation: gbPartIn 700ms ease both calc(var(--gb-delay, 0ms) + 150ms); }
  .gb-bphoto::after { content: ''; position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 calc(var(--u) * 0.13) rgba(8,7,6,0.9); }
  .gb-bphoto img { display: block; width: 100%; height: 100%; object-fit: cover; }

  .gb-mhead { animation: gbPartIn 700ms ease both calc(var(--gb-delay, 0ms) + 330ms); }
  .gb-bname { margin: 0; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: calc(var(--u) * 2.1); line-height: 1.25; color: #F2D28C; text-shadow: 0 0 calc(var(--u) * 1) rgba(0,0,0,0.85); }
  .gb-btime { margin: calc(var(--u) * 0.08) 0 0; font-family: 'Libre Baskerville', Georgia, serif; font-size: calc(var(--u) * 1.3); line-height: 1.3; color: #EDE3CF; opacity: 0.88; text-shadow: 0 0 calc(var(--u) * 0.8) rgba(0,0,0,0.85); }
  .gb-bname.gb-rtl { font-size: calc(var(--u) * 2.4); letter-spacing: 0; text-transform: none; }

  /* Le message, directement sur le fond (aucune bulle). */
  .gb-mbody { max-width: calc(var(--u) * 44); margin-top: calc(var(--u) * 0.7); animation: gbPartIn 700ms ease both calc(var(--gb-delay, 0ms) + 480ms); }
  .gb-msg:not(.gb-has-photo) .gb-mbody { max-width: calc(var(--u) * 54.6); }

  @keyframes gbMsgIn { from { opacity: 0; transform: translateY(calc(var(--u) * -1.8)); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gbMsgOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(calc(var(--u) * 1.2)); } }
  @keyframes gbPartIn { from { opacity: 0; transform: translateY(calc(var(--u) * 0.5)); } to { opacity: 1; transform: translateY(0); } }
  @keyframes gbFadeOut { from { opacity: 1; } to { opacity: 0; } }

  /* white-space: pre-line : les paragraphes tapés par l'invité sont conservés. dir="auto" (posé dans
     le JSX) : un message en arabe ou autre écriture RTL se lit dans le bon sens. */
  .gb-btext { margin: 0; font-family: 'Libre Baskerville', Georgia, serif; font-size: calc(var(--u) * 2.05); line-height: 1.42; color: #F7F1E5; font-weight: 400; text-shadow: 0 0 calc(var(--u) * 1.2) rgba(0,0,0,0.8); white-space: pre-line; overflow-wrap: break-word; text-wrap: pretty; }
  /* Écriture progressive : chaque mot est présent dans la mise en page mais invisible, puis se révèle
     (classe .gb-on posée par TypedText) avec un fondu court et une légère teinte champagne qui
     s'éteint vers l'ivoire. Le curseur doré est positionné en absolu après le dernier mot révélé :
     il ne change jamais la largeur de la ligne, donc jamais les retours à la ligne. */
  /* Écriture arabe/RTL : la police de repli a des lettres plus petites que le latin à taille égale ; on
     compense pour qu'elle reste lisible depuis le fond de la salle. */
  .gb-btext.gb-rtl { font-size: calc(var(--u) * 2.6); line-height: 1.6; }
  .gb-w { opacity: 0; color: #EACB86; transition: opacity 260ms ease, color 900ms ease; }
  .gb-w.gb-on { opacity: 1; color: #F7F1E5; }
  .gb-w-last { position: relative; }
  .gb-w-last::after { content: ''; position: absolute; inset-inline-end: calc(var(--u) * -0.3); top: 12%; bottom: 6%; width: max(2px, calc(var(--u) * 0.12)); background: #E3B866; box-shadow: 0 0 calc(var(--u) * 0.6) rgba(227,184,102,0.7); animation: gbCaretBlink 1050ms steps(1) infinite; }
  @keyframes gbCaretBlink { 0%, 58% { opacity: 1; } 59%, 100% { opacity: 0; } }
  /* Emojis conservés dans la donnée (jamais modifiés), juste neutralisés visuellement. */
  .gb-emoji { filter: grayscale(0.85) opacity(0.6) brightness(0.9); font-size: 0.9em; }

  /* Pied de page : musique (gauche), "Merci d'être ici" (centre), compteur et points (droite). */
  .gb-foot-center { position: absolute; z-index: 2; left: 0; right: 0; bottom: calc(var(--u) * 1.1); text-align: center; pointer-events: none; }
  .gb-foot-center .gb-divider-line { width: calc(var(--u) * 12.5); }
  .gb-foot-center .gb-heart { width: calc(var(--u) * 1.5); height: calc(var(--u) * 1.5); }
  .gb-foot-script { margin: calc(var(--u) * 0.1) 0 0; font-family: 'Great Vibes', 'Dancing Script', cursive; font-size: calc(var(--u) * 2.4); line-height: 1.1; color: #E9C47A; text-shadow: 0 0 calc(var(--u) * 0.7) rgba(226,172,84,0.35); }
  .gb-foot-music { position: absolute; z-index: 3; left: calc(var(--u) * 3.7); bottom: calc(var(--u) * 2); display: flex; align-items: center; gap: calc(var(--u) * 0.7); padding: 0; background: none; border: 0; cursor: pointer; font-family: 'Cormorant Garamond', Georgia, serif; font-size: calc(var(--u) * 1.25); color: #D9B66F; }
  .gb-foot-music svg { width: calc(var(--u) * 2.2); height: calc(var(--u) * 2.2); }
  .gb-foot-count { position: absolute; z-index: 3; right: calc(var(--u) * 3.6); bottom: calc(var(--u) * 2); display: flex; align-items: center; gap: calc(var(--u) * 1.2); font-size: calc(var(--u) * 1.25); color: #D9B66F; }
  .gb-dots { display: flex; align-items: center; gap: calc(var(--u) * 0.5); }
  .gb-dots i { display: block; width: calc(var(--u) * 0.62); height: calc(var(--u) * 0.62); border-radius: 50%; background: rgba(255,255,255,0.22); }
  .gb-dots i.on { width: calc(var(--u) * 0.8); height: calc(var(--u) * 0.8); background: #F3D58C; box-shadow: 0 0 calc(var(--u) * 0.5) rgba(243,213,140,0.7); }

  /* Écran en hauteur (portrait) : unité plus généreuse, liste pleine largeur. */
  /* Page de clôture (livre d'or terminé par les mariés) : la photo des mariés à gauche, fondue vers le fond,
     le remerciement à droite. Remplace le titre, la liste et le pied de page. */
  /* visibility (et non display: none) pour le titre et le pied de page : leur cœur SVG porte le dégradé doré
     que le cœur de la page de clôture réutilise, et un dégradé défini dans un bloc display: none ne s'affiche plus. */
  .gb-ended .gb-title, .gb-ended .gb-foot-center { visibility: hidden; }
  .gb-ended .gb-thread, .gb-ended .gb-photo-bg, .gb-ended .gb-foot-count { display: none; }
  .gb-closing { position: absolute; inset: 0; z-index: 4; animation: gbFadeOnly 1600ms ease both; }
  .gb-closing-photo { position: absolute; left: 0; top: 0; bottom: 0; width: 42%; background-size: cover; background-position: 50% 14%; filter: sepia(0.28) saturate(1.1) brightness(0.86); -webkit-mask-image: linear-gradient(270deg, transparent 0%, #000 50%); mask-image: linear-gradient(270deg, transparent 0%, #000 50%); }
  .gb-closing-text { position: absolute; left: 42%; right: calc(var(--u) * 4); top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .gb-closing-text > * { animation: gbPartIn 1100ms ease both; }
  .gb-closing-eyebrow { margin: 0 0 calc(var(--u) * 1.2); font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: calc(var(--u) * 1.5); letter-spacing: 0.3em; text-transform: uppercase; color: #B8873F; animation-delay: 500ms; }
  .gb-closing-merci { padding: 0.16em 0.14em 0.2em; margin: -0.16em -0.14em -0.2em; font-family: 'Great Vibes', 'Dancing Script', cursive; font-weight: 400; font-size: calc(var(--u) * 14.5); line-height: 1.1; background: linear-gradient(180deg, #FFF1C6 0%, #F2CB78 46%, #C98F3A 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 calc(var(--u) * 1) rgba(226,170,80,0.4)); animation-delay: 900ms; }
  .gb-closing-text .gb-divider { margin: calc(var(--u) * 1.4) 0 calc(var(--u) * 2); animation: gbPartIn 1100ms ease both 1500ms; }
  .gb-closing-line { margin: 0 0 calc(var(--u) * 1.6); font-family: 'Libre Baskerville', Georgia, serif; font-style: italic; font-size: calc(var(--u) * 2.5); color: #F7F1E5; animation-delay: 1900ms; }
  .gb-closing-names { margin: 0 0 calc(var(--u) * 1.4); font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700; font-size: calc(var(--u) * 3); letter-spacing: 0.05em; color: #F2D28C; animation-delay: 2300ms; }
  .gb-closing-count { margin: 0; font-family: 'Libre Baskerville', Georgia, serif; font-size: calc(var(--u) * 1.4); letter-spacing: 0.08em; color: #EDE3CF; opacity: 0.8; animation-delay: 2700ms; }

  @media (max-aspect-ratio: 1/1) {
    .gb-display { --u: 2.6vw; }
    .gb-closing-photo { width: 100%; opacity: 0.28; -webkit-mask-image: none; mask-image: none; }
    .gb-closing-text { left: 4vw; right: 4vw; }
    .gb-thread { left: 4vw; right: 4vw; }
    .gb-msg, .gb-mbody, .gb-msg:not(.gb-has-photo) .gb-mbody { max-width: 100%; }
    .gb-live .gb-photo-bg { width: 100%; opacity: 0.25; }
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
    .gb-thread-empty .gb-waiting, .gb-bokeh { animation: none; }
    .gb-msg:not(.gb-leaving), .gb-bphoto, .gb-mhead, .gb-mbody { animation: gbFadeOnly 500ms ease both !important; }
    .gb-msg.gb-leaving { animation: gbFadeOut 500ms ease both !important; }
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
// mise en page ne bouge pas quand elle arrive.
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
// comme avant : il s'écrit d'un seul tenant, voir keepWordVisible). Au-delà de 280
// caractères, chaque caractère ajoute ce temps de lecture (≈ 25 caractères par seconde).
const LONG_TEXT_CHARS = 280;
const EXTRA_MS_PER_CHAR = 40;
function readingTime(text) {
  return durationForText(text) + Math.max(0, (text || '').length - LONG_TEXT_CHARS) * EXTRA_MS_PER_CHAR;
}
// Une photo se regarde en plus de se lire : temps ajouté à un témoignage illustré.
const PHOTO_DWELL_BONUS_MS = 3000;
// Au-delà de ce temps (messages moyens et longs, voir durationForText), deux témoignages
// consécutifs ralentissent la cadence : le suivant garde LONG_SLOWDOWN fois son temps habituel.
const LONG_DWELL_MS = 11000;
const LONG_SLOWDOWN = 1.2;

// ===== Écriture progressive (révélation mot après mot) =========================================
// Pure mise en scène visuelle d'un témoignage DÉJÀ soumis et approuvé : le texte affiché à la fin
// est strictement celui de la base, jamais modifié ; rien n'indique qu'un invité écrit en direct.
// Vitesse initiale en mots par seconde ; `?wps=5` dans l'adresse de l'écran la remplace (1 à 12), pour
// l'ajuster sur place sans redéployer.
const TYPING_WORDS_PER_SECOND = 4;
// Avant le premier mot : la bulle, le nom et la photo se révèlent d'abord (voir --gb-delay et les
// animations .gb-bphoto / .gb-bname).
const TYPING_LEAD_MS = 1300;
// Une fois le texte entièrement écrit, il reste lisible au moins HOLD_MIN_MS, ou cette part de son
// temps de lecture (voir readingTime) s'il est long, avant que la conversation évolue.
const HOLD_MIN_MS = 3000;
const HOLD_READING_SHARE = 0.4;

// Texte écrit de droite à gauche (arabe, hébreu...) d'après sa première lettre : sert à agrandir
// légèrement ces écritures dont la police de repli est plus petite (voir .gb-rtl).
const RTL_FIRST_LETTER = /^[^\p{L}]*[֐-ࣿיִ-﷿ﹰ-﻿]/u;
function isRtlText(text) {
  return RTL_FIRST_LETTER.test(text || '');
}

function readTypingSpeed() {
  const raw = Number(new URLSearchParams(window.location.search).get('wps'));
  return Number.isFinite(raw) && raw >= 1 && raw <= 12 ? raw : TYPING_WORDS_PER_SECOND;
}

// Hauteur utile du fil : sans la marge interne basse (réservée au glissement d'entrée des bulles).
function threadInnerHeight(el) {
  const style = window.getComputedStyle(el);
  return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
}

// Un message plus haut que le fil (texte très long) n'est ni coupé en pages ni répété sous un second
// bloc : il reste UN seul bloc, qui se complète vers le bas, là où le message suivant apparaîtrait.
// Quand le mot qui vient d'être écrit dépasse le bas du fil, le bloc remonte doucement (de deux
// lignes à la fois, jamais au-delà de sa propre fin) ; le début, déjà lu, s'estompe sous le titre.
// Un message qui tient dans le fil n'est jamais déplacé.
function keepWordVisible(threadEl, wordEl) {
  const msg = wordEl?.closest('.gb-msg');
  if (!threadEl || !msg) return;
  const available = threadInnerHeight(threadEl);
  const full = msg.offsetHeight;
  if (full <= available) return;
  const shift = Number(msg.dataset.shift) || 0;
  // Positions relatives au bloc : insensibles à son glissement d'entrée comme à sa remontée en cours.
  const wordBottom = wordEl.getBoundingClientRect().bottom - msg.getBoundingClientRect().top;
  if (wordBottom - shift <= available) return;
  const line = parseFloat(window.getComputedStyle(wordEl.parentElement).lineHeight) || 0;
  const next = Math.min(full - available, wordBottom - available + 2 * line);
  if (next <= shift) return;
  msg.dataset.shift = String(next);
  msg.style.marginTop = `${-next}px`;
}

// "il y a quelques secondes", "il y a 2 minutes"... d'après l'heure d'approbation réelle du message
// (fournie par le serveur). Sans date exploitable : aucune mention plutôt qu'une mention inventée.
function relativeTimeLabel(isoDate, now) {
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return '';
  const seconds = Math.max(0, Math.round((now - time) / 1000));
  if (seconds < 45) return 'il y a quelques secondes';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes <= 1 ? '1 minute' : `${minutes} minutes`}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  const days = Math.round(hours / 24);
  return `il y a ${days} jour${days > 1 ? 's' : ''}`;
}

// ----- Décor : feuilles dorées, cœur, note de musique (SVG en ligne, aucun fichier à charger) -----
// Une branche : une tige courbe (Bézier) et des feuilles en amande posées le long, alternées de part
// et d'autre, de plus en plus petites vers la pointe.
const BRANCH_STEM = { p0: [30, 158], p1: [38, 110], p2: [52, 70], p3: [84, 12] };
function bezierPoint(t) {
  const { p0, p1, p2, p3 } = BRANCH_STEM;
  const mt = 1 - t;
  const x = mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0];
  const y = mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1];
  const dx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}
const BRANCH_LEAVES = Array.from({ length: 9 }, (_, i) => {
  const t = 0.1 + (i / 8) * 0.9;
  const { x, y, angle } = bezierPoint(t);
  const side = i % 2 === 0 ? -1 : 1;
  return { x, y, rotate: angle + side * 52, scale: 1.05 - t * 0.5 };
});

function GoldBranch({ className }) {
  return (
    <svg className={`gb-leaf ${className}`} viewBox="0 0 120 160" aria-hidden="true">
      <defs>
        <linearGradient id="gbLeafGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBE5A6" />
          <stop offset="0.55" stopColor="#D9A94F" />
          <stop offset="1" stopColor="#A87423" />
        </linearGradient>
      </defs>
      <path d="M30 158 C 38 110, 52 70, 84 12" stroke="url(#gbLeafGold)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {BRANCH_LEAVES.map((leaf, i) => (
        <path
          key={i}
          d="M0 0 C 8 -13 24 -13 33 0 C 24 13 8 13 0 0 Z"
          transform={`translate(${leaf.x.toFixed(1)} ${leaf.y.toFixed(1)}) rotate(${leaf.rotate.toFixed(1)}) scale(${leaf.scale.toFixed(2)})`}
          fill="url(#gbLeafGold)"
        />
      ))}
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="gb-heart" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="gbHeartGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE5A6" />
          <stop offset="1" stopColor="#D9A94F" />
        </linearGradient>
      </defs>
      <path
        d="M12 21s-7.5-4.6-9.5-9.2C1 8 3.2 5 6.2 5c1.9 0 3.4 1 5.8 3.3C14.4 6 15.9 5 17.8 5c3 0 5.2 3 3.7 6.8C19.5 16.4 12 21 12 21z"
        fill="url(#gbHeartGold)"
      />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 18V6l10-2v12M9 18a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 9 18zm10-2a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 19 16z"
        fill="none"
        stroke="#D9B66F"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


const BOKEH = [
  { l: '6%', t: '6%', s: 7.2 },
  { l: '12%', t: '14%', s: 3.2 },
  { l: '1%', t: '30%', s: 8.4 },
  { l: '8%', t: '46%', s: 3.5 },
  { l: '2%', t: '63%', s: 6 },
  { l: '13%', t: '72%', s: 2.6 },
  { l: '5%', t: '86%', s: 7.8 },
  { l: '18%', t: '91%', s: 3 },
  { l: '46%', t: '3%', s: 2.4 },
  { l: '66%', t: '90%', s: 3.2 },
  { l: '91%', t: '31%', s: 2.2 },
];

// Texte d'un témoignage révélé mot après mot. TOUT le texte est rendu dès le départ, invisible
// (opacity 0, voir .gb-w) : la bulle a donc sa taille définitive dès son apparition et la mise en
// page ne bouge jamais pendant l'écriture (pas de recalcul, les bulles plus anciennes ne sont pas
// repoussées à chaque mot). Les mots sont ensuite révélés dans l'ordre d'origine en ajoutant une
// classe directement sur les éléments : React ne refait aucun rendu à chaque mot.
// startsRef (clé = message) mémorise l'instant de départ : si le composant est remonté en cours
// d'écriture (remontage React, événement dupliqué), l'écriture reprend là où elle en était au lieu
// de se relancer depuis le début. Le calendrier se lit sur l'horloge (performance.now) : chaque réveil
// est calculé pour tomber à l'instant du mot suivant (aucune dérive qui s'accumule), un onglet
// ralenti rattrape le temps écoulé en révélant les mots dus, et — contrairement à
// requestAnimationFrame — rien ne se fige si la fenêtre est masquée ou recouverte, tout en réveillant
// la page seulement 4 fois par seconde environ au lieu de 60.
const TypedText = memo(function TypedText({ text, stampKey, startsRef, leadMs, wordsPerSecond, onReveal }) {
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
        onReveal?.(words[latest]);
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
    <p ref={rootRef} className={`gb-btext${isRtlText(text) ? ' gb-rtl' : ''}`} dir="auto">
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

// Page de clôture : affichée après le dernier message quand les mariés ont terminé le livre d'or (voir
// closed dans GET /guestbook/display/:slug) — la même que celle qui ferme le PDF.
function ClosingPage({ coverUrl, namesLine, count, eventDate }) {
  const dateText = eventDate ? new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  return (
    <div className="gb-closing">
      {coverUrl && <div className="gb-closing-photo" style={{ backgroundImage: `url(${coverUrl})` }} />}
      <div className="gb-closing-text">
        <p className="gb-closing-eyebrow">Avec tout notre amour</p>
        <h2 className="gb-closing-merci">Merci</h2>
        <div className="gb-divider" aria-hidden="true">
          <span className="gb-divider-line" />
          <HeartIcon />
          <span className="gb-divider-line" />
        </div>
        <p className="gb-closing-line">d’avoir partagé notre bonheur</p>
        <p className="gb-closing-names">{namesLine}</p>
        <p className="gb-closing-count">
          {count} mot{count > 1 ? 's' : ''} d’amour réunis{dateText ? ` · ${dateText}` : ''}
        </p>
      </div>
    </div>
  );
}

export default function GuestbookDisplayPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [entries, setEntries] = useState([]);
  // Livre d'or terminé par les mariés : suit la liste (interrogée toutes les 2 s), donc la clôture
  // arrive à l'écran sans le recharger.
  const [closed, setClosed] = useState(false);
  const [phase, setPhase] = useState('loading');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [introStep, setIntroStep] = useState(0);
  // Le fil de conversation : les bulles actuellement à l'écran, de la plus ancienne (en haut) à la
  // plus récente (affichée en haut). Chaque élément : { key, entry, photo, photoFailed, leaving,
  // afterMove }.
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
  const runIdRef = useRef(0);
  const threadRef = useRef(null);
  const threadStateRef = useRef([]);
  const rowRefs = useRef(new Map());
  const prevTopsRef = useRef(new Map());
  // Instant de départ de l'écriture de chaque page (voir TypedText) et vitesse d'écriture (mots/s).
  const typingStartsRef = useRef(new Map());
  const [typingWps] = useState(readTypingSpeed);
  // Horloge de l'écran, rafraîchie toutes les 15 s : met à jour les "il y a … minutes".
  const [now, setNow] = useState(() => Date.now());
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
        setClosed(Boolean(d.closed));
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
          (x.photo?.url || null) === (b[i].photo?.url || null) &&
          (x.photo?.focusX ?? null) === (b[i].photo?.focusX ?? null) &&
          (x.photo?.focusY ?? null) === (b[i].photo?.focusY ?? null)
      );

    const poll = () => {
      fetch(`${API_BASE}/guestbook/display/${slug}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stopped || !d?.entries) return;
          setEntries((prev) => (sameList(prev, d.entries) ? prev : d.entries));
          setClosed(Boolean(d.closed));
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

  // Délai avant le premier mot : un message qui arrive attend d'abord la fin du glissement des
  // anciens (MOVE_MS), puis la révélation du nom et de la photo (TYPING_LEAD_MS).
  const typingLead = (item) => (item.afterMove ? MOVE_MS : 0) + TYPING_LEAD_MS;

  // Temps pendant lequel le dernier message reste seul "en tête" avant que le suivant arrive : délai
  // d'entrée + durée d'écriture (proportionnelle à la longueur) + temps de lecture une fois le texte
  // complet (au moins HOLD_MIN_MS, plus pour un texte long ou une photo). Les messages plus anciens
  // restent à l'écran tant que la place le permet — ils ont donc toujours eu au moins ce temps
  // complet. Deux messages ne s'écrivent jamais en même temps : le suivant n'est lancé qu'à la fin de
  // ce délai.
  const pageTimeline = (item) => {
    const text = item.entry.message;
    const reading = readingTime(text);
    const hold = Math.max(HOLD_MIN_MS, Math.round(HOLD_READING_SHARE * reading)) + (item.photo ? PHOTO_DWELL_BONUS_MS : 0);
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

    const item = {
      key: entryKey(entry),
      entry,
      photo: entry.photo?.url ? entry.photo : null,
      photoFailed: false,
      leaving: false,
      // Des messages sont déjà à l'écran et vont glisser vers le bas : celui-ci patiente.
      afterMove: threadStateRef.current.some((i) => !i.leaving),
    };
    setThread((current) => [...current, item]);
    presentingRef.current = false;
    startDwell(item);
  };

  // Chef d'orchestre : à chaque fin de temps de lecture (tick) ou nouvelle liste (entries), soit le
  // prochain message non présenté rejoint le fil, soit, s'il n'y en a plus, le fil s'efface et
  // l'écran d'attente s'affiche (jamais de conclusion définitive : d'autres témoignages peuvent
  // encore arriver pendant toute la réception).
  useEffect(() => {
    if (phase !== 'loop' || presentingRef.current || dwellingRef.current) return;
    const next = nextUnseen();
    if (next) {
      present(next);
      return;
    }
    // Plus rien à présenter et le dernier message a eu tout son temps : le fil s'efface en fondu et
    // l'écran d'attente prend la place ("D'autres mots arrivent bientôt...", voir .gb-thread-empty),
    // comme l'écran l'a toujours fait. Un message approuvé ensuite arrive sur un fil vide.
    setThread((items) => (items.some((i) => !i.leaving) ? items.map((i) => (i.leaving ? i : { ...i, leaving: true })) : items));
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

  // Met à jour les "il y a … minutes" pendant la boucle.
  useEffect(() => {
    if (phase !== 'loop') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [phase]);

  // Libère les minuteurs à la fermeture de la page.
  useEffect(() => () => clearTimeout(dwellTimerRef.current), []);

  // Appelé à chaque mot révélé : un texte plus long que le fil remonte pour rester visible.
  const onReveal = useCallback((wordEl) => keepWordVisible(threadRef.current, wordEl), []);

  // Mise en page du fil (avant la peinture, pour ne jamais montrer un état intermédiaire) :
  // 1. les bulles déjà présentes glissent doucement vers le haut quand une nouvelle arrive ;
  // 2. on garde les bulles les plus récentes qui tiennent dans la hauteur du fil, les plus
  //    anciennes sont marquées "leaving" (fondu de sortie) — jamais de chevauchement ni de texte
  //    coupé. La plus récente est toujours conservée (si elle est trop longue pour le fil, elle
  //    occupe seule l'écran et se complète vers le bas, voir keepWordVisible). Le nombre de messages visibles n'est donc pas une constante : il dépend de
  //    la place et de la longueur réelle des textes.
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

  // Compteur du pied de page : messages déjà passés / messages approuvés, et 6 points de progression.
  const totalCount = entries.length;
  const shownCount = Math.min(shownRef.current.size, totalCount);
  const activeDots = shownCount > 0 ? Math.max(1, Math.round((6 * shownCount) / totalCount)) : 0;
  // Page de clôture : livre d'or terminé, plus rien à présenter et le dernier message a eu tout son temps
  // (le fil est vide). Tant que les mariés n'ont pas terminé, « D'autres mots arrivent bientôt » reste.
  const ended = phase === 'loop' && closed && thread.length === 0 && !entries.some((e) => !shownRef.current.has(entryKey(e)));

  return (
    <div className={`gb-display${phase === 'loop' ? ' gb-live' : ''}${ended ? ' gb-ended' : ''}`}>
      {data.coverUrl && <div className="gb-photo-bg" style={{ backgroundImage: `url(${data.coverUrl})` }} />}
      <div className="gb-overlay" />
      <div className="gb-mist" />
      <div className="gb-glow gb-glow-a" />
      <div className="gb-glow gb-glow-b" />
      <Particles />

      {data.musicUrl && (
        <>
          <audio ref={audioRef} src={data.musicUrl} loop />
          {phase !== 'loop' && (
            <button
              type="button"
              onClick={toggleMusic}
              className="gb-music-btn"
              aria-label={musicPlaying ? 'Couper la musique' : 'Jouer la musique'}
            >
              {musicPlaying ? '♪' : '🔇'}
            </button>
          )}
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
          {BOKEH.map((spot, i) => (
            <span
              key={i}
              className="gb-bokeh"
              aria-hidden="true"
              style={{
                left: spot.l,
                top: spot.t,
                width: `calc(var(--u) * ${spot.s})`,
                height: `calc(var(--u) * ${spot.s})`,
                animationDelay: `${(i * 1.1).toFixed(1)}s`,
              }}
            />
          ))}
          <GoldBranch className="gb-leaf-bl" />
          <GoldBranch className="gb-leaf-tl" />
          <GoldBranch className="gb-leaf-br" />

          <header className="gb-title">
            <h1 className="gb-title-script">Livre d’Or</h1>
            <div className="gb-divider" aria-hidden="true">
              <span className="gb-divider-line" />
              <HeartIcon />
              <span className="gb-divider-line" />
            </div>
            <p className="gb-title-sub">Vos mots d’amour pour les mariés</p>
          </header>

          <div className="gb-thread" ref={threadRef}>
            {/* Le plus récent en haut : la liste est tenue du plus ancien au plus récent, affichée à l'envers. */}
            {[...thread].reverse().map((item) => {
              const showPhoto = item.photo && !item.photoFailed;
              const timeLabel = relativeTimeLabel(item.entry.approvedAt, now);
              return (
                <div
                  key={item.key}
                  className="gb-row"
                  ref={(el) => {
                    if (el) rowRefs.current.set(item.key, el);
                    else rowRefs.current.delete(item.key);
                  }}
                >
                  <div
                    className={`gb-msg${showPhoto ? ' gb-has-photo' : ''}${item.leaving ? ' gb-leaving' : ''}`}
                    style={item.afterMove ? { '--gb-delay': `${MOVE_MS}ms` } : undefined}
                  >
                    {showPhoto && (
                      <figure className="gb-bphoto">
                        <img
                          src={item.photo.url}
                          style={{ objectPosition: avatarObjectPosition(item.photo) }}
                          alt={`Photo de ${item.entry.guestName}`}
                          decoding="async"
                          onError={() =>
                            setThread((items) => items.map((i) => (i.key === item.key ? { ...i, photoFailed: true } : i)))
                          }
                        />
                      </figure>
                    )}
                    <div className="gb-mcol">
                      <div className="gb-mhead">
                        <p className={`gb-bname${isRtlText(item.entry.guestName) ? ' gb-rtl' : ''}`} dir="auto">{item.entry.guestName}</p>
                        {timeLabel && <p className="gb-btime">{timeLabel}</p>}
                      </div>
                      <div className="gb-mbody">
                        {/* key = message : écrit une seule fois, et un texte différent remonte toujours un
                            composant neuf (jamais de mots déjà révélés d'un autre texte). */}
                        <TypedText
                          key={item.key}
                          text={item.entry.message}
                          stampKey={item.key}
                          startsRef={typingStartsRef}
                          leadMs={typingLead(item)}
                          wordsPerSecond={typingWps}
                          onReveal={onReveal}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {thread.length === 0 && !ended && (
              <div className="gb-thread-empty">
                <p className="gb-waiting">
                  {shownRef.current.size > 0 ? "D'autres mots arrivent bientôt..." : 'Les premiers mots arrivent bientôt...'}
                </p>
              </div>
            )}
          </div>

          {ended && <ClosingPage coverUrl={data.coverUrl} namesLine={data.namesLine || data.title} count={totalCount} eventDate={data.eventDate} />}

          {data.musicUrl && (
            <button
              type="button"
              className="gb-foot-music"
              onClick={toggleMusic}
              aria-label={musicPlaying ? 'Couper la musique' : 'Jouer la musique'}
            >
              <NoteIcon />
              {musicPlaying ? 'Ambiance musicale douce...' : 'Activer la musique'}
            </button>
          )}
          <div className="gb-foot-center">
            <div className="gb-divider" aria-hidden="true">
              <span className="gb-divider-line" />
              <HeartIcon />
              <span className="gb-divider-line" />
            </div>
            <p className="gb-foot-script">Merci d’être ici</p>
          </div>
          {totalCount > 0 && (
            <div className="gb-foot-count">
              <span>{shownCount} / {totalCount}</span>
              <span className="gb-dots" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} className={i < activeDots ? 'on' : ''} />
                ))}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
