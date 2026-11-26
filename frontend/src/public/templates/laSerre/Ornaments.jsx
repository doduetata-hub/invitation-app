// Ornements de « La Serre » : le séparateur (un filet et un bouton de pivoine en arche) et l'en-tête de section.

export function Divider({ className = '' }) {
  return (
    <span className={`ls-div ${className}`} aria-hidden="true">
      <i />
      <svg viewBox="0 0 40 24" width="34" height="20" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 23V13a14 14 0 0 1 28 0v10" />
        <path d="M20 22v-7" />
        <path d="M20 15c-4 0-6-3-5.5-7 2.5 0 4 1 5.5 3 1.5-2 3-3 5.5-3 .5 4-1.5 7-5.5 7z" />
        <path d="M20 21c-1.5-2.5-4-3.2-6-2.6M20 21c1.5-2.5 4-3.2 6-2.6" />
      </svg>
      <i />
    </span>
  );
}

/** En-tête d'une section : sur fond sombre ou clair, les couleurs viennent du CSS de la section. */
export function Head({ eyebrow, title, sub, children }) {
  return (
    <header className="ls-head">
      {eyebrow && <p className="ls-eyebrow">{eyebrow}</p>}
      <h2 className="ls-h2">{title}</h2>
      <Divider />
      {sub && <p className="ls-head__sub">{sub}</p>}
      {children}
    </header>
  );
}
