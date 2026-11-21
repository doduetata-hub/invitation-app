// Ornements dessinés en SVG (aucune image externe) : branche fleurie, bord déchiré, pictogrammes du programme.

/** Branche fleurie au trait doré, pour les angles. `flip` la retourne horizontalement. */
export function Sprig({ flip = false, className = '' }) {
  const leaves = [
    [44, 214, -35], [58, 186, 20], [70, 160, -40], [88, 134, 25], [106, 108, -38], [124, 80, 28], [140, 54, -30],
  ];
  const flowers = [[36, 232, 1], [104, 92, 0.85], [150, 30, 0.7]];
  return (
    <svg className={`ng-sprig ${className}`} viewBox="0 0 180 260" aria-hidden="true" focusable="false" style={flip ? { transform: 'scaleX(-1)' } : undefined}>
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 256 C 38 196, 72 128, 158 12" />
        {leaves.map(([x, y, r], i) => (
          <path key={i} d="M0 0 C 6 -9, 18 -10, 26 -2 C 18 6, 6 8, 0 0 Z" transform={`translate(${x} ${y}) rotate(${r - 30})`} />
        ))}
        {flowers.map(([x, y, s], i) => (
          <g key={`f${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-9" rx="4.6" ry="9" transform={`rotate(${a})`} />)}
            <circle r="2.2" />
          </g>
        ))}
      </g>
    </svg>
  );
}

// Bord déchiré : tracé déterministe (toujours le même), rempli de la couleur de la section suivante.
const TORN = (() => {
  let seed = 11;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const pts = [];
  for (let x = 0; x <= 400; x += 8) pts.push([x, 14 + rnd() * 20 + (x % 40 === 0 ? 6 : 0)]);
  return `M0 60 L0 ${pts[0][1].toFixed(1)} ${pts.map(([x, y]) => `L${x} ${y.toFixed(1)}`).join(' ')} L400 60 Z`;
})();
export function TornEdge() {
  return (
    <svg className="ng-torn" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={TORN} />
    </svg>
  );
}

const ICONS = {
  welcome: <><path d="M9 7h10l-1.6 11a3.4 3.4 0 0 1-6.8 0z" transform="rotate(-10 14 20)" /><path d="M21 7h10l-1.6 11a3.4 3.4 0 0 1-6.8 0z" transform="rotate(10 26 20)" /><path d="M13 23v9M9 32h8M27 23v9M23 32h8" /></>,
  rings: <><circle cx="15" cy="23" r="9" /><circle cx="25" cy="23" r="9" /><path d="M20 8l2.5 3.2L20 14l-2.5-2.8z" /></>,
  cake: <><rect x="8" y="25" width="24" height="9" rx="1.5" /><rect x="12" y="17" width="16" height="8" rx="1.5" /><path d="M20 17v-5M8 29.5c3 2 5 2 8 0s5-2 8 0 5 2 8 0" /><path d="M20 6.5c1.6 1.6 1.6 3.4 0 4.2-1.6-.8-1.6-2.6 0-4.2z" /></>,
  dinner: <><path d="M12 6v9a3 3 0 0 0 6 0V6M15 6v28M27 6c3.2 2.4 4.4 7 4 12h-4M27 6v28" /></>,
  music: <><path d="M15 29V9l14-3v20" /><circle cx="12" cy="29" r="3.4" /><circle cx="26" cy="26" r="3.4" /></>,
  camera: <><rect x="6" y="13" width="28" height="19" rx="3" /><circle cx="20" cy="22.5" r="5.5" /><path d="M14 13l2-4h8l2 4" /></>,
  star: <><path d="M20 5c1 8 4 11 12 15-8 4-11 7-12 15-1-8-4-11-12-15 8-4 11-7 12-15z" /></>,
};
export function iconKeyFor(title) {
  const t = (title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/ceremonie|mari|voeux|benediction|alliance|union|echange/.test(t)) return 'rings';
  if (/gateau|dessert|piece montee/.test(t)) return 'cake';
  if (/diner|repas|buffet|banquet|souper|gala/.test(t)) return 'dinner';
  if (/danse|bal|soiree|dj|musique|ouverture/.test(t)) return 'music';
  if (/photo|portrait/.test(t)) return 'camera';
  if (/accueil|arrivee|cocktail|aperitif|installation|invites/.test(t)) return 'welcome';
  return 'star';
}
export function Icon({ name }) {
  return (
    <svg className="ng-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name] || ICONS.star}
    </svg>
  );
}
