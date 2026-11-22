// Pictogrammes au trait unique (1.3 px), tous dessinés sur une grille 40×40 : aucune image externe.
const P = {
  calendar: <><rect x="7" y="10" width="26" height="23" rx="2.5" /><path d="M7 17h26M14 6v7M26 6v7M13 23h3M19 23h3M25 23h3M13 28h3M19 28h3" /></>,
  clock: <><circle cx="20" cy="20" r="13" /><path d="M20 11v9l6 4" /></>,
  pin: <><path d="M20 35s-11-10.2-11-18a11 11 0 0 1 22 0c0 7.8-11 18-11 18z" /><circle cx="20" cy="17" r="4" /></>,
  tie: <><path d="M20 19.5 8 13v14l12-6.5L32 27V13z" /><rect x="17.5" y="16.5" width="5" height="7" rx="1.4" /></>,
  rings: <><circle cx="15" cy="23" r="9" /><circle cx="25" cy="23" r="9" /><path d="M20 7l2.4 3L20 13l-2.4-3z" /></>,
  church: <><path d="M20 4v7M17 7h6M20 11 9 19v15h22V19z" /><path d="M16 34V25a4 4 0 0 1 8 0v9M5 34h30" /></>,
  toast: <><path d="M9 7h10l-1.6 11a3.4 3.4 0 0 1-6.8 0z" transform="rotate(-10 14 20)" /><path d="M21 7h10l-1.6 11a3.4 3.4 0 0 1-6.8 0z" transform="rotate(10 26 20)" /><path d="M13 23v9M9 32h8M27 23v9M23 32h8" /></>,
  cake: <><rect x="8" y="25" width="24" height="9" rx="1.5" /><rect x="12" y="17" width="16" height="8" rx="1.5" /><path d="M20 17v-5M8 29.5c3 2 5 2 8 0s5-2 8 0 5 2 8 0" /><path d="M20 6.5c1.6 1.6 1.6 3.4 0 4.2-1.6-.8-1.6-2.6 0-4.2z" /></>,
  dinner: <path d="M12 6v9a3 3 0 0 0 6 0V6M15 6v28M27 6c3.2 2.4 4.4 7 4 12h-4M27 6v28" />,
  music: <><path d="M15 29V9l14-3v20" /><circle cx="12" cy="29" r="3.4" /><circle cx="26" cy="26" r="3.4" /></>,
  gift: <><rect x="7" y="16" width="26" height="6" rx="1.5" /><path d="M9 22v12h22V22M20 16v18M20 16c-3-7-9-6-8-2 .8 3 5 2 8 2zM20 16c3-7 9-6 8-2-.8 3-5 2-8 2z" /></>,
  camera: <><rect x="6" y="13" width="28" height="19" rx="3" /><circle cx="20" cy="22.5" r="5.5" /><path d="M14 13l2-4h8l2 4" /></>,
  star: <path d="M20 5c1 8 4 11 12 15-8 4-11 7-12 15-1-8-4-11-12-15 8-4 11-7 12-15z" />,
  book: <><path d="M20 12c-3-3-8-4-13-4v21c5 0 10 1 13 4 3-3 8-4 13-4V8c-5 0-10 1-13 4zM20 12v21" /></>,
  check: <><circle cx="20" cy="20" r="14" /><path d="M13.5 20.5l4.5 4.5 8.5-9.5" /></>,
  heart: <path d="M20 33S7 24.5 7 15.5a6.5 6.5 0 0 1 13-1.5 6.5 6.5 0 0 1 13 1.5C33 24.5 20 33 20 33z" />,
  share: <><circle cx="29" cy="9" r="4" /><circle cx="11" cy="20" r="4" /><circle cx="29" cy="31" r="4" /><path d="M14.6 18l11-7M14.6 22l11 7" /></>,
  whatsapp: <><path d="M6 34l2.2-8A14 14 0 1 1 14 31.8z" /><path d="M15 14c-1.2 1.4-1 4 1.6 7s5.4 4.4 7.4 4c1.2-.4 2-1.4 2-2.2l-3-1.6-1.6 1.2c-1.4-.6-3.4-2.4-4-4l1.2-1.6-1.6-3z" /></>,
  link: <><path d="M17 23a6 6 0 0 0 8.5 0l4-4a6 6 0 0 0-8.5-8.5l-1.5 1.5M23 17a6 6 0 0 0-8.5 0l-4 4a6 6 0 0 0 8.5 8.5l1.5-1.5" /></>,
  phone: <path d="M12 6h5l2 8-3.4 2.2a18 18 0 0 0 8.2 8.2L26 21l8 2v5c0 1.7-1.3 3-3 3C17 31 9 23 9 9c0-1.7 1.3-3 3-3z" />,
  arrow: <path d="M8 20h24M24 12l8 8-8 8" />,
};

export function Icon({ name, className = 'bge-icon' }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      {P[name] || P.star}
    </svg>
  );
}

/** Pictogramme du programme, reconnu d'après l'intitulé du moment. */
export function iconKeyFor(title) {
  const t = (title || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/ceremonie|religieu|messe|culte|benediction|priere|eglise|temple/.test(t)) return 'church';
  if (/mariage civil|civil|mairie|voeux|alliance|union|echange/.test(t)) return 'rings';
  if (/gateau|dessert|piece montee/.test(t)) return 'cake';
  if (/cadeau|present/.test(t)) return 'gift';
  if (/diner|repas|buffet|banquet|souper|gala/.test(t)) return 'dinner';
  if (/danse|bal|animation|dj|musique|ouverture/.test(t)) return 'music';
  if (/photo|portrait/.test(t)) return 'camera';
  if (/reception|accueil|arrivee|cocktail|aperitif|vin d|festive|soiree/.test(t)) return 'toast';
  return 'star';
}

/** Alliances entrelacées surmontées d'une croix : monogramme de la marque du template. */
export function Alliance({ className = 'bge-alliance' }) {
  return (
    <svg className={className} viewBox="0 0 64 44" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="23" cy="28" r="12.5" />
      <circle cx="41" cy="28" r="12.5" />
      <path d="M32 3v10M27.5 7.5h9" />
    </svg>
  );
}

/** Croix fine : symbole discret de la cérémonie religieuse. */
export function Cross({ className = 'bge-cross' }) {
  return (
    <svg className={className} viewBox="0 0 24 34" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2v30M4 11h16" />
    </svg>
  );
}

/** Filet doré avec un motif au centre. */
export function Rule({ children, className = '' }) {
  return (
    <div className={`bge-rule ${className}`} aria-hidden="true">
      <i />{children ? <span>{children}</span> : <b />}<i />
    </div>
  );
}
