// Ornements de « La Porte » : séparateur filet-serrure et en-tête de section (petite phrase, titre manuscrit, séparateur, phrase).

/** Filet interrompu par un trou de serrure (le fil conducteur du template : la porte). */
export function Divider({ className = '' }) {
  return (
    <span className={`lp-div ${className}`} aria-hidden="true">
      <i />
      <svg viewBox="0 0 20 28" width="14" height="20" focusable="false"><path d="M10 1a7.5 7.5 0 0 0-3 14.4L4.6 27h10.8L13 15.4A7.5 7.5 0 0 0 10 1z" fill="currentColor" /></svg>
      <i />
    </span>
  );
}

/** En-tête d'une section : sur fond sombre ou clair, les couleurs viennent du CSS de la section. */
export function Head({ eyebrow, title, sub, children }) {
  return (
    <header className="lp-head">
      {eyebrow && <p className="lp-eyebrow">{eyebrow}</p>}
      <h2 className="lp-h2">{title}</h2>
      <Divider />
      {sub && <p className="lp-head__sub">{sub}</p>}
      {children}
    </header>
  );
}
