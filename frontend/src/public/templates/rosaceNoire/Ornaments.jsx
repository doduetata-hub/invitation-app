import { useId } from 'react';

/** Croix fine au trait : symbole discret de la cérémonie religieuse. */
export function Cross({ className = 'nv-cross' }) {
  return (
    <svg className={className} viewBox="0 0 24 34" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <path d="M12 2v30M4 11h16" />
    </svg>
  );
}

// Inscription circulaire qui tourne lentement autour du portrait (comme la légende gravée d'une médaille ou d'une rosace).
// Le texte vient des données de l'invitation (noms, date, intitulé) ; il est répété pour remplir exactement le cercle.
export function RingText({ parts }) {
  const id = useId().replace(/:/g, '');
  const unit = `${parts.filter(Boolean).join('  ✦  ')}  ✦  `;
  const R = 94;
  const circ = 2 * Math.PI * R;
  const target = 118; // nombre de caractères visés sur le cercle (taille de police fixe, espacement ajusté par textLength)
  const reps = Math.max(1, Math.round(target / unit.length));
  const text = unit.repeat(reps);
  return (
    <div className="nv-ringwrap" aria-hidden="true">
    <svg className="nv-ringtext" viewBox="0 0 200 200" focusable="false">
      <defs><path id={`nv-circ-${id}`} d={`M100 100 m-${R} 0 a${R} ${R} 0 1 1 ${2 * R} 0 a${R} ${R} 0 1 1 -${2 * R} 0`} /></defs>
      <text className="nv-ringtext__t"><textPath href={`#nv-circ-${id}`} textLength={circ - 1} lengthAdjust="spacing">{text}</textPath></text>
    </svg>
    </div>
  );
}

/** Titre sur deux lignes : la seconde, en italique, est facultative (champ vide = une seule ligne). */
export function TwoLines({ a, b }) {
  return <>{a}{b && <><br /><em>{b}</em></>}</>;
}

/** Deux alliances entrelacées : le dress code « noir & noir » prend la forme des anneaux. */
export function DressRings({ words }) {
  const [a, b] = [words[0], words[1] || words[0]];
  return (
    <svg className="nv-dressrings" viewBox="0 0 340 200" role="img" aria-label={words.length > 1 ? `${a} et ${b}` : a} focusable="false">
      <defs>
        <clipPath id="nv-lens"><circle cx="122" cy="100" r="84" /></clipPath>
      </defs>
      <circle className="nv-dressrings__c" cx="122" cy="100" r="84" />
      <circle className="nv-dressrings__c" cx="218" cy="100" r="84" />
      <circle className="nv-dressrings__lens" cx="218" cy="100" r="84" clipPath="url(#nv-lens)" />
      <text className="nv-dressrings__w" x="82" y="108" textAnchor="middle">{a}</text>
      <text className="nv-dressrings__w" x="258" y="108" textAnchor="middle">{b}</text>
      <text className="nv-dressrings__amp" x="170" y="118" textAnchor="middle">&amp;</text>
    </svg>
  );
}
