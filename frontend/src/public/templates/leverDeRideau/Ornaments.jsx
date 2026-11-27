// Ornements du « Lever de rideau » : le séparateur (un losange entre deux filets), les objets de théâtre et l'en-tête de section.
import masksUrl from './assets/masks.webp';
import glassesUrl from './assets/glasses.webp';
import lyreUrl from './assets/lyre.webp';
import fanUrl from './assets/fan.webp';
import rosesUrl from './assets/roses.webp';
import laurelUrl from './assets/laurel.webp';

const PROPS = { masks: masksUrl, glasses: glassesUrl, lyre: lyreUrl, fan: fanUrl, roses: rosesUrl, laurel: laurelUrl };

/** Un objet de théâtre décoratif (masques, jumelles, lyre, éventail, roses, laurier). */
export function Prop({ name, className = '' }) {
  return <img className={`lr-prop lr-prop--${name} ${className}`} src={PROPS[name]} alt="" aria-hidden="true" loading="lazy" />;
}

export function Divider({ className = '' }) {
  return (
    <span className={`lr-div ${className}`} aria-hidden="true">
      <i />
      <svg viewBox="0 0 34 12" width="34" height="12" focusable="false">
        <path d="M17 0l6 6-6 6-6-6z" fill="currentColor" />
        <circle cx="4" cy="6" r="2" fill="currentColor" />
        <circle cx="30" cy="6" r="2" fill="currentColor" />
      </svg>
      <i />
    </span>
  );
}

/** En-tête d'une section : sur fond sombre ou clair, les couleurs viennent du CSS de la section. */
export function Head({ eyebrow, title, sub, prop, children }) {
  return (
    <header className="lr-head">
      {prop && <Prop name={prop} />}
      {eyebrow && <p className="lr-eyebrow">{eyebrow}</p>}
      <h2 className="lr-h2">{title}</h2>
      <Divider />
      {sub && <p className="lr-head__sub">{sub}</p>}
      {children}
    </header>
  );
}
