// Écriture progressive (révélation mot après mot) d'un témoignage : calendrier commun à l'écran de la
// salle (GuestbookDisplayPage) et à la vidéo souvenir (guestbookVideoRenderer), pour que les deux
// écrivent exactement au même rythme. Pure mise en scène visuelle d'un témoignage DÉJÀ soumis et
// approuvé : le texte affiché à la fin est strictement celui de la base, jamais modifié.
// Pauses naturelles, ajoutées APRÈS le mot concerné : fin de phrase, virgule, saut de ligne. Jamais
// après chaque mot, jamais aléatoires : le rythme reste prévisible et ne ressemble pas à un blocage.
export const TYPING_PAUSE_STRONG_MS = 380;
const TYPING_PAUSE_SOFT_MS = 140;
const TYPING_PAUSE_PARAGRAPH_MS = 520;
// Temps laissé au dernier mot pour finir de se révéler avant que le texte soit considéré comme terminé.
export const TYPING_SETTLE_MS = 300;

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
export function splitIntoUnits(text) {
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
export function buildTypingSchedule(text, wordsPerSecond) {
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
export function getTyping(text, wordsPerSecond) {
  const key = `${wordsPerSecond}|${text}`;
  let typing = typingCache.get(key);
  if (!typing) {
    if (typingCache.size > 300) typingCache.clear();
    typing = buildTypingSchedule(text, wordsPerSecond);
    typingCache.set(key, typing);
  }
  return typing;
}
