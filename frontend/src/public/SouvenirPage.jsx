import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { injectStylesOnce } from './utils/injectStyles';
import { avatarObjectPosition } from '../shared/utils/avatarFocus';
import { buildGuestbookVideoTimeline } from '../shared/video/guestbookVideoTimeline';
import { generateGuestbookVideo, VIDEO_WIDTH, VIDEO_HEIGHT } from '../shared/video/guestbookVideoEncoder';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// La création de la vidéo dans le navigateur du client est désactivée : sur un livre d'or de plusieurs
// dizaines de messages elle prend des heures sur un appareil modeste. L'organisateur génère la vidéo
// depuis l'admin et l'envoie à part (lien cloud). Passer à true pour rouvrir la génération ici.
const VIDEO_GENERATION_ENABLED = false;

// ===== Page « Souvenir » des mariés =================================================================
// Un lien secret, à envoyer aux mariés (voir le lien Souvenir de l'admin). Trois temps, dans cet ordre
// voulu : 1. revivre le livre d'or en version web (l'expérience complète, avec la musique), 2. le
// télécharger en vidéo, 3. le télécharger en PDF. La page pousse doucement dans cet ordre : les étapes
// suivantes sont visibles mais estompées tant que la précédente n'a pas été faite (avec toujours un
// lien « je l'ai déjà fait » : on guide, on ne bloque jamais). Vidéo et PDF ne s'ouvrent qu'une fois le
// livre d'or terminé par les organisateurs (livre d'or complet).
injectStylesOnce(
  'souvenir-page',
  `
  .sv { --gold: #D9AE62; --gold-hi: #F2D28C; --gold-deep: #B8873F; --ivory: #F7F1E5; min-height: 100vh; position: relative; overflow-x: hidden; color: var(--ivory); background: #0b0a08; font-family: 'Libre Baskerville', Georgia, serif; }
  .sv *, .sv *::before, .sv *::after { box-sizing: border-box; }
  .sv-bg { position: fixed; inset: 0; z-index: 0; background-size: cover; background-position: 50% 15%; filter: blur(26px) saturate(1.2) brightness(0.45); transform: scale(1.15); opacity: 0.5; }
  .sv-veil { position: fixed; inset: 0; z-index: 0; background: radial-gradient(circle at 70% 8%, rgba(60,46,24,0.5) 0%, rgba(11,10,8,0.93) 58%), linear-gradient(180deg, rgba(11,10,8,0.2), #0b0a08 92%); }
  .sv-spark { position: fixed; z-index: 1; width: 4px; height: 4px; border-radius: 50%; background: rgba(243,213,140,0.8); box-shadow: 0 0 10px rgba(243,213,140,0.9); pointer-events: none; opacity: 0; animation: svSpark linear infinite; }
  @keyframes svSpark { 0% { transform: translateY(0) scale(0.6); opacity: 0; } 15% { opacity: 0.9; } 100% { transform: translateY(-70vh) scale(1.1); opacity: 0; } }
  .sv-wrap { position: relative; z-index: 2; width: min(1200px, 100% - 40px); margin: 0 auto; padding: clamp(28px, 5vw, 64px) 0 64px; }
  @keyframes svRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes svFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

  /* Apparition douce au défilement */
  .sv-reveal { opacity: 0; transform: translateY(24px); transition: opacity 900ms ease, transform 900ms cubic-bezier(0.2, 0.7, 0.2, 1); }
  .sv-reveal.is-in { opacity: 1; transform: none; }

  /* En-tête : texte à gauche, portrait en arche à droite (le portrait passe en premier sur téléphone) */
  .sv-hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr); gap: clamp(28px, 5vw, 72px); align-items: center; }
  .sv-hero.no-art { grid-template-columns: 1fr; text-align: center; }
  @media (min-width: 901px) { .sv-hero { min-height: min(74vh, 700px); } }
  .sv-hero-text { text-align: left; }
  .sv-hero.no-art .sv-hero-text { text-align: center; }
  .sv-hero-text .sv-eyebrow { margin-bottom: 20px; }
  .sv-eyebrow { margin: 0 0 10px; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-size: 15px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--gold-deep); animation: svRise 900ms ease both; }
  .sv-title { padding: 0.16em 0.14em 0.2em; margin: -0.16em -0.14em -0.2em; font-family: 'Great Vibes', cursive; font-weight: 400; font-size: clamp(76px, 11vw, 150px); line-height: 1.05; white-space: nowrap; background: linear-gradient(180deg, #FFF1C6 0%, #F2CB78 46%, #C98F3A 100%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 22px rgba(226,170,80,0.38)); animation: svRise 1100ms ease both 150ms; }
  .sv-divider { display: flex; align-items: center; gap: 12px; margin: 14px 0 20px; animation: svRise 1100ms ease both 350ms; }
  .sv-divider i { display: block; height: 1px; width: clamp(54px, 9vw, 120px); background: linear-gradient(90deg, transparent, var(--gold)); }
  .sv-divider i:last-child { background: linear-gradient(90deg, var(--gold), transparent); }
  .sv-hero.no-art .sv-divider { justify-content: center; }
  .sv-heart { width: 18px; height: 18px; filter: drop-shadow(0 0 6px rgba(226,172,84,0.6)); }
  .sv-names { margin: 0; font-size: clamp(24px, 3.3vw, 42px); font-weight: 700; letter-spacing: 0.04em; color: var(--gold-hi); animation: svRise 1100ms ease both 500ms; }
  .sv-date { margin: 10px 0 0; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #EDE3CF; opacity: 0.8; animation: svRise 1100ms ease both 650ms; }
  .sv-pill { display: inline-flex; align-items: center; gap: 9px; margin-top: 22px; padding: 9px 18px; border-radius: 999px; font-size: 13px; line-height: 1.4; letter-spacing: 0.03em; text-align: left; border: 1px solid rgba(217,174,98,0.5); background: rgba(217,174,98,0.09); backdrop-filter: blur(6px); animation: svRise 1100ms ease both 800ms; }
  .sv-pill b { flex: none; display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #E3B866; box-shadow: 0 0 10px #E3B866; animation: svPulse 1.8s ease-in-out infinite; }
  .sv-pill.is-done b { animation: none; background: #8FD19E; box-shadow: 0 0 10px #8FD19E; }
  @keyframes svPulse { 0%, 100% { opacity: 0.45; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }

  .sv-stats { display: flex; flex-wrap: wrap; margin-top: 34px; padding-top: 24px; border-top: 1px solid rgba(217,174,98,0.22); animation: svRise 1100ms ease both 950ms; }
  .sv-stat { padding: 0 clamp(16px, 3vw, 36px); border-left: 1px solid rgba(217,174,98,0.22); }
  .sv-stat:first-child { padding-left: 0; border-left: 0; }
  .sv-stat strong { display: block; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: clamp(40px, 5.4vw, 60px); line-height: 1; color: var(--gold-hi); text-shadow: 0 0 24px rgba(226,170,80,0.35); }
  .sv-stat span { display: block; margin-top: 8px; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #CDBB95; }

  .sv-hero-art { display: grid; place-items: center; padding: 18px; }
  .sv-portrait { position: relative; margin: 0; width: min(100%, clamp(320px, 23vw, 430px)); aspect-ratio: 4 / 5.1; padding: 4px; border-radius: 999px 999px 26px 26px; background: linear-gradient(160deg, #FFF1C6 0%, #D9AE62 45%, #8E5F22 100%); box-shadow: 0 30px 70px rgba(0,0,0,0.6), 0 0 70px rgba(226,170,80,0.22); animation: svRise 1200ms ease both 250ms; }
  .sv-portrait::before { content: ''; position: absolute; inset: -14px; border-radius: 999px 999px 38px 38px; border: 1px solid rgba(217,174,98,0.4); pointer-events: none; }
  .sv-portrait img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 16%; border-radius: 999px 999px 22px 22px; background: #1a1610; }

  /* Titres de section */
  .sv-sec-head { text-align: center; margin: clamp(56px, 8vw, 96px) 0 clamp(24px, 4vw, 40px); }
  .sv-sec-head .sv-eyebrow { animation: none; }
  .sv-sec-title { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: clamp(34px, 5vw, 58px); line-height: 1.1; color: #fff; }
  .sv-sec-title em { font-style: italic; color: var(--gold-hi); }

  /* Quelques mots d'amour : une citation à la fois, les avatars ronds servent de navigation */
  .sv-quote { position: relative; display: grid; grid-template-columns: minmax(0, 230px) minmax(0, 1fr); gap: clamp(24px, 5vw, 64px); align-items: center; max-width: 1000px; margin: 0 auto; padding: clamp(26px, 4.5vw, 54px); min-height: 330px; border-radius: 28px; border: 1px solid rgba(217,174,98,0.24); background: linear-gradient(160deg, rgba(36,29,17,0.55), rgba(14,12,9,0.55)); backdrop-filter: blur(8px); }
  .sv-quote-who { text-align: center; }
  .sv-quote-ava { width: clamp(120px, 16vw, 172px); aspect-ratio: 1; margin: 0 auto 16px; padding: 4px; border-radius: 50%; background: linear-gradient(160deg, #FFF1C6 0%, #D9AE62 45%, #8E5F22 100%); box-shadow: 0 0 34px rgba(226,170,80,0.32); }
  .sv-quote-ava > * { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #1a1610; }
  .sv-quote-ava span { display: grid; place-items: center; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 48px; color: var(--gold-hi); }
  .sv-quote-name { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 26px; line-height: 1.2; color: var(--gold-hi); overflow-wrap: anywhere; }
  .sv-quote-meta { margin: 6px 0 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #CDBB95; }
  .sv-quote-text { position: relative; margin: 0; padding-top: 0.75em; font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-weight: 500; font-size: clamp(22px, 2.5vw, 33px); line-height: 1.45; color: #FBF4E4; white-space: pre-line; overflow-wrap: anywhere; text-align: start; }
  .sv-quote-text::before { content: '\\201C'; position: absolute; inset-inline-start: -0.06em; top: -0.28em; font-family: 'Great Vibes', cursive; font-style: normal; font-size: 4em; line-height: 1; color: rgba(217,174,98,0.42); pointer-events: none; }
  .sv-quote-text.is-long { font-size: clamp(18px, 1.9vw, 23px); line-height: 1.55; }
  .sv-in { animation: svFade 700ms ease both; }
  .sv-pick { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; margin: 26px auto 0; max-width: 760px; }
  .sv-pick button { width: 50px; height: 50px; padding: 2px; border-radius: 50%; border: 1.5px solid rgba(217,174,98,0.35); background: #14110c; cursor: pointer; overflow: hidden; opacity: 0.55; transition: opacity 250ms ease, transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease; }
  .sv-pick button:hover { opacity: 0.9; }
  .sv-pick button:focus-visible { outline: 2px solid var(--gold-hi); outline-offset: 3px; }
  .sv-pick button.is-on { opacity: 1; border-color: var(--gold-hi); transform: scale(1.14); box-shadow: 0 0 20px rgba(243,213,140,0.5); }
  .sv-pick button > * { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
  .sv-pick button span { display: grid; place-items: center; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 18px; color: var(--gold-hi); }

  /* Les trois temps */
  .sv-steps { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
  .sv-cell { min-width: 0; }
  .sv-cell.is-wide { grid-column: 1 / -1; }
  .sv-card { position: relative; height: 100%; padding: clamp(26px, 3.4vw, 40px); border-radius: 26px; overflow: hidden; border: 1px solid rgba(217,174,98,0.26); background: linear-gradient(160deg, rgba(30,24,14,0.74), rgba(12,10,8,0.84)); backdrop-filter: blur(10px); box-shadow: 0 18px 50px rgba(0,0,0,0.4); transition: opacity 500ms ease, border-color 500ms ease, filter 500ms ease; }
  .sv-card.is-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(24px, 4vw, 56px); align-items: center; padding: clamp(28px, 4.4vw, 56px); border-color: rgba(243,213,140,0.6); background: radial-gradient(circle at 8% 0%, rgba(243,213,140,0.18), transparent 55%), linear-gradient(160deg, rgba(48,38,20,0.88), rgba(14,12,9,0.92)); box-shadow: 0 0 0 1px rgba(243,213,140,0.14), 0 24px 70px rgba(0,0,0,0.55), 0 0 60px rgba(226,170,80,0.16); }
  .sv-card.is-dim { opacity: 0.58; filter: saturate(0.65); }
  .sv-card.is-dim:hover { opacity: 0.85; }
  .sv-num { position: absolute; top: -22px; right: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; font-size: 112px; line-height: 1; color: transparent; -webkit-text-stroke: 1px rgba(217,174,98,0.3); pointer-events: none; user-select: none; }
  .sv-num.is-done { -webkit-text-stroke-color: rgba(143,209,158,0.6); }
  .sv-body { position: relative; min-width: 0; }
  .sv-tag { display: inline-block; margin-bottom: 14px; padding: 4px 12px; border-radius: 999px; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #1a1409; background: linear-gradient(145deg, #FBE5A6, #D9A94F); }
  .sv-tag.is-quiet { color: var(--gold-hi); background: transparent; border: 1px solid rgba(217,174,98,0.5); }
  .sv-tag.is-done { color: #0b1a10; background: #8FD19E; border-color: transparent; }
  .sv-card h2 { margin: 0 0 12px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: clamp(30px, 3.6vw, 42px); line-height: 1.1; color: #fff; }
  .sv-card.is-hero h2 { font-size: clamp(36px, 5vw, 58px); }
  .sv-card p { margin: 0 0 20px; font-size: 14.5px; line-height: 1.75; color: #E6DAC2; }
  .sv-cta { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 15px 30px; border: 0; border-radius: 999px; cursor: pointer; text-decoration: none; font-family: 'Libre Baskerville', Georgia, serif; font-size: 15px; font-weight: 700; letter-spacing: 0.04em; color: #1a1409; background: linear-gradient(145deg, #FBE5A6 0%, #E7BE68 50%, #C98F3A 100%); box-shadow: 0 10px 30px rgba(226,170,80,0.35); transition: transform 200ms ease, box-shadow 200ms ease; }
  .sv-cta:hover { transform: translateY(-2px); box-shadow: 0 16px 40px rgba(226,170,80,0.5); }
  .sv-cta:disabled { opacity: 0.55; cursor: default; transform: none; }
  .sv-cta.is-big { padding: 19px 40px; font-size: 17px; }
  .sv-cta.is-ghost { color: var(--gold-hi); background: transparent; border: 1px solid rgba(217,174,98,0.6); box-shadow: none; }
  .sv-hint { margin: 14px 0 0 !important; font-size: 12.5px !important; line-height: 1.6 !important; color: #B6A580 !important; }
  .sv-nudge { margin: 0 0 16px !important; }
  .sv-skip { background: none; border: 0; padding: 0; margin-left: 4px; cursor: pointer; color: var(--gold-hi); font: inherit; text-decoration: underline; text-underline-offset: 3px; }
  .sv-lock { display: flex; gap: 12px; align-items: center; padding: 14px 16px; border-radius: 12px; border: 1px dashed rgba(217,174,98,0.4); font-size: 13.5px; line-height: 1.5; color: #CDBB95; }
  .sv-lock span { font-size: 22px; }
  .sv-error { margin: 14px 0 0; padding: 10px 14px; border-radius: 10px; background: rgba(190,60,60,0.18); border: 1px solid rgba(220,100,100,0.5); color: #FFD3D3; font-size: 13.5px; }

  /* Chapitre I : arrêt sur image du livre d'or */
  .sv-still { position: relative; display: block; aspect-ratio: 16 / 11; border-radius: 20px; overflow: hidden; border: 1px solid rgba(243,213,140,0.5); box-shadow: 0 26px 60px rgba(0,0,0,0.55); background: #14110c; }
  .sv-still img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 14%; transition: transform 900ms ease; }
  .sv-still::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(11,10,8,0.05) 40%, rgba(11,10,8,0.78) 100%); pointer-events: none; }
  .sv-still:hover img { transform: scale(1.04); }
  .sv-still-play { position: absolute; z-index: 1; inset: 0; display: grid; place-items: center; }
  .sv-still-play i { display: grid; place-items: center; width: 74px; height: 74px; padding-left: 5px; border-radius: 50%; font-style: normal; font-size: 24px; color: #1a1409; background: linear-gradient(145deg, #FBE5A6, #D9A94F); box-shadow: 0 0 0 10px rgba(243,213,140,0.18), 0 12px 36px rgba(0,0,0,0.5); transition: transform 250ms ease; }
  .sv-still:hover .sv-still-play i { transform: scale(1.08); }
  .sv-still-cap { position: absolute; z-index: 1; left: 20px; right: 20px; bottom: 12px; font-family: 'Great Vibes', cursive; font-style: normal; font-size: 32px; line-height: 1.2; color: var(--gold-hi); text-shadow: 0 2px 14px rgba(0,0,0,0.7); }

  /* Vidéo : aperçu du rendu, progression, résultat */
  .sv-canvas { width: 100%; height: auto; display: block; border-radius: 12px; background: #0A0908; border: 1px solid rgba(217,174,98,0.35); margin: 4px 0 14px; }
  .sv-bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .sv-bar i { display: block; height: 100%; background: linear-gradient(90deg, #C98F3A, #FBE5A6); transition: width 250ms ease; box-shadow: 0 0 14px rgba(243,213,140,0.6); }
  .sv-phase { display: flex; justify-content: space-between; margin: 0 0 8px !important; font-size: 13px !important; color: #E6DAC2 !important; }
  .sv-video { width: 100%; border-radius: 12px; background: #000; margin: 4px 0 16px; border: 1px solid rgba(217,174,98,0.35); }
  .sv-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

  .sv-foot { margin: 56px 0 0; text-align: center; font-size: 13px; line-height: 1.7; color: #9e8f72; }
  .sv-foot b { font-family: 'Great Vibes', cursive; font-weight: 400; font-size: 32px; color: #E9C47A; }
  .sv-center { position: relative; z-index: 2; min-height: 100vh; display: grid; place-items: center; text-align: center; padding: 24px; font-family: 'Libre Baskerville', Georgia, serif; color: #F7F1E5; }

  @media (max-width: 900px) {
    .sv-hero { grid-template-columns: 1fr; gap: 8px; text-align: center; }
    .sv-hero-art { order: -1; padding: 14px 0 22px; }
    .sv-portrait { width: min(62vw, 270px); }
    .sv-hero-text { text-align: center; }
    .sv-divider { justify-content: center; }
    .sv-pill { text-align: left; }
    .sv-stats { justify-content: center; }
    .sv-card.is-hero { grid-template-columns: 1fr; }
    .sv-card.is-hero .sv-still { order: -1; }
  }
  @media (max-width: 760px) {
    .sv-steps { grid-template-columns: 1fr; }
    .sv-quote { grid-template-columns: 1fr; text-align: center; gap: 18px; min-height: 0; padding: 26px 20px 30px; }
    .sv-quote-text { padding-top: 1.5em; text-align: center; }
    .sv-quote-text::before { inset-inline-start: 50%; transform: translateX(-50%); top: -0.1em; }
    .sv-card, .sv-card.is-hero { padding: 24px 20px 24px; }
    .sv-num { font-size: 84px; top: -14px; }
    .sv-cta, .sv-cta.is-big { width: 100%; }
    .sv-stat { padding: 0 14px; }
    .sv-stats { margin-top: 28px; }
    .sv-pick { gap: 9px; max-width: 232px; }
    .sv-pick button { width: 46px; height: 46px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sv-spark, .sv-pill b { animation: none !important; }
    .sv-reveal { opacity: 1; transform: none; transition: none; }
    .sv *, .sv *::before { animation-duration: 1ms !important; animation-delay: 0ms !important; }
  }
  `
);

const PHASE_LABELS = {
  preload: 'Préparation des photos…',
  'load-ffmpeg': 'Chargement du moteur vidéo…',
  render: 'Dessin des images…',
  encode: 'Encodage de la vidéo…',
  'reload-ffmpeg': 'Libération de la mémoire…',
  mux: 'Assemblage final et musique…',
};

const HEART = 'M12 21s-7.5-4.6-9.5-9.2C1 8 3.2 5 6.2 5c1.9 0 3.4 1 5.8 3.3C14.4 6 15.9 5 17.8 5c3 0 5.2 3 3.7 6.8C19.5 16.4 12 21 12 21z';

function HeartIcon() {
  return (
    <svg className="sv-heart" viewBox="0 0 24 24" aria-hidden="true">
      <path d={HEART} fill="#E9C26C" />
    </svg>
  );
}

// Compte jusqu'à `value` (accroche des chiffres). Un minuteur plutôt que requestAnimationFrame : il tourne
// aussi quand l'onglet est en arrière-plan ou masqué.
function useCountUp(value, durationMs = 1600) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!value) {
      setShown(0);
      return undefined;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t >= 1) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [value, durationMs]);
  return shown;
}

function Stat({ value, label }) {
  const shown = useCountUp(value);
  return (
    <div className="sv-stat">
      <strong>{shown}</strong>
      <span>{label}</span>
    </div>
  );
}

const SPARKS = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  bottom: `${(i * 23) % 30}%`,
  delay: `${(i * 1.3) % 9}s`,
  duration: `${9 + ((i * 7) % 8)}s`,
}));

function formatDuration(totalSeconds) {
  const s = Math.round(totalSeconds);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}

function isBrowserSupported() {
  try {
    const canvas = document.createElement('canvas');
    return typeof canvas.getContext === 'function' && typeof window.Worker !== 'undefined';
  } catch {
    return false;
  }
}

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

// État mémorisé dans ce navigateur (étapes déjà faites) : simple confort pour la progression, jamais une
// sécurité — le serveur, lui, ne s'appuie que sur le token et sur l'état du livre d'or.
function useStoredFlag(key) {
  const [value, setValue] = useState(() => {
    try {
      return window.localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const set = useCallback(
    (next) => {
      setValue(next);
      try {
        if (next) window.localStorage.setItem(key, '1');
        else window.localStorage.removeItem(key);
      } catch {
        // stockage indisponible : la progression reste valable le temps de la visite
      }
    },
    [key]
  );
  return [value, set];
}

// Apparition douce d'un bloc quand il entre à l'écran (sans IntersectionObserver : visible tout de suite).
function Reveal({ className = '', delay = 0, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (items) => {
        if (items.some((i) => i.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    // Filet de sécurité : si l'observateur ne se déclenche jamais (navigateur intégré, impression…),
    // le contenu ne doit pas rester invisible.
    const fallback = setTimeout(() => setShown(true), 6000);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  return (
    <div ref={ref} className={`sv-reveal${shown ? ' is-in' : ''} ${className}`.trim()} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

function AuthorPhoto({ entry }) {
  return entry.photo?.url ? <img src={entry.photo.url} alt="" style={{ objectPosition: avatarObjectPosition(entry.photo) }} /> : <span aria-hidden="true">{initialsOf(entry.guestName)}</span>;
}

// Quelques témoignages, un à la fois, tels qu'ils ont été écrits (texte jamais modifié). Les avatars ronds
// servent de navigation ; la rotation automatique s'arrête dès qu'on touche à la navigation ou qu'on
// survole la citation, et n'existe pas pour qui préfère moins d'animations.
function WordsSection({ slug }) {
  const [entries, setEntries] = useState([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/guestbook/display/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('indisponible'))))
      .then((d) => {
        if (cancelled) return;
        const all = (d.entries || []).filter((e) => (e.message || '').trim());
        const short = all.filter((e) => e.message.length <= 320);
        setEntries((short.length >= 3 ? short : all).slice(0, 8));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const count = entries.length;
  useEffect(() => {
    if (count < 2 || paused || touched) return undefined;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 8000);
    return () => clearInterval(timer);
  }, [count, paused, touched]);

  if (!count) return null;
  const entry = entries[Math.min(index, count - 1)];
  const long = entry.message.length > 200;

  return (
    <Reveal>
      <div className="sv-sec-head">
        <p className="sv-eyebrow">Ils ont écrit pour vous</p>
        <h2 className="sv-sec-title">
          Quelques <em>mots d’amour</em>
        </h2>
      </div>
      <figure className="sv-quote" style={{ margin: '0 auto' }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="sv-quote-who sv-in" key={`who-${entry.id || index}`}>
          <div className="sv-quote-ava">
            <AuthorPhoto entry={entry} />
          </div>
          <p className="sv-quote-name">{entry.guestName}</p>
          {entry.tableNumber ? <p className="sv-quote-meta">Table {entry.tableNumber}</p> : null}
        </div>
        <blockquote className={`sv-quote-text sv-in${long ? ' is-long' : ''}`} key={`msg-${entry.id || index}`} dir="auto" style={{ margin: 0 }}>
          {entry.message}
        </blockquote>
      </figure>
      {count > 1 && (
        <div className="sv-pick">
          {entries.map((e, i) => (
            <button
              key={e.id || i}
              type="button"
              className={i === index ? 'is-on' : ''}
              aria-label={`Message de ${e.guestName}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => {
                setTouched(true);
                setIndex(i);
              }}
            >
              <AuthorPhoto entry={e} />
            </button>
          ))}
        </div>
      )}
    </Reveal>
  );
}

export default function SouvenirPage() {
  const { token } = useParams();
  const storeKey = `souvenir:${token.slice(0, 16)}`;
  const [info, setInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [watched, setWatched] = useStoredFlag(`${storeKey}:watched`);
  const [videoDone, setVideoDone] = useStoredFlag(`${storeKey}:video`);
  const [pdfDone, setPdfDone] = useStoredFlag(`${storeKey}:pdf`);
  const [skipWatch, setSkipWatch] = useState(false);
  const [skipVideo, setSkipVideo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/souvenir/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((d) => !cancelled && setInfo(d))
      .catch(() => !cancelled && setNotFound(true));
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Le livre d'or peut être terminé pendant que la page est ouverte : on réinterroge de temps en temps
  // tant qu'il est ouvert, pour débloquer vidéo et PDF sans recharger.
  useEffect(() => {
    if (!info || info.closed) return undefined;
    const timer = setInterval(() => {
      fetch(`${API_BASE}/souvenir/${token}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setInfo(d))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, [info, token]);

  if (notFound) {
    return (
      <div className="sv sv-center">
        <div>
          <h1 style={{ fontFamily: "'Great Vibes', cursive", fontWeight: 400, fontSize: 56, margin: '0 0 8px', color: '#F2D28C' }}>Lien introuvable</h1>
          <p style={{ opacity: 0.8 }}>Ce lien n'est plus valide. Demandez-en un nouveau à votre organisateur.</p>
        </div>
      </div>
    );
  }
  if (!info) {
    return (
      <div className="sv sv-center">
        <p style={{ opacity: 0.7, letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: 13 }}>Chargement…</p>
      </div>
    );
  }

  const dateText = info.eventDate ? new Date(info.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const names = info.namesLine || info.title;
  const watchUrl = `/guestbook/${info.slug}/display?regie=1`;

  // Quelle étape est mise en avant. 1 tant que la version web n'a pas été revue, puis la vidéo, puis le PDF.
  const watchedOrSkipped = watched || skipWatch;
  const videoOrSkipped = videoDone || skipVideo;
  const activeStep = !watchedOrSkipped ? 1 : VIDEO_GENERATION_ENABLED && !videoOrSkipped ? 2 : 3;

  return (
    <div className="sv">
      {info.coverUrl && <div className="sv-bg" style={{ backgroundImage: `url(${info.coverUrl})` }} />}
      <div className="sv-veil" />
      {SPARKS.map((s, i) => (
        <span key={i} className="sv-spark" style={{ left: s.left, bottom: s.bottom, animationDelay: s.delay, animationDuration: s.duration }} />
      ))}

      <div className="sv-wrap">
        <header className={`sv-hero${info.coverUrl ? '' : ' no-art'}`}>
          <div className="sv-hero-text">
            <p className="sv-eyebrow">Votre souvenir</p>
            <h1 className="sv-title">Livre d’Or</h1>
            <div className="sv-divider" aria-hidden="true">
              <i />
              <HeartIcon />
              <i />
            </div>
            <p className="sv-names">{names}</p>
            {dateText && <p className="sv-date">{dateText}</p>}
            <div className={`sv-pill${info.closed ? ' is-done' : ''}`}>
              <b />
              {info.closed ? 'Le livre d’or est terminé : tous vos souvenirs sont réunis' : 'Le livre d’or est encore ouvert : les messages continuent d’arriver'}
            </div>
            <div className="sv-stats">
              <Stat value={info.stats.messages} label={info.stats.messages > 1 ? 'mots d’amour' : 'mot d’amour'} />
              <Stat value={info.stats.photos} label={info.stats.photos > 1 ? 'photos' : 'photo'} />
              {info.stats.tables > 0 && <Stat value={info.stats.tables} label={info.stats.tables > 1 ? 'tables' : 'table'} />}
            </div>
          </div>
          {info.coverUrl && (
            <div className="sv-hero-art">
              <figure className="sv-portrait">
                <img src={info.coverUrl} alt={names} />
              </figure>
            </div>
          )}
        </header>

        <WordsSection slug={info.slug} />

        <Reveal>
          <div className="sv-sec-head">
            <p className="sv-eyebrow">À vous de choisir</p>
            <h2 className="sv-sec-title">
              Revivre, garder, <em>partager</em>
            </h2>
          </div>
        </Reveal>

        <section className="sv-steps">
          {/* ---- I. Version web ---- */}
          <Reveal className="sv-cell is-wide">
            <article className="sv-card is-hero">
              <div className="sv-body">
                <span className={`sv-num${watched ? ' is-done' : ''}`} aria-hidden="true">I</span>
                <span className={`sv-tag${watched ? ' is-done' : ''}`}>{watched ? '✓ Déjà vécu' : 'Commencez ici'}</span>
                <h2>Revivez le livre d’or</h2>
                <p>
                  Tous les mots d’amour de vos proches, tels qu’ils sont apparus dans la salle : chaque message s’écrit mot après mot, avec les photos, la musique et la page de remerciement. C’est
                  l’expérience complète, celle à vivre en premier.
                </p>
                <a className="sv-cta is-big" href={watchUrl} onClick={() => setWatched(true)}>
                  ▶&nbsp; {watched ? 'Le revoir' : 'Lancer le livre d’or'}
                </a>
                <p className="sv-hint">Le livre d’or s’ouvre en plein écran, avec le son. Prenez le temps de tout lire : environ une minute par message. Pour revenir ici, utilisez le bouton « Retour » de votre navigateur.</p>
              </div>
              {info.coverUrl && (
                <a className="sv-still" href={watchUrl} onClick={() => setWatched(true)} tabIndex={-1} aria-hidden="true">
                  <img src={info.coverUrl} alt="" />
                  <span className="sv-still-play">
                    <i>▶</i>
                  </span>
                  <em className="sv-still-cap">{names}</em>
                </a>
              )}
            </article>
          </Reveal>

          {/* ---- II. Vidéo ---- */}
          <Reveal className="sv-cell" delay={120}>
            <article className={`sv-card${VIDEO_GENERATION_ENABLED ? (activeStep < 2 || !info.closed ? ' is-dim' : '') : ' is-dim'}`}>
              <div className="sv-body">
                <span className={`sv-num${videoDone ? ' is-done' : ''}`} aria-hidden="true">II</span>
                <span className={`sv-tag is-quiet${videoDone ? ' is-done' : ''}`}>
                  {VIDEO_GENERATION_ENABLED ? (videoDone ? '✓ Téléchargée' : 'Étape 2') : 'Envoyée par lien'}
                </span>
                <h2>La vidéo souvenir</h2>
                <p>Le livre d’or en un film (MP4), avec la musique : à garder, à partager, à revoir quand vous voulez.</p>
                {!VIDEO_GENERATION_ENABLED ? (
                  <>
                    <button type="button" className="sv-cta" disabled aria-disabled="true" title="Votre vidéo vous est envoyée par un lien de téléchargement">
                      🎬&nbsp; Créer ma vidéo
                    </button>
                    <p className="sv-hint">
                      Pas besoin de la créer ici : votre vidéo vous est envoyée à part par votre organisateur, par un lien de téléchargement. En attendant, vous pouvez télécharger le livre en PDF.
                    </p>
                  </>
                ) : !info.closed ? (
                  <div className="sv-lock">
                    <span aria-hidden="true">🔒</span>
                    <div>Disponible dès que le livre d’or sera terminé, pour que votre vidéo soit complète.</div>
                  </div>
                ) : (
                  <>
                    {activeStep < 2 && (
                      <p className="sv-hint sv-nudge">
                        💡 Commencez par revivre le livre d’or ci-dessus : la vidéo en est le résumé.
                        <button type="button" className="sv-skip" onClick={() => setSkipWatch(true)}>Je l’ai déjà vu</button>
                      </p>
                    )}
                    <VideoMaker slug={info.slug} names={names} done={videoDone} onDone={() => setVideoDone(true)} />
                  </>
                )}
              </div>
            </article>
          </Reveal>

          {/* ---- III. PDF ---- */}
          <Reveal className="sv-cell" delay={240}>
            <article className={`sv-card${activeStep < 3 || !info.closed ? ' is-dim' : ''}`}>
              <div className="sv-body">
                <span className={`sv-num${pdfDone ? ' is-done' : ''}`} aria-hidden="true">III</span>
                <span className={`sv-tag is-quiet${pdfDone ? ' is-done' : ''}`}>{pdfDone ? '✓ Téléchargé' : 'Étape 3'}</span>
                <h2>Le livre en PDF</h2>
                <p>Une page par message, photos en médaillon, prêt à être imprimé ou relié : le souvenir à tenir dans les mains.</p>
                {!info.closed ? (
                  <div className="sv-lock">
                    <span aria-hidden="true">🔒</span>
                    <div>Disponible dès que le livre d’or sera terminé.</div>
                  </div>
                ) : (
                  <>
                    {activeStep < 3 && (
                      <p className="sv-hint sv-nudge">
                        💡 Profitez d’abord de la version web{VIDEO_GENERATION_ENABLED && !videoOrSkipped ? ' et de la vidéo' : ''}.
                        <button type="button" className="sv-skip" onClick={() => { setSkipWatch(true); setSkipVideo(true); }}>
                          Je veux le PDF maintenant
                        </button>
                      </p>
                    )}
                    <PdfDownload token={token} slug={info.slug} done={pdfDone} onDone={() => setPdfDone(true)} />
                  </>
                )}
              </div>
            </article>
          </Reveal>
        </section>

        <footer className="sv-foot">
          <b>Merci d’être ici</b>
          <br />
          Ce lien est personnel : gardez-le précieusement, il vous permettra de revenir à votre souvenir quand vous le souhaitez.
        </footer>
      </div>
    </div>
  );
}

// ---- Vidéo : générée dans le navigateur (même moteur que l'admin), avec aperçu du rendu en direct ----
function VideoMaker({ slug, names, done, onDone }) {
  const canvasRef = useRef(null);
  const [display, setDisplay] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const supported = useMemo(() => isBrowserSupported(), []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/guestbook/display/${slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('indisponible'))))
      .then((d) => !cancelled && setDisplay(d))
      .catch(() => !cancelled && setError("Impossible de charger les messages pour le moment. Réessayez dans un instant."));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(
    () => () => {
      if (video?.url) URL.revokeObjectURL(video.url);
    },
    [video]
  );

  const running = phase !== 'idle' && phase !== 'done' && phase !== 'error';
  // Garde-fou : fermer l'onglet en plein calcul fait perdre toute la progression.
  useEffect(() => {
    if (!running) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [running]);

  const timeline = useMemo(
    () => (display ? buildGuestbookVideoTimeline({ namesLine: display.namesLine, title: display.title, eventDate: display.eventDate, entries: display.entries }) : null),
    [display]
  );

  const start = async () => {
    if (!display || !timeline) return;
    setError('');
    setVideo(null);
    setPhase('preload');
    setProgress({ current: 0, total: 1 });
    try {
      const blob = await generateGuestbookVideo({
        canvas: canvasRef.current,
        timeline,
        coverUrl: display.coverUrl,
        musicUrl: display.musicUrl,
        onProgress: ({ phase: p, current, total }) => {
          setPhase(p);
          setProgress({ current, total });
        },
      });
      setVideo({ url: URL.createObjectURL(blob), size: blob.size });
      setPhase('done');
    } catch (err) {
      setError(err.message || 'La création de la vidéo a échoué. Réessayez, de préférence sur un ordinateur avec Chrome ou Edge.');
      setPhase('error');
    }
  };

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const entryCount = display?.entries?.length ?? 0;
  const fileName = `livre-or-${slug}.mp4`;

  return (
    <div>
      {!supported && <p className="sv-error">Ce navigateur ne permet pas de créer la vidéo. Essayez avec une version récente de Chrome ou Edge, sur ordinateur.</p>}
      {error && <p className="sv-error">{error}</p>}

      {phase === 'idle' || phase === 'error' ? (
        <>
          <button type="button" className="sv-cta" onClick={start} disabled={!supported || !display || entryCount === 0}>
            🎬&nbsp; {done || phase === 'error' ? 'Créer à nouveau la vidéo' : 'Créer ma vidéo'}
          </button>
          {timeline && entryCount > 0 && (
            <p className="sv-hint">
              {entryCount} message{entryCount > 1 ? 's' : ''} · film d’environ {formatDuration(timeline.totalDuration)}. La création se fait sur votre appareil et prend quelques minutes
              {isMobile() ? ' (plus confortable sur un ordinateur)' : ''} : gardez cet onglet ouvert.
            </p>
          )}
          {display && entryCount === 0 && <p className="sv-hint">Aucun message pour le moment.</p>}
        </>
      ) : null}

      {/* Le canvas reste monté (le moteur dessine dedans) ; visible seulement pendant le rendu */}
      <canvas ref={canvasRef} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} className="sv-canvas" style={{ display: running ? 'block' : 'none' }} />

      {running && (
        <div>
          <p className="sv-phase">
            <span>{PHASE_LABELS[phase] || 'Préparation…'}</span>
            <span>{percent}%</span>
          </p>
          <div className="sv-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="sv-hint">⚠️ Ne changez pas d’onglet et ne fermez pas la page avant la fin.</p>
        </div>
      )}

      {phase === 'done' && video && (
        <div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={video.url} controls className="sv-video" />
          <div className="sv-row">
            <a className="sv-cta" href={video.url} download={fileName} onClick={onDone}>
              ⬇&nbsp; Télécharger la vidéo ({(video.size / (1024 * 1024)).toFixed(1)} Mo)
            </a>
            <button type="button" className="sv-cta is-ghost" onClick={start}>↺ Refaire</button>
          </div>
          <p className="sv-hint">Votre vidéo « {names} » est prête : enregistrez-la avant de quitter cette page.</p>
        </div>
      )}
    </div>
  );
}

// ---- PDF : généré par le serveur, téléchargé tel quel ----
function PdfDownload({ token, slug, done, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/souvenir/${token}/pdf`);
      if (res.status === 429) throw new Error('Trop de téléchargements d’affilée : patientez quelques minutes avant de réessayer.');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Le PDF n’a pas pu être préparé. Réessayez dans un instant.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `livre-or-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" className="sv-cta" onClick={download} disabled={busy}>
        {busy ? '⏳ Préparation du PDF…' : done ? '📖 Télécharger à nouveau' : '📖 Télécharger le PDF'}
      </button>
      <p className="sv-hint">{busy ? 'La préparation peut prendre une dizaine de secondes (les photos sont intégrées au document).' : 'Format 16:9, une page par message, avec couverture et page de remerciement.'}</p>
      {error && <p className="sv-error">{error}</p>}
    </div>
  );
}
