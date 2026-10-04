import { durationForText } from '../utils/guestbookTiming';
import { getTyping } from '../utils/guestbookTyping';

// Même rythme d'intro que le mode écran (GuestbookDisplayPage) : 3 temps forts d'environ 2.6 s
// (accroche -> noms -> transition), puis la couverture du livre d'or (photo des mariés, titre en script),
// qui reste à l'écran INTRO_COVER_S secondes.
const INTRO_STEP_S = 2.6;
const INTRO_TEXT_STEPS = 3;
const INTRO_COVER_S = 5.5;

// Écriture mot à mot, au même rythme que l'écran de la salle (voir guestbookTyping.js).
export const VIDEO_TYPING_WPS = 4;
// Avant le premier mot : l'avatar, le nom se révèlent d'abord (comme TYPING_LEAD_MS à l'écran).
export const ENTRY_LEAD_S = 1.3;
const HOLD_MIN_S = 3;
const HOLD_READING_SHARE = 0.4;
const PHOTO_BONUS_S = 2.5;
const OUTRO_DURATION_S = 9;

// Temps de lecture : mêmes règles que l'écran (durationForText plafonne à 14 s dès 280 caractères ; chaque
// caractère au-delà ajoute 40 ms).
function readingSeconds(text) {
  return (durationForText(text) + Math.max(0, (text || '').length - 280) * 40) / 1000;
}

// Construit la liste des scènes de la vidéo avec leur fenêtre [start, end) en secondes, à partir des mêmes
// données que celles affichées par le mode écran (voir GET /api/guestbook/display/:slug). `entries` est
// déjà le sous-ensemble choisi (voir GuestbookVideoPage) : cette fonction ne fait aucune sélection.
// Une scène « entrée » dure : le temps d'apparition de l'avatar et du nom, l'écriture du message, puis un
// temps de lecture une fois le texte complet (plus long pour un texte long ou une photo) — comme l'écran.
export function buildGuestbookVideoTimeline({ namesLine, title, eventDate = null, entries }) {
  const scenes = [];
  let cursor = 0;

  const pushScene = (scene) => {
    scenes.push({ ...scene, start: cursor, end: cursor + scene.duration });
    cursor += scene.duration;
  };

  pushScene({
    type: 'intro',
    duration: INTRO_STEP_S * INTRO_TEXT_STEPS + INTRO_COVER_S,
    namesLine,
    title,
    eventDate,
    introStepS: INTRO_STEP_S,
    textSteps: INTRO_TEXT_STEPS,
  });

  entries.forEach((entry, entryIndex) => {
    const message = entry.message || '';
    const typingS = getTyping(message, VIDEO_TYPING_WPS).total / 1000;
    const holdS = Math.max(HOLD_MIN_S, HOLD_READING_SHARE * readingSeconds(message)) + (entry.photo?.url ? PHOTO_BONUS_S : 0);
    pushScene({ type: 'entry', duration: ENTRY_LEAD_S + typingS + holdS, entry, entryIndex, entryTotal: entries.length, typingS });
  });

  pushScene({ type: 'outro', duration: OUTRO_DURATION_S, namesLine, title, eventDate, count: entries.length });

  return { scenes, totalDuration: cursor };
}

// Recherche linéaire simple (le nombre de scènes reste modeste, quelques dizaines à quelques centaines) :
// retrouve la scène active à l'instant « time » et son temps local (depuis le début de CETTE scène), utilisé
// par le moteur de rendu pour ses propres animations d'entrée/sortie.
export function findActiveScene(scenes, time) {
  for (const scene of scenes) {
    if (time >= scene.start && time < scene.end) {
      return { scene, localTime: time - scene.start };
    }
  }
  return null;
}
