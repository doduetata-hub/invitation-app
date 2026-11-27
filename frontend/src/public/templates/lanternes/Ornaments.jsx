// Ornements des « Lanternes » : le séparateur (une petite lanterne entre deux fils) et l'en-tête de section.

export function Divider({ className = '' }) {
  return (
    <span className={`ll-div ${className}`} aria-hidden="true">
      <i />
      <svg viewBox="0 0 20 28" width="17" height="24" focusable="false">
        <path d="M4 7C4 3.7 6.7 2 10 2s6 1.7 6 5c0 6-1.6 11-3 14H7C5.600 18 4 13 4 7z" fill="currentColor" />
        <path d="M7 23.5h6" stroke="currentColor" strokeWidth="1.4" />
        <ellipse cx="10" cy="17" rx="2" ry="3.2" fill="#ffe9be" />
      </svg>
      <i />
    </span>
  );
}

/** En-tête d'une section : sur fond sombre ou clair, les couleurs viennent du CSS de la section. */
export function Head({ eyebrow, title, sub, children }) {
  return (
    <header className="ll-head">
      {eyebrow && <p className="ll-eyebrow">{eyebrow}</p>}
      <h2 className="ll-h2">{title}</h2>
      <Divider />
      {sub && <p className="ll-head__sub">{sub}</p>}
      {children}
    </header>
  );
}
