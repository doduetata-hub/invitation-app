import { durationForText } from '../utils/guestbookTiming';

// Même rythme d'intro que le mode écran (GuestbookDisplayPage) : 4 temps forts d'environ 2.6s
// chacun (accroche -> noms -> transition -> titre "Livre d'or").
const INTRO_STEP_S = 2.6;
const INTRO_STEPS = 4;
// Marge ajoutée à la durée "de lecture" de durationForText, pour laisser le temps aux animations
// d'entrée/sortie de la scène sans rogner sur le temps de lecture réel du message.
const ENTRY_PADDING_S = 1.2;
const OUTRO_DURATION_S = 7;

// Construit la liste des scènes de la vidéo (une par temps fort de l'intro... non, l'intro est
// UNE seule scène qui gère ses 4 temps forts en interne via le temps local, comme les entrées du
// livre d'or gèrent leur propre entrée/sortie) avec leur fenêtre [start, end) en secondes, à
// partir des mêmes données que celles affichées par le mode écran (voir
// GET /api/guestbook/display/:slug). `entries` est déjà le sous-ensemble choisi par l'admin
// (voir GuestbookVideoPage) : cette fonction ne fait plus aucune sélection elle-même.
export function buildGuestbookVideoTimeline({ namesLine, title, entries }) {
  const scenes = [];
  let cursor = 0;

  const pushScene = (scene) => {
    scenes.push({ ...scene, start: cursor, end: cursor + scene.duration });
    cursor += scene.duration;
  };

  pushScene({ type: 'intro', duration: INTRO_STEP_S * INTRO_STEPS, namesLine, title, introStepS: INTRO_STEP_S });

  entries.forEach((entry, entryIndex) => {
    const readingS = durationForText(entry.message) / 1000;
    // entryIndex sert uniquement à faire varier le style d'animation d'entrée d'un témoignage à
    // l'autre (voir ENTRY_TRANSITIONS dans guestbookVideoRenderer.js) — pas à autre chose.
    pushScene({ type: 'entry', duration: readingS + ENTRY_PADDING_S, entry, entryIndex });
  });

  pushScene({ type: 'outro', duration: OUTRO_DURATION_S, namesLine, title });

  return { scenes, totalDuration: cursor };
}

// Recherche linéaire simple (le nombre de scènes reste modeste, quelques dizaines à quelques
// centaines) : retrouve la scène active à l'instant `time` et son temps local (depuis le début de
// CETTE scène), utilisé par le moteur de rendu pour ses propres animations d'entrée/sortie.
export function findActiveScene(scenes, time) {
  for (const scene of scenes) {
    if (time >= scene.start && time < scene.end) {
      return { scene, localTime: time - scene.start };
    }
  }
  return null;
}
