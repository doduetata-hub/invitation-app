// Ornements de « L'Embarquement » : le séparateur (une trajectoire en pointillés et son avion) et l'en-tête de section.

export function Divider({ className = '' }) {
  return (
    <span className={`em-div ${className}`} aria-hidden="true">
      <i />
      <svg viewBox="0 0 24 24" width="20" height="20" focusable="false" fill="currentColor">
        <path d="M21.5 12c0-.8-.7-1.4-1.6-1.4h-4.6L10.6 3H8.8l2.3 7.6H6.3L4.7 8.6H3.3l1 3.4-1 3.4h1.4l1.6-2h4.8L8.8 21h1.8l4.7-7.6h4.6c.9 0 1.6-.6 1.6-1.4z" />
      </svg>
      <i />
    </span>
  );
}

/** En-tête d'une section : sur fond sombre ou clair, les couleurs viennent du CSS de la section. */
export function Head({ eyebrow, title, sub, children }) {
  return (
    <header className="em-head">
      {eyebrow && <p className="em-eyebrow">{eyebrow}</p>}
      <h2 className="em-h2">{title}</h2>
      <Divider />
      {sub && <p className="em-head__sub">{sub}</p>}
      {children}
    </header>
  );
}
