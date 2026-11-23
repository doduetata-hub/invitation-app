// Pictogrammes et ornements dessinés en SVG (aucune image externe). Traits fins, comme les illustrations des maquettes.
const P = {
  pin: <><path d="M20 35s-11-10.2-11-18a11 11 0 0 1 22 0c0 7.8-11 18-11 18z" /><circle cx="20" cy="17" r="4" /></>,
  clock: <><circle cx="20" cy="20" r="13" /><path d="M20 11v9l6 4" /></>,
  rings: <><circle cx="15" cy="23" r="9" /><circle cx="25" cy="23" r="9" /><path d="M20 7l2.4 3L20 13l-2.4-3z" /></>,
  church: <><path d="M20 4v7M17 7h6M20 11 9 19v15h22V19z" /><path d="M16 34V25a4 4 0 0 1 8 0v9M5 34h30" /></>,
  bride: <><circle cx="14" cy="9" r="3" /><path d="M14 13c-3 3-4 8-5 13h10c-1-5-2-10-5-13zM9 26l-3 9h16l-3-9" /><circle cx="27" cy="9" r="3" /><path d="M24 14h6v21h-6z" /></>,
  couple: <><circle cx="13" cy="8" r="3" /><circle cx="26" cy="8" r="3" /><path d="M13 12c-4 2-5 8-5 14l-2 9h14l-2-9c0-3 1-8-5-14zM26 12c-3 1-4 4-4 8v15h8V20c0-4-1-7-4-8z" /></>,
  dance: <><circle cx="14" cy="8" r="3" /><circle cx="27" cy="8" r="3" /><path d="M14 12l-5 10 6 3-3 10M27 12l4 9-6 4 3 10M14 12l13 0" /></>,
  toast: <><path d="M9 7h10l-1.6 11a3.4 3.4 0 0 1-6.8 0z" transform="rotate(-10 14 20)" /><path d="M21 7h10l-1.6 11a3.4 3.4 0 0 1-6.8 0z" transform="rotate(10 26 20)" /><path d="M13 23v9M9 32h8M27 23v9M23 32h8" /></>,
  cake: <><rect x="8" y="25" width="24" height="9" rx="1.5" /><rect x="12" y="17" width="16" height="8" rx="1.5" /><path d="M20 17v-5M8 29.5c3 2 5 2 8 0s5-2 8 0 5 2 8 0" /><path d="M20 6.5c1.6 1.6 1.6 3.4 0 4.2-1.6-.8-1.6-2.6 0-4.2z" /></>,
  dinner: <path d="M12 6v9a3 3 0 0 0 6 0V6M15 6v28M27 6c3.2 2.4 4.4 7 4 12h-4M27 6v28" />,
  music: <><path d="M15 29V9l14-3v20" /><circle cx="12" cy="29" r="3.4" /><circle cx="26" cy="26" r="3.4" /></>,
  gift: <><rect x="7" y="16" width="26" height="6" rx="1.5" /><path d="M9 22v12h22V22M20 16v18M20 16c-3-7-9-6-8-2 .8 3 5 2 8 2zM20 16c3-7 9-6 8-2-.8 3-5 2-8 2z" /></>,
  camera: <><rect x="6" y="13" width="28" height="19" rx="3" /><circle cx="20" cy="22.5" r="5.5" /><path d="M14 13l2-4h8l2 4" /></>,
  star: <path d="M20 5c1 8 4 11 12 15-8 4-11 7-12 15-1-8-4-11-12-15 8-4 11-7 12-15z" />,
  envelope: <><rect x="6" y="11" width="28" height="20" rx="2" /><path d="M6 13l14 10 14-10" /><rect x="15" y="4" width="10" height="8" rx="1" /></>,
  plate: <><circle cx="20" cy="20" r="9" /><circle cx="20" cy="20" r="5" /><path d="M6 8v8a2 2 0 0 0 4 0V8M8 8v24M34 8c-2.4 1.8-3 5-3 9h3M34 8v24" /></>,
  arch: <><path d="M10 35V16a10 10 0 0 1 20 0v19" /><path d="M14 35V17a6 6 0 0 1 12 0v18M8 35h24" /><path d="M20 6c-2 2-2 4 0 6 2-2 2-4 0-6z" /></>,
  heart: <path d="M20 33S7 24.5 7 15.5a6.5 6.5 0 0 1 13-1.5 6.5 6.5 0 0 1 13 1.5C33 24.5 20 33 20 33z" />,
  check: <><circle cx="20" cy="20" r="14" /><path d="M13.5 20.5l4.5 4.5 8.5-9.5" /></>,
  book: <path d="M20 12c-3-3-8-4-13-4v21c5 0 10 1 13 4 3-3 8-4 13-4V8c-5 0-10 1-13 4zM20 12v21" />,
  share: <><circle cx="29" cy="9" r="4" /><circle cx="11" cy="20" r="4" /><circle cx="29" cy="31" r="4" /><path d="M14.6 18l11-7M14.6 22l11 7" /></>,
  whatsapp: <><path d="M6 34l2.2-8A14 14 0 1 1 14 31.8z" /><path d="M15 14c-1.2 1.4-1 4 1.6 7s5.4 4.4 7.4 4c1.2-.4 2-1.4 2-2.2l-3-1.6-1.6 1.2c-1.4-.6-3.4-2.4-4-4l1.2-1.6-1.6-3z" /></>,
  link: <path d="M17 23a6 6 0 0 0 8.5 0l4-4a6 6 0 0 0-8.5-8.5l-1.5 1.5M23 17a6 6 0 0 0-8.5 0l-4 4a6 6 0 0 0 8.5 8.5l1.5-1.5" />,
  phone: <path d="M12 6h5l2 8-3.4 2.2a18 18 0 0 0 8.2 8.2L26 21l8 2v5c0 1.7-1.3 3-3 3C17 31 9 23 9 9c0-1.7 1.3-3 3-3z" />,
  arrow: <path d="M8 20h24M24 12l8 8-8 8" />,
};

export function Icon({ name, className = 'sk-icon' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {P[name] || P.star}
    </svg>
  );
}

/** Pictogramme du programme, reconnu d'après l'intitulé du moment. */
export function iconKeyFor(title) {
  const t = (title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/entree des maries|arrivee des maries|presentation des maries|entree des couples/.test(t)) return 'couple';
  if (/premiere danse|ouverture du bal|ouverture bal/.test(t)) return 'dance';
  if (/ceremonie|religieu|messe|culte|benediction|priere|eglise|temple/.test(t)) return 'church';
  if (/civil|mairie|voeux|alliance|union|echange|dot/.test(t)) return 'rings';
  if (/gateau|dessert|piece montee/.test(t)) return 'cake';
  if (/cadeau|present/.test(t)) return 'gift';
  if (/buffet|diner|repas|banquet|souper|gala/.test(t)) return 'dinner';
  if (/danse|bal|animation|dj|musique|soiree/.test(t)) return 'music';
  if (/photo|portrait/.test(t)) return 'camera';
  if (/reception|accueil|arrivee|cocktail|aperitif|invites|toast/.test(t)) return 'toast';
  return 'star';
}

/** Cadre d'angle à fleurs (dessin au trait) : `kind` = « blossom » (fleurs blanches) ou « rose » (roses). */
export function Corner({ kind = 'blossom', className = '' }) {
  const petals = (r) => [0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.4} ry={r * 0.62} transform={`rotate(${a})`} />);
  const leaf = (x, y, r) => <path key={`${x}${y}`} d="M0 0 C 6 -10, 20 -12, 30 -2 C 20 8, 6 10, 0 0 Z" transform={`translate(${x} ${y}) rotate(${r})`} />;
  return (
    <svg className={`sk-corner ${className}`} viewBox="0 0 160 160" aria-hidden="true" focusable="false">
      <g className="sk-corner__stem" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 150 C 30 110, 62 70, 130 18" />
        {[[26, 128, -40], [44, 108, 20], [64, 88, -45], [86, 66, 25], [108, 44, -40]].map(([x, y, r]) => leaf(x, y, r))}
      </g>
      {kind === 'rose' ? (
        <g className="sk-corner__rose" strokeWidth="1">
          {[[34, 120, 15], [92, 60, 13], [140, 16, 10]].map(([x, y, r]) => (
            <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>
              <circle r={r} /><path d={`M0 ${-r * 0.6} C ${r * 0.7} ${-r * 0.6}, ${r * 0.7} ${r * 0.5}, 0 ${r * 0.5} C ${-r * 0.5} ${r * 0.5}, ${-r * 0.5} ${-r * 0.2}, 0 ${-r * 0.2}`} fill="none" />
            </g>
          ))}
        </g>
      ) : (
        <g className="sk-corner__flower" strokeWidth="1">
          {[[34, 122, 13], [86, 64, 11], [134, 20, 9]].map(([x, y, r]) => (
            <g key={`${x}${y}`} transform={`translate(${x} ${y})`}>{petals(r)}<circle r={r * 0.22} className="sk-corner__core" /></g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Séparateur : filet, motif central, filet. */
export function Flourish({ className = '' }) {
  return (
    <svg className={`sk-flourish ${className}`} viewBox="0 0 220 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <path d="M4 8h78M138 8h78" />
      <path d="M98 8c4-6 8-6 12 0s8 6 12 0M102 8c0 4 4 5 8 0 4 5 8 4 8 0" />
      <circle cx="110" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}
