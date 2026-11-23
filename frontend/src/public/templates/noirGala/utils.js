// Utilitaires propres à Noir Gala.
export { splitNames, initials, mediaOf, isVideo } from '../royalEditorial/utils';

const COLORS = [
  [/noir/i, '#0b0a09'], [/blanc|ivoire|cr[èe]me/i, '#f3ecdf'], [/dor[ée]|\bor\b/i, '#c8a45a'], [/argent/i, '#b8b8b8'],
  [/bordeaux/i, '#6d1a2b'], [/rouge/i, '#a3202c'], [/bleu/i, '#1f3d7a'], [/vert|[ée]meraude/i, '#1f5a46'],
  [/rose|fuchsia/i, '#c4577e'], [/violet|mauve/i, '#5b3a86'], [/beige|nude|sable/i, '#cdb596'], [/marron|chocolat/i, '#4a2f20'],
];

/** « Tendance noir/noir » -> { text, words: ['Tendance noir','noir'], swatches: [couleurs reconnues] }. */
export function parseDressCode(text) {
  const t = (text || '').trim();
  if (!t) return null;
  const words = t.split(/\s*[/,+&]\s*|\s+et\s+/i).map((w) => w.trim()).filter(Boolean);
  const swatches = [];
  words.forEach((w) => { const hit = COLORS.find(([re]) => re.test(w)); if (hit) swatches.push(hit[1]); });
  return { text: t, words, swatches };
}

/** « 87, avenue Eyala, commune/Kasa-vubu, Référence/ Rond point Kimpwanza » -> { street, reference }. */
export function splitAddress(address) {
  const a = (address || '').trim();
  const m = a.match(/^(.*?)[,\s]*\br[ée]f[ée]rence\b\s*[:/-]?\s*(.+)$/i);
  if (!m) return { street: a, reference: '' };
  return { street: m[1].trim().replace(/[,;]$/, ''), reference: m[2].trim() };
}

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Grille du mois (lundi en premier) en UTC, comme les dates de l'application. */
export function monthGrid(eventDate) {
  const d = new Date(eventDate);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const offset = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const cells = Array(offset).fill(null);
  for (let i = 1; i <= count; i += 1) cells.push(i);
  return { cells, day: d.getUTCDate() };
}

export const pad2 = (n) => String(n).padStart(2, '0');
